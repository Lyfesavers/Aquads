import { clearProjectAgentMediaCache } from '../../services/projectAgentMediaCache';

/** Stable id for the logged-in Aquads user (used to reset Skipper on account switch). */
export function getSkipperSessionKey(user) {
  if (!user || typeof user !== 'object') return '';
  const id = user.userId ?? user.id ?? user._id;
  if (id != null && String(id)) return String(id);
  if (user.username) return String(user.username);
  return '';
}

/**
 * Changes when the Aquads account changes — remount / reset Skipper on login/logout.
 * Must NOT include JWT: token refresh updates the access token without changing user,
 * and including it caused endless reload loops + "Loading conversations…" for minutes.
 */
export function getSkipperAuthEpoch(user) {
  return getSkipperSessionKey(user) || 'guest';
}

/** Module-level Skipper UI bookkeeping cleared when the account changes. */
const recentlyDeletedThreadIds = new Set();

let skipperAbortController = null;

/** Abort open SSE streams / fetches started by Skipper. */
export function abortSkipperInFlightWork() {
  if (skipperAbortController) {
    skipperAbortController.abort();
    skipperAbortController = null;
  }
}

/** Cancel prior Skipper network work and return a fresh AbortController. */
export function createSkipperAbortController() {
  abortSkipperInFlightWork();
  skipperAbortController = new AbortController();
  return skipperAbortController;
}

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

/** Full client-side Skipper reset (call on logout, login, and account switch). */
export function resetSkipperClientSession() {
  abortSkipperInFlightWork();
  recentlyDeletedThreadIds.clear();
  clearProjectAgentMediaCache();
}

/** Leave full-page Skipper so URL params cannot pin the previous account's project/thread. */
export function clearProjectAgentRoute() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/project-agent')) {
    window.history.replaceState(null, '', '/');
  }
}
