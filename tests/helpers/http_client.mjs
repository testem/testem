import got from 'got';

/**
 * Shared HTTP client for integration tests, matching legacy `request` semantics:
 * - non-2xx responses do not throw (tests assert on status and body)
 * - self-signed TLS to localhost (Testem dev HTTPS) is allowed
 */
export const client = got.extend({
  throwHttpErrors: false,
  https: { rejectUnauthorized: false },
});
