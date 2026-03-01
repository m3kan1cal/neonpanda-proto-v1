import { alertPatterns } from "../utils/uiPatterns";

const ICONS = { info: "ℹ", success: "✓", warning: "⚠", error: "✕" };
const BORDERS = {
  info: "border-[rgba(0,255,255,0.25)] bg-retro-cyan-dim",
  success: "border-[rgba(57,255,20,0.25)] bg-retro-lime-dim",
  warning: "border-[rgba(255,107,53,0.25)] bg-retro-orange-dim",
  error: "border-[rgba(255,0,128,0.25)] bg-retro-pink-dim",
};
const ICON_COLORS = {
  info: alertPatterns.infoIcon,
  success: alertPatterns.successIcon,
  warning: alertPatterns.warningIcon,
  error: alertPatterns.errorIcon,
};
const TITLE_COLORS = {
  info: alertPatterns.infoTitle,
  success: alertPatterns.successTitle,
  warning: alertPatterns.warningTitle,
  error: alertPatterns.errorTitle,
};

/**
 * Inline alert banner.
 * Variants: info | success | warning | error.
 *
 * Props:
 *   variant — info | success | warning | error
 *   title   — bold title line
 *   icon    — override the default icon character
 *   children— body text content
 */
export function Alert({
  variant = "info",
  title,
  icon,
  children,
  className = "",
}) {
  const borderBg = BORDERS[variant] ?? BORDERS.info;
  const iconClass = ICON_COLORS[variant] ?? ICON_COLORS.info;
  const titleClass = TITLE_COLORS[variant] ?? TITLE_COLORS.info;
  const displayIcon = icon ?? ICONS[variant] ?? ICONS.info;

  return (
    <div className={`${alertPatterns.base} ${borderBg} ${className}`.trim()}>
      <span className={iconClass}>{displayIcon}</span>
      <div className={alertPatterns.body}>
        {title && <div className={titleClass}>{title}</div>}
        {children && <div className={alertPatterns.text}>{children}</div>}
      </div>
    </div>
  );
}

export default Alert;
