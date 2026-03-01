import { miscPatterns } from "../utils/uiPatterns";

/**
 * Monospace code/terminal block with optional syntax token spans.
 *
 * For syntax highlighting, wrap tokens in the exported helper components:
 *   <Kw>const</Kw>  →  cyan keyword
 *   <Str>'value'</Str>  →  lime string
 *   <Num>42</Num>  →  amber number
 *   <Cmt>// comment</Cmt>  →  dimmed italic comment
 */
export function CodeBlock({ children, className = "", ...props }) {
  return (
    <div className={`${miscPatterns.codeBlock} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function Kw({ children }) {
  return <span className={miscPatterns.codeKw}>{children}</span>;
}

export function Str({ children }) {
  return <span className={miscPatterns.codeStr}>{children}</span>;
}

export function Num({ children }) {
  return <span className={miscPatterns.codeNum}>{children}</span>;
}

export function Cmt({ children }) {
  return <span className={miscPatterns.codeCmt}>{children}</span>;
}

export default CodeBlock;
