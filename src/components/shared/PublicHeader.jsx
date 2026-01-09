// PublicHeader.jsx - Simple header for marketing/public pages
// Minimal navigation focused on conversion and information access

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import {
  containerPatterns,
  iconButtonPatterns,
  buttonPatterns,
} from "../../utils/ui/uiPatterns";
import UserAvatar from "./UserAvatar";
import {
  HomeIconTiny,
  FAQIconTiny,
  AboutIconTiny,
  TechnologyIconTiny,
  ChangelogIconTiny,
  SupportIconTiny,
  CollaborateIconTiny,
  WaitlistIconTiny,
  SignOutIconTiny,
  SettingsIconTiny,
  BlogIconTiny,
} from "../themes/SynthwaveComponents";

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, userProfile, signOut, loading } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Get authenticated user's userId
  const userId = user?.attributes?.["custom:user_id"];

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isMenuOpen) {
        closeMenu();
      }
    };

    const handleClickOutside = (event) => {
      if (isMenuOpen) {
        const menuContainer = document.querySelector("[data-public-menu]");
        if (menuContainer && !menuContainer.contains(event.target)) {
          closeMenu();
        }
      }
    };

    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [isMenuOpen]);

  // Public navigation links (matches SidebarNav utility section)
  const publicLinks = [
    { id: "home", label: "Home", path: "/", icon: HomeIconTiny },
    { id: "faqs", label: "FAQs", path: "/faqs", icon: FAQIconTiny },
    { id: "about", label: "About", path: "/about", icon: AboutIconTiny },
    {
      id: "technology",
      label: "Technology",
      path: "/technology",
      icon: TechnologyIconTiny,
    },
    {
      id: "blog",
      label: "Blog",
      path: "/blog",
      icon: BlogIconTiny,
    },
    {
      id: "changelog",
      label: "Changelog",
      path: "/changelog",
      icon: ChangelogIconTiny,
    },
    {
      id: "support",
      label: "Support",
      path: "/contact?type=support",
      icon: SupportIconTiny,
    },
    {
      id: "collaborate",
      label: "Collaborate",
      path: "/contact?type=collaborate",
      icon: CollaborateIconTiny,
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-synthwave-bg-primary/90 backdrop-blur-sm border-b border-synthwave-neon-cyan/10">
      <div className="px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="hover:opacity-80 transition-opacity duration-300"
        >
          <img
            src="/images/logo-dark-sm.webp"
            alt="NeonPanda"
            className="h-10 w-auto"
          />
        </Link>

        {/* Right Section: User Info + Menu */}
        <div className="flex items-center space-x-4">
          {/* Loading State - Skeleton */}
          {loading && (
            <div className="flex items-center space-x-3">
              {/* Avatar Skeleton */}
              <div className="w-9 h-9 bg-synthwave-text-muted/10 rounded-full animate-pulse"></div>
              {/* Username Skeleton (hidden on mobile) */}
              <div className="hidden sm:block h-4 w-24 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
            </div>
          )}

          {/* Authenticated User Info */}
          {!loading && isAuthenticated && user && (
            <div className="flex items-center space-x-3">
              {/* User Avatar - links to settings */}
              <Link
                to={userId ? `/settings?userId=${userId}` : "/settings"}
                className="hover:opacity-80 transition-opacity duration-200"
                title="Settings"
              >
                <UserAvatar
                  email={user.attributes?.email || user.email}
                  username={
                    userProfile?.displayName ||
                    user.attributes?.preferred_username ||
                    user.attributes?.email ||
                    user.email
                  }
                  size={32}
                />
              </Link>
              {/* Username - also links to settings */}
              <Link
                to={userId ? `/settings?userId=${userId}` : "/settings"}
                className="hidden sm:inline-block text-synthwave-neon-pink font-rajdhani font-medium hover:opacity-80 transition-opacity duration-200"
                title="Settings"
              >
                {userProfile?.displayName ||
                  user.attributes?.preferred_username ||
                  user.attributes?.email ||
                  user.email}
              </Link>
            </div>
          )}

          {/* Sign In Button (unauthenticated only) */}
          {!loading && !isAuthenticated && (
            <button
              onClick={() => navigate("/auth")}
              className="px-3 py-1.5 bg-synthwave-neon-pink text-synthwave-bg-primary font-rajdhani font-medium text-sm uppercase tracking-wide rounded-md transition-all duration-200 hover:bg-synthwave-neon-pink/90 hover:shadow-md hover:shadow-synthwave-neon-pink/30"
            >
              Sign In
            </button>
          )}

          {/* Hamburger Menu */}
          <div className="relative" data-public-menu>
            <button
              onClick={toggleMenu}
              className={iconButtonPatterns.bordered}
              aria-label="Open menu"
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
            {isMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 ${containerPatterns.cardMediumOpaque} animate-fade-in`}
              >
                <div className="py-2">
                  {/* Authenticated: Go to App + Settings */}
                  {isAuthenticated && userId && (
                    <>
                      <Link
                        to={`/coaches?userId=${userId}`}
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-4 py-2.5 font-rajdhani font-medium text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200"
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>Go to App</span>
                      </Link>
                      <Link
                        to={`/settings?userId=${userId}`}
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-4 py-2.5 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200"
                      >
                        <SettingsIconTiny className="w-5 h-5" />
                        <span>Settings</span>
                      </Link>
                      <div className="my-2 h-px bg-gradient-to-r from-transparent via-synthwave-neon-cyan/30 to-transparent" />
                    </>
                  )}

                  {/* Public Links */}
                  <div className="space-y-1">
                    {publicLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.id}
                          to={link.path}
                          onClick={closeMenu}
                          className="flex items-center space-x-3 px-4 py-2.5 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-200"
                        >
                          <Icon className="w-5 h-5" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Authenticated: Sign Out */}
                  {isAuthenticated && (
                    <>
                      <div className="my-2 h-px bg-gradient-to-r from-transparent via-synthwave-neon-cyan/30 to-transparent" />
                      <button
                        onClick={() => {
                          closeMenu();
                          signOut();
                        }}
                        className="flex items-center space-x-3 px-4 py-2.5 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10 transition-all duration-200 w-full text-left"
                      >
                        <SignOutIconTiny className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  )}

                  {/* Unauthenticated: Sign Up */}
                  {!isAuthenticated && (
                    <>
                      <div className="my-2 h-px bg-gradient-to-r from-transparent via-synthwave-neon-pink/30 to-transparent" />
                      <Link
                        to="/auth"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-4 py-2.5 font-rajdhani font-medium text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200"
                      >
                        <WaitlistIconTiny className="w-5 h-5" />
                        <span>Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default PublicHeader;
