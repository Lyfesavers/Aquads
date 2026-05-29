const { isAquadsPlatformQuestion } = require('./aquadsPlatformDetect');
const { KIMI_WEB_SEARCH_TOOL, webSearchToolResult } = require('./kimiWebSearch');
const {
  lookupTokenForListing,
  submitStarterListingViaAgent
} = require('../services/projectAgentListStarter');

/** Optional Formula URIs. Web search is always builtin $web_search. Empty = no formula probes. */
const DEFAULT_FORMULA_URIS = [];

const KIMI_BUILTIN_WEB_SEARCH = KIMI_WEB_SEARCH_TOOL;

const AQUADS_LOOKUP_TOKEN_TOOL = {
  type: 'function',
  function: {
    name: 'lookup_token_for_listing',
    description:
      'Look up token symbol, blockchain, and pair address from a contract address (CA) or pair address (PA) using DexScreener. Use before submitting a Starter listing or to confirm token details with the user.',
    parameters: {
      type: 'object',
      properties: {
        token_or_pair_address: {
          type: 'string',
          description: 'Token contract address or DEX pair address'
        }
      },
      required: ['token_or_pair_address']
    }
  }
};

const AQUADS_SUBMIT_STARTER_TOOL = {
  type: 'function',
  function: {
    name: 'submit_starter_listing',
    description:
      'Submit a free Starter bubble-map listing on Aquads for the logged-in user. Resolves token metadata from CA/PA, applies the user-provided logo URL, and creates a pending listing for admin approval. Starter tier only — never Premium or paid add-ons.',
    parameters: {
      type: 'object',
      properties: {
        token_or_pair_address: {
          type: 'string',
          description: 'Token contract address (CA) or DEX pair address (PA)'
        },
        logo_url: {
          type: 'string',
          description: 'Direct HTTPS URL to the project logo image (png/jpg/gif/webp)'
        },
        website_url: {
          type: 'string',
          description:
            'Optional project website URL. Use DexScreener value when available; omit if the user has no site yet.'
        }
      },
      required: ['token_or_pair_address', 'logo_url']
    }
  }
};

function isAquadsListingToolName(name) {
  return name === 'lookup_token_for_listing' || name === 'submit_starter_listing';
}

const { getLimits } = require('./projectAgentLimits');

function getMaxAgentRounds() {
  return getLimits().maxAgentRounds;
}

const TOOLS_CACHE_MS = Math.max(60_000, Number(process.env.PROJECT_AGENT_TOOLS_CACHE_MS) || 600_000);

/** @type {{ tools: object[], toolToUri: Record<string, string>, skippedFormulas: string[], loadedAt: number } | null} */
let toolsCache = null;

function normalizeFormulaUri(uri) {
  let u = String(uri || '').trim();
  if (!u) return '';
  if (!u.includes('/')) u = `moonshot/${u}`;
  if (!u.includes(':')) u = `${u}:latest`;
  return u;
}

/** Kimi expects /formulas/moonshot/web-search:latest/... — do not encode / or : */
function formulaApiUrl(baseUrl, uri, suffix) {
  const normalized = normalizeFormulaUri(uri);
  const base = String(baseUrl || '').replace(/\/$/, '');
  return `${base}/formulas/${normalized}${suffix}`;
}

function parseFormulaUris() {
  const raw = process.env.PROJECT_AGENT_AGENT_FORMULAS;
  const list =
    raw !== undefined && raw !== null
      ? raw.split(',').map((s) => normalizeFormulaUri(s.trim())).filter(Boolean)
      : DEFAULT_FORMULA_URIS.map(normalizeFormulaUri);
  return [...new Set(list)].filter((u) => !u.includes('web-search'));
}

function isWebSearchToolName(name) {
  return name === '$web_search' || name === 'web_search';
}

