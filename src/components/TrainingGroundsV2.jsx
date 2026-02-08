import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { useToast } from "../contexts/ToastContext";
import {
  containerPatterns,
  layoutPatterns,
  badgePatterns,
  tooltipPatterns,
  typographyPatterns,
  listItemPatterns,
} from "../utils/ui/uiPatterns";
import {
  isCurrentWeekReport,
  isNewWorkout,
  isRecentConversation,
  getWeekDateRange,
  formatWorkoutCount,
} from "../utils/dateUtils";
import { getLatestVersions } from "../utils/changelogData";
import {
  NeonBorder,
  NewBadge,
  ConversationIcon,
  ReportIcon,
  WorkoutIcon,
  LightningIcon,
  ChevronRightIcon,
  ProgramIcon,
  MessagesIcon,
  BarChartIcon,
} from "./themes/SynthwaveComponents";
import {
  FullPageLoader,
  CenteredErrorState,
  InlineError,
} from "./shared/ErrorStates";
import CoachHeader from "./shared/CoachHeader";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import QuickStats from "./shared/QuickStats";
import { useNavigationContext } from "../contexts/NavigationContext";
import CoachAgent from "../utils/agents/CoachAgent";
import CoachConversationAgent from "../utils/agents/CoachConversationAgent";
import WorkoutAgent from "../utils/agents/WorkoutAgent";
import ReportAgent from "../utils/agents/ReportAgent";
import { ProgramAgent } from "../utils/agents/ProgramAgent";
import TodaysWorkoutRow from "./programs/TodaysWorkoutRow";
import ProgramList from "./programs/ProgramList";
import { useUpgradePrompts } from "../hooks/useUpgradePrompts";
import { UpgradePrompt } from "./subscription";
import { generateGreeting as fetchAiGreeting } from "../utils/apis/greetingApi";
import { createProgramDesignerSession } from "../utils/apis/programDesignerApi";

// ---------------------------------------------------------------------------
// Helper: static contextual greeting (used as instant fallback)
// ---------------------------------------------------------------------------
function getContextualGreeting({
  todaysWorkouts = {},
  programs = [],
  lastWorkoutDaysAgo = 0,
  totalWorkoutCount = 0,
}) {
  const hour = new Date().getHours();
  let timeGreeting;
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 17) timeGreeting = "Good afternoon";
  else timeGreeting = "Good evening";

  const activePrograms = programs.filter((p) => p.status === "active");
  const workoutCount = Object.values(todaysWorkouts).filter(
    (w) => w.todaysWorkout?.templates?.length > 0,
  ).length;

  if (activePrograms.length === 0) {
    if (totalWorkoutCount === 0) {
      return `${timeGreeting}. Welcome -- get started by designing a training program or chatting with your coach.`;
    }
    return `${timeGreeting}. No active programs right now. Design one to get structured workouts.`;
  }

  if (workoutCount === 0) {
    return `${timeGreeting}. Rest day across ${activePrograms.length === 1 ? "your program" : `your ${activePrograms.length} programs`} -- enjoy the recovery.`;
  }

  const programLabel =
    workoutCount === 1
      ? "1 workout today"
      : `${workoutCount} workouts today across ${activePrograms.length} program${activePrograms.length > 1 ? "s" : ""}`;

  return `${timeGreeting}. You have ${programLabel}.`;
}

