import type { AccessHoodMetadata } from "./AccessHood.js";
import type { AccessHoodTheme } from "./accessHoodStyles.js";

/**
 * Remote verification and UI configuration.
 *
 * Consumers configure the URL and behavior of the remote password verification
 * endpoint, as well as visual and metadata options. The `AccessHood` component
 * reads from this configuration instead of receiving individual props (other
 * than `children`).
 */

export const DEFAULT_VERIFY_TIMEOUT_MS = 8000;

export const DEFAULT_STORAGE_KEY = "ah_authed_v1";

/**
 * AccessHoodConfig
 *
 * Describes the runtime configuration for remote password verification and
 * visual behavior.
 * - verifyUrl: URL of the backend endpoint that verifies the password. Can be
 *   absolute or relative to the current origin. Required for verification.
 * - requestTimeoutMs: Optional timeout for the network request in
 *   milliseconds. Defaults to 8000ms.
 * - passwordHint: Optional hint displayed under the form.
 * - metadata: Optional page-level metadata; `title` sets `document.title`.
 * - theme: Optional color theme overrides for the gate UI.
 * - storageKey: Optional identifier used to derive the localStorage key/value
 *   pair. Defaults to `"ah_authed_v1"`.
 */
export type AccessHoodConfig = {
  verifyUrl: string;
  requestTimeoutMs?: number;
  passwordHint?: string;
  metadata?: AccessHoodMetadata;
  theme?: Partial<AccessHoodTheme>;
  storageKey?: string;
};

let currentConfig: AccessHoodConfig = {
  verifyUrl: "",
  requestTimeoutMs: DEFAULT_VERIFY_TIMEOUT_MS,
  storageKey: DEFAULT_STORAGE_KEY,
};

/**
 * getConfig
 *
 * Returns the current configuration object. This is used internally by the
 * component and utility functions.
 */
export const getConfig = (): AccessHoodConfig => currentConfig;

/**
 * setConfig
 *
 * Allows consumers to configure AccessHood at runtime. Only the provided keys
 * are updated; omitted keys retain their previous values.
 *
 * Example:
 * setConfig({
 *   verifyUrl: "/api/ah-verify",
 *   passwordHint: "Ask the team lead",
 * });
 */
export const setConfig = (config: AccessHoodConfig): void => {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
};
