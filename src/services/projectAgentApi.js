import { API_URL } from './api';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export async function fetchProjectAgentEligible(token) {
  const res = await fetch(`${API_URL}/project-agent/eligible`, {
    headers: authHeaders(token)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load projects');
  return data;
}

export async function fetchProjectAgentWallet(adId, token) {
  const res = await fetch(`${API_URL}/project-agent/wallet/${encodeURIComponent(adId)}`, {
    headers: authHeaders(token)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to load wallet');
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function fetchProjectAgentThreads(adId, token) {
  const res = await fetch(`${API_URL}/project-agent/threads/${encodeURIComponent(adId)}`, {
    headers: authHeaders(token)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
  return data;
}

export async function createProjectAgentThread(adId, token, title = 'New chat') {
  const res = await fetch(`${API_URL}/project-agent/threads/${encodeURIComponent(adId)}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create conversation');
  return data;
}

export async function fetchProjectAgentMessages(adId, threadId, token) {
  const res = await fetch(
    `${API_URL}/project-agent/threads/${encodeURIComponent(adId)}/${encodeURIComponent(threadId)}/messages`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
}

/**
 * Stream chat via SSE. Calls onEvent({ type, ... }) for each frame; resolves on done.
 */
export async function generateProjectAgentImage({ adId, threadId, token, message }) {
  const res = await fetch(
    `${API_URL}/project-agent/generate-image/${encodeURIComponent(adId)}/${encodeURIComponent(threadId)}`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ message })
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Image generation failed');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function projectAgentImageUrl(messageId, token) {
  return `${API_URL}/project-agent/image/${encodeURIComponent(messageId)}`;
}

/** Fetch image bytes with auth for <img src={blobUrl}> */
export async function fetchProjectAgentImageBlob(messageId, token) {
  const res = await fetch(projectAgentImageUrl(messageId, token), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to load image');
  }
  return res.blob();
}

export function projectAgentImageDownloadUrl(messageId) {
  return `${API_URL}/project-agent/download/${encodeURIComponent(messageId)}`;
}

/** Trigger browser download (auth + Content-Disposition attachment). */
export async function downloadProjectAgentImage(messageId, token) {
  const res = await fetch(projectAgentImageDownloadUrl(messageId), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to download image');
  }

  const blob = await res.blob();
  let filename = `aquads-project-agent-${messageId}.jpg`;
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  if (match?.[1]) {
    filename = match[1];
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function streamProjectAgentChat({
  adId,
  threadId,
  token,
  message,
  mode,
  onEvent,
  signal
}) {
  const res = await fetch(
    `${API_URL}/project-agent/chat/${encodeURIComponent(adId)}/${encodeURIComponent(threadId)}`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ message, mode }),
      signal
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Chat failed');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const evt = JSON.parse(payload);
        onEvent?.(evt);
      } catch {
        /* ignore parse errors */
      }
    }
  }
}
