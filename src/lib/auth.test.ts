/**
 * Checks getAdminToken, which decides whether the dashboard fires requests
 * or redirects. Getting this wrong either 401s on every page (too lenient)
 * or locks the admin out (too strict).
 * Run: npx tsx src/lib/auth.test.ts
 */
import assert from 'assert';

const store: Record<string, string> = {};
(globalThis as any).window = { localStorage: null };
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
};
(globalThis as any).document = { cookie: '' };

const jwt = (exp: number) =>
  `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.sig`;

(async () => {
  const { getAdminToken, clearAdminSession } = await import('./auth');
  const set = (v: string | null) => { if (v === null) delete store.adminToken; else store.adminToken = v; };
  const now = Math.floor(Date.now() / 1000);

  set(null);
  assert.strictEqual(getAdminToken(), null, 'missing token -> null');

  set('');
  assert.strictEqual(getAdminToken(), null, 'empty token -> null');

  // A failed login that stored an undefined value writes this literal string,
  // which is truthy and was the source of the 401s.
  set('undefined');
  assert.strictEqual(getAdminToken(), null, '"undefined" string -> null');
  set('null');
  assert.strictEqual(getAdminToken(), null, '"null" string -> null');

  const expired = jwt(now - 60);
  set(expired);
  assert.strictEqual(getAdminToken(), null, 'expired JWT -> null');

  const valid = jwt(now + 3600);
  set(valid);
  assert.strictEqual(getAdminToken(), valid, 'unexpired JWT -> token');

  // Opaque tokens are the server's call, not ours - don't lock the admin out.
  set('opaque-token-no-jwt');
  assert.strictEqual(getAdminToken(), 'opaque-token-no-jwt', 'non-JWT -> token');

  set(valid);
  clearAdminSession();
  assert.strictEqual(getAdminToken(), null, 'clearAdminSession wipes the token');

  console.log('✅ getAdminToken OK');
})();
