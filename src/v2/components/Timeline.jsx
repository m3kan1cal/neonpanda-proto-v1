import { timelinePatterns } from "../utils/uiPatterns";

/**
 * Vertical timeline with done / active / pending dot states.
 *
 * Props:
 *   items — array of:
 *     {
 *       dot:   "done" | "active" | "" (pending)
 *       date:  string
 *       title: string
 *       desc:  string
 *     }
 */
export function Timeline({ items = [], className = "" }) {
  return (
    <div className={`${timelinePatterns.container} ${className}`.trim()}>
      {items.map((item, i) => {
        const dotClass =
          item.dot === "done"
            ? timelinePatterns.dotDone
            : item.dot === "active"
              ? timelinePatterns.dotActive
              : timelinePatterns.dot;

        return (
          <div key={i} className={timelinePatterns.item}>
            <div className={dotClass} />
            <div className={timelinePatterns.content}>
              {item.date && (
                <div className={timelinePatterns.date}>{item.date}</div>
              )}
              {item.title && (
                <div className={timelinePatterns.title}>{item.title}</div>
              )}
              {item.desc && (
                <div className={timelinePatterns.desc}>{item.desc}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Timeline;
