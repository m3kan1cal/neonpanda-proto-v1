import React, { useId } from "react";
import { Tooltip } from "react-tooltip";
import { navigationPatterns, tooltipPatterns } from "../../utils/ui/uiPatterns";

const { entityChatFab } = navigationPatterns;

const EntityChatFAB = ({
  onClick,
  tooltip = "Chat with coach",
  isOpen = false,
}) => {
  const uid = useId();
  const tooltipId = `entity-chat-fab-${uid}`;

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
          data-tooltip-id={tooltipId}
          data-tooltip-content={tooltip}
          data-tooltip-place="left"
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
      <Tooltip
        id={tooltipId}
        {...tooltipPatterns.standardLeft}
        offset={4}
        style={{ ...tooltipPatterns.standardLeft.style, transform: "translateX(-4px)" }}
        anchorSelect={`[data-tooltip-id="${tooltipId}"]`}
      />
    </>
  );
};

export default EntityChatFAB;
