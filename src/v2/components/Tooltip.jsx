/**
 * CSS tooltip wrapper using the `data-retro-tip` attribute defined in theme.css.
 * The tooltip appears above the wrapped element on hover — no JavaScript required.
 *
 * Props:
 *   tip      — tooltip text (uppercase, tracked, monospace)
 *   children — the element to attach the tooltip to
 *   as       — element tag to render (default "span")
 */
export function Tooltip({
  tip,
  children,
  as: Tag = "span",
  className = "",
  ...props
}) {
  return (
    <Tag data-retro-tip={tip} className={className} {...props}>
      {children}
    </Tag>
  );
}

export default Tooltip;
