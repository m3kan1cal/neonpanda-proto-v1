import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';

function Navigation() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-synthwave-bg-primary/90 backdrop-blur-sm border-none outline-none mb-0 pb-0">
      <div className="px-8 py-4 flex justify-between items-center">
        {/* Logo/Brand */}
        <Link
          to="/"
          className="font-russo text-xl text-synthwave-neon-cyan hover:text-synthwave-neon-pink transition-colors duration-300 uppercase tracking-wide"
        >
          CoachForge
        </Link>

        {/* Navigation Menu */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 px-4 py-2 border border-synthwave-neon-cyan/30 rounded-lg bg-synthwave-bg-card/50 hover:border-synthwave-neon-cyan hover:bg-synthwave-bg-card/70 transition-all duration-300"
          >
            <span className="font-rajdhani text-synthwave-text-primary font-medium">Menu</span>
            <svg
              className={`w-4 h-4 text-synthwave-neon-cyan transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Overlay to close dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={closeDropdown}
              ></div>

              <div className="absolute right-0 mt-2 w-48 bg-synthwave-bg-card/95 backdrop-blur-sm border border-synthwave-neon-cyan/30 rounded-lg shadow-lg z-20">
                <div className="py-2">
                  <Link
                    to="/"
                    onClick={closeDropdown}
                    className={`block px-4 py-3 font-rajdhani font-medium transition-all duration-300 ${
                      location.pathname === '/'
                        ? 'text-synthwave-neon-cyan bg-synthwave-neon-cyan/10'
                        : 'text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10'
                    }`}
                  >
                    Home
                  </Link>
                                    <Link
                    to="/faqs"
                    onClick={closeDropdown}
                    className={`block px-4 py-3 font-rajdhani font-medium transition-all duration-300 ${
                      location.pathname === '/faqs'
                        ? 'text-synthwave-neon-pink bg-synthwave-neon-pink/10'
                        : 'text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10'
                    }`}
                  >
                    FAQs
                  </Link>
                  <div className="border-t border-synthwave-neon-purple/20 my-2"></div>
                  <a
                    href="#waitlist"
                    onClick={closeDropdown}
                    className="block px-4 py-3 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10 transition-all duration-300"
                  >
                    Join Waitlist
                  </a>
                  <a
                    href="#collaborate"
                    onClick={closeDropdown}
                    className="block px-4 py-3 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10 transition-all duration-300"
                  >
                    Collaborate
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;