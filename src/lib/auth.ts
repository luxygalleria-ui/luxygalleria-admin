/**
 * Returns the stored admin token only if it is actually usable.
 * Guards against the two ways a "present" token still 401s:
 * a literal "undefined"/"null" string written by a failed login, and an
 * expired JWT. Returns null otherwise, so callers can redirect instead of
 * firing a request that is guaranteed to fail.
 */
export const getAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('adminToken');
  if (!token || token === 'undefined' || token === 'null') return null;

  // JWTs carry their own expiry; a stale one is the usual source of a 401.
  const payload = token.split('.')[1];
  if (payload) {
    try {
      const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof exp === 'number' && exp * 1000 <= Date.now()) return null;
    } catch {
      // Not a decodable JWT - let the server be the judge rather than
      // locking the admin out over a parse failure.
    }
  }

  return token;
};

export const clearAdminSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  document.cookie = 'adminToken=; path=/; max-age=0; SameSite=Strict';
};
