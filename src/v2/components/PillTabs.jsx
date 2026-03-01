import { useState } from "react";
import { tabPatterns } from "../utils/uiPatterns";

/**
 * Stateful pill-style tab group.
 *
 * Props:
 *   tabs         — array of label strings
 *   defaultIndex — initially active tab (default 0)
 *   onChange     — (index: number, label: string) => void
 */
export function PillTabs({
  tabs = [],
  defaultIndex = 0,
  onChange,
  className = "",
}) {
  const [active, setActive] = useState(defaultIndex);

  const handleClick = (i) => {
    setActive(i);
    onChange?.(i, tabs[i]);
  };

  return (
    <div className={`${tabPatterns.pillTabs} ${className}`.trim()}>
      {tabs.map((tab, i) => (
        <div
          key={tab}
          className={active === i ? tabPatterns.pillActive : tabPatterns.pill}
          onClick={() => handleClick(i)}
        >
          {tab}
        </div>
      ))}
    </div>
  );
}

export default PillTabs;
