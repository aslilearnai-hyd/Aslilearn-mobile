/** Decode a JWT payload without verifying (client display / storage keys only). */

function decodeBase64Url(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');

  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
  } catch {
    /* fall through */
  }

  if (typeof globalThis.atob !== 'function') return '';
  const binary = globalThis.atob(padded);
  try {
    return decodeURIComponent(
      Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
  } catch {
    return binary;
  }
}

export function decodeJwtPayload(token?: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = decodeBase64Url(part);
    if (!json) return null;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function jwtUserId(token?: string | null): string {
  const payload = decodeJwtPayload(token);
  if (!payload) return '';
  return String(payload.userId || payload.id || payload._id || payload.sub || '').trim();
}

export function jwtRole(token?: string | null): string {
  const payload = decodeJwtPayload(token);
  return String(payload?.role || '').toLowerCase();
}
