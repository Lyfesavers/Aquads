const MIN_INTERVAL_MS = Number(process.env.DEX_SCREENER_MIN_INTERVAL_MS) || 334;
const FETCH_TIMEOUT_MS = Number(process.env.TOKEN_LOOKUP_TIMEOUT_MS) || 12_000;

let lastCallAt = 0;
let chain = Promise.resolve();

function scheduleFetch(url, options = {}) {
  const run = async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastCallAt));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();

    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Aquads-DexFeed/1.0 (+https://aquads.xyz)',
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS)
    });

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      lastCallAt = Date.now();
      const retry = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Aquads-DexFeed/1.0 (+https://aquads.xyz)',
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS)
      });
      return retry;
    }

    return res;
  };

  chain = chain.then(run, run);
  return chain;
}

async function dexScreenerGetJson(url) {
  const res = await scheduleFetch(url);
  if (!res.ok) {
    throw new Error(`DexScreener HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

module.exports = {
  dexScreenerGetJson
};
