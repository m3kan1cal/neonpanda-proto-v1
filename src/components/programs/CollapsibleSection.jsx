import React, { useId, useState } from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";

const ICON_COLOR = {
  pink: "text-synthwave-neon-pink",
  cyan: "text-synthwave-neon-cyan",
  purple: "text-synthwave-neon-purple",
};

export default function CollapsibleSection({
  title,
  icon: Icon,
  iconColor = "pink",
  defaultCollapsed = false,
  headerExtras,
  id,
  className = "",
  headerClassName = "p-6",
  bodyClassName = "px-6 pb-6",
  children,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const reactId = useId();
  const bodyId = id ? `${id}-content` : `collapsible-${reactId}`;
  const iconColorClass = ICON_COLOR[iconColor] || ICON_COLOR.pink;

  const toggle = () => setCollapsed((prev) => !prev);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className={`${containerPatterns.cardMedium} overflow-hidden ${className}`}>
      <div
        className={`flex items-start justify-between gap-3 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${headerClassName} ${
          collapsed ? "rounded-xl" : "rounded-t-xl"
        }`}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {Icon && (
            <span className={`shrink-0 mt-1 ${iconColorClass}`}>
              <Icon className="w-5 h-5" />
            </span>
          )}
          <h3 className="font-header font-bold text-white text-lg uppercase">
            {title}
          </h3>
          {headerExtras && (
            <div
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {headerExtras}
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 shrink-0 text-synthwave-neon-cyan transition-transform duration-200 ${
            collapsed ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      {!collapsed && (
        <div id={bodyId} className={bodyClassName}>
          {children}
        </div>
      )}
    </div>
  );
}
