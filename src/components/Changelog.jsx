import React, { useState, useEffect } from 'react';
import { containerPatterns, layoutPatterns, typographyPatterns, formPatterns } from '../utils/uiPatterns';
import { changelogEntries, generateVersionAnchor } from '../utils/changelogData';
import { ChevronDownIcon } from './themes/SynthwaveComponents';
import Footer from './shared/Footer';

// Release icon
const ReleaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

// Modern collapsible section component using 2025 UI patterns
const CollapsibleSection = ({ title, icon, children, defaultOpen = true, className = "", id = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className={`${containerPatterns.collapsibleSection} ${className} scroll-mt-24`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={containerPatterns.collapsibleHeader}
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-pink">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-base uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-pink transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className={containerPatterns.collapsibleContent}>
          {children}
        </div>
      )}
    </div>
  );
};

function Changelog() {
  // Auto-scroll to top when page loads, or scroll to anchor if present
  useEffect(() => {
    // Check if there's a hash in the URL
    const hash = window.location.hash;
    if (hash) {
      // Remove the '#' and get the element by ID
      const elementId = hash.substring(1);
      // Small delay to ensure the DOM is ready
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className={typographyPatterns.pageTitle}>
            Changelog
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Track the latest updates, improvements, and changes to the platform.
            Stay informed about new features and bug fixes as they're released.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className={`${containerPatterns.mainContent} h-full overflow-hidden`}>
            <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
              {changelogEntries.map((entry, index) => (
                <CollapsibleSection
                  key={index}
                  id={generateVersionAnchor(entry.version)}
                  title={`${entry.version} - ${entry.date}`}
                  icon={<ReleaseIcon />}
                  defaultOpen={index === 0}
                >
                  <div className="space-y-6">

              {entry.changes.added && (
                <div className="mb-6">
                  <h3 className={formPatterns.subsectionHeader}>
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
                  <h3 className={formPatterns.subsectionHeader}>
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
                  <h3 className={formPatterns.subsectionHeader}>
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

              {entry.changes.removed && (
                <div className="mb-6">
                  <h3 className={formPatterns.subsectionHeader}>
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Removed</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.removed.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-orange-400 mr-2">•</span>
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
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Changelog;
