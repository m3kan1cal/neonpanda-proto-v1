import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import {
  querySharedPrograms,
  deactivateSharedProgram,
} from "../../utils/apis/sharedProgramApi";
import { useAuthorizeUser } from "../../auth/hooks/useAuthorizeUser";
import { AccessDenied, LoadingScreen } from "../shared/AccessDenied";
import { useToast } from "../../contexts/ToastContext";
import { useNavigationContext } from "../../contexts/NavigationContext";
import CommandPaletteButton from "../shared/CommandPaletteButton";
import QuickStats from "../shared/QuickStats";
import AppFooter from "../shared/AppFooter";
import {
  layoutPatterns,
  containerPatterns,
  buttonPatterns,
  tooltipPatterns,
} from "../../utils/ui/uiPatterns";
import {
  TrashIcon,
  ShareIconTiny,
  ProgramIconTiny,
  WorkoutIconTiny,
} from "../themes/SynthwaveComponents";

// Icons
const ClockIconSmall = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const EyeIconTiny = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const UsersIconTiny = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

function ManageSharedPrograms() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId"); // Preserve coach context if available
  const toast = useToast();
  const [sharedPrograms, setSharedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Navigation context for command palette
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Authorize user access
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate("/training-grounds", { replace: true });
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (userId && isValidUserId) {
      loadSharedPrograms();
    }
  }, [userId, isValidUserId]);

  // Auto-scroll to top when page loads
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  // Close delete modal when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && showDeleteModal) {
        handleDeleteCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteModal]);

  const loadSharedPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await querySharedPrograms(userId);
      // Backend returns { sharedPrograms: [...] }
      setSharedPrograms(response.sharedPrograms || []);
    } catch (err) {
      console.error("Failed to load shared programs:", err);
      setError(err.message || "Failed to load shared programs");
      toast.error("Failed to load shared programs");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (sharedProgramId) => {
    const shareUrl = `${window.location.origin}/shared/programs/${sharedProgramId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(sharedProgramId);
    toast.success("Link copied to clipboard!");

    // Reset copied state after 2 seconds
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteClick = (shared) => {
    setProgramToDelete(shared);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!programToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      await deactivateSharedProgram(userId, programToDelete.sharedProgramId);
      toast.success("Program unshared successfully");
      setShowDeleteModal(false);
      setProgramToDelete(null);
      // Refresh the list
      await loadSharedPrograms();
    } catch (err) {
      console.error("Failed to unshare program:", err);
      toast.error(err.message || "Failed to unshare program");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setProgramToDelete(null);
  };

  const handleViewPreview = (sharedProgramId) => {
    window.open(`/shared/programs/${sharedProgramId}`, "_blank");
  };

  // Calculate stats
  const totalPrograms = sharedPrograms.length;
  const totalDays = sharedPrograms.reduce(
    (sum, p) => sum + (p.programSnapshot?.totalDays || 0),
    0,
  );
  const totalWorkouts = sharedPrograms.reduce((sum, p) => {
    const days = p.programSnapshot?.totalDays || 0;
    const frequency = p.programSnapshot?.trainingFrequency || 0;
    return sum + Math.round((days / 7) * frequency);
  }, 0);
  // Engagement metrics
  const totalViews = sharedPrograms.reduce(
    (sum, p) => sum + (p.viewCount || 0),
    0,
  );
  const totalCopies = sharedPrograms.reduce(
    (sum, p) => sum + (p.copyCount || 0),
    0,
  );

  // Render a shared program card
  const renderSharedProgramCard = (shared) => {
    const programName = shared.programSnapshot?.name || "Untitled Program";
    const totalDays = shared.programSnapshot?.totalDays || 0;
    const frequency = shared.programSnapshot?.trainingFrequency || 0;

    // Truncate name for header
    const headerText =
      programName.length > 35
        ? programName.substring(0, 35) + "..."
        : programName;

    return (
      <div
        key={shared.sharedProgramId}
        className={`${containerPatterns.cardMedium} p-6 relative mb-6`}
      >
        {/* Delete button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(shared);
          }}
          className="absolute top-4 right-4 p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50"
          title="Unshare program"
        >
          <TrashIcon />
        </button>

        {/* Header with pink dot */}
        <div className="flex items-start gap-3 mb-2 pr-16">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            {headerText}
          </h3>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center flex-wrap gap-4 mb-4 pr-16">
          {/* Created Date */}
          <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
            <ClockIconSmall />
            <span>
              {new Date(shared.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          {/* Duration */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-muted">Duration:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {totalDays} days
            </span>
          </div>
          {/* Frequency */}
          {frequency > 0 && (
            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-muted">Frequency:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {frequency}x/week
              </span>
            </div>
          )}
          {/* Views */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <EyeIconTiny className="w-3.5 h-3.5 text-synthwave-text-muted" />
            <span className="text-synthwave-neon-cyan font-medium">
              {shared.viewCount || 0}
            </span>
          </div>
          {/* Copies */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <UsersIconTiny className="w-3.5 h-3.5 text-synthwave-text-muted" />
            <span className="text-synthwave-neon-cyan font-medium">
              {shared.copyCount || 0}
            </span>
          </div>
        </div>

        {/* Share Link Section */}
        <div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={`${window.location.origin}/shared/programs/${shared.sharedProgramId}`}
              readOnly
              className="flex-1 px-4 py-3 bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-xl text-synthwave-text-primary font-rajdhani text-sm cursor-text select-all transition-all duration-300 focus:outline-none focus:border-synthwave-neon-cyan focus:bg-synthwave-bg-primary/50 truncate"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={() => handleCopyLink(shared.sharedProgramId)}
              className="p-2 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors rounded-lg hover:bg-synthwave-neon-cyan/10 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
              aria-label="Copy link"
            >
              {copiedId === shared.sharedProgramId ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => handleViewPreview(shared.sharedProgramId)}
            className={`${buttonPatterns.secondarySmall} text-sm`}
          >
            <span className="flex items-center gap-2">
              <ExternalLinkIcon className="w-4 h-4" />
              View Preview
            </span>
          </button>
          {shared.originalCoachId && (
            <Link
              to={`/training-grounds/programs/dashboard?userId=${userId}&coachId=${shared.originalCoachId}&programId=${shared.originalProgramId}`}
              className={`${buttonPatterns.secondarySmall} text-sm`}
            >
              <span className="flex items-center gap-2">
                <ProgramIconTiny />
                View Program
              </span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  // Render program list with masonry layout
  const renderProgramList = () => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto p-6 border border-synthwave-neon-pink/30 rounded-lg bg-synthwave-bg-card/30">
            <p className="font-rajdhani text-synthwave-neon-pink text-xl font-bold mb-2">
              Error Loading Shared Programs
            </p>
            <p className="font-rajdhani text-synthwave-text-secondary text-lg mb-6">
              {error}
            </p>
            <button
              onClick={loadSharedPrograms}
              className={`${buttonPatterns.primarySmall} text-sm px-6 py-3`}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // Sort by createdAt descending (newest first)
    const sortedPrograms = [...sharedPrograms].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    // Show empty state if no programs
    if (sortedPrograms.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="font-rajdhani text-synthwave-neon-cyan text-base">
            No Shared Programs Yet
          </div>
          <div className="font-rajdhani text-synthwave-text-muted text-sm mt-2">
            Share a program from your Programs page to generate a link others
            can view and copy.
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        {/* Mobile: Single column */}
        <div className="lg:hidden">
          {sortedPrograms.map((program) => (
            <div key={program.sharedProgramId}>
              {renderSharedProgramCard(program)}
            </div>
          ))}
        </div>
        {/* Desktop: Two columns with alternating distribution */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
          {/* Left Column - even indices (0, 2, 4, ...) */}
          <div>
            {sortedPrograms
              .filter((_, index) => index % 2 === 0)
              .map((program) => (
                <div key={program.sharedProgramId}>
                  {renderSharedProgramCard(program)}
                </div>
              ))}
          </div>
          {/* Right Column - odd indices (1, 3, 5, ...) */}
          <div>
            {sortedPrograms
              .filter((_, index) => index % 2 === 1)
              .map((program) => (
                <div key={program.sharedProgramId}>
                  {renderSharedProgramCard(program)}
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // Skeleton loading state
  if (isValidatingUserId || loading) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Header skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-80"></div>
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                <div className="h-6 w-8 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Cards skeleton */}
          <div className="mb-8">
            {/* Mobile: Single column */}
            <div className="lg:hidden">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.cardMedium} p-6 mb-6`}
                >
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                  </div>
                  <div className="h-12 bg-synthwave-text-muted/20 rounded-xl animate-pulse w-full"></div>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Two columns */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
              <div>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  >
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-12 bg-synthwave-text-muted/20 rounded-xl animate-pulse w-full"></div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                      <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                {[3].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  >
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-12 bg-synthwave-text-muted/20 rounded-xl animate-pulse w-full"></div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                      <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own shared programs."}
      />
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-synthwave-bg-tertiary">
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
            Invalid Access
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-8">
            User ID is required to access shared programs.
          </p>
          <button
            onClick={() => navigate("/training-grounds")}
            className={`${buttonPatterns.primary} text-lg px-8 py-3`}
          >
            Return to Training Grounds
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header */}
          <header
            className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
            aria-label="Manage Shared Programs Header"
          >
            {/* Left section: Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="shared-programs-info"
                data-tooltip-content="Manage programs you've shared with others. Copy links, view previews, or unshare programs."
              >
                Shared Programs
              </h1>
            </div>

            {/* Right section: Command Palette Button */}
            <div className="flex items-center gap-3">
              <CommandPaletteButton
                onClick={() => setIsCommandPaletteOpen(true)}
              />
            </div>
          </header>

          {/* Quick Stats */}
          <QuickStats
            stats={[
              {
                icon: ShareIconTiny,
                value: totalPrograms,
                tooltip: {
                  title: "Programs Shared",
                  description: "Programs you've shared with others",
                },
                color: "pink",
                isLoading: loading,
                ariaLabel: `${totalPrograms} shared programs`,
              },
              {
                icon: EyeIconTiny,
                value: totalViews,
                tooltip: {
                  title: "Total Views",
                  description:
                    "How many times your shared programs have been viewed",
                },
                color: "cyan",
                isLoading: loading,
                ariaLabel: `${totalViews} total views`,
              },
              {
                icon: UsersIconTiny,
                value: totalCopies,
                tooltip: {
                  title: "Total Copies",
                  description:
                    "How many times your programs have been copied by others",
                },
                color: "purple",
                isLoading: loading,
                ariaLabel: `${totalCopies} total copies`,
              },
              {
                icon: WorkoutIconTiny,
                value: totalWorkouts,
                tooltip: {
                  title: "Total Workouts",
                  description: "Combined workouts across all shared programs",
                },
                color: "pink",
                isLoading: loading,
                ariaLabel: `${totalWorkouts} total workouts shared`,
              },
            ]}
          />

          {/* Program List */}
          {!error && <div className="mb-8">{renderProgramList()}</div>}
          <AppFooter />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Unshare Program
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-2">
                Are you sure you want to unshare{" "}
                <span className="text-white font-semibold">
                  "{programToDelete?.programSnapshot?.name}"
                </span>
                ?
              </p>
              <p className="font-rajdhani text-sm text-synthwave-text-muted mb-6">
                Anyone with the link will no longer be able to access it.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Unsharing...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Unshare</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltips */}
      <Tooltip
        id="shared-programs-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
    </>
  );
}

export default ManageSharedPrograms;
