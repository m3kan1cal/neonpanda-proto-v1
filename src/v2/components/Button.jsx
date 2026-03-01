import { buttonPatterns } from "../utils/uiPatterns";

const VARIANTS = {
  primary: buttonPatterns.primary,
  solid: buttonPatterns.solid,
  pink: buttonPatterns.pink,
  purple: buttonPatterns.purple,
  ghost: buttonPatterns.ghost,
  danger: buttonPatterns.danger,
};

const SIZES = {
  lg: buttonPatterns.lg,
  default: "",
  sm: buttonPatterns.sm,
  xs: buttonPatterns.xs,
};

/**
 * Retro button. Variants: primary | solid | pink | purple | ghost | danger.
 * Sizes: lg | default | sm | xs. Supports block, disabled, loading, and
 * an optional prefix icon via the `prefix` prop.
 */
export function Button({
  variant = "primary",
  size = "default",
  block = false,
  disabled = false,
  loading = false,
  prefix,
  children,
  className = "",
  ...props
}) {
  const base = VARIANTS[variant] ?? VARIANTS.primary;
  const sizeClass = SIZES[size] ?? "";
  const blockClass = block ? buttonPatterns.block : "";
  const disabledClass = disabled ? buttonPatterns.disabled : "";

  return (
    <button
      className={`${base} ${sizeClass} ${blockClass} ${disabledClass} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {(prefix || loading) && (
        <span
          className={`${buttonPatterns.prefix} ${loading ? buttonPatterns.loading : ""}`.trim()}
        >
          {loading ? "↻" : prefix}
        </span>
      )}
      {children}
    </button>
  );
}

export default Button;
