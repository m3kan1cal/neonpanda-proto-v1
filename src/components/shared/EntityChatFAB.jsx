import React, { useId, useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { navigationPatterns, tooltipPatterns } from "../../utils/ui/uiPatterns";

const { entityChatFab } = navigationPatterns;

// On coarse pointers (touch), react-tooltip intercepts the first tap to show
// the tooltip and the click handler never fires. Suppress the tooltip on
// touch so the FAB invokes its action immediately. aria-label still provides
// the accessible name.
const useIsCoarsePointer = () => {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarse(mql.matches);
    update();
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  return isCoarse;
};

const EntityChatFAB = ({
  onClick,
  tooltip = "Chat with coach",
  isOpen = false,
}) => {
  const uid = useId();
  const tooltipId = `entity-chat-fab-${uid}`;
  const isCoarsePointer = useIsCoarsePointer();

  return (
    <>
      <div
        className={entityChatFab.container}
        style={entityChatFab.containerStyle}
      >
        <button
          type="button"
          onClick={onClick}
          aria-label={tooltip}
          data-tooltip-id={isCoarsePointer ? undefined : tooltipId}
          data-tooltip-content={isCoarsePointer ? undefined : tooltip}
          data-tooltip-place={isCoarsePointer ? undefined : "left"}
          data-tooltip-hidden={isCoarsePointer ? "true" : undefined}
          className={isOpen ? entityChatFab.buttonActive : entityChatFab.button}
        >
          <img
            src="/images/logo-dark-sm-head.webp"
            alt="NeonPanda AI Coach"
            className="w-10 h-10 object-contain"
            draggable={false}
          />
        </button>
      </div>
      {!isCoarsePointer && (
        <Tooltip
          id={tooltipId}
          {...tooltipPatterns.standardLeft}
          anchorSelect={`[data-tooltip-id="${tooltipId}"]`}
        />
      )}
    </>
  );
};

export default EntityChatFAB;
