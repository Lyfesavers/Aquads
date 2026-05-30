const { extractKimiUsageFromCompletion } = require('./kimiCost');

const KIMI_WEB_SEARCH_TOOL = {
  type: 'builtin_function',
  function: { name: '$web_search' }
};

const MAX_WEB_SEARCH_ROUNDS = Math.max(
  2,
  Math.min(10, Number(process.env.PROJECT_AGENT_WEB_SEARCH_MAX_ROUNDS) || 8)
);

/**
 * Echo search args back to Kimi (Moonshot runs search server-side).
 * @param {Record<string, unknown>} args
 */
function webSearchToolResult(args) {
  return args;
}

/**
 * Run Kimi $web_search tool loop (non-stream), then emit answer content via send().
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl
 * @param {string} opts.model
 * @param {Array} opts.messages - includes system + history + user
 * @param {number} opts.maxTokens
 * @param {(evt: object) => void} opts.send
 */
async function runKimiWebSearchChat({ apiKey, baseUrl, model, messages, maxTokens, send }) {
  const working = [...messages];
  const usages = [];
  let webSearchCalls = 0;

  for (let round = 0; round < MAX_WEB_SEARCH_ROUNDS; round += 1) {
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
        tools: [KIMI_WEB_SEARCH_TOOL]
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

    const legUsage = extractKimiUsageFromCompletion(data);
    if (legUsage) {
      usages.push(legUsage);
    }

    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason;

    if (finishReason === 'tool_calls' && choice?.message?.tool_calls?.length) {
      working.push(choice.message);
      send({ type: 'searching', searchNumber: webSearchCalls + 1 });

      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall?.function?.name;
        if (name !== '$web_search') {
          working.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: name || 'unknown',
            content: JSON.stringify({ error: `Unsupported tool: ${name}` })
          });
          continue;
        }

        webSearchCalls += 1;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          args = {};
        }

        working.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: '$web_search',
          content: JSON.stringify(webSearchToolResult(args))
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

    return { content, usages, webSearchCalls };
  }

  throw new Error('Web search took too many steps. Try a shorter or simpler question.');
}

module.exports = {
  KIMI_WEB_SEARCH_TOOL,
  runKimiWebSearchChat,
  webSearchToolResult
};
