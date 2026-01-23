/**
 * SharedProgramPreview - Public preview page for shared programs
 *
 * Displays limited program information with a marketing/app hybrid aesthetic.
 * Context-aware CTAs based on authentication state and ownership.
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getSharedProgram,
  copySharedProgram,
} from "../../utils/apis/sharedProgramApi.js";
import { getCoaches } from "../../utils/apis/coachApi.js";
import { useAuth } from "../../auth";
import { useToast } from "../../contexts/ToastContext";
import {
  containerPatterns,
  layoutPatterns,
  buttonPatterns,
  badgePatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns.js";
import Footer from "../shared/Footer";
import SelectCoachModal from "./SelectCoachModal";

function SharedProgramPreview() {
  const { sharedProgramId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, user } = useAuth();

  // State
  const [sharedProgram, setSharedProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState(null);
  const [showCoachModal, setShowCoachModal] = useState(false);

  // Get user ID from auth context
  const userId = user?.attributes?.["custom:user_id"];

  // Check if current user is the creator
  const isCreator = isAuthenticated && sharedProgram?.creatorUserId === userId;

  // Load shared program data
  useEffect(() => {
    // Create AbortController to cancel request on cleanup (React Strict Mode)
    const abortController = new AbortController();

    const loadSharedProgram = async () => {
      if (!sharedProgramId) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await getSharedProgram(sharedProgramId, {
          signal: abortController.signal,
        });
        setSharedProgram(data);
      } catch (err) {
        // Ignore AbortError - this is expected when the component unmounts
        if (err.name === "AbortError") {
          return;
        }

        console.error("Failed to load shared program:", err);
        setError(
          err.message ||
            "Failed to load program. The link may be invalid or expired.",
        );
      } finally {
        // Only update loading if not aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadSharedProgram();

    // Cleanup: abort the request if component unmounts or sharedProgramId changes
    return () => {
      abortController.abort();
    };
  }, [sharedProgramId]);

  // Load user's coaches when authenticated and not the creator
  useEffect(() => {
    const loadCoaches = async () => {
      if (!isAuthenticated || !userId || isCreator) {
        return;
      }

      try {
        setCoachesLoading(true);
        const coachesData = await getCoaches(userId);
        setCoaches(coachesData.coaches || []);

        // Auto-select if only one coach
        if (coachesData.coaches?.length === 1) {
          setSelectedCoachId(coachesData.coaches[0].coach_id);
        }
      } catch (err) {
        console.error("Failed to load coaches:", err);
        setCoaches([]);
      } finally {
        setCoachesLoading(false);
      }
    };

    if (sharedProgram) {
      loadCoaches();
    }
  }, [isAuthenticated, userId, isCreator, sharedProgram]);

  // Handle copy program
  const handleCopyProgram = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    // Validate userId is available
    if (!userId) {
      console.error("userId is undefined. User attributes:", user?.attributes);
      toast.error(
        "Unable to get user information. Please try refreshing the page.",
      );
      return;
    }

    // Wait for coaches to finish loading
    if (coachesLoading) {
      toast.error("Please wait while we load your coaches.");
      return;
    }

    // If user has no coaches, redirect to coach creator
    if (coaches.length === 0) {
      toast.error("Please create a coach first before copying programs.");
      navigate(`/coach-creator?userId=${userId}`);
      return;
    }

    // If user has multiple coaches, show modal to select
    if (coaches.length > 1 && !selectedCoachId) {
      setShowCoachModal(true);
      return;
    }

    // Use selected coach or the only coach
    const coachId = selectedCoachId || coaches[0]?.coach_id;
    await executeCopyProgram(coachId);
  };

  // Execute the actual copy program action
  const executeCopyProgram = async (coachId) => {
    try {
      setIsCopying(true);

      const result = await copySharedProgram(userId, sharedProgramId, coachId);

      toast.success("Program copied successfully!");

      // Navigate to the new program dashboard
      navigate(
        `/training-grounds/programs/dashboard?userId=${userId}&coachId=${coachId}&programId=${result.programId}`,
      );
    } catch (err) {
      console.error("Failed to copy program:", err);
      toast.error(err.message || "Failed to copy program. Please try again.");
    } finally {
      setIsCopying(false);
    }
  };

  // Handle coach selection from modal
  const handleCoachSelect = async (coachId) => {
    setSelectedCoachId(coachId);
    await executeCopyProgram(coachId);
    // Modal will close after navigation
  };

  // Close coach modal
  const handleCloseCoachModal = () => {
    setShowCoachModal(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={layoutPatterns.pageContainer}>
        {/* Hero Section Skeleton */}
        <section className={`${layoutPatterns.hero} relative overflow-hidden`}>
          <div className="relative z-10 max-w-5xl mx-auto">
            {/* Duration badge skeleton */}
            <div className="flex justify-center mb-4">
              <div className="h-6 w-32 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            </div>

            {/* Program name skeleton */}
            <div className="flex justify-center mb-6">
              <div className="h-12 w-96 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            </div>

            {/* Attribution skeleton */}
            <div className="flex justify-center mb-4">
              <div className="h-6 w-64 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            </div>

            {/* Quick stats skeleton */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="h-5 w-24 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              <div className="h-5 w-28 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              <div className="h-5 w-32 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            </div>

            {/* Button skeleton */}
            <div className="flex justify-center">
              <div className="h-12 w-40 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Main Content Skeleton */}
        <section className="py-16 px-8">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* The Game Plan skeleton */}
            <div className={containerPatterns.boldGradient}>
              <div className="h-8 w-48 bg-synthwave-text-muted/20 rounded animate-pulse mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-4/5"></div>
              </div>
            </div>

            {/* Program Intel skeleton */}
            <div className={containerPatterns.mediumGlass}>
              <div className="h-8 w-48 bg-synthwave-text-muted/20 rounded animate-pulse mb-6"></div>
              <div className="space-y-6">
                <div>
                  <div className="h-6 w-40 bg-synthwave-text-muted/20 rounded animate-pulse mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  </div>
                </div>
                <div>
                  <div className="h-6 w-40 bg-synthwave-text-muted/20 rounded animate-pulse mb-3"></div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-6 w-20 bg-synthwave-text-muted/20 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Training Phases skeleton */}
            <div>
              <div className="h-8 w-56 bg-synthwave-text-muted/20 rounded animate-pulse mb-8 mx-auto"></div>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={containerPatterns.mediumGlass}>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-6 w-64 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                          <div className="h-4 w-32 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section skeleton */}
            <div className={`${containerPatterns.boldGradient} text-center`}>
              <div className="h-8 w-96 bg-synthwave-text-muted/20 rounded animate-pulse mb-6 mx-auto"></div>
              <div className="space-y-2 mb-8 max-w-2xl mx-auto">
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4 mx-auto"></div>
              </div>
              <div className="flex justify-center">
                <div className="h-12 w-40 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className="min-h-screen flex items-center justify-center px-8">
          <div
            className={`${containerPatterns.mediumGlassPink} max-w-md text-center`}
          >
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-4`}
            >
              Program Not Found
            </h2>
            <p className="font-rajdhani text-synthwave-text-secondary mb-6">
              {error}
            </p>
            <Link to="/" className={buttonPatterns.secondary}>
              Go to Homepage
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { programSnapshot, sampleWorkouts } = sharedProgram;

  // Calculate weeks from days
  const weeks = Math.ceil(programSnapshot.totalDays / 7);

  // Render copy button
  const renderCopyButton = () => {
    // If user is the creator, show link to their programs
    if (isCreator) {
      return (
        <Link
          to={`/training-grounds/programs?userId=${userId}`}
          className={buttonPatterns.primary}
        >
          View Programs
        </Link>
      );
    }

    // If authenticated non-creator, show copy button with functionality
    if (isAuthenticated) {
      const isDisabled = isCopying || coachesLoading || coaches.length === 0;

      return (
        <button
          onClick={handleCopyProgram}
          disabled={isDisabled}
          className={`${buttonPatterns.primary} ${isDisabled ? "opacity-75 cursor-not-allowed" : ""}`}
        >
          {isCopying ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Copying...
            </span>
          ) : coachesLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Loading Coaches...
            </span>
          ) : (
            "Copy Program"
          )}
        </button>
      );
    }

    // If not authenticated, show link to sign in/sign up
    return (
      <Link to="/auth" className={buttonPatterns.primary}>
        Copy Program
      </Link>
    );
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      {/* Hero Section with Background Image */}
      <section className={`${layoutPatterns.hero} relative overflow-hidden`}>
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/images/blog-posts/home-gym.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-synthwave-bg-primary/70 via-synthwave-bg-primary/65 to-synthwave-bg-primary/80"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Duration badge */}
          <div className="flex justify-center mb-4">
            <span className={`${badgePatterns.cyanBorder} text-sm`}>
              {weeks} Week Program
            </span>
          </div>

          {/* Program name */}
          <h1 className={typographyPatterns.heroTitle}>
            {programSnapshot.name}
          </h1>

          {/* Attribution */}
          <p className={`${typographyPatterns.heroSubtitle} mb-4`}>
            Shared by{" "}
            <span className="text-synthwave-neon-pink font-semibold">
              @{sharedProgram.creatorUsername}
            </span>
            {programSnapshot.coachNames?.length > 0 && (
              <>
                {" "}
                • Created with{" "}
                <span className="text-synthwave-neon-cyan font-semibold">
                  {programSnapshot.coachNames.join(", ")}
                </span>
              </>
            )}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-8 text-sm font-rajdhani mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-pink rounded-full"></div>
              <span className="text-synthwave-text-secondary">
                {programSnapshot.totalDays} Days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full"></div>
              <span className="text-synthwave-text-secondary">
                {programSnapshot.trainingFrequency} Days/Week
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-purple rounded-full"></div>
              <span className="text-synthwave-text-secondary">
                {programSnapshot.phases?.length || 0} Training Phases
              </span>
            </div>
          </div>

          {/* Top Copy Button */}
          <div className="flex justify-center">{renderCopyButton()}</div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* The Game Plan */}
          <div className={containerPatterns.boldGradient}>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-4`}
            >
              The Game Plan
            </h2>
            <p
              className={`${typographyPatterns.description} text-lg leading-relaxed`}
            >
              {programSnapshot.description}
            </p>
          </div>

          {/* Program Intel */}
          <div className={containerPatterns.mediumGlass}>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
            >
              Program Intel
            </h2>

            <div className="space-y-6">
              {/* Training Goals */}
              <div>
                <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
                  Training Goals
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  {Array.isArray(programSnapshot.trainingGoals)
                    ? programSnapshot.trainingGoals.join(" ")
                    : programSnapshot.trainingGoals}
                </p>
              </div>

              {/* Equipment */}
              <div>
                <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
                  Equipment Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {programSnapshot.equipmentConstraints?.map(
                    (equipment, index) => (
                      <span
                        key={index}
                        className={`${badgePatterns.workoutDetail} text-base`}
                      >
                        {equipment}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Training Phases */}
          <div>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-8 text-center`}
            >
              Training Phases
            </h2>

            <div className="space-y-6">
              {programSnapshot.phases?.map((phase, index) => {
                const colors = [
                  {
                    text: "text-synthwave-neon-pink",
                    bg: "bg-synthwave-neon-pink/10",
                    border: "border-synthwave-neon-pink/30",
                  },
                  {
                    text: "text-synthwave-neon-cyan",
                    bg: "bg-synthwave-neon-cyan/10",
                    border: "border-synthwave-neon-cyan/30",
                  },
                  {
                    text: "text-synthwave-neon-purple",
                    bg: "bg-synthwave-neon-purple/10",
                    border: "border-synthwave-neon-purple/30",
                  },
                ][index % 3];

                return (
                  <div
                    key={phase.phaseId || index}
                    className={containerPatterns.mediumGlass}
                  >
                    <div className="p-6">
                      {/* Phase header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`w-10 h-10 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center flex-shrink-0`}
                        >
                          <span
                            className={`font-inter font-bold ${colors.text}`}
                          >
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`${typographyPatterns.cardTitle} ${colors.text}`}
                          >
                            {phase.name}
                          </h3>
                          <p className="font-rajdhani text-synthwave-text-muted text-sm">
                            Days {phase.startDay} - {phase.endDay} (
                            {phase.durationDays} days)
                          </p>
                        </div>
                      </div>

                      {/* Phase description - FULL, not truncated */}
                      <p className={`${typographyPatterns.cardText} mb-4`}>
                        {phase.description}
                      </p>

                      {/* Focus areas - standard badges */}
                      {phase.focusAreas?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {phase.focusAreas.map((focus, idx) => (
                            <span
                              key={idx}
                              className={badgePatterns.workoutDetail}
                            >
                              {focus}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sample Workouts */}
          {sampleWorkouts && sampleWorkouts.length > 0 && (
            <div>
              <h2
                className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-8 text-center`}
              >
                Sample Workouts
              </h2>

              <div className="space-y-6">
                {sampleWorkouts.map((workout, index) => (
                  <div
                    key={workout.templateId || index}
                    className={containerPatterns.cardMedium}
                  >
                    <div className="p-6">
                      {/* Workout Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 rounded-full bg-synthwave-neon-cyan" />
                            <h3 className="font-russo text-lg font-bold uppercase text-white">
                              {workout.name}
                            </h3>
                            {workout.metadata?.difficulty && (
                              <span
                                className={`${
                                  workout.metadata.difficulty === "advanced"
                                    ? badgePatterns.pink
                                    : workout.metadata.difficulty ===
                                        "intermediate"
                                      ? badgePatterns.purple
                                      : badgePatterns.cyan
                                } uppercase`}
                              >
                                {workout.metadata.difficulty}
                              </span>
                            )}
                          </div>

                          {/* Metadata Row */}
                          <div className="flex items-center flex-wrap gap-4">
                            {workout.estimatedDuration && (
                              <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
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
                                <span>{workout.estimatedDuration} min</span>
                              </div>
                            )}
                            {workout.type && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-muted">
                                  Type:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium capitalize">
                                  {workout.type}
                                </span>
                              </div>
                            )}
                            {workout.scoringType && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-muted">
                                  Scoring:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workout.scoringType
                                    .split("_")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1),
                                    )
                                    .join(" ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Workout Description */}
                      {workout.description && (
                        <div className="mb-4">
                          <div
                            className={`${containerPatterns.workoutDescriptionEditable} text-sm`}
                          >
                            {workout.description}
                          </div>
                        </div>
                      )}

                      {/* Equipment, Exercises & Focus Areas */}
                      <div className="space-y-4">
                        {workout.equipment && workout.equipment.length > 0 && (
                          <div>
                            <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                              Equipment Needed
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {workout.equipment.map((item, i) => (
                                <span
                                  key={i}
                                  className={badgePatterns.workoutDetail}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {workout.prescribedExercises &&
                          workout.prescribedExercises.length > 0 && (
                            <div>
                              <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                                Prescribed Exercises
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {workout.prescribedExercises.map(
                                  (exercise, i) => (
                                    <span
                                      key={i}
                                      className={badgePatterns.workoutDetail}
                                    >
                                      {exercise}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {workout.metadata?.focusAreas &&
                          workout.metadata.focusAreas.length > 0 && (
                            <div>
                              <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                                Focus Areas
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {workout.metadata.focusAreas.map((area, i) => (
                                  <span
                                    key={i}
                                    className={badgePatterns.workoutDetail}
                                  >
                                    {area}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className={`${containerPatterns.boldGradient} text-center`}>
            <h2 className={`${typographyPatterns.sectionTitle} mb-6`}>
              Ready to{" "}
              <span className="text-synthwave-neon-pink">Transform</span> Your
              Training?
            </h2>

            {/* Description text - conditional based on creator status */}
            {isCreator ? (
              <p
                className={`${typographyPatterns.description} mb-8 max-w-2xl mx-auto`}
              >
                This is your program. You can view and manage it from your
                dashboard.
              </p>
            ) : (
              <p
                className={`${typographyPatterns.description} mb-8 max-w-2xl mx-auto`}
              >
                {isAuthenticated
                  ? "Copy this program to your account and start training today. Your AI coach will help you customize it to your needs."
                  : "Sign up for NeonPanda to copy this program and get personalized coaching from your own AI training partner."}
              </p>
            )}

            {/* CTA button */}
            <div className="flex justify-center">{renderCopyButton()}</div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Coach Selection Modal */}
      {showCoachModal && (
        <SelectCoachModal
          coaches={coaches}
          onSelectCoach={handleCoachSelect}
          onClose={handleCloseCoachModal}
          isLoading={isCopying}
          programName={programSnapshot?.name || "this program"}
        />
      )}
    </div>
  );
}

export default SharedProgramPreview;
