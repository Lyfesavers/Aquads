const { isAquadsPlatformQuestion } = require('./aquadsPlatformDetect');
const { KIMI_WEB_SEARCH_TOOL, webSearchToolResult } = require('./kimiWebSearch');

/** Formula URIs to try (optional). Web search always uses builtin $web_search. */
const DEFAULT_FORMULA_URIS = ['moonshot/code_runner:latest', 'moonshot/fetch:latest'];

const KIMI_BUILTIN_WEB_SEARCH = KIMI_WEB_SEARCH_TOOL;

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
  const list = raw
    ? raw.split(',').map((s) => normalizeFormulaUri(s.trim())).filter(Boolean)
    : DEFAULT_FORMULA_URIS.map(normalizeFormulaUri);
  return [...new Set(list)].filter((u) => !u.includes('web-search'));
}

function isWebSearchToolName(name) {
  return name === '$web_search' || name === 'web_search';
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
      console.warn(`[project-agent] Skipping formula ${uri}: ${msg}`);
      continue;
    }

    for (const tool of data.tools || []) {
      const func = tool?.function;
      const name = func?.name;
      if (!name) continue;
      if (name === 'web_search') continue;
      if (toolToUri[name]) {
        console.warn(`[project-agent] Duplicate tool "${name}", keeping first mapping`);
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
async function executeAgentToolCall({ apiKey, baseUrl, toolName, toolCall, toolToUri }) {
  if (toolName === '$web_search') {
    let args = {};
    try {
      args = JSON.parse(toolCall.function?.arguments || '{}');
    } catch {
      args = {};
    }
    return JSON.stringify(webSearchToolResult(args));
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
  send
}) {
  const { tools: loadedTools, toolToUri, skippedFormulas } = await loadAgentTools(apiKey, baseUrl);
  let tools = loadedTools;

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
    console.warn('[project-agent] Agent formulas skipped:', skippedFormulas.join('; '));
  }

  const working = [...messages];
  const usages = [];
  let webSearchCalls = 0;
  let toolRound = 0;

  const maxRounds = getMaxAgentRounds();
  for (let round = 0; round < maxRounds; round += 1) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: working,
        max_tokens: maxTokens,
        thinking: { type: 'disabled' },
        tools
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `AI request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.kimi = data;
      throw err;
    }

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
          toolToUri
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

  throw new Error('Agent took too many steps. Try a shorter or simpler request.');
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
