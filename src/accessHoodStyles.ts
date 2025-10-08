/**
 * Styles for the `AccessHood` component
 *
 * Centralizes inline styles to keep the component lean and allow simple
 * customization. For production apps, consider replacing with CSS Modules or a
 * design system, but these defaults are intentionally minimal and portable.
 */

/**
 * AccessHoodTheme
 *
 * Allows consumers to override key colors used by the component without
 * forking. All properties are optional when passed through the `theme` prop.
 */
export type AccessHoodTheme = {
  containerBorder: string;
  containerBackground: string | "transparent";
  inputBorder: string;
  buttonBackground: string;
  buttonBorder: string;
  buttonText: string;
  errorText: string;
  hintText: string;
  headingText: string;
};

const DEFAULT_THEME: AccessHoodTheme = {
  containerBorder: "#e5e7eb",
  containerBackground: "transparent",
  inputBorder: "#d1d5db",
  buttonBackground: "#111827",
  buttonBorder: "#111827",
  buttonText: "#ffffff",
  errorText: "#b91c1c",
  hintText: "#6b7280",
  headingText: "inherit",
};

/**
 * getStyles
 *
 * Returns inline styles used by the component, merged with an optional color
 * theme. Only color-related values are themeable; layout metrics remain
 * consistent to preserve UX.
 */
export const getStyles = (
  theme: Partial<AccessHoodTheme> = {}
): Record<string, React.CSSProperties> => {
  const t = { ...DEFAULT_THEME, ...theme };
  return {
    centerBox: {
      maxWidth: 420,
      margin: "10vh auto",
      padding: 24,
      borderRadius: 12,
      border: `1px solid ${t.containerBorder}`,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      background: t.containerBackground,
      fontFamily:
        "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans",
    },
    h1: { fontSize: 20, margin: "0 0 12px", color: t.headingText },
    p: { margin: "0 0 8px", lineHeight: 1.5 },
    form: { display: "grid", gap: 12 },
    input: {
      padding: "10px 12px",
      borderRadius: 8,
      border: `1px solid ${t.inputBorder}`,
    },
    button: {
      padding: "10px 12px",
      borderRadius: 8,
      border: `1px solid ${t.buttonBorder}`,
      background: t.buttonBackground,
      color: t.buttonText,
      cursor: "pointer",
    },
    error: { color: t.errorText, margin: 0 },
    hint: { color: t.hintText, margin: 0, fontSize: 12 },
  };
};
