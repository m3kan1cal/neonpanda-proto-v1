import { badgePatterns } from "../utils/uiPatterns";

const VARIANTS = {
  cyan: badgePatterns.cyan,
  pink: badgePatterns.pink,
  purple: badgePatterns.purple,
  lime: badgePatterns.lime,
  amber: badgePatterns.amber,
  red: badgePatterns.red,
  ghost: badgePatterns.ghost,
};

/**
 * Retro badge / status tag.
 * Variants: cyan | pink | purple | lime | amber | red | ghost.
 * Modifiers: dot (show color dot), pill (rounded), lg (larger), online (pulse animation).
 */
export function Badge({
  variant = "cyan",
  dot = false,
  pill = false,
  lg = false,
  online = false,
  children,
  className = "",
  ...props
}) {
  const base = VARIANTS[variant] ?? VARIANTS.cyan;
  const pillClass = pill ? badgePatterns.pill : "";
  const lgClass = lg ? badgePatterns.lg : "";
  const onlineClass = online ? badgePatterns.online : "";

  return (
    <span
      className={`${base} ${pillClass} ${lgClass} ${onlineClass} ${className}`.trim()}
      {...props}
    >
      {dot && <span className={badgePatterns.dot} />}
      {children}
    </span>
  );
}

export default Badge;
