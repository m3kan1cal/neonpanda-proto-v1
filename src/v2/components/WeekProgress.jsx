import { weekPatterns } from "../utils/uiPatterns";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/**
 * 7-day week-at-a-glance progress grid.
 *
 * Props:
 *   days — array of 7 state strings: "done" | "today" | "rest" | "" (empty/pending)
 *   showLabels — whether to render MON–SUN labels below (default true)
 */
export function WeekProgress({ days = [], showLabels = true, className = "" }) {
  const normalized = [...days, ...new Array(7).fill("")].slice(0, 7);

  return (
    <div className={className}>
      <div className={weekPatterns.grid}>
        {normalized.map((state, i) => {
          const dayClass =
            state === "done"
              ? weekPatterns.done
              : state === "today"
                ? weekPatterns.today
                : state === "rest"
                  ? weekPatterns.rest
                  : weekPatterns.day;
          return <div key={i} className={dayClass} />;
        })}
      </div>
      {showLabels && (
        <div className={weekPatterns.labels}>
          {DAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default WeekProgress;
