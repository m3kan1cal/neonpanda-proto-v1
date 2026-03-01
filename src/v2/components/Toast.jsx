import { toastPatterns } from "../utils/uiPatterns";

const VARIANTS = {
  cyan: toastPatterns.cyan,
  pink: toastPatterns.pink,
  amber: toastPatterns.amber,
};

/**
 * Floating toast notification.
 * Variants: cyan | pink | amber.
 *
 * Position the toast container in your layout (e.g. fixed bottom-right).
 * This component renders the toast itself without positioning.
 */
export function Toast({
  variant = "cyan",
  children,
  className = "",
  ...props
}) {
  const base = VARIANTS[variant] ?? VARIANTS.cyan;

  return (
    <div className={`${base} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default Toast;
