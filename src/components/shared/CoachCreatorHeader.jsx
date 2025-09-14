import React from 'react';

function CoachCreatorHeader({ isOnline = true }) {
  const coachName = "Vesper the Coach Creator";
  const coachTitle = "Coach Creator Guide & Mentor";

  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      {/* Coach Avatar with Online Status */}
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-russo font-bold text-lg">
          V
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-synthwave-bg-primary rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Coach Info */}
      <div className="text-left">
        <div className="flex items-center gap-2">
          <h3 className="font-rajdhani font-semibold text-white text-lg">
            {coachName}
          </h3>
          <span className="px-2 py-0.5 bg-green-400/20 text-green-300 rounded-full text-xs font-medium font-rajdhani">
            Online
          </span>
        </div>
        <p className="text-sm text-synthwave-text-secondary font-rajdhani">
          {coachTitle}
        </p>
      </div>
    </div>
  );
}

export default CoachCreatorHeader;
