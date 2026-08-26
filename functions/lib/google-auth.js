/**
 * Google service account JWT → access token (Web Crypto, Cloudflare Workers).
 */

function base64urlEncode(input) {
  let str;
  if (typeof input === 'string') {
    str = input;
  } else {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
    str = String.fromCharCode(...bytes);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const contents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(contents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importPrivateKey(pem) {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function parseServiceAccount(jsonString) {
  if (!jsonString) return null;
  try {
    const sa = JSON.parse(jsonString);
    if (!sa.client_email || !sa.private_key) return null;
    return sa;
  } catch (e) {
    return null;
  }
}

export function isGoogleConfigured(env) {
  return !!parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

export async function getGoogleAccessToken(env, scopes) {
  const sa = parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!sa) {
    return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set or invalid' };
  }

  const scopeList = Array.isArray(scopes) ? scopes : [scopes];
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: scopeList.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const unsigned = base64urlEncode(JSON.stringify(header)) + '.' + base64urlEncode(JSON.stringify(payload));
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = unsigned + '.' + base64urlEncode(signature);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: 'Token exchange failed (' + res.status + ')', detail: text.slice(0, 400) };
  }

  const data = await res.json();
  if (!data.access_token) {
    return { ok: false, error: 'No access_token in response' };
  }

  return { ok: true, accessToken: data.access_token, email: sa.client_email };
}
