import { DEFAULT_STORAGE_KEY, getConfig } from "./config.js";

/**
 * Authentication storage utilities with obfuscated key/value derivation.
 *
 * Derives deterministic, random-looking storage key and value from a configured
 * storage identifier plus a salt. Uses Web Crypto when available, with a
 * minimal fallback to remain functional in non-browser environments.
 */

/**
 * Constant salt used to derive deterministic, obfuscated storage keys/values
 * from the configured storage identifier. Changing this will invalidate
 * existing gates.
 */
export const STORAGE_SALT = "ah_salt_v1";

/**
 * User-facing error message shown by the gate when the password verification
 * fails. Kept generic to avoid leaking information.
 */
export const AUTH_FAILED_MESSAGE = "Incorrect password. Please try again.";

/**
 * In-memory cache of auth status for the lifetime of the page.
 * This avoids re-hashing and re-reading localStorage on subsequent renders
 * and prevents UI flicker when children re-render.
 */
let authedCache: boolean | undefined = undefined;

/**
 * Returns the cached auth status, if known.
 * - true: previously verified as authed this session
 * - false: previously checked and not authed
 * - undefined: not yet checked this session
 */
export const getCachedIsAuthed = (): boolean | undefined => authedCache;

/**
 * Returns the configured storage identifier used to derive the localStorage
 * key/value pair. Falls back to a default when not provided.
 */
const getStorageIdentifier = (): string =>
  getConfig().storageKey ?? DEFAULT_STORAGE_KEY;

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
 * Derives a deterministic, obfuscated localStorage key from the storage
 * identifier and
 * a versioned salt to minimize guessability and collisions.
 */
export const deriveStorageKey = async (identifier: string): Promise<string> => {
  const h = await hashString(`key:${identifier}:${STORAGE_SALT}`);
  return `k_${h.slice(0, 24)}`;
};

/**
 * Derives a deterministic, obfuscated localStorage value from the storage
 * identifier and salt. Used alongside `deriveStorageKey` to signal access.
 */
export const deriveStorageValue = async (
  identifier: string
): Promise<string> => {
  const h = await hashString(`val:${identifier}:${STORAGE_SALT}`);
  return `v_${h.slice(0, 16)}`;
};

/**
 * Computes the storage key/value pair used by the gate to mark the session as
 * authorized.
 */
export const getAuthKeyAndValue = async (): Promise<{
  key: string;
  value: string;
}> => {
  const identifier = getStorageIdentifier();
  const [key, value] = await Promise.all([
    deriveStorageKey(identifier),
    deriveStorageValue(identifier),
  ]);
  return { key, value };
};

/**
 * Checks whether the derived key/value is present in localStorage. Returns
 * `false` on any error or SSR.
 */
export const readIsAuthed = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    if (authedCache !== undefined) return authedCache;
    const { key, value } = await getAuthKeyAndValue();
    const stored = localStorage.getItem(key);
    const ok = stored === value;
    authedCache = ok;
    return ok;
  } catch {
    return false;
  }
};

/**
 * Writes the derived key/value into localStorage to signal authorization.
 * Silently no-ops on SSR and swallows storage errors to avoid UX breakage.
 */
export const writeAuthed = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  try {
    const { key, value } = await getAuthKeyAndValue();
    try {
      localStorage.setItem(key, value);
      authedCache = true;
    } catch {}
  } catch {}
};
