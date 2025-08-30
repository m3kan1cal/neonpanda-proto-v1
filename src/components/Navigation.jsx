import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

function Navigation() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();

  // Extract userId and coachId from current URL's query parameters
  const searchParams = new URLSearchParams(location.search);
  const currentUserId = searchParams.get("userId") || "user123"; // fallback to default
  const currentCoachId = searchParams.get("coachId") || "coach456"; // fallback to default

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Handle Escape key and outside clicks to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && isDropdownOpen) {
        closeDropdown();
      }
    };

    const handleClickOutside = (event) => {
      if (isDropdownOpen) {
        // Check if the click is outside the dropdown container
        const dropdownContainer = document.querySelector(
          "[data-dropdown-container]"
        );
        if (dropdownContainer && !dropdownContainer.contains(event.target)) {
          closeDropdown();
        }
      }
    };

    // Add event listeners when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      document.addEventListener("click", handleClickOutside, true); // Use capture phase
    }

    // Cleanup event listeners
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [isDropdownOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-synthwave-bg-primary/90 backdrop-blur-sm border-none outline-none mb-0 pb-0">
      <div className="px-8 py-4 flex justify-between items-center">
        {/* Logo/Brand */}
        <Link
          to="/"
          className="hover:opacity-80 transition-opacity duration-300"
        >
          <img
            src="/images/logo-light-sm.png"
            alt="CoachForge"
            className="h-8 w-auto"
          />
        </Link>

        {/* Navigation Menu */}
        <div className="relative" data-dropdown-container>
          <button
            onClick={toggleDropdown}
            className="flex items-center justify-center w-10 h-10 border border-synthwave-neon-cyan/30 rounded-lg bg-synthwave-bg-card/50 hover:border-synthwave-neon-cyan hover:bg-synthwave-bg-card/70 transition-all duration-300"
          >
            <svg
              className="w-5 h-5 text-synthwave-neon-cyan"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-synthwave-bg-card/95 backdrop-blur-sm border border-synthwave-neon-cyan/30 rounded-lg shadow-lg z-[10002]">
              <div className="py-2">
                <Link
                  to="/"
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-3 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/"
                      ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span>Home</span>
                </Link>
                <Link
                  to="/faqs"
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-3 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/faqs"
                      ? "text-synthwave-neon-pink bg-synthwave-neon-pink/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>FAQs</span>
                </Link>
                <Link
                  to="/changelog"
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-3 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/changelog"
                      ? "text-synthwave-neon-purple bg-synthwave-neon-purple/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span>Changelog</span>
                </Link>
                <div className="border-t border-synthwave-neon-purple/20 my-2"></div>
                <Link
                  to={`/coaches${currentUserId ? `?userId=${currentUserId}` : ""}`}
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-3 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/coaches"
                      ? "text-synthwave-neon-purple bg-synthwave-neon-purple/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Coaches</span>
                </Link>
                <div className="border-t border-synthwave-neon-purple/20 my-2"></div>
                <Link
                  to="/contact?type=waitlist"
                  onClick={closeDropdown}
                  className="flex items-center space-x-3 px-4 py-3 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-300"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <span>Join Waitlist</span>
                </Link>
                <Link
                  to="/contact?type=collaborate"
                  onClick={closeDropdown}
                  className="flex items-center space-x-3 px-4 py-3 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-300"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Collaborate</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
