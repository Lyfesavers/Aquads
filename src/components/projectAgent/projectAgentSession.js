import { clearProjectAgentMediaCache } from '../../services/projectAgentMediaCache';

/** Stable id for the logged-in Aquads user (used to reset Skipper on account switch). */
export function getSkipperSessionKey(user) {
  if (!user || typeof user !== 'object') return '';
  const id = user.userId ?? user.id ?? user._id;
  if (id != null && String(id)) return String(id);
  if (user.username) return String(user.username);
  return '';
}

/** Module-level Skipper UI bookkeeping cleared when the account changes. */
const recentlyDeletedThreadIds = new Set();

export function markSkipperThreadDeleted(threadId) {
  recentlyDeletedThreadIds.add(String(threadId));
}

export function unmarkSkipperThreadDeleted(threadId) {
  recentlyDeletedThreadIds.delete(String(threadId));
}

export function filterSkipperThreads(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((t) => !recentlyDeletedThreadIds.has(String(t?._id)));
}

export function resetSkipperClientSession() {
  recentlyDeletedThreadIds.clear();
  clearProjectAgentMediaCache();
}
