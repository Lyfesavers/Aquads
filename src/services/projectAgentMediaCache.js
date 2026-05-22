import {
  fetchProjectAgentImageBlob,
  fetchProjectAgentVideoBlob
} from './projectAgentApi';

/** @type {Map<string, { url?: string, promise?: Promise<string> }>} */
const cache = new Map();

function cacheKey(kind, messageId) {
  return `${kind}:${String(messageId)}`;
}

async function loadBlobUrl(kind, messageId, token, fetchBlob) {
  const key = cacheKey(kind, messageId);
  const existing = cache.get(key);
  if (existing?.url) return existing.url;
  if (existing?.promise) return existing.promise;

  const promise = fetchBlob(messageId, token)
    .then((blob) => {
      if (!blob?.size) throw new Error('Empty media');
      const url = URL.createObjectURL(blob);
      cache.set(key, { url });
      return url;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, { promise });
  return promise;
}

export function getProjectAgentImageBlobUrl(messageId, token) {
  return loadBlobUrl('image', messageId, token, fetchProjectAgentImageBlob);
}

export function getProjectAgentVideoBlobUrl(messageId, token) {
  return loadBlobUrl('video', messageId, token, fetchProjectAgentVideoBlob);
}

export function invalidateProjectAgentMedia(messageId, kind = 'both') {
  const id = String(messageId);
  const kinds = kind === 'both' ? ['image', 'video'] : [kind];
  kinds.forEach((k) => {
    const key = cacheKey(k, id);
    const entry = cache.get(key);
    if (entry?.url) URL.revokeObjectURL(entry.url);
    cache.delete(key);
  });
}
