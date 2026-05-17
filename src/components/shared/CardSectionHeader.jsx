import React from "react";

const CardSectionHeader = ({ icon, title, className = "" }) => (
  <div className={`flex items-start space-x-3 mb-4 ${className}`}>
    {icon && (
      <span className="hidden md:inline-block shrink-0 mt-1.5">{icon}</span>
    )}
    <h3 className="font-header font-bold text-white text-lg uppercase">
      {title}
    </h3>
  </div>
);

export default CardSectionHeader;
