/**
 * Remote verification configuration.
 *
 * Consumers can configure the base URL and behavior of the remote password
 * verification endpoint. The component will use this configuration
 * when validating passwords against a backend instead of relying solely on
 * local password comparison.
 */

export const DEFAULT_VERIFY_PATH = "/ah-verify";

export const DEFAULT_VERIFY_TIMEOUT_MS = 8000;

/**
 * RemoteVerificationConfig
 *
 * Describes the runtime configuration for remote password verification.
 * - baseUrl: Base URL of the backend that exposes the `ah-verify` endpoint.
 * - verifyPath: Optional path for the verification endpoint. Defaults to
 *   `/ah-verify`.
 * - requestTimeoutMs: Optional timeout for the network request in
 *   milliseconds. Defaults to 8000ms.
 */
export type RemoteVerificationConfig = {
  baseUrl?: string;
  verifyPath?: string;
  requestTimeoutMs?: number;
};

let currentConfig: RemoteVerificationConfig = {
  verifyPath: DEFAULT_VERIFY_PATH,
  requestTimeoutMs: DEFAULT_VERIFY_TIMEOUT_MS,
};

/**
 * getConfig
 *
 * Returns the current remote verification configuration object. This is used
 * internally by the component and utility functions.
 */
export const getConfig = (): RemoteVerificationConfig => currentConfig;

/**
 * setConfig
 *
 * Allows consumers to configure remote verification at runtime. Only the
 * provided keys are updated; omitted keys retain their previous values.
 *
 * Example:
 * setConfig({
 *   baseUrl: "https://my-api.example.com",
 * });
 */
export const setConfig = (config: RemoteVerificationConfig): void => {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
};
