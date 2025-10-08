/**
 * Authentication storage utilities with obfuscated key/value derivation.
 *
 * Derives deterministic, random-looking storage key and value from the provided
 * password plus a salt. Uses Web Crypto when available, with a minimal fallback
 * to remain functional in non-browser environments.
 */

/**
 * Constant salt used to derive deterministic, obfuscated storage keys/values
 * from the provided password. Changing this will invalidate existing gates.
 */
export const STORAGE_SALT = "ah_salt_v1";

/**
 * User-facing error message shown by the gate when the password comparison
 * fails. Keep generic to avoid leaking information.
 */
export const AUTH_FAILED_MESSAGE = "Incorrect password. Please try again.";

/**
 * In-memory cache of auth status per password for the lifetime of the page.
 * This avoids re-hashing and re-reading localStorage on subsequent renders
 * and prevents UI flicker when children re-render.
 */
const authedCache = new Map<string, boolean>();

/**
 * Returns the cached auth status for a given password, if known.
 * - true: previously verified as authed this session
 * - false: previously checked and not authed
 * - undefined: not yet checked this session
 */
export const getCachedIsAuthed = (password: string): boolean | undefined =>
  authedCache.get(password);

/**
 * Converts an ArrayBuffer to a lowercase hex string.
 */
const toHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const hex: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hex[i] = bytes[i].toString(16).padStart(2, "0");
  }
  return hex.join("");
};

/**
 * Returns a hex digest for the given input. Uses Web Crypto SHA-256 when
 * available; falls back to a small deterministic hash to avoid hard-failure
 * in restricted environments. The fallback is not cryptographically secure.
 */
export const hashString = async (input: string): Promise<string> => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    let acc = 0;
    for (let i = 0; i < input.length; i++)
      acc = (acc * 31 + input.charCodeAt(i)) >>> 0;
    return acc.toString(16).padStart(8, "0");
  }
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

/**
 * Derives a deterministic, obfuscated localStorage key from the password and
 * a versioned salt to minimize guessability and collisions.
 */
export const deriveStorageKey = async (password: string): Promise<string> => {
  const h = await hashString(`key:${password}:${STORAGE_SALT}`);
  return `k_${h.slice(0, 24)}`;
};

/**
 * Derives a deterministic, obfuscated localStorage value from the password
 * and salt. Used alongside `deriveStorageKey` to signal access.
 */
export const deriveStorageValue = async (password: string): Promise<string> => {
  const h = await hashString(`val:${password}:${STORAGE_SALT}`);
  return `v_${h.slice(0, 16)}`;
};

/**
 * Computes the storage key/value pair used by the gate to mark the session as
 * authorized.
 */
export const getAuthKeyAndValue = async (
  password: string
): Promise<{ key: string; value: string }> => {
  const [key, value] = await Promise.all([
    deriveStorageKey(password),
    deriveStorageValue(password),
  ]);
  return { key, value };
};

/**
 * Checks whether the derived key/value is present in localStorage for the
 * provided password. Returns `false` on any error or SSR.
 */
export const readIsAuthed = async (password: string): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    const cached = authedCache.get(password);
    if (cached !== undefined) return cached;
    const { key, value } = await getAuthKeyAndValue(password);
    const stored = localStorage.getItem(key);
    const ok = stored === value;
    authedCache.set(password, ok);
    return ok;
  } catch {
    return false;
  }
};

/**
 * Writes the derived key/value into localStorage to signal authorization.
 * Silently no-ops on SSR and swallows storage errors to avoid UX breakage.
 */
export const writeAuthed = async (password: string): Promise<void> => {
  if (typeof window === "undefined") return;
  try {
    const { key, value } = await getAuthKeyAndValue(password);
    try {
      localStorage.setItem(key, value);
      authedCache.set(password, true);
    } catch {}
  } catch {}
};
