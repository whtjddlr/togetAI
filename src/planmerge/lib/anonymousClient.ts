const ANONYMOUS_CLIENT_ID_KEY = 'planmerge_anonymous_client_id';

function createFallbackId() {
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnonymousClientId() {
  if (typeof window === 'undefined') {
    return 'anonymous-server-placeholder';
  }

  const existingId = window.localStorage.getItem(ANONYMOUS_CLIENT_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId = window.crypto?.randomUUID?.() ?? createFallbackId();
  window.localStorage.setItem(ANONYMOUS_CLIENT_ID_KEY, nextId);

  return nextId;
}
