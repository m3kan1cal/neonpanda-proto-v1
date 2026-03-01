import { useState } from "react";
import { tabPatterns } from "../utils/uiPatterns";

/**
 * Stateful border-style tab row.
 *
 * Props:
 *   tabs         — array of label strings
 *   defaultIndex — initially active tab index (default 0)
 *   onChange     — (index: number, label: string) => void
 */
export function Tabs({
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
    <div className={`${tabPatterns.tabs} ${className}`.trim()}>
      {tabs.map((tab, i) => (
        <div
          key={tab}
          className={active === i ? tabPatterns.tabActive : tabPatterns.tab}
          onClick={() => handleClick(i)}
        >
          {tab}
        </div>
      ))}
    </div>
  );
}

export default Tabs;
