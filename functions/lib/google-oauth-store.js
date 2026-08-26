/**
 * OAuth token store — KV when SHADOW_TICKETS is bound, otherwise in-memory (local dev).
 */

const TOKEN_PREFIX = 'oauth:tokens:';

const memoryTokens = new Map();

function kv(env) {
  return env && env.SHADOW_TICKETS ? env.SHADOW_TICKETS : null;
}

export async function getOAuthTokens(env, identityKey) {
  const store = kv(env);
  const key = TOKEN_PREFIX + identityKey;
  if (!store) {
    const entry = memoryTokens.get(key);
    return entry ? structuredClone(entry) : null;
  }
  const raw = await store.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveOAuthTokens(env, identityKey, tokens) {
  const store = kv(env);
  const key = TOKEN_PREFIX + identityKey;
  const value = {
    accessToken: tokens.accessToken || '',
    refreshToken: tokens.refreshToken || '',
    expiresAt: tokens.expiresAt || 0,
    email: tokens.email || '',
    connectedAt: tokens.connectedAt || new Date().toISOString()
  };
  if (!store) {
    memoryTokens.set(key, structuredClone(value));
    return value;
  }
  await store.put(key, JSON.stringify(value));
  return value;
}

export async function clearOAuthTokens(env, identityKey) {
  const store = kv(env);
  const key = TOKEN_PREFIX + identityKey;
  if (!store) {
    memoryTokens.delete(key);
    return;
  }
  await store.delete(key);
}
