import { listPatterns } from "../utils/uiPatterns";

/**
 * Bordered item list with active state, prefix icons, meta labels, and actions.
 *
 * Props:
 *   items — array of item objects:
 *     {
 *       label:   string (required)
 *       active:  boolean
 *       prefix:  string (e.g. "→" or "○")
 *       meta:    string (right-aligned dimmed text)
 *       action:  React node (right-aligned, overrides meta)
 *     }
 */
export function List({ items = [], className = "" }) {
  return (
    <ul className={`${listPatterns.list} ${className}`.trim()}>
      {items.map((item, i) => (
        <li
          key={i}
          className={item.active ? listPatterns.active : listPatterns.item}
        >
          {item.prefix && (
            <span className={listPatterns.prefix}>{item.prefix}</span>
          )}
          {item.label}
          {item.action && (
            <span className={listPatterns.action}>{item.action}</span>
          )}
          {!item.action && item.meta && (
            <span className={listPatterns.meta}>{item.meta}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default List;
