/**
 * Safely decodes and checks if a JWT token is expired
 * @param {string|null} token
 * @returns {boolean} true if expired or invalid, false if still valid
 */
export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode URL-safe base64 payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;

    // Compare with current time in ms
    return payload.exp * 1000 <= Date.now();
  } catch (err) {
    return true;
  }
}

/**
 * Returns the remaining milliseconds until JWT expiration
 * @param {string|null} token
 * @returns {number} remaining ms (<= 0 if expired)
 */
export function getTokenRemainingTime(token) {
  if (!token || typeof token !== 'string') return 0;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return Infinity;

    return Math.max(0, payload.exp * 1000 - Date.now());
  } catch (err) {
    return 0;
  }
}
