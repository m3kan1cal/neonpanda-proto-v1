import { useState } from "react";
import { accordionPatterns } from "../utils/uiPatterns";

/**
 * Stateful accordion item with smooth max-height expand/collapse.
 *
 * Props:
 *   index       — numeric index used in the [0N] prefix label
 *   title       — trigger label text
 *   defaultOpen — whether expanded by default
 *   children    — body content
 */
export function Accordion({
  index,
  title,
  defaultOpen = false,
  children,
  className = "",
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${accordionPatterns.wrapper} ${className}`.trim()}>
      <button
        className={
          open ? accordionPatterns.triggerOpen : accordionPatterns.trigger
        }
        onClick={() => setOpen(!open)}
      >
        <span>
          {index != null && (
            <span
              className={
                open ? accordionPatterns.prefixOpen : accordionPatterns.prefix
              }
            >
              [0{index}]
            </span>
          )}
          {title}
        </span>
        <span
          className={open ? accordionPatterns.iconOpen : accordionPatterns.icon}
        >
          ▶
        </span>
      </button>
      <div
        className={open ? accordionPatterns.bodyOpen : accordionPatterns.body}
      >
        <div className={accordionPatterns.bodyInner}>{children}</div>
      </div>
    </div>
  );
}

export default Accordion;
