import { typographyPatterns } from "../utils/uiPatterns";

// ── Display scale (VT323) ──────────────────────────────────────────────────

export function DisplayXl({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.displayXl} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function DisplayLg({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.displayLg} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function DisplayMd({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.displayMd} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function DisplaySm({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.displaySm} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Mono scale (Share Tech Mono) ────────────────────────────────────────────

export function MonoLg({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.monoLg} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function MonoMd({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.monoMd} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function MonoSm({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <span
      className={`${typographyPatterns.monoSm} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}

export function MonoXs({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.monoXs} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Body scale (Courier Prime) ───────────────────────────────────────────────

export function BodyText({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <p
      className={`${typographyPatterns.body} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

export function BodySm({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <p
      className={`${typographyPatterns.bodySm} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

export function BodyItalic({ children, className = "", ...props }) {
  return (
    <p className={`${typographyPatterns.bodyI} ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function Label({ children, color, className = "", ...props }) {
  const colorClass = color ? (typographyPatterns[color] ?? "") : "";
  return (
    <div
      className={`${typographyPatterns.label} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export default DisplayXl;
