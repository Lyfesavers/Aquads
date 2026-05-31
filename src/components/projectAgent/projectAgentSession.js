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

/** Decode Aquads JWT payload (no verify) — used to ensure API calls match logged-in user. */
export function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getJwtUserId(token) {
  const p = decodeJwtPayload(token);
  const id = p?.userId ?? p?._id ?? p?.id;
  return id != null ? String(id) : '';
}

/** True when this JWT belongs to the same Aquads user as sessionKey (Mongo user id). */
export function jwtMatchesSessionKey(token, sessionKey) {
  if (!token || !sessionKey) return false;
  const jwtUserId = getJwtUserId(token);
  return jwtUserId !== '' && jwtUserId === String(sessionKey);
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

let skipperBootstrapAbort = null;

export function abortSkipperBootstrap() {
  if (skipperBootstrapAbort) {
    skipperBootstrapAbort.abort();
    skipperBootstrapAbort = null;
  }
}

export function createSkipperBootstrapAbort() {
  abortSkipperBootstrap();
  skipperBootstrapAbort = new AbortController();
  return skipperBootstrapAbort.signal;
}

/** Full client-side Skipper reset (call on logout, login, and account switch). */
export function resetSkipperClientSession() {
  abortSkipperInFlightWork();
  abortSkipperBootstrap();
  recentlyDeletedThreadIds.clear();
  clearProjectAgentMediaCache();
}

/**
 * Skipper switch timing logs.
 * - Always on in development (`npm start`)
 * - Production: `localStorage.setItem('skipperDebug', '1')` then reload
 * - Off: `localStorage.removeItem('skipperDebug')`
 */
export function isSkipperDebugEnabled() {
  try {
    if (localStorage.getItem('skipperDebug') === '0') return false;
    if (localStorage.getItem('skipperDebug') === '1') return true;
  } catch {
    /* ignore */
  }
  return process.env.NODE_ENV === 'development';
}

export function skipperDebugLog(label, detail) {
  if (!isSkipperDebugEnabled()) return;
  const ts = new Date().toISOString().slice(11, 23);
  if (detail !== undefined) {
    console.log(`[Skipper ${ts}] ${label}`, detail);
  } else {
    console.log(`[Skipper ${ts}] ${label}`);
  }
}

/** Per-step timings for account switch bootstrap (see console.table at end). */
export function createSkipperBootstrapTrace(meta = {}) {
  const t0 = performance.now();
  let last = t0;
  const steps = [];

  skipperDebugLog('── bootstrap trace start ──', meta);

  return {
    mark(step, extra) {
      const now = performance.now();
      const row = {
        step,
        msTotal: Math.round(now - t0),
        msStep: Math.round(now - last),
        ...(extra || {})
      };
      steps.push(row);
      last = now;
      skipperDebugLog(`  +${row.msStep}ms (${row.msTotal}ms) ${step}`, extra || '');
    },
    finish(status, extra) {
      const msTotal = Math.round(performance.now() - t0);
      const summary = { status, msTotal, ...(extra || {}) };
      skipperDebugLog(`── bootstrap ${status} (${msTotal}ms) ──`, summary);
      if (typeof console !== 'undefined' && console.table && steps.length) {
        console.table(steps);
      }
    },
    aborted(reason, extra) {
      const msTotal = Math.round(performance.now() - t0);
      skipperDebugLog(`── bootstrap ABORTED @ ${msTotal}ms: ${reason} ──`, {
        steps,
        ...(extra || {})
      });
      if (typeof console !== 'undefined' && console.table && steps.length) {
        console.table(steps);
      }
    }
  };
}

/** Leave full-page Skipper so URL params cannot pin the previous account's project/thread. */
export function clearProjectAgentRoute() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/project-agent')) {
    window.history.replaceState(null, '', '/');
  }
}
