import { cardPatterns } from "../utils/uiPatterns";

const VARIANTS = {
  base: cardPatterns.base,
  raised: cardPatterns.raised,
  cyan: cardPatterns.cyan,
  glow: cardPatterns.glow,
  activeTop: cardPatterns.activeTop,
};

/**
 * Retro card container.
 * Variants: base | raised | cyan | glow | activeTop.
 * The `glow` variant adds a cyan outline on hover via the `retro-card-glow` CSS utility.
 */
export function Card({ variant = "base", children, className = "", ...props }) {
  const base = VARIANTS[variant] ?? VARIANTS.base;

  return (
    <div className={`${base} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

/** Thin horizontal rule inside a card */
export function CardDivider({ className = "" }) {
  return <div className={`${cardPatterns.divider} ${className}`.trim()} />;
}

export default Card;
