import React from "react";

export const ValueDisplay = ({ label, value, dataPath, className = "" }) => {
  if (value === null || value === undefined) return null;

  return (
    <div
      className={`flex justify-between items-center py-1 ${className}`}
      data-json-path={dataPath}
    >
      <span className="text-synthwave-neon-pink font-body text-base font-medium">
        {label}:
      </span>
      <span
        className="text-synthwave-text-primary font-body text-base"
        data-json-value={JSON.stringify(value)}
      >
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </span>
    </div>
  );
};
