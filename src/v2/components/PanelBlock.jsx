import { panelPatterns } from "../utils/uiPatterns";

/**
 * Sectioned panel with header rule and optional action link.
 * Used in sidebars and right panels.
 *
 * Props:
 *   title      — header label text
 *   action     — optional React node (or string) for the right-side link
 *   onAction   — click handler for the action link
 *   children   — body content
 */
export function PanelBlock({
  title,
  action,
  onAction,
  children,
  className = "",
  ...props
}) {
  return (
    <div className={`${panelPatterns.block} ${className}`.trim()} {...props}>
      {title && (
        <div className={panelPatterns.header}>
          <span>// {title}</span>
          {action && (
            <a className={panelPatterns.headerLink} onClick={onAction}>
              {action}
            </a>
          )}
        </div>
      )}
      <div className={panelPatterns.body}>{children}</div>
    </div>
  );
}

export default PanelBlock;
