import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useNavigationContext } from "../../contexts/NavigationContext";
import { buttonPatterns, iconButtonPatterns, containerPatterns } from "../../utils/ui/uiPatterns";
import {
  isCurrentWeekReport,
  isNewWorkout,
  isRecentConversation,
  getWeekDateRange,
  formatWorkoutCount,
} from "../../utils/dateUtils";
import ReportAgent from "../../utils/agents/ReportAgent";
import WorkoutAgent from "../../utils/agents/WorkoutAgent";
import CoachConversationAgent from "../../utils/agents/CoachConversationAgent";
import {
  FloatingIconButton,
  ModernPopover,
  FloatingIconBar,
} from "./FloatingMenu";
import {
  WorkoutIcon,
  WorkoutIconSmall,
  ChatIcon,
  ChatIconSmall,
  LightningIcon,
  LightningIconSmall,
  ReportIconSmall,
  ChevronRightIcon,
  MenuIcon,
  MemoryIcon,
  CoachIcon,
  CoachIconSmall,
  NewBadge,
} from "../themes/SynthwaveComponents";

/**
 * FloatingMenuManager - A comprehensive floating menu system with agent management
 * Handles conversations, workouts, and reports with their respective agents and state
 */
export const FloatingMenuManager = ({
  userId,
  coachId,
  currentPage = "default",
  className = "",
  onCommandPaletteToggle = null,
  coachData = null,
}) => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { isSidebarCollapsed } = useNavigationContext();

  // Modern popover state
  const [activePopover, setActivePopover] = useState(null);
  const menuIconRef = useRef(null);
  const conversationsIconRef = useRef(null);
  const workoutsIconRef = useRef(null);
  const reportsIconRef = useRef(null);
  const coachIconRef = useRef(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Agent refs
  const reportAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const conversationAgentRef = useRef(null);

  // Agent states
  const [reportAgentState, setReportAgentState] = useState({
    recentReports: [],
    isLoadingRecentItems: false,
    error: null,
  });

  const [workoutAgentState, setWorkoutAgentState] = useState({
    recentWorkouts: [],
    isLoadingRecentItems: false,
    error: null,
  });

  const [conversationAgentState, setConversationAgentState] = useState({
    recentConversations: [],
    isLoadingRecentItems: false,
    error: null,
  });

  // Initialize report agent
  useEffect(() => {
    if (!userId) return;

    if (!reportAgentRef.current) {
      reportAgentRef.current = new ReportAgent(userId, (newState) => {
        setReportAgentState((prevState) => ({
          ...prevState,
          recentReports: newState.recentReports || prevState.recentReports,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          error: newState.error || null,
        }));
      });

      reportAgentRef.current.onError = (error) => {
        console.error("Report agent error:", error);
      };
    }

    return () => {
      if (reportAgentRef.current) {
        reportAgentRef.current.destroy();
        reportAgentRef.current = null;
      }
    };
  }, [userId]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          recentWorkouts: newState.recentWorkouts || [],
          error: newState.error || null,
        }));
      });

      workoutAgentRef.current.onError = (error) => {
        console.error("Workout agent error:", error);
      };

      workoutAgentRef.current.onNewWorkout = (workout) => {
        const title = workoutAgentRef.current.formatWorkoutSummary(
          workout,
          true
        );
        success(`Workout logged: ${title}`);
      };
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId, success]);

  // Initialize conversation agent
  useEffect(() => {
    if (!userId || !coachId) return;

    if (!conversationAgentRef.current) {
      conversationAgentRef.current = new CoachConversationAgent({
        userId,
        coachId,
        conversationId: null,
        onStateChange: (newState) => {
          setConversationAgentState((prevState) => ({
            ...prevState,
            recentConversations: newState.recentConversations || [],
            isLoadingRecentItems: newState.isLoadingRecentItems || false,
            error: newState.error || null,
          }));
        },
        onNavigation: (type, data) => {
          // Handle navigation if needed
        },
        onError: (error) => {
          console.error("Conversation agent error:", error);
        },
      });
    }

    return () => {
      if (conversationAgentRef.current) {
        conversationAgentRef.current.destroy();
        conversationAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Load data when popovers are opened
  useEffect(() => {
    if (
      activePopover === "conversations" &&
      userId &&
      coachId &&
      conversationAgentRef.current
    ) {
      console.info("Loading conversations for popover...", { userId, coachId });
      conversationAgentRef.current.loadRecentConversations(userId, coachId, 10);
    }
  }, [activePopover, userId, coachId]);

  useEffect(() => {
    if (activePopover === "workouts" && userId && workoutAgentRef.current) {
      console.info("Loading workouts for popover...", {
        userId,
        activePopover,
      });
      workoutAgentRef.current.loadRecentWorkouts(10);
    }
  }, [activePopover, userId]);

  useEffect(() => {
    if (activePopover === "reports" && userId && reportAgentRef.current) {
      console.info("Loading recent reports for popover...", {
        userId,
        activePopover,
      });
      reportAgentRef.current.loadRecentReports(10);
    }
  }, [activePopover, userId]);

  // Handlers
  const handleTogglePopover = (popoverType) => {
    if (activePopover === popoverType) {
      // Closing the popup - clear all agent states
      setWorkoutAgentState({
        recentWorkouts: [],
        isLoadingRecentItems: false,
        error: null,
      });
      setConversationAgentState({
        recentConversations: [],
        isLoadingRecentItems: false,
        error: null,
      });
      setReportAgentState({
        recentReports: [],
        isLoadingRecentItems: false,
        error: null,
      });
      setActivePopover(null);
    } else {
      // Opening a different popup
      setActivePopover(popoverType);
    }
  };

  const handleClosePopover = () => {
    // Clear all agent states to prevent stale content flashing
    setWorkoutAgentState({
      recentWorkouts: [],
      isLoadingRecentItems: false,
      error: null,
    });
    setConversationAgentState({
      recentConversations: [],
      isLoadingRecentItems: false,
      error: null,
    });
    setReportAgentState({
      recentReports: [],
      isLoadingRecentItems: false,
      error: null,
    });

    setActivePopover(null);
  };

  const formatConversationDate = (dateString) => {
    if (!dateString) return "Unknown";

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const truncateTitle = (title, maxLength = 40) => {
    if (!title || title.length <= maxLength) return title || "Untitled";
    return title.substring(0, maxLength) + "...";
  };

  const handleConversationClick = (selectedConversationId) => {
    navigate(
      `/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${selectedConversationId}`
    );
  };

  const handleNewConversation = async () => {
    if (
      !conversationAgentRef.current ||
      !userId ||
      !coachId ||
      isCreatingConversation
    )
      return;

    setIsCreatingConversation(true);

    try {
      console.info("FloatingMenuManager: Creating new conversation...", {
        userId,
        coachId,
      });
      const result = await conversationAgentRef.current.createConversation(
        userId,
        coachId
      );

      console.info(
        "FloatingMenuManager: Conversation created successfully:",
        result
      );

      if (result && result.conversationId) {
        console.info(
          "FloatingMenuManager: Navigating to conversation:",
          result.conversationId
        );
        handleClosePopover();
        navigate(
          `/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${result.conversationId}`
        );
      } else {
        console.error(
          "FloatingMenuManager: No conversationId in result:",
          result
        );
        error("Failed to create conversation - no ID returned");
      }
    } catch (error) {
      console.error(
        "FloatingMenuManager: Error creating new conversation:",
        error
      );
      error("Failed to create conversation");
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Render functions
  const renderWorkoutList = () => (
    <div className="space-y-2">
      {workoutAgentState.isLoadingRecentItems ? (
        <div className="space-y-3">
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Workouts
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4 mb-2"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                </div>
                <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse ml-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : workoutAgentState.recentWorkouts.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No workouts found
          </div>
        </div>
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Workouts
          </div>
          {workoutAgentState.recentWorkouts.map((workout) => {
            const isNew = isNewWorkout(workout.completedAt);
            return (
              <div
                key={workout.workoutId}
                onClick={() => {
                  navigate(
                    `/training-grounds/workouts?workoutId=${workout.workoutId}&userId=${userId}&coachId=${coachId}`
                  );
                  handleClosePopover();
                }}
                className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
              >
                {/* NEW badge for workouts within 24 hours */}
                {isNew && <NewBadge />}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium truncate">
                      {workoutAgentRef.current?.formatWorkoutSummary(
                        workout,
                        true
                      ) || "Workout"}
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {workoutAgentRef.current?.formatWorkoutTime(
                        workout.completedAt
                      ) || "Unknown time"}
                      {workout.duration ? ` • ` : ""}
                      <span className="text-synthwave-neon-cyan">
                        {workout.duration
                          ? `${Math.round(workout.duration / 60)}min`
                          : ""}
                      </span>
                      {workout.extractionMetadata?.confidence ? ` • ` : ""}
                      {workout.extractionMetadata?.confidence ? (
                        <span
                          className={`${workoutAgentRef.current?.getConfidenceColorClass(workout.extractionMetadata.confidence) || "text-synthwave-text-secondary"}`}
                        >
                          {workoutAgentRef.current?.getConfidenceDisplay(
                            workout.extractionMetadata.confidence
                          ) || "Unknown"}
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                  <div className="text-synthwave-neon-pink ml-2">
                    <WorkoutIconSmall />
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  const renderReportList = () => (
    <div className="space-y-2">
      {reportAgentState.isLoadingRecentItems ? (
        <div className="space-y-3">
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Reports
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/3 mb-2"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-2/3"></div>
                </div>
                <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse ml-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : reportAgentState.recentReports.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No reports found
          </div>
        </div>
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Reports
          </div>
          {reportAgentState.recentReports.slice(0, 10).map((report) => {
            const isNew = isCurrentWeekReport(report.weekId);
            return (
              <div
                key={report.weekId}
                onClick={() => {
                  navigate(
                    `/training-grounds/reports/weekly?userId=${userId}&weekId=${report.weekId}&coachId=${coachId}`
                  );
                  handleClosePopover();
                }}
                className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
              >
                {/* NEW badge for current week reports */}
                {isNew && <NewBadge />}

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium truncate">
                      Week {report.weekId}
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {getWeekDateRange(report)} •{" "}
                      <span className="text-synthwave-neon-cyan">
                        {formatWorkoutCount(report.analyticsData?.structured_analytics?.metadata?.sessions_completed || report.metadata?.workoutCount || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-synthwave-neon-pink ml-2">
                    <ReportIconSmall />
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  const renderMainActionsMenu = () => (
    <div className="space-y-3">
      {/* CYAN BUTTONS - Management Actions */}
      {/* Training Grounds */}
      <button
        onClick={() => {
          navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
          handleClosePopover();
        }}
        className={`${buttonPatterns.secondaryCompact} w-full space-x-2`}
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
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span>Training Grounds</span>
      </button>

      {/* Manage Workouts */}
      <button
        onClick={() => {
          navigate(
            `/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`
          );
          handleClosePopover();
        }}
        className={`${buttonPatterns.secondaryCompact} w-full space-x-2`}
      >
        <WorkoutIconSmall />
        <span>Manage Workouts</span>
      </button>

      {/* Manage Memories */}
      <button
        onClick={() => {
          navigate(
            `/training-grounds/manage-memories?userId=${userId}&coachId=${coachId}`
          );
          handleClosePopover();
        }}
        className={`${buttonPatterns.secondaryCompact} w-full space-x-2`}
      >
        <MemoryIcon />
        <span>Manage Memories</span>
      </button>

      {/* Manage Conversations */}
      <button
        onClick={() => {
          navigate(
            `/training-grounds/manage-conversations?userId=${userId}&coachId=${coachId}`
          );
          handleClosePopover();
        }}
        className={`${buttonPatterns.secondaryCompact} w-full space-x-2`}
      >
        <ChatIconSmall />
        <span>Manage Conversations</span>
      </button>

      {/* View Reports */}
      <button
        onClick={() => {
          navigate(
            `/training-grounds/reports?userId=${userId}&coachId=${coachId}`
          );
          handleClosePopover();
        }}
        className={`${buttonPatterns.secondaryCompact} w-full space-x-2`}
      >
        <ReportIconSmall />
        <span>View Reports</span>
      </button>

      {/* PINK BUTTONS - Creation/Writing Actions */}
      {/* Log Workout */}
      <button
        onClick={() => {
          if (onCommandPaletteToggle) {
            onCommandPaletteToggle("/log-workout ");
          } else {
            console.info(
              "Log Workout clicked - onCommandPaletteToggle not provided"
            );
          }
          handleClosePopover();
        }}
        className={`${buttonPatterns.primaryCompact} w-full space-x-2`}
      >
        <WorkoutIconSmall />
        <span>Log Workout</span>
      </button>

      {/* Start Conversation */}
      <button
        onClick={() => {
          if (onCommandPaletteToggle) {
            onCommandPaletteToggle("/start-conversation ");
          } else {
            // Fallback to original behavior if no command palette callback
            handleNewConversation();
          }
          handleClosePopover();
        }}
        disabled={isCreatingConversation}
        className={`${buttonPatterns.primaryCompact} w-full space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isCreatingConversation ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Creating...</span>
          </>
        ) : (
          <>
            <ChatIconSmall />
            <span>Start Conversation</span>
          </>
        )}
      </button>

      {/* Save Memory */}
      <button
        onClick={() => {
          if (onCommandPaletteToggle) {
            onCommandPaletteToggle("/save-memory ");
          } else {
            console.info(
              "Save Memory clicked - onCommandPaletteToggle not provided"
            );
          }
          handleClosePopover();
        }}
        className={`${buttonPatterns.primaryCompact} w-full space-x-2`}
      >
        <MemoryIcon />
        <span>Save Memory</span>
      </button>
    </div>
  );

  const renderConversationList = () => (
    <div className="space-y-2">
      {conversationAgentState.isLoadingRecentItems ? (
        <div className="space-y-3">
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Conversations
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-2/3 mb-2"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                </div>
                <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse ml-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : conversationAgentState.recentConversations.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No conversations found
          </div>
        </div>
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Conversations
          </div>
          {conversationAgentState.recentConversations.map((conv) => {
            const isRecent = isRecentConversation(
              conv.metadata?.lastActivity,
              conv.createdAt
            );
            return (
              <div
                key={conv.conversationId}
                onClick={() => handleConversationClick(conv.conversationId)}
                className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
              >
                {/* NEW badge for conversations with recent activity */}
                {isRecent && <NewBadge />}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium truncate">
                      {truncateTitle(conv.title)}
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {formatConversationDate(
                        conv.metadata?.lastActivity || conv.createdAt
                      )}{" "}
                      •{" "}
                      <span className="text-synthwave-neon-cyan">
                        {conv.metadata?.totalMessages || 0} messages
                      </span>
                    </div>
                  </div>
                  <div className="text-synthwave-neon-pink ml-2">
                    <ChevronRightIcon />
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  const renderCoachDetails = () => {
    if (!coachData) {
      return (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No coach data available
          </div>
        </div>
      );
    }

    const config = coachData.rawCoach?.coachConfig;
    if (!config) {
      return (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            Coach configuration not available
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Coach Identity */}
        <div>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Coach Identity
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
              <div className="flex-1 min-w-0">
                <div className="font-rajdhani text-sm text-white font-medium truncate">
                  {config.coach_name?.replace(/_/g, " ") || coachData.name}
                </div>
                <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                  {config.metadata?.created_date
                    ? new Date(
                        config.metadata.created_date
                      ).toLocaleDateString()
                    : "Unknown date"}{" "}
                  •{" "}
                  <span className="text-synthwave-neon-cyan">
                    {config.metadata?.total_conversations || 0} conversations
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Personality & Tone */}
        {(config.selected_personality || config.generated_prompts) && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Coach Personality & Tone
            </div>
            <div className="space-y-3">
              {config.selected_personality?.primary_template && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Primary Personality:{" "}
                      {config.selected_personality.primary_template
                        .replace(/_/g, " ")
                        .toUpperCase()}
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.selected_personality.secondary_influences
                        ?.length > 0 && (
                        <>
                          Influenced by:{" "}
                          <span className="text-synthwave-neon-cyan">
                            {config.selected_personality.secondary_influences
                              .map((inf) => inf.replace(/_/g, " "))
                              .join(", ")}
                          </span>
                        </>
                      )}
                      {config.selected_personality.blending_weights && (
                        <>
                          {" "}
                          • Primary:{" "}
                          <span className="text-synthwave-neon-cyan">
                            {(
                              config.selected_personality.blending_weights
                                .primary * 100
                            ).toFixed(0)}
                            %
                          </span>
                          , Secondary:{" "}
                          <span className="text-synthwave-neon-purple">
                            {(
                              config.selected_personality.blending_weights
                                .secondary * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {config.selected_personality?.selection_reasoning && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Personality Selection Reasoning
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 leading-relaxed">
                      {config.selected_personality.selection_reasoning}
                    </div>
                  </div>
                </div>
              )}
              {config.generated_prompts?.communication_style && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Communication Style Preview
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 leading-relaxed">
                      {config.generated_prompts.communication_style.slice(
                        0,
                        200
                      )}
                      ...
                    </div>
                  </div>
                </div>
              )}
              {config.generated_prompts?.motivation_prompt && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Motivational Approach Preview
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 leading-relaxed">
                      {config.generated_prompts.motivation_prompt.slice(0, 200)}
                      ...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Methodology */}
        {config.selected_methodology && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Training Methodology
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {config.selected_methodology.primary_methodology?.replace(
                      /_/g,
                      " "
                    ) || "Hybrid Training"}
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    <span className="text-synthwave-neon-cyan">
                      {config.selected_methodology.programming_emphasis}
                    </span>{" "}
                    •{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.selected_methodology.periodization_approach}{" "}
                      periodization
                    </span>
                    {config.selected_methodology.creativity_emphasis && (
                      <>
                        {" "}
                        •{" "}
                        <span className="text-synthwave-neon-cyan">
                          {config.selected_methodology.creativity_emphasis.replace(
                            /_/g,
                            " "
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {config.selected_methodology.methodology_reasoning && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Methodology Reasoning
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 leading-relaxed">
                      {config.selected_methodology.methodology_reasoning}
                    </div>
                  </div>
                </div>
              )}
              {config.selected_methodology.workout_innovation && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Workout Innovation
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      Status:{" "}
                      <span className="text-synthwave-neon-cyan">
                        {config.selected_methodology.workout_innovation}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Configuration */}
        {config.technical_config && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Technical Configuration
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {config.technical_config.experience_level?.toUpperCase() ||
                      "INTERMEDIATE"}{" "}
                    • {config.technical_config.training_frequency || 4}{" "}
                    days/week
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {config.technical_config.preferred_intensity?.replace(
                      /_/g,
                      " "
                    ) || "Moderate"}{" "}
                    intensity •{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.technical_config.goal_timeline?.replace(
                        /_/g,
                        " "
                      ) || "1 year"}{" "}
                      timeline
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Profile */}
        {config.metadata?.safety_profile && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Safety & Limitations
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    {config.metadata.safety_profile.experienceLevel ||
                      "Standard"}{" "}
                    Safety Profile
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    Experience Level:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.metadata.safety_profile.experienceLevel ||
                        "Standard"}
                    </span>
                  </div>
                </div>
              </div>
              {config.metadata.safety_profile.contraindications?.length > 0 && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Contraindications (
                      {config.metadata.safety_profile.contraindications.length})
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.metadata.safety_profile.contraindications.map(
                        (contra, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-orange">
                              •
                            </span>
                            <span>{contra.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              {config.metadata.safety_profile.modifications?.length > 0 && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Required Modifications (
                      {config.metadata.safety_profile.modifications.length})
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.metadata.safety_profile.modifications.map(
                        (mod, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-cyan">•</span>
                            <span>{mod.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equipment Available */}
        {(config.metadata?.safety_profile?.equipment ||
          config.technical_config?.equipment_available) && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Available Equipment
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    Equipment Types (
                    {
                      (
                        config.metadata?.safety_profile?.equipment ||
                        config.technical_config?.equipment_available ||
                        []
                      ).length
                    }{" "}
                    total)
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {(
                      config.metadata?.safety_profile?.equipment ||
                      config.technical_config?.equipment_available ||
                      []
                    ).map((equipment, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 mt-1"
                      >
                        <span className="text-synthwave-neon-cyan">•</span>
                        <span>{equipment.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modification Capabilities */}
        {config.modification_capabilities && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Coach Capabilities
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    Programming Adaptability
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    Level:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.modification_capabilities
                        .programming_adaptability || "Medium"}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    Creative Programming
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    Level:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.modification_capabilities.creative_programming ||
                        "Medium"}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    Personality Flexibility
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    Level:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.modification_capabilities
                        .personality_flexibility || "Medium"}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    Workout Variety Emphasis
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    Level:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.modification_capabilities
                        .workout_variety_emphasis || "Medium"}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    Safety Override Level
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    Level:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {config.modification_capabilities.safety_override_level ||
                        "Limited"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Show all enabled modifications */}
              {config.modification_capabilities.enabled_modifications && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Enabled Modifications (
                      {
                        config.modification_capabilities.enabled_modifications
                          .length
                      }{" "}
                      total)
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.modification_capabilities.enabled_modifications.map(
                        (modification, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-cyan">•</span>
                            <span>{modification.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Programming Focus & Specializations */}
        {(config.technical_config?.programming_focus ||
          config.technical_config?.specializations) && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Programming Focus
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    Focus Areas & Specializations
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {config.technical_config.programming_focus?.map(
                      (focus, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 mt-1"
                        >
                          <span className="text-synthwave-neon-cyan">•</span>
                          <span className="text-synthwave-neon-secondary">
                            {focus.replace(/_/g, " ")}
                          </span>
                        </div>
                      )
                    )}
                    {config.technical_config.specializations?.map(
                      (spec, index) => (
                        <div
                          key={`spec-${index}`}
                          className="flex items-center space-x-2 mt-1"
                        >
                          <span className="text-synthwave-neon-cyan">•</span>
                          <span className="text-synthwave-neon-secondary">
                            {spec.replace(/_/g, " ")}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Injury Considerations & Modifications */}
        {(config.technical_config?.injury_considerations ||
          config.metadata?.safety_profile?.modifications) && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Injury Considerations & Modifications
            </div>
            <div className="space-y-3">
              {config.technical_config?.injury_considerations && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Injury Considerations (
                      {config.technical_config.injury_considerations.length})
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.technical_config.injury_considerations.map(
                        (injury, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-orange">
                              •
                            </span>
                            <span>{injury.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              {config.metadata?.safety_profile?.modifications && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Required Modifications (
                      {config.metadata.safety_profile.modifications.length})
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.metadata.safety_profile.modifications.map(
                        (mod, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-cyan">•</span>
                            <span>{mod.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Time Constraints & Session Preferences */}
        {(config.metadata?.safety_profile?.timeConstraints ||
          config.technical_config?.time_constraints) && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Time Constraints & Preferences
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {config.metadata?.safety_profile?.timeConstraints
                      ?.session_duration ||
                      config.technical_config?.time_constraints
                        ?.session_duration ||
                      60}{" "}
                    minute sessions
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {config.metadata?.safety_profile?.timeConstraints
                      ?.morning_preferred && (
                      <>
                        Preferred:{" "}
                        <span className="text-synthwave-neon-cyan">
                          Morning Training
                        </span>
                      </>
                    )}
                    {config.metadata?.safety_profile?.timeConstraints
                      ?.preferred_time && (
                      <>
                        {" "}
                        • Time:{" "}
                        <span className="text-synthwave-neon-purple">
                          {
                            config.metadata.safety_profile.timeConstraints
                              .preferred_time
                          }
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Learning Considerations */}
        {config.metadata?.safety_profile?.learningConsiderations && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Learning Preferences
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    Preferred Learning Methods (
                    {
                      config.metadata.safety_profile.learningConsiderations
                        .length
                    }
                    )
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {config.metadata.safety_profile.learningConsiderations.map(
                      (learning, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 mt-1"
                        >
                          <span className="text-synthwave-neon-cyan">•</span>
                          <span>{learning.replace(/_/g, " ")}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Needs */}
        {(config.metadata?.safety_profile?.recoveryNeeds ||
          config.technical_config?.safety_constraints
            ?.recovery_requirements) && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Recovery Requirements
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    Recovery Focus Areas (
                    {
                      (
                        config.metadata?.safety_profile?.recoveryNeeds ||
                        config.technical_config?.safety_constraints
                          ?.recovery_requirements ||
                        []
                      ).length
                    }
                    )
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {(
                      config.metadata?.safety_profile?.recoveryNeeds ||
                      config.technical_config?.safety_constraints
                        ?.recovery_requirements ||
                      []
                    ).map((recovery, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 mt-1"
                      >
                        <span className="text-synthwave-neon-cyan">•</span>
                        <span>{recovery.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Environmental Factors */}
        {config.metadata?.safety_profile?.environmentalFactors && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Environmental Factors
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    Scheduling Constraints (
                    {config.metadata.safety_profile.environmentalFactors.length}
                    )
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {config.metadata.safety_profile.environmentalFactors.map(
                      (factor, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 mt-1"
                        >
                          <span className="text-synthwave-neon-cyan">•</span>
                          <span>{factor.replace(/_/g, " ")}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Constraints Detail */}
        {config.technical_config?.safety_constraints && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Safety Monitoring
            </div>
            <div className="space-y-3">
              {config.technical_config.safety_constraints
                .contraindicated_exercises && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Contraindicated Exercises (
                      {
                        config.technical_config.safety_constraints
                          .contraindicated_exercises.length
                      }
                      )
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.technical_config.safety_constraints.contraindicated_exercises.map(
                        (exercise, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-orange">
                              •
                            </span>
                            <span>{exercise.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              {config.technical_config.safety_constraints.safety_monitoring && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Safety Monitoring (
                      {
                        config.technical_config.safety_constraints
                          .safety_monitoring.length
                      }
                      )
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.technical_config.safety_constraints.safety_monitoring.map(
                        (monitor, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-cyan">•</span>
                            <span>{monitor.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              {config.technical_config.safety_constraints
                .volume_progression_limit && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Volume Progression Limit
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      Limit:{" "}
                      <span className="text-synthwave-neon-cyan">
                        {
                          config.technical_config.safety_constraints
                            .volume_progression_limit
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Methodology Experience & Preferences */}
        {config.metadata?.methodology_profile && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Methodology Experience
            </div>
            <div className="space-y-3">
              {config.metadata.methodology_profile.experience && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Training Experience (
                      {config.metadata.methodology_profile.experience.length})
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.metadata.methodology_profile.experience.map(
                        (exp, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-cyan">•</span>
                            <span>{exp.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              {config.metadata.methodology_profile.preferences && (
                <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-rajdhani text-sm text-white font-medium">
                      Training Preferences (
                      {config.metadata.methodology_profile.preferences.length})
                    </div>
                    <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                      {config.metadata.methodology_profile.preferences.map(
                        (pref, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mt-1"
                          >
                            <span className="text-synthwave-neon-cyan">•</span>
                            <span>{pref.replace(/_/g, " ")}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coach Creator Session Summary */}
        {config.metadata?.coach_creator_session_summary && (
          <div>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
              Creation Summary
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium">
                    Coach Creator Session
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 leading-relaxed">
                    {config.metadata.coach_creator_session_summary}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        <div>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            System Information
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between ${containerPatterns.infoCard}`}>
              <div className="flex-1 min-w-0">
                <div className="font-rajdhani text-sm text-white font-medium truncate">
                  {config.entityType || "coachConfig"} • v
                  {config.metadata?.version || "1.0"}
                </div>
                <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                  ID:{" "}
                  <span className="text-synthwave-neon-cyan">
                    {config.coach_id?.split("_").pop() || "main"}
                  </span>{" "}
                  • Updated:{" "}
                  {config.updatedAt
                    ? new Date(config.updatedAt).toLocaleDateString()
                    : "Unknown"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Don't render if missing required props
  if (!userId) return null;

  // Position based on sidebar state (4px from sidebar edge)
  const iconBarPosition = isSidebarCollapsed
    ? 'left-[68px]' // 68px = 64px (collapsed sidebar w-16) + 4px margin
    : 'left-[260px]'; // 260px = 256px (expanded sidebar w-64) + 4px margin

  // Popover position (icons + icon width + margin)
  const popoverPosition = isSidebarCollapsed
    ? 'lg:left-[132px]' // 132px = 68px + 64px (icon width + margin)
    : 'lg:left-[324px]'; // 324px = 260px + 64px (icon width + margin)

  return (
    <>
      {/* Modern Floating Icon Bar - HIDDEN: Now integrated into SidebarNav Quick Access section */}
      <FloatingIconBar className={`hidden ${iconBarPosition} ${className}`}>
        <FloatingIconButton
          ref={menuIconRef}
          icon={<MenuIcon />}
          isActive={activePopover === "menu"}
          onClick={() => handleTogglePopover("menu")}
          title="Quick Actions"
        />
        <FloatingIconButton
          ref={conversationsIconRef}
          icon={<ChatIconSmall />}
          isActive={activePopover === "conversations"}
          onClick={() => handleTogglePopover("conversations")}
          title="Recent Conversations"
        />
        <FloatingIconButton
          ref={workoutsIconRef}
          icon={<WorkoutIconSmall />}
          isActive={activePopover === "workouts"}
          onClick={() => handleTogglePopover("workouts")}
          title="Recent Workouts"
        />
        <FloatingIconButton
          ref={reportsIconRef}
          icon={<ReportIconSmall />}
          isActive={activePopover === "reports"}
          onClick={() => handleTogglePopover("reports")}
          title="Recent Reports"
        />
        {coachData && (
          <FloatingIconButton
            ref={coachIconRef}
            icon={<CoachIconSmall />}
            isActive={activePopover === "coach"}
            onClick={() => handleTogglePopover("coach")}
            title="Coach Details"
          />
        )}
      </FloatingIconBar>

      {/* Modern Popovers - Only render content for active popover */}
      <ModernPopover
        isOpen={activePopover === "menu"}
        onClose={handleClosePopover}
        anchorRef={menuIconRef}
        title="Quick Actions"
        positionClass={popoverPosition}
      >
        {activePopover === "menu" && renderMainActionsMenu()}
      </ModernPopover>

      <ModernPopover
        isOpen={activePopover === "conversations"}
        onClose={handleClosePopover}
        anchorRef={conversationsIconRef}
        title="Recent Conversations"
        positionClass={popoverPosition}
      >
        {activePopover === "conversations" && renderConversationList()}
      </ModernPopover>

      <ModernPopover
        isOpen={activePopover === "workouts"}
        onClose={handleClosePopover}
        anchorRef={workoutsIconRef}
        title="Recent Workouts"
        positionClass={popoverPosition}
      >
        {activePopover === "workouts" && renderWorkoutList()}
      </ModernPopover>

      <ModernPopover
        isOpen={activePopover === "reports"}
        onClose={handleClosePopover}
        anchorRef={reportsIconRef}
        title="Recent Reports"
        positionClass={popoverPosition}
      >
        {activePopover === "reports" && renderReportList()}
      </ModernPopover>

      {coachData && (
        <ModernPopover
          isOpen={activePopover === "coach"}
          onClose={handleClosePopover}
          anchorRef={coachIconRef}
          title="Coach Details"
          positionClass={popoverPosition}
        >
          {activePopover === "coach" && renderCoachDetails()}
        </ModernPopover>
      )}
    </>
  );
};

export default FloatingMenuManager;