/**
 * Get the current time-of-day bucket for the AI greeting request
 */
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function TrainingGroundsV2() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);
  const { success: showSuccess, error: showError } = useToast();

  // Global Command Palette state
  const { setIsCommandPaletteOpen, onCommandPaletteToggle } =
    useNavigationContext();

  const coachAgentRef = useRef(null);
  const conversationAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const reportsAgentRef = useRef(null);
  const programAgentRef = useRef(null);

  // Coach data state
  const [coachData, setCoachData] = useState(null);
  const [isLoadingCoachData, setIsLoadingCoachData] = useState(
    !!(userId && coachId),
  );
  const [coachDataError, setCoachDataError] = useState(null);

  // Conversation state
  const [conversationAgentState, setConversationAgentState] = useState({
    recentConversations: [],
    conversationCount: 0,
    isLoadingRecentItems: false,
    isLoadingConversationCount: !!(userId && coachId),
    isLoadingItem: false,
    error: null,
  });

  // Workout state
  const [workoutState, setWorkoutState] = useState({
    recentWorkouts: [],
    totalWorkoutCount: 0,
    trainingDaysCount: 0,
    lastWorkoutDaysAgo: 0,
    isLoading: false,
    error: null,
  });

  // Reports state
  const [reportsState, setReportsState] = useState({
    recentReports: [],
    isLoadingRecentItems: false,
    isLoadingItem: false,
    error: null,
  });

  // Program data state
  const [programs, setPrograms] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [todaysWorkouts, setTodaysWorkouts] = useState({});
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingTodaysWorkouts, setIsLoadingTodaysWorkouts] = useState(false);
  const [programError, setProgramError] = useState(null);

  // AI greeting state
  const [aiGreeting, setAiGreeting] = useState(null);
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(
    !!(userId && coachId),
  );

  // Component-local UI state
  const [isCompletingRestDay, setIsCompletingRestDay] = useState(false);
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);

  // Pagination state (Show More / Show Less)
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const PAGINATION_LIMIT = 5;

  // Upgrade prompts
  const {
    isPromptOpen: showUpgradePrompt,
    activeTrigger: upgradeTrigger,
    closePrompt: closeUpgradePrompt,
    isPremium,
  } = useUpgradePrompts(userId, {
    messagesCount: conversationAgentState.totalMessages || 0,
    workoutCount: workoutState.totalWorkoutCount || 0,
  });

  // Stable workout state callback
  const handleWorkoutStateChange = useCallback((newState) => {
    const mappedState = {
      ...newState,
      isLoading:
        newState.isLoadingCount ||
        newState.isLoadingRecentItems ||
        newState.isLoadingItem ||
        newState.isLoadingTrainingDays,
    };
    setWorkoutState(mappedState);
  }, []);

  // Scroll to top on load
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

  useEffect(() => {
    if (!isValidatingUserId) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId]);

  // Load coach data
  useEffect(() => {
    if (!userId || !coachId) return;
    const loadCoachData = async () => {
      try {
        setIsLoadingCoachData(true);
        setCoachDataError(null);
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loaded = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(loaded);
        setIsLoadingCoachData(false);
      } catch (error) {
        console.error("Failed to load coach data:", error);
        setCoachDataError(error.message);
        setIsLoadingCoachData(false);
      }
    };
    loadCoachData();
    return () => {
      if (coachAgentRef.current) coachAgentRef.current = null;
    };
  }, [userId, coachId]);

  // Initialize conversation agent
  useEffect(() => {
    if (!conversationAgentRef.current) {
      conversationAgentRef.current = new CoachConversationAgent({
        onStateChange: (newState) => setConversationAgentState(newState),
        onNavigation: (type, data) => {
          if (type === "conversation-created" || type === "view-conversation") {
            navigate(
              `/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`,
            );
          }
        },
        onError: (error) =>
          console.error("CoachConversationAgent error:", error),
      });
    }
    return () => {
      if (conversationAgentRef.current) {
        conversationAgentRef.current.destroy();
        conversationAgentRef.current = null;
      }
    };
  }, []);

  // Initialize workout agent
  useEffect(() => {
    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(
        null,
        handleWorkoutStateChange,
      );
    }
    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [handleWorkoutStateChange]);

  // Initialize reports agent
  useEffect(() => {
    if (!reportsAgentRef.current) {
      reportsAgentRef.current = new ReportAgent(null, (newState) => {
        setReportsState((prev) => ({
          ...prev,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          recentReports: newState.recentReports || [],
          error: newState.error || null,
        }));
      });
    }
    return () => {
      if (reportsAgentRef.current) {
        reportsAgentRef.current.destroy();
        reportsAgentRef.current = null;
      }
    };
  }, []);

  // Initialize program agent
  useEffect(() => {
    if (!programAgentRef.current && userId && coachId) {
      programAgentRef.current = new ProgramAgent(
        userId,
        coachId,
        (newState) => {
          if (newState.programs !== undefined) setPrograms(newState.programs);
          if (newState.activeProgram !== undefined)
            setActiveProgram(newState.activeProgram);
          if (newState.todaysWorkouts !== undefined)
            setTodaysWorkouts(newState.todaysWorkouts);
          if (newState.isLoadingPrograms !== undefined)
            setIsLoadingPrograms(newState.isLoadingPrograms);
          if (newState.isLoadingAllTodaysWorkouts !== undefined)
            setIsLoadingTodaysWorkouts(newState.isLoadingAllTodaysWorkouts);
          if (newState.error !== undefined) setProgramError(newState.error);
        },
      );
    }
    return () => {
      if (programAgentRef.current) {
        programAgentRef.current.destroy();
        programAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Load data when userId / coachId available
  useEffect(() => {
    if (conversationAgentRef.current && userId && coachId) {
      conversationAgentRef.current.loadRecentConversations(userId, coachId, 5);
      conversationAgentRef.current.loadConversationCount(userId, coachId);
    }
    if (workoutAgentRef.current && userId) {
      workoutAgentRef.current.setUserId(userId);
      setWorkoutState((prev) => ({ ...prev, lastCheckTime: Date.now() }));
    }
    if (reportsAgentRef.current && userId) {
      reportsAgentRef.current.setUserId(userId);
      reportsAgentRef.current.loadRecentReports(5);
    }
    if (programAgentRef.current && userId && coachId) {
      programAgentRef.current
        .loadPrograms({ limit: 10, includeStatus: ["active", "paused"] })
        .then(() => {
          // Load today's workout for ALL active programs
          return programAgentRef.current.loadAllTodaysWorkouts();
        })
        .catch((error) => {
          console.error(
            "TrainingGroundsV2: Error loading program data:",
            error,
          );
        });
    }
  }, [userId, coachId]);

  // Fetch AI-generated greeting (from coach's perspective) once data is available
  useEffect(() => {
    // Wait until programs and today's workouts have loaded, and we have both IDs
    if (isLoadingPrograms || isLoadingTodaysWorkouts || !userId || !coachId)
      return;

    const abortController = new AbortController();

    const loadAiGreeting = async () => {
      try {
        const activePrograms = programs.filter((p) => p.status === "active");
        const workoutsWithTemplates = Object.values(todaysWorkouts).filter(
          (w) => w.todaysWorkout?.templates?.length > 0,
        );

        // Extract template names across all today's workouts for richer AI context
        const todaysWorkoutNames = workoutsWithTemplates.flatMap((w) =>
          (w.todaysWorkout?.templates || []).map((t) => t.name).filter(Boolean),
        );

        const result = await fetchAiGreeting(
          userId,
          coachId,
          {
            timeOfDay: getTimeOfDay(),
            activeProgramCount: activePrograms.length,
            todaysWorkoutCount: workoutsWithTemplates.length,
            todaysWorkoutNames:
              todaysWorkoutNames.length > 0 ? todaysWorkoutNames : undefined,
            lastWorkoutDate:
              workoutState.lastWorkoutDaysAgo != null
                ? new Date(
                    Date.now() - workoutState.lastWorkoutDaysAgo * 86400000,
                  )
                    .toISOString()
                    .split("T")[0]
                : undefined,
          },
          abortController.signal,
        );

        if (!abortController.signal.aborted && result?.greeting) {
          setAiGreeting(result.greeting);
        }
      } catch (error) {
        // Silently fall back to static greeting on any error
        if (!abortController.signal.aborted) {
          console.warn(
            "AI greeting unavailable, using static fallback:",
            error.message,
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingGreeting(false);
        }
      }
    };

    loadAiGreeting();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coachId, isLoadingPrograms, isLoadingTodaysWorkouts]);

  // Handlers
  const handleStartNewConversation = async () => {
    if (
      !conversationAgentRef.current ||
      !userId ||
      !coachId ||
      conversationAgentState.isLoadingItem
    )
      return;
    try {
      await conversationAgentRef.current.createConversation(userId, coachId);
      showSuccess("Conversation created!");
    } catch (error) {
      // Error handled by agent
    }
  };

  const handleViewConversation = (conversationId) => {
    if (!conversationId || !userId || !coachId) return;
    navigate(
      `/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${conversationId}`,
    );
  };

  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  const handleSaveCoachName = async (newName) => {
    if (!coachAgentRef.current || !newName || !newName.trim()) return false;
    try {
      await coachAgentRef.current.updateCoachConfig(userId, coachId, {
        coach_name: newName.trim(),
      });
      const loaded = await coachAgentRef.current.loadCoachDetails(
        userId,
        coachId,
      );
      setCoachData(loaded);
      showSuccess("Coach name updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating coach name:", error);
      showError("Failed to update coach name");
      return false;
    }
  };

  const handleCompleteRestDay = async (program) => {
    if (!programAgentRef.current || !program) return;
    try {
      setIsCompletingRestDay(true);
      await programAgentRef.current.completeRestDay(program.programId, {
        notes: "Rest day completed from Training Grounds",
      });
      // Reload all today's workouts after rest day completion
      await programAgentRef.current.loadAllTodaysWorkouts();
      showSuccess("Rest day completed! Moving to next day.");
    } catch (error) {
      console.error("Error completing rest day:", error);
      showError("Failed to complete rest day");
    } finally {
      setIsCompletingRestDay(false);
    }
  };

  const handleDesignProgram = async () => {
    if (!userId || !coachId || isCreatingProgram) return;
    setIsCreatingProgram(true);
    try {
      const result = await createProgramDesignerSession(userId, coachId);
      const { sessionId } = result;
      navigate(
        `/training-grounds/program-designer?userId=${userId}&coachId=${coachId}&programDesignerSessionId=${sessionId}`,
      );
    } catch (error) {
      console.error("Error creating program designer session:", error);
      showError("Failed to create program design session");
      setIsCreatingProgram(false);
    }
  };

  const handleLogWorkout = () => {
    onCommandPaletteToggle("/log-workout ");
  };

  const formatConversationDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const truncateTitle = (title, maxLength = 30) => {
    if (!title || title.length <= maxLength) return title || "Untitled";
    return title.substring(0, maxLength) + "...";
  };

  // Auth redirect
  useEffect(() => {
    if (!isValidatingUserId && (userIdError || !isValidUserId)) {
      navigate("/auth", { replace: true });
    }
  }, [isValidatingUserId, userIdError, isValidUserId, navigate]);

  // Skeleton loading state
  if (isValidatingUserId || userIdError || !isValidUserId) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Header skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-72"></div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* AI Greeting skeleton */}
          <div className="mb-4 max-w-3xl">
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-full mb-2"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-2/3"></div>
          </div>

          {/* QuickStats + Pill buttons skeleton */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0 [&>div]:mt-0 [&>div]:mb-0">
              <QuickStats
                stats={[1, 2, 3, 4, 5, 6, 7].map((i) => ({
                  icon: null,
                  value: 0,
                  tooltip: { title: "", description: "" },
                  color: "cyan",
                  isLoading: true,
                  id: `skeleton-stat-${i}`,
                }))}
              />
            </div>
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-28 bg-synthwave-text-muted/10 border border-synthwave-text-muted/20 rounded-full animate-pulse"
                ></div>
              ))}
            </div>
          </div>

          {/* Today's Lineup section skeleton -- matches TodaysWorkoutRow's internal skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
              <div className="flex-1 h-px bg-synthwave-neon-cyan/10"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2].map((i) => (
                <div key={i} className={containerPatterns.neonGlassSkeleton}>
                  <div className={containerPatterns.neonGlassSkeletonInner}>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                    <div className="h-[3px] bg-synthwave-text-muted/20 rounded-full animate-pulse w-full"></div>
                    <div className="flex-1 min-h-[16px]"></div>
                    <div className="h-12 bg-synthwave-text-muted/20 rounded-[10px] animate-pulse w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Your Highlights section skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
              <div className="flex-1 h-px bg-synthwave-neon-cyan/10"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-10 bg-synthwave-text-muted/10 rounded-lg animate-pulse"></div>
                    <div className="h-10 bg-synthwave-text-muted/10 rounded-lg animate-pulse"></div>
                    <div className="h-10 bg-synthwave-text-muted/10 rounded-lg animate-pulse w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="flex items-center justify-between pt-4">
            <div className="h-4 bg-synthwave-text-muted/10 rounded animate-pulse w-48"></div>
            <div className="h-4 bg-synthwave-text-muted/10 rounded animate-pulse w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userId || !coachId) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message="Both User ID and Coach ID are required to access the Training Grounds."
        buttonText="Back to Coaches"
        onButtonClick={() => navigate(`/coaches?userId=${userId || ""}`)}
        variant="error"
      />
    );
  }

  if (coachDataError) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={coachDataError}
        buttonText="Back to Coaches"
        onButtonClick={() => navigate(`/coaches?userId=${userId || ""}`)}
        variant="error"
      />
    );
  }

  // Build greeting -- use AI greeting if available, otherwise static fallback
  const staticGreeting = getContextualGreeting({
    todaysWorkouts,
    programs,
    lastWorkoutDaysAgo: workoutState.lastWorkoutDaysAgo,
    totalWorkoutCount: workoutState.totalWorkoutCount,
  });
  const greeting = aiGreeting || staticGreeting;

  // ---------------------------------------------------------------------------
  // Masonry section cards (shared between mobile and desktop layouts)
  // ---------------------------------------------------------------------------
  const renderConversationsCard = () => (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Recent Conversations
        </h3>
      </div>
      <div className="space-y-2">
        {conversationAgentState.isLoadingRecentItems ? (
          <div className="space-y-3">
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
          </div>
        ) : conversationAgentState.recentConversations.length > 0 ? (
          <>
            {conversationAgentState.recentConversations
              .slice(
                0,
                showAllConversations
                  ? conversationAgentState.recentConversations.length
                  : PAGINATION_LIMIT,
              )
              .map((conversation) => {
                const isRecent = isRecentConversation(
                  conversation.metadata?.lastActivity,
                  conversation.createdAt,
                );
                return (
                  <div
                    key={conversation.conversationId}
                    onClick={() =>
                      handleViewConversation(conversation.conversationId)
                    }
                    className={`relative ${listItemPatterns.rowPink}`}
                  >
                    {isRecent && <NewBadge />}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-rajdhani text-sm text-white font-medium truncate">
                          {truncateTitle(conversation.title)}
                        </div>
                        <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                          {formatConversationDate(
                            conversation.metadata?.lastActivity ||
                              conversation.createdAt,
                          )}{" "}
                          &bull;{" "}
                          <span className="text-synthwave-neon-cyan">
                            {conversation.metadata?.totalMessages || 0} messages
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 text-synthwave-text-muted group-hover:text-synthwave-neon-pink transition-colors">
                        <ChevronRightIcon />
                      </div>
                    </div>
                  </div>
                );
              })}
            {conversationAgentState.recentConversations.length >
              PAGINATION_LIMIT && (
              <button
                onClick={() => setShowAllConversations((prev) => !prev)}
                className={listItemPatterns.showMoreLink}
              >
                {showAllConversations
                  ? "Show Less"
                  : `Show More (${conversationAgentState.recentConversations.length})`}
              </button>
            )}
          </>
        ) : (
          <div className="text-center pb-2">
            <div className="max-w-xs mx-auto">
              <p className="font-rajdhani text-sm text-synthwave-text-muted mb-4 text-left">
                No conversations yet. Chat with your coach to set goals, log
                workouts, or design programs.
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2">
                  <span className={badgePatterns.numberedCircle}>
                    <span className={badgePatterns.numberedCircleText}>1</span>
                  </span>
                  <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                    Click "Chat" above or use ⌘+K
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkoutHistoryCard = () => (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Workout History
        </h3>
      </div>
      <div className="space-y-2">
        {workoutState.isLoadingRecentItems ? (
          <div className="space-y-3">
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
          </div>
        ) : workoutState.error ? (
          <InlineError
            title="Workout API Error"
            message={workoutState.error}
            variant="error"
            size="medium"
          />
        ) : workoutState.recentWorkouts.length === 0 ? (
          <div className="text-center pb-2">
            <div className="max-w-xs mx-auto">
              <p className="font-rajdhani text-sm text-synthwave-text-muted mb-4 text-left">
                No workouts logged yet. Start tracking to monitor progress.
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2">
                  <span className={badgePatterns.numberedCircle}>
                    <span className={badgePatterns.numberedCircleText}>1</span>
                  </span>
                  <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                    Click "Log Workout" above or use ⌘+K
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {workoutState.recentWorkouts
              .slice(
                0,
                showAllWorkouts
                  ? workoutState.recentWorkouts.length
                  : PAGINATION_LIMIT,
              )
              .map((workout) => {
                const workoutDate = new Date(workout.completedAt);
                const now = new Date();
                const isNew =
                  isNewWorkout(workout.completedAt) || workoutDate > now;
                return (
                  <div
                    key={workout.workoutId}
                    onClick={() =>
                      navigate(
                        `/training-grounds/workouts?workoutId=${workout.workoutId}&userId=${userId}&coachId=${coachId}`,
                      )
                    }
                    className={`relative ${listItemPatterns.rowPink}`}
                  >
                    {isNew && <NewBadge />}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-rajdhani text-sm text-white font-medium truncate">
                          {workoutAgentRef.current?.formatWorkoutSummary(
                            workout,
                            true,
                          ) || "Workout"}
                        </div>
                        <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                          {workoutAgentRef.current?.formatWorkoutTime(
                            workout.completedAt,
                          ) || "Unknown time"}
                          {workout.duration ? " \u2022 " : ""}
                          <span className="text-synthwave-neon-cyan">
                            {workout.duration
                              ? `${Math.round(workout.duration / 60)}min`
                              : ""}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 text-synthwave-text-muted group-hover:text-synthwave-neon-pink transition-colors">
                        <ChevronRightIcon />
                      </div>
                    </div>
                  </div>
                );
              })}
            {workoutState.recentWorkouts.length > PAGINATION_LIMIT && (
              <button
                onClick={() => setShowAllWorkouts((prev) => !prev)}
                className={listItemPatterns.showMoreLink}
              >
                {showAllWorkouts
                  ? "Show Less"
                  : `Show More (${workoutState.recentWorkouts.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderReportsCard = () => (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-3 h-3 bg-synthwave-neon-purple rounded-full flex-shrink-0 mt-2"></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Reports & Insights
        </h3>
      </div>
      <div className="space-y-2">
        {reportsState.isLoadingRecentItems ? (
          <div className="space-y-3">
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
          </div>
        ) : reportsState.error ? (
          <InlineError
            title="Reports API Error"
            message={reportsState.error}
            variant="error"
            size="medium"
          />
        ) : reportsState.recentReports.length === 0 ? (
          <div className="pb-4">
            <div>
              <p className="font-rajdhani text-sm text-synthwave-text-muted mb-4">
                You don't have any reports yet. Reports automatically generate
                weekly to track your progress and provide insights.
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2">
                  <span className={badgePatterns.numberedCircle}>
                    <span className={badgePatterns.numberedCircleText}>1</span>
                  </span>
                  <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                    Log workouts throughout the week
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className={badgePatterns.numberedCircle}>
                    <span className={badgePatterns.numberedCircleText}>2</span>
                  </span>
                  <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                    Reports automatically generate each Sunday
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className={badgePatterns.numberedCircle}>
                    <span className={badgePatterns.numberedCircleText}>3</span>
                  </span>
                  <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                    View reports in "Reports" or here on your dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {reportsState.recentReports
              .slice(
                0,
                showAllReports
                  ? reportsState.recentReports.length
                  : PAGINATION_LIMIT,
              )
              .map((rep) => {
                const isNew = isCurrentWeekReport(rep.weekId);
                return (
                  <div
                    key={rep.weekId}
                    onClick={() =>
                      navigate(
                        `/training-grounds/reports/weekly?userId=${userId}&weekId=${rep.weekId}&coachId=${coachId}`,
                      )
                    }
                    className={`relative ${listItemPatterns.rowCyan}`}
                  >
                    {isNew && <NewBadge />}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-rajdhani text-sm text-white font-medium truncate">
                          Week {rep.weekId}
                        </div>
                        <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                          {getWeekDateRange(rep)} &bull;{" "}
                          <span className="text-synthwave-neon-cyan">
                            {formatWorkoutCount(
                              rep.analyticsData?.structured_analytics?.metadata
                                ?.sessions_completed ||
                                rep.metadata?.workoutCount ||
                                0,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 text-synthwave-text-muted group-hover:text-synthwave-neon-cyan transition-colors">
                        <BarChartIcon />
                      </div>
                    </div>
                  </div>
                );
              })}
            {reportsState.recentReports.length > PAGINATION_LIMIT && (
              <button
                onClick={() => setShowAllReports((prev) => !prev)}
                className={listItemPatterns.showMoreLink}
              >
                {showAllReports
                  ? "Show Less"
                  : `Show More (${reportsState.recentReports.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* ---------------------------------------------------------------- */}
        {/* HEADER                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-2"
          aria-label="Training Grounds Header"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="training-grounds-info"
              data-tooltip-content="Your central hub to track progress, access resources, chat with your coach, and manage your complete fitness journey."
            >
              Training Grounds
            </h1>
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={handleCoachCardClick}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* CONTEXTUAL GREETING                                              */}
        {/* ---------------------------------------------------------------- */}
        {isLoadingGreeting ? (
          <p className="font-rajdhani text-base text-synthwave-text-muted animate-pulse mb-4 max-w-3xl">
            Checking in with your coach...
          </p>
        ) : (
          <p className="font-rajdhani text-base text-synthwave-text-secondary mb-4 max-w-3xl">
            {greeting}
          </p>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* QUICK STATS + QUICK ACTIONS (pills inline on desktop)            */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Override QuickStats container's -mt-4 / mb-6 so it aligns with pills */}
          <div className="flex-1 min-w-0 [&>div]:mt-0 [&>div]:mb-0">
            <QuickStats
              stats={[
                {
                  icon: ConversationIcon,
                  value: conversationAgentState.conversationCount || 0,
                  tooltip: {
                    title: `${conversationAgentState.conversationCount || 0} Chats`,
                    description: "Total coach conversations you've started",
                  },
                  color: "pink",
                  isLoading: conversationAgentState.isLoadingConversationCount,
                  ariaLabel: `${conversationAgentState.conversationCount || 0} total chats`,
                  id: "v2-stat-chats",
                },
                {
                  icon: MessagesIcon,
                  value: conversationAgentState.totalMessages || 0,
                  tooltip: {
                    title: `${conversationAgentState.totalMessages || 0} Messages`,
                    description: "Total messages exchanged with your coaches",
                  },
                  color: "cyan",
                  isLoading: conversationAgentState.isLoadingConversationCount,
                  ariaLabel: `${conversationAgentState.totalMessages || 0} total messages`,
                  id: "v2-stat-messages",
                },
                {
                  icon: WorkoutIcon,
                  value: workoutState.totalWorkoutCount || 0,
                  tooltip: {
                    title: `${workoutState.totalWorkoutCount || 0} Workouts`,
                    description: "Total workouts logged across all coaches",
                  },
                  color: "purple",
                  isLoading: workoutState.isLoadingCount,
                  ariaLabel: `${workoutState.totalWorkoutCount || 0} total workouts`,
                  id: "v2-stat-workouts",
                },
                {
                  icon: WorkoutIcon,
                  value: workoutState.thisWeekWorkoutCount || 0,
                  tooltip: {
                    title: `${workoutState.thisWeekWorkoutCount || 0} This Week`,
                    description:
                      "Workouts completed this week (Sunday-Saturday)",
                  },
                  color: "pink",
                  isLoading: workoutState.isLoadingCount,
                  ariaLabel: `${workoutState.thisWeekWorkoutCount || 0} workouts this week`,
                  id: "v2-stat-this-week",
                },
                {
                  icon: ProgramIcon,
                  value: coachData?.activePrograms || 0,
                  tooltip: {
                    title: `${coachData?.activePrograms || 0} Programs`,
                    description:
                      "Active training programs you're currently following",
                  },
                  color: "cyan",
                  isLoading: isLoadingCoachData,
                  ariaLabel: `${coachData?.activePrograms || 0} active programs`,
                  id: "v2-stat-programs",
                },
                {
                  icon: LightningIcon,
                  value: workoutState.trainingDaysCount || 0,
                  tooltip: {
                    title: `${workoutState.trainingDaysCount || 0} Days`,
                    description: "Your current training streak",
                  },
                  color: "purple",
                  isLoading: workoutState.isLoadingTrainingDays,
                  ariaLabel: `${workoutState.trainingDaysCount || 0} training days`,
                  id: "v2-stat-days",
                },
                {
                  icon: ReportIcon,
                  value: reportsState.recentReports.length || 0,
                  tooltip: {
                    title: `${reportsState.recentReports.length || 0} Reports`,
                    description: "Weekly performance reports generated",
                  },
                  color: "pink",
                  isLoading: reportsState.isLoadingRecentItems,
                  ariaLabel: `${reportsState.recentReports.length || 0} reports`,
                  id: "v2-stat-reports",
                },
              ]}
            />
          </div>

          {/* Quick action pills -- visible on desktop, hidden on mobile (FAB covers mobile) */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleStartNewConversation}
              disabled={conversationAgentState.isLoadingItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan rounded-full font-rajdhani text-xs font-semibold uppercase tracking-wide transition-all duration-200 hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {conversationAgentState.isLoadingItem ? "Creating..." : "Chat"}
            </button>
            <button
              onClick={handleLogWorkout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-synthwave-neon-pink/30 text-synthwave-neon-pink rounded-full font-rajdhani text-xs font-semibold uppercase tracking-wide transition-all duration-200 hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink/50"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Log Workout
            </button>
            <button
              onClick={handleDesignProgram}
              disabled={isCreatingProgram}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-synthwave-neon-purple/30 text-synthwave-neon-purple rounded-full font-rajdhani text-xs font-semibold uppercase tracking-wide transition-all duration-200 hover:bg-synthwave-neon-purple/10 hover:border-synthwave-neon-purple/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              {isCreatingProgram ? "Creating..." : "Design Program"}
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TIER 1 -- TODAY                                                  */}
        {/* ================================================================ */}
        <div className="mb-8">
          {/* Section divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className={typographyPatterns.sectionDivider}>
              Today's Lineup
            </div>
            <div className="flex-1 h-px bg-synthwave-neon-cyan/10"></div>
          </div>

          <TodaysWorkoutRow
            todaysWorkouts={todaysWorkouts}
            programs={programs}
            isLoading={isLoadingPrograms || isLoadingTodaysWorkouts}
            userId={userId}
            coachId={coachId}
            onCompleteRestDay={handleCompleteRestDay}
            isCompletingRestDay={isCompletingRestDay}
          />
        </div>

        {/* ================================================================ */}
        {/* TIER 2 -- YOUR ACTIVITY (2-col grid)                             */}
        {/* ================================================================ */}
        <div className="mb-8">
          {/* Section divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className={typographyPatterns.sectionDivider}>
              Your Highlights
            </div>
            <div className="flex-1 h-px bg-synthwave-neon-cyan/10"></div>
          </div>

          {/* Mobile: Single column */}
          <div className="md:hidden space-y-6">
            {/* Active Programs */}
            <div className={`${containerPatterns.cardMedium} p-6`}>
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Active Programs
                </h3>
              </div>
              <ProgramList
                programs={programs}
                isLoading={isLoadingPrograms}
                userId={userId}
                coachId={coachId}
                maxItems={PAGINATION_LIMIT}
                showAll={showAllPrograms}
                onToggleShowAll={() => setShowAllPrograms((prev) => !prev)}
              />
            </div>

            {/* Conversations */}
            {renderConversationsCard()}

            {/* Workout History */}
            {renderWorkoutHistoryCard()}

            {/* Reports & Insights */}
            {renderReportsCard()}
          </div>

          {/* Desktop: Two columns with alternating distribution (masonry) */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-x-6 md:items-start">
            {/* Left Column -- Programs + Workout History */}
            <div className="space-y-6">
              <div className={`${containerPatterns.cardMedium} p-6`}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Active Programs
                  </h3>
                </div>
                <ProgramList
                  programs={programs}
                  isLoading={isLoadingPrograms}
                  userId={userId}
                  coachId={coachId}
                  maxItems={PAGINATION_LIMIT}
                  showAll={showAllPrograms}
                  onToggleShowAll={() => setShowAllPrograms((prev) => !prev)}
                />
              </div>

              {renderWorkoutHistoryCard()}
            </div>

            {/* Right Column -- Conversations + Reports */}
            <div className="space-y-6">
              {renderConversationsCard()}
              {renderReportsCard()}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* BRANDED FOOTER                                                   */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between py-6 mt-6">
          <div className="flex items-center gap-2">
            <span className="font-rajdhani text-sm text-synthwave-text-muted">
              Powered by
            </span>
            <span className="font-russo text-sm text-synthwave-neon-cyan uppercase tracking-wider">
              NeonPanda
            </span>
            <span className="text-synthwave-text-muted/30 mx-1">/</span>
            <svg
              className="w-3.5 h-3.5 text-synthwave-neon-cyan"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="font-rajdhani text-sm text-synthwave-text-muted">
              {getLatestVersions(1)[0]?.version.replace("Release ", "") || ""}
            </span>
          </div>
          <Link
            to="/changelog"
            className="font-rajdhani text-sm text-synthwave-text-muted hover:text-synthwave-neon-cyan transition-colors"
          >
            Changelog
          </Link>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {!isPremium && showUpgradePrompt && (
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={closeUpgradePrompt}
          userId={userId}
          trigger={upgradeTrigger}
        />
      )}

      {/* Tooltips */}
      <Tooltip
        id="training-grounds-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="coach-card-tooltip"
        {...tooltipPatterns.standard}
        place="bottom"
      />
      <Tooltip
        id="command-palette-button"
        {...tooltipPatterns.standard}
        place="bottom"
      />
    </div>
  );
}

export default TrainingGroundsV2;
