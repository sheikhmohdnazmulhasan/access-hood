import React, { useEffect, useMemo, useState } from "react";
import {
  AUTH_FAILED_MESSAGE,
  readIsAuthed,
  writeAuthed,
  getCachedIsAuthed,
} from "./authStorage.js";
import { getStyles, type AccessHoodTheme } from "./accessHoodStyles.js";

/**
 * AccessHoodMetadata
 *
 * Describes optional page-level metadata that can be applied when the
 * `AccessHood` gate is mounted. Currently, only `title` is used to set the
 * `document.title` for the gated route. `description` is reserved for future
 * enhancements or external consumers.
 */
export type AccessHoodMetadata = {
  title?: string;
  description?: string;
};

// This is the type that will be used internally by the component
type AccessHoodProps = {
  children: React.ReactNode;
  metadata?: AccessHoodMetadata;
  password: string;
  passwordHint?: string;
  theme?: Partial<AccessHoodTheme>;
};

// This is the type that will be exported and used by the consumer
export type AccessHood = Omit<AccessHoodProps, "children">;

/**
 * AccessHood component
 *
 * Simple client-side gate that verifies a provided password and sets an
 * obfuscated auth flag in localStorage. On mount, it checks the stored flag
 * using derived, non-readable keys/values from `authStorage`.
 */

// styles imported from accessHoodStyles

/**
 * AccessHood
 *
 * Client-side visual gate for low-stakes access control. Renders a minimal
 * password form until the user provides the correct password. On success, an
 * obfuscated key/value derived from the password is stored in `localStorage`
 * to automatically re-authorize on subsequent visits.
 *
 * Usage notes:
 * - This is not security; do not ship sensitive data to the client unless
 *   protected server-side.
 * - Works only on the client. In SSR, initial render will return `null` and
 *   the form will appear once hydrated.
 */
export function AccessHood({
  children,
  metadata,
  password,
  passwordHint,
  theme,
}: AccessHoodProps) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  // Initialize auth from cache synchronously to avoid flicker on re-renders
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    const cached = getCachedIsAuthed(password);
    return cached === true;
  });
  // Lazily mark client after mount; initial SSR/hydration returns null
  const [isClient, setIsClient] = useState(false);
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Detect client once
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update title when metadata.title changes
  useEffect(() => {
    if (metadata?.title && typeof document !== "undefined") {
      document.title = metadata.title;
    }
  }, [metadata?.title]);

  // Check auth once per password change; respects cache to avoid recomputation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        const ok = await readIsAuthed(password);
        if (!cancelled) setIsAuthed(ok);
      } catch {
        // Ignore – treat as not authed when storage/crypto fail
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pwd === password) {
      try {
        await writeAuthed(password);
        setIsAuthed(true);
      } catch {
        setIsAuthed(true);
      }
    } else {
      setErr(AUTH_FAILED_MESSAGE);
    }
  };

  if (isClient && isAuthed) {
    return <>{children}</>;
  }

  if (isClient) {
    return (
      <div style={styles.centerBox}>
        <style>{`
  .ah-input:focus-visible,
  .ah-button:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  /* Firefox keyboard focus */
  .ah-input:-moz-focusring,
  .ah-button:-moz-focusring {
    outline: none !important;
  }
  /* Legacy Firefox inner border on buttons */
  .ah-button::-moz-focus-inner { border: 0; }
`}</style>

        <h1 style={styles.h1}>Authentication Required</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            className="ah-input"
            type="password"
            placeholder="Enter password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit(e);
            }}
            style={styles.input}
          />
          <button type="submit" className="ah-button" style={styles.button}>
            Enter
          </button>
          {err && <p style={styles.error}>{err}</p>}
          {passwordHint && <p style={styles.hint}>Hint: {passwordHint}</p>}
        </form>
      </div>
    );
  }

  return null;
}
