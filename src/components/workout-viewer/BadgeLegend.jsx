import React from "react";

export const BadgeLegend = () => {
  return (
    <div className="px-6 pb-4 pt-2">
      <div className="flex items-center gap-4 text-xs font-rajdhani text-synthwave-text-secondary">
        <span className="font-semibold uppercase">Badge Colors:</span>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 rounded bg-synthwave-neon-pink/20 text-synthwave-neon-pink uppercase">
            Pink
          </span>
          <span>= Main Work</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 rounded bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan uppercase">
            Cyan
          </span>
          <span>= Accessory</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 rounded bg-synthwave-neon-purple/20 text-synthwave-neon-purple uppercase">
            Purple
          </span>
          <span>= Warmup/Technique</span>
        </div>
      </div>
    </div>
  );
};