function getKimiRequestTimeoutMs() {
  const n = Number(process.env.PROJECT_AGENT_KIMI_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : 180_000;
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl
 * @param {string} opts.model
 * @param {Array} opts.messages
 * @param {number} opts.maxTokens
 * @param {object[]|undefined} opts.tools
 */
async function kimiChatCompletion({ apiKey, baseUrl, model, messages, maxTokens, tools }) {
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    thinking: { type: 'disabled' }
  };
  if (tools && tools.length) {
    body.tools = tools;
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(getKimiRequestTimeoutMs())
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `AI request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.kimi = data;
    throw err;
  }
  return data;
}

const WRAP_UP_USER_MESSAGE =
  'You have used the maximum tool steps allowed for this request. Do not call any more tools. ' +
  'Using only information already gathered above, write your complete final answer now. ' +
  'If something is missing, say what you could not verify.';

/**
 * One final completion without tools so the user still gets an answer.
 */
async function finalizeAgentAnswer({
  apiKey,
  baseUrl,
  model,
  working,
  maxTokens,
  usages,
  webSearchCalls,
  toolRound,
  send,
  reason
}) {
  send({ type: 'wrap_up', reason });
  const messages = [...working, { role: 'user', content: WRAP_UP_USER_MESSAGE }];
  const data = await kimiChatCompletion({
    apiKey,
    baseUrl,
    model,
    messages,
    maxTokens,
    tools: undefined
  });

  if (data.usage) {
    usages.push(data.usage);
  }

  const content = data.choices?.[0]?.message?.content || '';
  if (content) {
    const chunkSize = 120;
    for (let i = 0; i < content.length; i += chunkSize) {
      send({ type: 'content', delta: content.slice(i, i + chunkSize) });
    }
  }

  return {
    content,
    usages,
    webSearchCalls,
    toolRounds: toolRound,
    truncated: true,
    truncateReason: reason
  };
}

/**
 * @param {string} apiKey
 * @param {string} baseUrl
 */
async function loadAgentTools(apiKey, baseUrl) {
  if (toolsCache && Date.now() - toolsCache.loadedAt < TOOLS_CACHE_MS) {
    return {
      tools: toolsCache.tools,
      toolToUri: toolsCache.toolToUri,
      skippedFormulas: toolsCache.skippedFormulas
    };
  }

  const uris = parseFormulaUris();
  const allTools = [KIMI_BUILTIN_WEB_SEARCH];
  const toolToUri = {};
  const skippedFormulas = [];

  const headers = {
    Authorization: `Bearer ${apiKey}`
  };

  for (const uri of uris) {
    const url = formulaApiUrl(baseUrl, uri, '/tools');
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || `Failed to load tools (${res.status})`;
      skippedFormulas.push(`${uri}: ${msg}`);
      continue;
    }

    for (const tool of data.tools || []) {
      const func = tool?.function;
      const name = func?.name;
      if (!name) continue;
      if (name === 'web_search') continue;
      if (toolToUri[name]) {
        continue;
      }
      toolToUri[name] = uri;
      allTools.push(tool);
    }
  }

  toolsCache = { tools: allTools, toolToUri, skippedFormulas, loadedAt: Date.now() };
  return { tools: allTools, toolToUri, skippedFormulas };
}

/**
 * @param {object} fiber
 * @returns {string}
 */
function extractFiberOutput(fiber) {
  if (!fiber || fiber.status !== 'succeeded') {
    const err =
      fiber?.error ||
      fiber?.context?.error ||
      fiber?.context?.output ||
      'Tool execution failed';
    return typeof err === 'string' ? err : JSON.stringify(err);
  }
  const ctx = fiber.context || {};
  const out = ctx.output ?? ctx.encrypted_output;
  if (out == null || out === '') {
    return JSON.stringify({ error: 'Empty tool output' });
  }
  return typeof out === 'string' ? out : JSON.stringify(out);
}

async function executeFormulaTool(apiKey, baseUrl, formulaUri, functionName, argumentsJson) {
  const res = await fetch(formulaApiUrl(baseUrl, formulaUri, '/fibers'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      name: functionName,
      arguments: argumentsJson || '{}'
    })
  });

  const fiber = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = fiber?.error?.message || fiber?.message || `Fiber request failed (${res.status})`;
    return JSON.stringify({ error: msg });
  }
  return extractFiberOutput(fiber);
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl
 * @param {string} opts.toolName
 * @param {object} opts.toolCall
 * @param {Record<string, string>} opts.toolToUri
 */
async function executeAgentToolCall({ apiKey, baseUrl, toolName, toolCall, toolToUri, agentContext }) {
  if (toolName === '$web_search') {
    let args = {};
    try {
      args = JSON.parse(toolCall.function?.arguments || '{}');
    } catch {
      args = {};
    }
    return JSON.stringify(webSearchToolResult(args));
  }

  if (isAquadsListingToolName(toolName)) {
    if (!agentContext?.userId || !agentContext?.username) {
      return JSON.stringify({ success: false, error: 'Listing tools require a logged-in verified user.' });
    }
    let args = {};
    try {
      args = JSON.parse(toolCall.function?.arguments || '{}');
    } catch {
      args = {};
    }
    const address = args.token_or_pair_address;
    if (toolName === 'lookup_token_for_listing') {
      const result = await lookupTokenForListing(address);
      return JSON.stringify(result);
    }
    const result = await submitStarterListingViaAgent({
      userId: agentContext.userId,
      username: agentContext.username,
      tokenOrPairAddress: address,
      logoUrl: args.logo_url,
      websiteUrl: args.website_url
    });
    return JSON.stringify(result);
  }

  const uri = toolToUri[toolName];
  if (!uri) {
    if (toolName === 'web_search') {
      let args = {};
      try {
        args = JSON.parse(toolCall.function?.arguments || '{}');
      } catch {
        args = {};
      }
      return JSON.stringify(webSearchToolResult(args));
    }
    return JSON.stringify({ error: `Tool not available on this API key: ${toolName}` });
  }

  return executeFormulaTool(apiKey, baseUrl, uri, toolName, toolCall.function?.arguments || '{}');
}

function toolStatusLabel(toolName) {
  switch (toolName) {
    case '$web_search':
    case 'web_search':
      return 'Searching the web';
    case 'lookup_token_for_listing':
      return 'Looking up token on DexScreener';
    case 'submit_starter_listing':
      return 'Submitting Starter listing';
    case 'code_runner':
      return 'Running Python code';
    case 'fetch':
      return 'Fetching URL';
    default:
      return `Using ${toolName}`;
  }
}

async function runKimiAgentChat({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  userMessage = '',
  send,
  agentContext = null
}) {
  const { tools: loadedTools, toolToUri, skippedFormulas } = await loadAgentTools(apiKey, baseUrl);
  let tools = loadedTools;

  if (agentContext?.userId && agentContext?.username) {
    tools = [...tools, AQUADS_LOOKUP_TOKEN_TOOL, AQUADS_SUBMIT_STARTER_TOOL];
  }

  if (isAquadsPlatformQuestion(userMessage)) {
    tools = tools.filter((t) => {
      const n = t?.function?.name;
      return !isWebSearchToolName(n);
    });
  }

  if (!tools.length) {
    throw new Error('No agent tools available. Check KIMI_API_KEY and PROJECT_AGENT_AGENT_FORMULAS.');
  }

  if (skippedFormulas.length) {
    console.log(
      `[project-agent] Agent optional tools unavailable (OK): ${skippedFormulas.join('; ')}. Using builtin $web_search.`
    );
  }

  const working = [...messages];
  const usages = [];
  let webSearchCalls = 0;
  let toolRound = 0;

  const limits = getLimits();
  const maxRounds = limits.maxAgentRounds;
  const maxWebSearches = limits.maxWebSearchesPerMessage;

  for (let round = 0; round < maxRounds; round += 1) {
    if (webSearchCalls >= maxWebSearches) {
      return finalizeAgentAnswer({
        apiKey,
        baseUrl,
        model,
        working,
        maxTokens,
        usages,
        webSearchCalls,
        toolRound,
        send,
        reason: 'max_web_searches'
      });
    }

    const data = await kimiChatCompletion({
      apiKey,
      baseUrl,
      model,
      messages: working,
      maxTokens,
      tools
    });

    if (data.usage) {
      usages.push(data.usage);
    }

    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason;

    if (finishReason === 'tool_calls' && choice?.message?.tool_calls?.length) {
      working.push(choice.message);
      toolRound += 1;

      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall?.function?.name || 'unknown';
        send({
          type: 'tool',
          tool: name,
          label: toolStatusLabel(name),
          round: toolRound
        });
        if (isWebSearchToolName(name)) {
          send({ type: 'searching', searchNumber: webSearchCalls + 1 });
        }

        const result = await executeAgentToolCall({
          apiKey,
          baseUrl,
          toolName: name,
          toolCall,
          toolToUri,
          agentContext
        });

        if (isWebSearchToolName(name)) {
          webSearchCalls += 1;
        }

        const toolMsg = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result
        };
        if (name === '$web_search') {
          toolMsg.name = '$web_search';
        }
        working.push(toolMsg);
      }

      if (webSearchCalls >= maxWebSearches) {
        return finalizeAgentAnswer({
          apiKey,
          baseUrl,
          model,
          working,
          maxTokens,
          usages,
          webSearchCalls,
          toolRound,
          send,
          reason: 'max_web_searches'
        });
      }
      continue;
    }

    const content = choice?.message?.content || '';
    if (content) {
      const chunkSize = 120;
      for (let i = 0; i < content.length; i += chunkSize) {
        send({ type: 'content', delta: content.slice(i, i + chunkSize) });
      }
    }

    return { content, usages, webSearchCalls, toolRounds: toolRound, skippedFormulas };
  }

  return finalizeAgentAnswer({
    apiKey,
    baseUrl,
    model,
    working,
    maxTokens,
    usages,
    webSearchCalls,
    toolRound,
    send,
    reason: 'max_rounds'
  });
}

function clearAgentToolsCache() {
  toolsCache = null;
}

module.exports = {
  runKimiAgentChat,
  loadAgentTools,
  clearAgentToolsCache,
  normalizeFormulaUri,
  formulaApiUrl,
  DEFAULT_FORMULA_URIS
};
