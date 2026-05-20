const { isAquadsPlatformQuestion } = require('./aquadsPlatformDetect');

const DEFAULT_FORMULA_URIS = [
  'moonshot/web-search:latest',
  'moonshot/code_runner:latest',
  'moonshot/fetch:latest'
];

const MAX_AGENT_ROUNDS = Math.max(
  2,
  Math.min(16, Number(process.env.PROJECT_AGENT_AGENT_MAX_ROUNDS) || 12)
);

const TOOLS_CACHE_MS = Math.max(60_000, Number(process.env.PROJECT_AGENT_TOOLS_CACHE_MS) || 600_000);

/** @type {{ tools: object[], toolToUri: Record<string, string>, loadedAt: number } | null} */
let toolsCache = null;

function normalizeFormulaUri(uri) {
  let u = String(uri || '').trim();
  if (!u) return '';
  if (!u.includes('/')) u = `moonshot/${u}`;
  if (!u.includes(':')) u = `${u}:latest`;
  return u;
}

function parseFormulaUris() {
  const raw = process.env.PROJECT_AGENT_AGENT_FORMULAS;
  const list = raw
    ? raw.split(',').map((s) => normalizeFormulaUri(s.trim())).filter(Boolean)
    : DEFAULT_FORMULA_URIS.map(normalizeFormulaUri);
  return [...new Set(list)];
}

/**
 * @param {string} apiKey
 * @param {string} baseUrl
 */
async function loadAgentTools(apiKey, baseUrl) {
  if (toolsCache && Date.now() - toolsCache.loadedAt < TOOLS_CACHE_MS) {
    return { tools: toolsCache.tools, toolToUri: toolsCache.toolToUri };
  }

  const uris = parseFormulaUris();
  const allTools = [];
  const toolToUri = {};
  const headers = {
    Authorization: `Bearer ${apiKey}`
  };

  for (const uri of uris) {
    const res = await fetch(`${baseUrl}/formulas/${encodeURIComponent(uri)}/tools`, {
      headers
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || `Failed to load tools (${res.status})`;
      throw new Error(`Formula tools ${uri}: ${msg}`);
    }

    for (const tool of data.tools || []) {
      const func = tool?.function;
      const name = func?.name;
      if (!name) continue;
      if (toolToUri[name]) {
        throw new Error(`Duplicate agent tool name "${name}" across formulas`);
      }
      toolToUri[name] = uri;
      allTools.push(tool);
    }
  }

  if (!allTools.length) {
    throw new Error('No Kimi agent tools available for this API key');
  }

  toolsCache = { tools: allTools, toolToUri, loadedAt: Date.now() };
  return { tools: allTools, toolToUri };
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

/**
 * @param {string} apiKey
 * @param {string} baseUrl
 * @param {string} formulaUri
 * @param {string} functionName
 * @param {string} argumentsJson - raw JSON string from model tool call
 */
async function executeFormulaTool(apiKey, baseUrl, formulaUri, functionName, argumentsJson) {
  const res = await fetch(`${baseUrl}/formulas/${encodeURIComponent(formulaUri)}/fibers`, {
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

/** User-facing status for SSE */
function toolStatusLabel(toolName) {
  switch (toolName) {
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

/**
 * Run Kimi agent tool loop (Formula tools), stream answer via send().
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl
 * @param {string} opts.model
 * @param {Array} opts.messages
 * @param {number} opts.maxTokens
 * @param {string} [opts.userMessage] - latest user text (Aquads playbook routing)
 * @param {(evt: object) => void} opts.send
 */
async function runKimiAgentChat({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  userMessage = '',
  send
}) {
  let { tools, toolToUri } = await loadAgentTools(apiKey, baseUrl);

  if (isAquadsPlatformQuestion(userMessage)) {
    tools = tools.filter((t) => t?.function?.name !== 'web_search');
    for (const name of Object.keys(toolToUri)) {
      if (name === 'web_search') delete toolToUri[name];
    }
  }

  const working = [...messages];
  const usages = [];
  let webSearchCalls = 0;
  let toolRound = 0;

  for (let round = 0; round < MAX_AGENT_ROUNDS; round += 1) {
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
        if (name === 'web_search') {
          send({ type: 'searching', searchNumber: webSearchCalls + 1 });
        }

        const uri = toolToUri[name];
        if (!uri) {
          working.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Unsupported tool: ${name}` })
          });
          continue;
        }

        const argsStr = toolCall.function?.arguments || '{}';
        const result = await executeFormulaTool(apiKey, baseUrl, uri, name, argsStr);

        if (name === 'web_search') {
          webSearchCalls += 1;
        }

        working.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result
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

    return { content, usages, webSearchCalls, toolRounds: toolRound };
  }

  throw new Error('Agent took too many steps. Try a shorter or simpler request.');
}

/** Clear cached tool definitions (e.g. after deploy config change). */
function clearAgentToolsCache() {
  toolsCache = null;
}

module.exports = {
  runKimiAgentChat,
  loadAgentTools,
  clearAgentToolsCache,
  normalizeFormulaUri,
  DEFAULT_FORMULA_URIS
};
