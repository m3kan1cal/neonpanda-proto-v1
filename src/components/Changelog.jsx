import React, { useState } from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder, ChevronDownIcon } from './themes/SynthwaveComponents';

// Release icon
const ReleaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

// Collapsible section component (same as WorkoutViewer)
const CollapsibleSection = ({ title, icon, children, defaultOpen = true, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-synthwave-neon-pink/30 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-synthwave-bg-primary/30 hover:bg-synthwave-bg-primary/50 transition-colors duration-200 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-pink">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-sm uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-pink transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-synthwave-bg-card/20">
          {children}
        </div>
      )}
    </div>
  );
};

const changelogEntries = [
  {
    version: "Release v1.1.0",
    date: "2025-08-28",
    changes: {
      added: [
        "Save Memory button to Training Grounds and Floating Menu Manager",
        "Widget totals on Manage Workouts page (total, monthly, weekly, recent)",
        "Command Palette integration for Save Memory functionality",
        "Consistent error message styling across all Manage pages",
        "Changelog page with semantic versioning and collapsible release sections",
        "Navigation dropdown link to access changelog",
        "Professional SVG icons replacing emoji icons in changelog sections",
        "Collapsible release sections matching workout metadata styling"
      ],
      changed: [
        "Command Palette now supports dynamic prefilled commands",
        "Error messages now use consistent styling across Manage pages",
        "Removed unused commands from Command Palette (new conversation, search workouts)",
        "Updated ManageWorkouts page layout and widget functionality",
        "Replaced Log Workout button with widget totals on ManageWorkouts page",
        "Changelog now uses collapsible sections with proper WorkoutViewer styling",
        "Section headers in changelog now match Round header styling from Workouts page",
        "Workout metadata and rounds sections now use small workout icons for consistency",
        "Changelog container width now matches Workouts page layout (max-w-7xl)"
      ],
      fixed: [
        "Memory deletion now properly refreshes widget counts",
        "Workout total count displays correctly on Manage Workouts page",
        "State updates now handle empty arrays correctly",
        "WorkoutAgent now properly loads total workout count for accurate statistics",
        "Changelog navigation and routing properly integrated with breadcrumbs"
      ]
    }
  }
];

function Changelog() {
  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Changelog
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Track the latest updates, improvements, and changes to the platform.
            Stay informed about new features and bug fixes as they're released.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-full overflow-hidden">
            <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
              {changelogEntries.map((entry, index) => (
                <CollapsibleSection
                  key={index}
                  title={`${entry.version} - ${entry.date}`}
                  icon={<ReleaseIcon />}
                  defaultOpen={true}
                >
                  <div className="space-y-6">

              {entry.changes.added && (
                <div className="mb-6">
                  <h3 className="font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Added</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.added.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-synthwave-neon-cyan mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.changes.changed && (
                <div className="mb-6">
                  <h3 className="font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-synthwave-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Changed</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.changed.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-synthwave-neon-purple mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.changes.fixed && (
                <div className="mb-6">
                  <h3 className="font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Fixed</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.fixed.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-synthwave-neon-pink mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          </NeonBorder>
        </div>
      </div>
    </div>
  );
}

export default Changelog;
