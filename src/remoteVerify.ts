import {
  DEFAULT_VERIFY_PATH,
  DEFAULT_VERIFY_TIMEOUT_MS,
  getConfig,
} from "./config.js";

/**
 * AUTH_VERIFY_UNAVAILABLE_MESSAGE
 *
 * Generic user-facing error message shown when the password could not be
 * verified due to network, server, or configuration issues. Kept generic to
 * avoid leaking implementation details.
 */
export const AUTH_VERIFY_UNAVAILABLE_MESSAGE =
  "Unable to verify access. Please try again later.";

/**
 * RemoteVerifyFailureReason
 *
 * Describes the reason why a remote verification attempt failed.
 */
export type RemoteVerifyFailureReason =
  | "NO_BASE_URL"
  | "NO_WINDOW"
  | "NETWORK"
  | "TIMEOUT"
  | "BAD_STATUS"
  | "BAD_RESPONSE";

/**
 * RemoteVerifyResult
 *
 * Represents the outcome of a remote verification attempt.
 * - ok: true  -> request succeeded and a boolean `valid` result was returned.
 * - ok: false -> request failed; `reason` describes the failure type.
 */
export type RemoteVerifyResult =
  | {
      ok: true;
      valid: boolean;
    }
  | {
      ok: false;
      reason: RemoteVerifyFailureReason;
    };

/**
 * buildVerifyUrl
 *
 * Computes the absolute URL for the verification endpoint from the configured
 * base URL and verify path. Returns `undefined` when the base URL is missing.
 */
const buildVerifyUrl = (): string | undefined => {
  const config = getConfig();
  if (!config.baseUrl) return undefined;

  const verifyPath = config.verifyPath ?? DEFAULT_VERIFY_PATH;

  try {
    const url = new URL(verifyPath, config.baseUrl);
    return url.toString();
  } catch {
    return undefined;
  }
};

/**
 * verifyPasswordRemotely
 *
 * Sends the provided password to the configured `ah-verify` endpoint. The
 * backend is responsible for validating the password and returning a JSON
 * payload of the form:
 *
 *   { "valid": true }  // or false
 *
 * The password is never logged or cached by this utility.
 */
export const verifyPasswordRemotely = async ({
  password,
}: {
  password: string;
}): Promise<RemoteVerifyResult> => {
  if (typeof window === "undefined") {
    return { ok: false, reason: "NO_WINDOW" };
  }

  const url = buildVerifyUrl();
  if (!url) {
    return { ok: false, reason: "NO_BASE_URL" };
  }

  const timeoutMs = getConfig().requestTimeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : undefined;

  const timeoutId = window.setTimeout(() => {
    if (controller) {
      try {
        controller.abort();
      } catch {
        // Ignore abort errors; they are handled by fetch below.
      }
    }
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "BAD_STATUS" };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, reason: "BAD_RESPONSE" };
    }

    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as { valid?: unknown }).valid !== "boolean"
    ) {
      return { ok: false, reason: "BAD_RESPONSE" };
    }

    const { valid } = data as { valid: boolean };
    return { ok: true, valid };
  } catch (error) {
    const reason: RemoteVerifyFailureReason =
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError"
        ? "TIMEOUT"
        : "NETWORK";

    return { ok: false, reason };
  } finally {
    window.clearTimeout(timeoutId);
  }
};
