import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { avatarPatterns, iconButtonPatterns, containerPatterns } from '../utils/uiPatterns';
import { useAuth } from '../auth/contexts/AuthContext';
import {
  HomeIconTiny,
  FAQIconTiny,
  ChangelogIconTiny,
  CoachesIconTiny,
  WorkoutIconTiny,
  MemoryIconTiny,
  ReportsIconTiny,
  WaitlistIconTiny,
  CollaborateIconTiny,
  SignOutIconTiny
} from './themes/SynthwaveComponents';

function Navigation({ user, signOut }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user: authUser, loading } = useAuth();

  // Get authenticated user's real userId (no fallback needed)
  const authenticatedUserId = authUser?.attributes?.['custom:user_id'];

  // Extract coachId from current URL's query parameters
  const searchParams = new URLSearchParams(location.search);
  const currentCoachId = searchParams.get("coachId");

  // Determine if we have coach context for showing coach-specific menu items
  const hasCoachContext = currentCoachId && authenticatedUserId;

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
      <div className="px-6 py-3 flex justify-between items-center">
        {/* Logo/Brand */}
        <Link
          to="/"
          className="hover:opacity-80 transition-opacity duration-300"
        >
          <img
            src="/images/logo-light-sm.png"
            alt="NeonPanda"
            className="h-8 w-auto"
          />
        </Link>

        {/* User Info and Navigation Menu */}
        <div className="flex items-center space-x-4">
          {/* Show user info with loading state */}
          {loading && (
            <div className="flex items-center space-x-3 text-synthwave-text-secondary font-rajdhani">
              {/* Avatar skeleton - lighter shade */}
              <div className="w-8 h-8 bg-synthwave-text-muted/10 rounded-full animate-pulse"></div>
              {/* Username skeleton - lighter shade */}
              <div className="h-4 w-20 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
            </div>
          )}
          {!loading && isAuthenticated && user?.attributes && (
            <div className="flex items-center space-x-3 text-synthwave-text-secondary font-rajdhani">
              {/* User Avatar */}
              <div className={avatarPatterns.userSmall}>
                {(user.attributes.preferred_username || user.attributes.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-synthwave-neon-pink font-medium">
                {user.attributes.preferred_username || user.attributes.email}
              </span>
            </div>
          )}

          {/* Navigation Menu */}
          <div className="relative" data-dropdown-container>
            <button
              onClick={toggleDropdown}
              className={`${iconButtonPatterns.bordered.replace('text-synthwave-neon-cyan', 'text-synthwave-neon-pink').replace('border-synthwave-neon-cyan', 'border-synthwave-neon-pink').replace('hover:border-synthwave-neon-cyan', 'hover:border-synthwave-neon-pink').replace('focus:ring-synthwave-neon-cyan', 'focus:ring-synthwave-neon-pink').replace('hover:bg-synthwave-neon-cyan', 'hover:bg-synthwave-neon-pink').replace('p-3', 'p-2.5')}`}
          >
            <svg
              className="w-5 h-5"
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
            <div className={`absolute right-0 mt-2 w-64 z-[10002] ${containerPatterns.cardMediumOpaque}`}>
              <div className="py-2">
                <Link
                  to="/"
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/"
                      ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
                  }`}
                >
                    <HomeIconTiny />
                  <span>Home</span>
                </Link>
                <Link
                  to="/faqs"
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/faqs"
                      ? "text-synthwave-neon-pink bg-synthwave-neon-pink/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10"
                  }`}
                >
                  <FAQIconTiny />
                  <span>FAQs</span>
                </Link>
                <Link
                  to="/changelog"
                  onClick={closeDropdown}
                  className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                    location.pathname === "/changelog"
                      ? "text-synthwave-neon-purple bg-synthwave-neon-purple/10"
                      : "text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10"
                  }`}
                >
                  <ChangelogIconTiny />
                  <span>Changelog</span>
                </Link>
                {/* Secure/Authenticated-only navigation links */}
                {isAuthenticated && authenticatedUserId && (
                  <>
                    <div className="border-t border-synthwave-neon-purple/20 my-2"></div>
                    <Link
                      to={`/coaches?userId=${authenticatedUserId}`}
                      onClick={closeDropdown}
                      className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                        location.pathname === "/coaches"
                          ? "text-synthwave-neon-purple bg-synthwave-neon-purple/10"
                          : "text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10"
                      }`}
                    >
                      <CoachesIconTiny />
                      <span>Your Coaches</span>
                    </Link>
                  </>
                )}

                {/* Coach-specific navigation links - only show when coach context exists */}
                {hasCoachContext && (
                  <>
                    <Link
                      to={`/training-grounds/manage-workouts?userId=${authenticatedUserId}&coachId=${currentCoachId}`}
                      onClick={closeDropdown}
                      className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                        location.pathname === "/training-grounds/manage-workouts"
                          ? "text-synthwave-neon-pink bg-synthwave-neon-pink/10"
                          : "text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10"
                      }`}
                    >
                      <WorkoutIconTiny />
                      <span>Your Workouts</span>
                    </Link>
                    <Link
                      to={`/training-grounds/manage-memories?userId=${authenticatedUserId}&coachId=${currentCoachId}`}
                      onClick={closeDropdown}
                      className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                        location.pathname === "/training-grounds/manage-memories"
                          ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                          : "text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
                      }`}
                    >
                      <MemoryIconTiny />
                      <span>Your Memories</span>
                    </Link>
                    <Link
                      to={`/training-grounds/reports?userId=${authenticatedUserId}&coachId=${currentCoachId}`}
                      onClick={closeDropdown}
                      className={`flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium transition-all duration-300 ${
                        location.pathname === "/training-grounds/reports"
                          ? "text-synthwave-neon-purple bg-synthwave-neon-purple/10"
                          : "text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10"
                      }`}
                    >
                      <ReportsIconTiny />
                      <span>Your Reports</span>
                    </Link>
                  </>
                )}
                <div className="border-t border-synthwave-neon-purple/20 my-2"></div>
                <Link
                  to="/contact?type=waitlist"
                  onClick={closeDropdown}
                  className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-300"
                >
                  <WaitlistIconTiny />
                  <span>Get Early Access</span>
                </Link>
                <Link
                  to="/contact?type=collaborate"
                  onClick={closeDropdown}
                  className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-300"
                >
                  <CollaborateIconTiny />
                  <span>Collaborate</span>
                </Link>

                {/* Sign Out Button - only show when authenticated */}
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      signOut();
                      closeDropdown();
                    }}
                    className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-300 w-full text-left"
                  >
                    <SignOutIconTiny />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
                      )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
