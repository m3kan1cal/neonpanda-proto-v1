import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from "../../auth/hooks/useAuthorizeUser";
import { AccessDenied, LoadingScreen } from "../shared/AccessDenied";
import {
  buttonPatterns,
  containerPatterns,
  layoutPatterns,
  tooltipPatterns,
  typographyPatterns,
  messagePatterns,
  iconButtonPatterns,
} from "../../utils/ui/uiPatterns";
import { Tooltip } from "react-tooltip";
import CompactCoachCard from "../shared/CompactCoachCard";
import CommandPaletteButton from "../shared/CommandPaletteButton";
import { InlineEditField } from "../shared/InlineEditField";
import { useNavigationContext } from "../../contexts/NavigationContext";
import {
  NeonBorder,
  NewBadge,
  TrashIcon,
  ProgramIcon,
  WorkoutIconSmall,
  CalendarIcon,
  TargetIcon,
  SparkleIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  ArrowRightIcon,
  HomeIcon,
  ChevronRightIcon,
} from "../themes/SynthwaveComponents";

// Three-dot vertical menu icon
const EllipsisVerticalIcon = () => (
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
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
);

const EditIcon = () => (
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
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);
import { ProgramAgent } from "../../utils/agents/ProgramAgent";
import CoachAgent from "../../utils/agents/CoachAgent";
import { useToast } from "../../contexts/ToastContext";
import { PROGRAM_STATUS } from "../../constants/conversationModes";
import { createProgramDesignerSession } from "../../utils/apis/programDesignerApi";

// Helper function to check if a program is new (created within last 7 days)
const isNewProgram = (createdDate, programId) => {
  // Try to use createdDate, or extract from programId
  let dateToCheck = createdDate;
  if (!dateToCheck && programId) {
    dateToCheck = extractTimestampFromProgramId(programId);
  }
  if (!dateToCheck) return false;

  const programDate = new Date(dateToCheck);
  if (isNaN(programDate.getTime())) return false;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return programDate >= sevenDaysAgo;
};

// Helper function to extract timestamp from programId
const extractTimestampFromProgramId = (programId) => {
  if (!programId) return null;
  // Format: program_{userId}_{timestamp}_{shortId}
  const parts = programId.split("_");
  if (parts.length >= 3) {
    const timestamp = parseInt(parts[parts.length - 2]);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }
  return null;
};

// Helper function to format dates
const formatDate = (dateString, fallbackProgramId = null) => {
  // If no date string, try to extract from programId
  if (!dateString && fallbackProgramId) {
    dateString = extractTimestampFromProgramId(fallbackProgramId);
  }

  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    return "Unknown";
  }
};

// Helper function to format coach names (remove underscores)
const formatCoachName = (name) => {
  if (!name) return "Unknown";
  return name.replace(/_/g, " ");
};

// Helper function to get progress percentage
const getProgressPercentage = (program) => {
  if (!program.totalDays || program.totalDays === 0) return 0;
  const currentDay = program.currentDay || 1;
  return Math.round((currentDay / program.totalDays) * 100);
};

// Helper function to format last activity
const formatLastActivity = (dateString) => {
  if (!dateString) return "Never";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown";

    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;

    // For older dates, show actual date
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (error) {
    return "Unknown";
  }
};

// Vesper coach data - static coach for coach creator/program guidance
const vesperCoachData = {
  coach_id: "vesper-coach-creator",
  coach_name: "Vesper_the_Coach_Creator",
  name: "Vesper",
  avatar: "V",
  metadata: {
    title: "Training Program Guide",
    description: "Your guide through program creation and management",
  },
};

function ManagePrograms() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId"); // Add coachId from URL
  const toast = useToast();

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);
  const programAgentsRef = useRef({}); // Map of coachId -> ProgramAgent
  const coachAgentRef = useRef(null);

  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Agent state (managed by ProgramAgent)
  const [programState, setProgramState] = useState({
    programs: [],
    activePrograms: [],
    pausedPrograms: [],
    completedPrograms: [],
    isLoadingPrograms: false,
    isLoadingCoaches: false,
    isUpdating: false,
    error: null,
  });

  // Coaches state
  const [coaches, setCoaches] = useState([]);
  const [coachData, setCoachData] = useState(null); // Current coach data
  const [isLoadingCoachData, setIsLoadingCoachData] = useState(false);

  // Local loading states - track both programId and action type
  const [updatingProgram, setUpdatingProgram] = useState({
    programId: null,
    action: null,
  });
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingProgramId, setEditingProgramId] = useState(null);

  // In-progress sessions state
  const [inProgressSessions, setInProgressSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [retryingSessionId, setRetryingSessionId] = useState(null);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const previousBuildingSessionsRef = useRef(new Set()); // Track previous building sessions

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest(".actions-menu-container")) {
        setOpenMenuId(null);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [openMenuId]);

  // Close delete modal on Escape key and cancel inline edit
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        // Cancel inline edit if active
        if (editingProgramId) {
          setEditingProgramId(null);
          return;
        }
        // Close delete modal if open
        if (showDeleteModal && !isDeleting) {
          handleCancelDelete();
        }
      }
    };

    if (showDeleteModal || editingProgramId) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [showDeleteModal, isDeleting, editingProgramId]);

  // Load coach data if coachId is provided
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoach = async () => {
      setIsLoadingCoachData(true);
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent({ userId });
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(loadedCoachData);
      } catch (error) {
        console.error("Error loading coach data:", error);
      } finally {
        setIsLoadingCoachData(false);
      }
    };

    loadCoach();
  }, [userId, coachId]);

  // Initialize coach agent and fetch coaches
  useEffect(() => {
    if (!userId) return;

    const loadCoachesAndPrograms = async () => {
      setProgramState((prev) => ({
        ...prev,
        isLoadingCoaches: true,
        isLoadingPrograms: true,
      }));

      try {
        // Initialize coach agent if needed
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent({ userId });
        }

        // Fetch user's coaches
        const coachesData = await coachAgentRef.current.loadCoaches();
        setCoaches(coachesData || []);

        // If no coaches, set empty state
        if (!coachesData || coachesData.length === 0) {
          setProgramState({
            programs: [],
            activePrograms: [],
            pausedPrograms: [],
            completedPrograms: [],
            isLoadingPrograms: false,
            isLoadingCoaches: false,
            isUpdating: false,
            error: null,
          });
          return;
        }

        // Fetch programs for each coach
        const programPromises = coachesData.map(async (coach) => {
          const coachId = coach.coach_id;

          // Create a program agent for this coach if it doesn't exist
          if (!programAgentsRef.current[coachId]) {
            programAgentsRef.current[coachId] = new ProgramAgent(
              userId,
              coachId,
              () => {},
            );
          }

          try {
            const response = await programAgentsRef.current[
              coachId
            ].loadPrograms({});
            // Programs already have coachIds and coachNames arrays from the API
            return response.programs || [];
          } catch (error) {
            console.error(
              `Error loading programs for coach ${coachId}:`,
              error,
            );
            return [];
          }
        });

        // Wait for all program fetches to complete
        const programArrays = await Promise.all(programPromises);
        const allPrograms = programArrays.flat();

        // Categorize programs by status
        const activePrograms = allPrograms.filter(
          (p) => p.status === PROGRAM_STATUS.ACTIVE,
        );
        const pausedPrograms = allPrograms.filter(
          (p) => p.status === PROGRAM_STATUS.PAUSED,
        );
        const completedPrograms = allPrograms.filter(
          (p) => p.status === PROGRAM_STATUS.COMPLETED,
        );

        setProgramState({
          programs: allPrograms,
          activePrograms,
          pausedPrograms,
          completedPrograms,
          isLoadingPrograms: false,
          isLoadingCoaches: false,
          isUpdating: false,
          error: null,
        });
      } catch (error) {
        console.error("Error loading coaches and programs:", error);
        setProgramState((prev) => ({
          ...prev,
          error: error.message || "Failed to load programs",
          isLoadingPrograms: false,
          isLoadingCoaches: false,
        }));
      }
    };

    loadCoachesAndPrograms();

    // Store reload function in ref so loadInProgressSessions can call it
    reloadCoachesAndProgramsRef.current = loadCoachesAndPrograms;

    return () => {
      // Clean up all program agents
      Object.values(programAgentsRef.current).forEach((agent) => {
        if (agent && agent.destroy) {
          agent.destroy();
        }
      });
      programAgentsRef.current = {};

      // Clean up coach agent
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }

      // Clear the reload callback ref
      reloadCoachesAndProgramsRef.current = null;
    };
  }, [userId]);

  // Callback function to reload coaches and programs
  const reloadCoachesAndProgramsRef = useRef(null);

  // Load in-progress sessions
  const loadInProgressSessions = async () => {
    if (!userId) return;

    setSessionsLoading(true);
    try {
      // Get incomplete sessions (still answering questions)
      const incompleteSessions =
        await ProgramAgent.getIncompleteSessions(userId);

      // Get completed sessions (to check for building/failed status)
      const completedSessions = await ProgramAgent.getCompletedSessions(userId);

      // Filter for sessions that are building or failed
      const buildingOrFailedSessions = completedSessions.filter(
        (session) =>
          session.programGeneration?.status === "IN_PROGRESS" ||
          session.programGeneration?.status === "FAILED",
      );

      // Check if any previously building sessions have completed
      const currentBuildingSessionIds = new Set(
        buildingOrFailedSessions
          .filter((s) => s.programGeneration?.status === "IN_PROGRESS")
          .map((s) => s.sessionId),
      );

      const previousBuildingSessionIds = previousBuildingSessionsRef.current;

      // Find sessions that were building but are no longer (completed)
      const completedSessionIds = Array.from(previousBuildingSessionIds).filter(
        (id) => !currentBuildingSessionIds.has(id),
      );

      // If any sessions completed, refresh the programs list
      if (completedSessionIds.length > 0) {
        console.info(
          `✅ ${completedSessionIds.length} program(s) completed building, refreshing programs list...`,
        );
        // Use the callback if available, otherwise trigger a reload
        if (reloadCoachesAndProgramsRef.current) {
          reloadCoachesAndProgramsRef.current();
        }
      }

      // Update the tracking set
      previousBuildingSessionsRef.current = currentBuildingSessionIds;

      // Combine all sessions for display
      const allActiveSessions = [
        ...incompleteSessions,
        ...buildingOrFailedSessions,
      ];
      setInProgressSessions(allActiveSessions);

      // If there's a building session, set up polling
      // (Simple polling for now - re-check every 5s)
      const hasBuildingSession = buildingOrFailedSessions.some(
        (session) => session.programGeneration?.status === "IN_PROGRESS",
      );

      if (hasBuildingSession) {
        setTimeout(loadInProgressSessions, 5000);
      }
    } catch (error) {
      console.error("Error loading in-progress sessions:", error);
      setInProgressSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Initial load of sessions
  useEffect(() => {
    if (userId) {
      loadInProgressSessions();
    }
  }, [userId]);

  // Handle pause program
  const handlePauseProgram = async (program) => {
    const primaryCoachId = program.coachIds?.[0];
    const agent = programAgentsRef.current[primaryCoachId];
    if (!agent || !program?.programId) return;

    setUpdatingProgram({ programId: program.programId, action: "pause" });
    try {
      await agent.pauseProgram(program.programId);
      toast.success("Training program paused successfully");

      // Update local state
      setProgramState((prev) => {
        const programs = prev.programs.map((p) =>
          p.programId === program.programId
            ? { ...p, status: PROGRAM_STATUS.PAUSED }
            : p,
        );
        return {
          ...prev,
          programs,
          activePrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.ACTIVE,
          ),
          pausedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.PAUSED,
          ),
          completedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.COMPLETED,
          ),
        };
      });
    } catch (error) {
      console.error("Error pausing program:", error);
      toast.error("Failed to pause training program");
    } finally {
      setUpdatingProgram({ programId: null, action: null });
    }
  };

  // Handle resume program
  const handleResumeProgram = async (program) => {
    const primaryCoachId = program.coachIds?.[0];
    const agent = programAgentsRef.current[primaryCoachId];
    if (!agent || !program?.programId) return;

    setUpdatingProgram({ programId: program.programId, action: "resume" });
    try {
      await agent.resumeProgram(program.programId);
      toast.success("Training program resumed successfully");

      // Update local state
      setProgramState((prev) => {
        const programs = prev.programs.map((p) =>
          p.programId === program.programId
            ? { ...p, status: PROGRAM_STATUS.ACTIVE }
            : p,
        );
        return {
          ...prev,
          programs,
          activePrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.ACTIVE,
          ),
          pausedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.PAUSED,
          ),
          completedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.COMPLETED,
          ),
        };
      });
    } catch (error) {
      console.error("Error resuming program:", error);
      toast.error("Failed to resume training program");
    } finally {
      setUpdatingProgram({ programId: null, action: null });
    }
  };

  // Handle complete program
  const handleCompleteProgram = async (program) => {
    const primaryCoachId = program.coachIds?.[0];
    const agent = programAgentsRef.current[primaryCoachId];
    if (!agent || !program?.programId) return;

    setUpdatingProgram({ programId: program.programId, action: "complete" });
    try {
      await agent.completeProgram(program.programId);
      toast.success("Training program completed! Great work!");

      // Update local state
      setProgramState((prev) => {
        const programs = prev.programs.map((p) =>
          p.programId === program.programId
            ? {
                ...p,
                status: PROGRAM_STATUS.COMPLETED,
                completedAt: new Date().toISOString(),
              }
            : p,
        );
        return {
          ...prev,
          programs,
          activePrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.ACTIVE,
          ),
          pausedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.PAUSED,
          ),
          completedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.COMPLETED,
          ),
        };
      });
    } catch (error) {
      console.error("Error completing program:", error);
      toast.error("Failed to complete training program");
    } finally {
      setUpdatingProgram({ programId: null, action: null });
    }
  };

  // Handle delete click - show modal
  const handleDeleteClick = (program) => {
    setProgramToDelete(program);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!programToDelete || !userId) return;

    const primaryCoachId = programToDelete.coachIds?.[0];
    const agent = programAgentsRef.current[primaryCoachId];
    if (!agent) return;

    setIsDeleting(true);
    try {
      await agent.deleteProgram(programToDelete.programId);

      // Remove the deleted program from local state
      setProgramState((prev) => {
        const programs = prev.programs.filter(
          (p) => p.programId !== programToDelete.programId,
        );
        return {
          ...prev,
          programs,
          activePrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.ACTIVE,
          ),
          pausedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.PAUSED,
          ),
          completedPrograms: programs.filter(
            (p) => p.status === PROGRAM_STATUS.COMPLETED,
          ),
        };
      });

      toast.success("Training program deleted successfully");
      setShowDeleteModal(false);
      setProgramToDelete(null);
    } catch (error) {
      console.error("Error deleting program:", error);
      toast.error("Failed to delete training program");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setProgramToDelete(null);
  };

  // Handle delete session
  const handleDeleteSession = async (session) => {
    setShowDeleteSessionModal(true);
    setSessionToDelete(session);
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete || !userId) return;

    setIsDeleting(true);
    try {
      await ProgramAgent.deleteSession(userId, sessionToDelete.sessionId);
      setInProgressSessions((prev) =>
        prev.filter((s) => s.sessionId !== sessionToDelete.sessionId),
      );
      toast.success("Session deleted successfully");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setIsDeleting(false);
      setShowDeleteSessionModal(false);
      setSessionToDelete(null);
    }
  };

  const handleRetryBuild = async (session) => {
    if (!userId || !session.sessionId) return;

    setRetryingSessionId(session.sessionId);
    try {
      // Trigger rebuild
      await ProgramAgent.retryBuild(session.sessionId, userId);

      // Update session status locally
      setInProgressSessions((prev) =>
        prev.map((s) =>
          s.sessionId === session.sessionId
            ? {
                ...s,
                programGeneration: {
                  status: "IN_PROGRESS",
                  startedAt: new Date().toISOString(),
                },
                lastActivity: new Date().toISOString(),
              }
            : s,
        ),
      );
      toast.success("Program build started successfully");

      // Trigger polling
      setTimeout(loadInProgressSessions, 2000);
    } catch (error) {
      console.error("Error retrying build:", error);
      toast.error("Failed to retry build. Please try again.");
    } finally {
      setRetryingSessionId(null);
    }
  };

  const handleContinueSession = (session) => {
    // Navigate to program designer with existing session
    // Use session.coachId instead of URL param to ensure correct coach
    navigate(
      `/training-grounds/program-designer?userId=${userId}&coachId=${session.coachId || coachId}&programDesignerSessionId=${session.sessionId}`,
    );
  };

  // Handle view program
  const handleViewProgram = (program) => {
    const primaryCoachId = program.coachIds?.[0];
    if (!userId || !program?.programId || !primaryCoachId) return;
    navigate(
      `/training-grounds/programs/dashboard?userId=${userId}&coachId=${primaryCoachId}&programId=${program.programId}`,
    );
  };

  // Handle create new program - create session then navigate
  const handleCreateProgram = async () => {
    if (!userId) {
      navigate(`/coaches?userId=${userId || ""}`);
      return;
    }

    if (!coachId) {
      // No coach selected - navigate to coaches page to select one
      navigate(`/coaches?userId=${userId}`);
      return;
    }

    setIsCreatingProgram(true);
    try {
      // Create a new program designer session (mirrors CoachCreator flow)
      const result = await createProgramDesignerSession(userId, coachId);
      const { sessionId } = result;

      // Navigate to program designer with the session ID
      navigate(
        `/training-grounds/program-designer?userId=${userId}&coachId=${coachId}&programDesignerSessionId=${sessionId}`,
      );
    } catch (error) {
      console.error("Error creating program designer session:", error);
      toast.error("Failed to create program design session");
      setIsCreatingProgram(false);
    }
  };

  // Render program card
  const renderProgramCard = (program, showActions = true) => {
    const isNew = isNewProgram(program.createdAt, program.programId);
    const progressPercentage = getProgressPercentage(program);
    const isPausing =
      updatingProgram.programId === program.programId &&
      updatingProgram.action === "pause";
    const isCompleting =
      updatingProgram.programId === program.programId &&
      updatingProgram.action === "complete";
    const isResuming =
      updatingProgram.programId === program.programId &&
      updatingProgram.action === "resume";
    const isAnyActionInProgress =
      updatingProgram.programId === program.programId;
    const workoutCount = program.totalWorkouts || program.workoutCount || 0;

    return (
      <div
        key={program.programId}
        className={`${containerPatterns.cardMedium} p-6 flex flex-col justify-between h-full relative`}
      >
        {/* Actions Menu - Hide when editing */}
        {editingProgramId !== program.programId && (
          <div className="absolute top-3 right-3 z-10 actions-menu-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(
                  openMenuId === program.programId ? null : program.programId,
                );
              }}
              className={`p-2 rounded-lg transition-colors duration-200 focus:outline-none active:outline-none focus:ring-1 focus:ring-synthwave-neon-cyan/50 ${
                openMenuId === program.programId
                  ? "text-synthwave-neon-cyan bg-synthwave-bg-primary/50 ring-1 ring-synthwave-neon-cyan/50"
                  : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-bg-primary/50"
              }`}
              style={{ WebKitTapHighlightColor: "transparent" }}
              aria-label="More actions"
              data-tooltip-id={`program-actions-${program.programId}`}
              data-tooltip-content="More actions"
            >
              <EllipsisVerticalIcon />
            </button>

            {/* Dropdown Menu */}
            {openMenuId === program.programId && (
              <div className="absolute right-0 mt-2 w-44 bg-synthwave-bg-card border border-synthwave-neon-cyan/20 rounded-lg shadow-[4px_4px_16px_rgba(0,255,255,0.06)] overflow-hidden z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProgramId(program.programId);
                    setOpenMenuId(null);
                  }}
                  className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200"
                >
                  <EditIcon />
                  <span className="font-rajdhani font-medium text-sm">
                    Rename Program
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(program);
                    setOpenMenuId(null);
                  }}
                  className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <TrashIcon />
                  </div>
                  <span className="font-rajdhani font-medium text-sm">
                    Delete Program
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* New Badge - placed after actions menu to appear on top in stacking order */}
        {isNew && <NewBadge />}

        <div className="flex-1">
          {/* Program Name - Either editable or static */}
          <div className="flex items-start space-x-3 mb-4">
            <div
              className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotCyan} flex-shrink-0 mt-2`}
            ></div>
            {editingProgramId === program.programId ? (
              <InlineEditField
                value={program.name}
                onSave={async (newName) => {
                  if (!newName || !newName.trim()) {
                    throw new Error("Program name cannot be empty");
                  }
                  const primaryCoachId = program.coachIds?.[0];
                  const agent = programAgentsRef.current[primaryCoachId];
                  if (!agent) {
                    throw new Error("Failed to update program name");
                  }

                  await agent.updateProgramStatus(program.programId, "update", {
                    name: newName.trim(),
                  });

                  // Update local state
                  setProgramState((prevState) => ({
                    ...prevState,
                    programs: prevState.programs.map((p) =>
                      p.programId === program.programId
                        ? { ...p, name: newName.trim() }
                        : p,
                    ),
                    activePrograms: prevState.activePrograms.map((p) =>
                      p.programId === program.programId
                        ? { ...p, name: newName.trim() }
                        : p,
                    ),
                    pausedPrograms: prevState.pausedPrograms.map((p) =>
                      p.programId === program.programId
                        ? { ...p, name: newName.trim() }
                        : p,
                    ),
                    completedPrograms: prevState.completedPrograms.map((p) =>
                      p.programId === program.programId
                        ? { ...p, name: newName.trim() }
                        : p,
                    ),
                  }));
                  setEditingProgramId(null);
                  toast.success("Program name updated successfully");
                }}
                onCancel={() => {
                  setEditingProgramId(null);
                }}
                placeholder="Program name..."
                maxLength={100}
                size="large"
                displayClassName="font-russo font-bold text-white text-xl uppercase"
                tooltipPrefix={`program-${program.programId}`}
                onError={(error) => {
                  setEditingProgramId(null);
                  toast.error(error.message || "Failed to update program name");
                }}
                startInEditMode={true}
              />
            ) : (
              <h3 className="font-russo font-bold text-white text-xl uppercase">
                {program.name}
              </h3>
            )}
          </div>

          {/* Program Description */}
          {program.description && (
            <p
              className={`${typographyPatterns.cardText} text-sm mb-4 line-clamp-2`}
            >
              {program.description}
            </p>
          )}

          {/* Program Details */}
          <div className="space-y-3">
            {/* Coach Name */}
            <div
              className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
            >
              <TargetIcon />
              <span className="text-sm">
                Coach:{" "}
                <span className="text-synthwave-neon-cyan">
                  {formatCoachName(program.coachNames?.[0]) || "Unknown"}
                </span>
              </span>
            </div>

            {/* Combined Workout Stats - only for active/paused programs */}
            {(program.status === PROGRAM_STATUS.ACTIVE ||
              program.status === PROGRAM_STATUS.PAUSED) &&
              workoutCount > 0 && (
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <WorkoutIconSmall />
                  <span className="text-sm">
                    <span className="text-synthwave-neon-pink font-semibold">
                      ✓ {program.completedWorkouts || 0}
                    </span>
                    <span className="text-synthwave-neon-cyan font-semibold">
                      {" "}
                      / ✕ {program.skippedWorkouts || 0}
                    </span>
                    <span className="text-synthwave-text-secondary">
                      {" "}
                      of {workoutCount} workouts
                    </span>
                  </span>
                </div>
              )}

            {/* Workout Count - only for completed programs */}
            {program.status === PROGRAM_STATUS.COMPLETED &&
              workoutCount > 0 && (
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <WorkoutIconSmall />
                  <span className="text-sm">
                    <span className="text-synthwave-neon-cyan font-semibold">
                      {workoutCount}
                    </span>{" "}
                    {workoutCount === 1 ? "Workout" : "Workouts"}
                  </span>
                </div>
              )}

            {/* Adherence Rate - only for active/paused programs with meaningful rate */}
            {(program.status === PROGRAM_STATUS.ACTIVE ||
              program.status === PROGRAM_STATUS.PAUSED) &&
              program.adherenceRate > 0 &&
              program.completedWorkouts > 0 && (
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <TargetIcon />
                  <span className="text-sm">
                    Adherence:{" "}
                    <span className="text-synthwave-neon-cyan font-semibold">
                      {Math.round(program.adherenceRate)}%
                    </span>
                  </span>
                </div>
              )}

            {/* Last Activity - only for active/paused programs */}
            {(program.status === PROGRAM_STATUS.ACTIVE ||
              program.status === PROGRAM_STATUS.PAUSED) &&
              program.lastActivityAt && (
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <CalendarIcon />
                  <span className="text-sm">
                    Last activity:{" "}
                    <span className="text-synthwave-neon-cyan">
                      {formatLastActivity(program.lastActivityAt)}
                    </span>
                  </span>
                </div>
              )}

            {/* Progress - only for active/paused programs */}
            {(program.status === PROGRAM_STATUS.ACTIVE ||
              program.status === PROGRAM_STATUS.PAUSED) && (
              <>
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <CalendarIcon />
                  <span className="text-sm">
                    Day {program.currentDay || 1} of {program.totalDays} •{" "}
                    <span className="text-synthwave-neon-cyan font-semibold">
                      {progressPercentage}% Complete
                    </span>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-synthwave-bg-primary/50 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-synthwave-neon-cyan to-synthwave-neon-purple rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </>
            )}

            {/* Completion stats - for completed programs */}
            {program.status === PROGRAM_STATUS.COMPLETED && (
              <div
                className={`flex items-center space-x-2 text-synthwave-neon-cyan ${typographyPatterns.cardText}`}
              >
                <CheckIcon />
                <span className="text-sm font-medium">
                  Completed {formatDate(program.completedAt, program.programId)}
                </span>
              </div>
            )}

            {/* Created Date */}
            <div
              className={`flex items-center space-x-2 ${typographyPatterns.caption}`}
            >
              <CalendarIcon />
              <span>
                Created {formatDate(program.createdAt, program.programId)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-6 space-y-2">
            {/* View Dashboard Button */}
            <button
              onClick={() => handleViewProgram(program)}
              disabled={isAnyActionInProgress}
              className={`${buttonPatterns.secondaryMedium} w-full space-x-2`}
            >
              <HomeIcon />
              <span>View Dashboard</span>
            </button>

            {/* Status-specific actions */}
            {program.status === PROGRAM_STATUS.ACTIVE && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePauseProgram(program)}
                  disabled={isAnyActionInProgress}
                  className={`flex-1 ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPausing ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PauseIcon />
                  )}
                  <span>Pause</span>
                </button>
                <button
                  onClick={() => handleCompleteProgram(program)}
                  disabled={isAnyActionInProgress}
                  className={`flex-1 ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCompleting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckIcon />
                  )}
                  <span>Complete</span>
                </button>
              </div>
            )}

            {program.status === PROGRAM_STATUS.PAUSED && (
              <button
                onClick={() => handleResumeProgram(program)}
                disabled={isAnyActionInProgress}
                className={`w-full ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isResuming ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowRightIcon />
                )}
                <span>Resume Program</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Show skeleton loading while validating userId or loading programs
  if (
    isValidatingUserId ||
    (programState.isLoadingPrograms && programState.programs.length === 0)
  ) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Title skeleton */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Programs grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Add New Program Card skeleton */}
            <div className={`${containerPatterns.dashedCard} opacity-60`}>
              <div className="text-center h-full flex flex-col justify-between min-h-[400px]">
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded animate-pulse mb-4"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-3"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-56 mb-4"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                </div>
              </div>
            </div>

            {/* Program card skeletons */}
            {[1, 2].map((i) => (
              <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                <div className="flex-1">
                  {/* Program name skeleton */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>

                  {/* Program details skeleton */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                    </div>
                  </div>
                </div>

                {/* Action button skeleton */}
                <div className="h-10 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* In-Progress Sessions skeleton */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <div className="h-7 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
              <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-full max-w-2xl mx-auto mb-2"></div>
              <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-full max-w-xl mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.dashedCardCyan} p-6 opacity-60`}
                >
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full flex-shrink-0 mt-2"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="h-4 bg-synthwave-neon-cyan/30 rounded animate-pulse w-36"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paused Programs Section Skeleton */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <div className="h-7 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
              <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-full max-w-2xl mx-auto mb-2"></div>
              <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-full max-w-xl mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2].map((i) => (
                <div
                  key={`paused-skeleton-${i}`}
                  className={`${containerPatterns.cardMedium} p-6`}
                >
                  <div className="flex-1">
                    {/* Program name skeleton */}
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>

                    {/* Program details skeleton */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                      </div>
                    </div>
                  </div>

                  {/* Action button skeleton */}
                  <div className="h-10 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user authorization failed
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={
          userIdError || "You can only access your own training programs."
        }
      />
    );
  }

  // Redirect to home if no userId
  if (!userId) {
    navigate("/", { replace: true });
    return null;
  }

  // Show training programs list
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Training Programs Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <div className="flex items-center gap-3">
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="programs-info"
                data-tooltip-content="Manage all your training programs. View progress, pause, resume, or complete programs across all your coaches."
              >
                Your Training Programs
              </h1>
              <div
                className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded text-synthwave-neon-purple font-rajdhani text-xs font-bold uppercase tracking-wider cursor-help"
                data-tooltip-id="beta-badge"
                data-tooltip-content="Training programs are in beta. You may experience pre-release behavior. We appreciate your feedback!"
              >
                Beta
              </div>
            </div>

            {/* Compact Coach Card */}
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={() =>
                  navigate(
                    `/training-grounds?userId=${userId}&coachId=${coachId}`,
                  )
                }
                tooltipContent="Go to the Training Grounds"
              />
            )}
          </div>

          {/* Right section: Command Palette Button */}
          <div className="flex items-center gap-3">
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </header>

        {/* Error State */}
        {programState.error && (
          <div className={`${containerPatterns.inlineError} text-center mb-8`}>
            <p className={`${typographyPatterns.description} text-red-400`}>
              {programState.error}
            </p>
          </div>
        )}

        {/* Active Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr animate-fadeIn">
          {/* Create New Program Card */}
          <div
            onClick={isCreatingProgram ? undefined : handleCreateProgram}
            className={`${containerPatterns.dashedCard} group ${
              isCreatingProgram
                ? "opacity-75 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <div className="text-center h-full flex flex-col justify-between min-h-[400px]">
              {/* Top Section */}
              <div className="flex-1 flex flex-col justify-center items-center">
                {/* Plus Icon or Spinner */}
                <div className="text-synthwave-neon-pink/40 group-hover:text-synthwave-neon-pink/80 transition-colors duration-300 mb-4">
                  {isCreatingProgram ? (
                    <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-russo font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-lg uppercase mb-3 transition-colors duration-300">
                  {isCreatingProgram
                    ? "Creating Session..."
                    : "Design New Program"}
                </h3>

                {/* Description */}
                <p
                  className={`${typographyPatterns.cardText} text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center mb-4 max-w-xs mx-auto`}
                >
                  {isCreatingProgram
                    ? "Setting up your program design session"
                    : "Chat with your coach to design a personalized training program"}
                </p>

                {/* Info Badge */}
                {!isCreatingProgram && (
                  <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-lg px-3 py-1 mb-4">
                    <p className="font-rajdhani text-synthwave-neon-pink text-xs font-semibold">
                      5-10 minute guided conversation
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Features - Only show when not creating */}
              {!isCreatingProgram && (
                <div className="border-t border-synthwave-neon-pink/20 pt-3 mt-3 pb-4">
                  <div className="grid grid-cols-1 gap-2">
                    <div
                      className={`flex items-center justify-center space-x-2 ${typographyPatterns.cardText} text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary transition-colors duration-300`}
                    >
                      <svg
                        className="w-3 h-3 text-synthwave-neon-pink"
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
                      <span className="text-sm">AI-Generated Workouts</span>
                    </div>
                    <div
                      className={`flex items-center justify-center space-x-2 ${typographyPatterns.cardText} text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary transition-colors duration-300`}
                    >
                      <svg
                        className="w-3 h-3 text-synthwave-neon-cyan"
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
                      <span className="text-sm">Progress Tracking</span>
                    </div>
                    <div
                      className={`flex items-center justify-center space-x-2 ${typographyPatterns.cardText} text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary transition-colors duration-300`}
                    >
                      <svg
                        className="w-3 h-3 text-synthwave-neon-purple"
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
                      <span className="text-sm">Adaptive Programming</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Programs */}
          {programState.activePrograms.map((program) =>
            renderProgramCard(program),
          )}
        </div>

        {/* In-Progress Program Design Sessions */}
        {inProgressSessions && inProgressSessions.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-russo font-black text-xl md:text-2xl text-white mb-4 uppercase">
                Your In-Progress Program Designs
              </h2>
              <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Continue designing your training programs. Pick up exactly where
                you left off and let's finish building something great together.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
              {inProgressSessions.map((session) => {
                // Determine session status
                const isBuilding =
                  session.programGeneration?.status === "IN_PROGRESS";
                const isFailed = session.programGeneration?.status === "FAILED";
                const isIncomplete = !session.isComplete;

                // Card styling based on status
                let cardClass, dotColor, statusColor;
                if (isFailed) {
                  cardClass = `${containerPatterns.dashedCardPinkBold} p-6 group`;
                  dotColor = "bg-synthwave-neon-pink";
                  statusColor = "text-synthwave-neon-pink";
                } else if (isBuilding) {
                  cardClass = `${containerPatterns.dashedCardCyan} p-6`;
                  dotColor = "bg-synthwave-neon-cyan";
                  statusColor = "text-synthwave-neon-cyan";
                } else {
                  cardClass = `${containerPatterns.dashedCardCyan} p-6 group cursor-pointer`;
                  dotColor = "bg-synthwave-neon-cyan";
                  statusColor = "text-synthwave-neon-cyan";
                }

                return (
                  <div
                    key={session.sessionId}
                    onClick={() => {
                      if (isIncomplete && !isBuilding && !isFailed) {
                        handleContinueSession(session);
                      }
                    }}
                    className={cardClass}
                  >
                    {/* Session Header */}
                    <div className="flex items-start space-x-3 mb-4">
                      <div
                        className={`w-3 h-3 ${dotColor} rounded-full flex-shrink-0 mt-2`}
                      ></div>
                      <div className="flex-1">
                        <h3 className="font-russo font-bold text-white text-lg uppercase">
                          Program Design Session
                        </h3>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="space-y-3 mb-2">
                      {/* Status */}
                      <div
                        className={`flex items-center space-x-2 ${statusColor}`}
                      >
                        {isFailed ? (
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
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : isBuilding ? (
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
                              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        )}
                        <span className="font-rajdhani text-sm font-medium">
                          {isFailed
                            ? "Build Failed"
                            : isBuilding
                              ? "Building Program"
                              : "Answering Questions"}
                        </span>
                        {isBuilding && (
                          <div className="w-4 h-4 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>

                      {/* Coach Name */}
                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <TargetIcon />
                        <span className="font-rajdhani text-sm">
                          Coach:{" "}
                          <span className="text-synthwave-neon-cyan">
                            {formatCoachName(session.coachName) || "Unknown"}
                          </span>
                        </span>
                      </div>

                      {/* Started Date */}
                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <CalendarIcon />
                        <span className="font-rajdhani text-sm">
                          Started {formatDate(session.startedAt)}
                        </span>
                      </div>

                      {/* Last Activity */}
                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-rajdhani text-sm">
                          Last activity {formatDate(session.lastActivity)}
                        </span>
                      </div>

                      {/* Progress - for incomplete sessions */}
                      {isIncomplete && session.progressDetails && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-synthwave-neon-cyan">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="font-rajdhani text-sm font-medium">
                              Progress: {session.progressDetails.itemsCompleted}{" "}
                              / {session.progressDetails.totalItems} (
                              {session.progressDetails.percentage}%)
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="relative w-full h-2 bg-synthwave-bg-primary/50 rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-synthwave-neon-cyan to-synthwave-neon-purple rounded-full transition-all duration-500"
                              style={{
                                width: `${session.progressDetails.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error message for failed builds */}
                      {isFailed && session.programGeneration?.error && (
                        <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-lg p-3 mt-3">
                          <p className="font-rajdhani text-xs text-synthwave-neon-pink">
                            {session.programGeneration.error}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Links */}
                    <div className="pt-2">
                      {isIncomplete && !isBuilding && !isFailed ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 bg-transparent border-none text-synthwave-neon-cyan px-2 py-1 hover:text-white hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer">
                            <ArrowRightIcon />
                            <span>Continue Session</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session);
                            }}
                            className="bg-transparent border-none text-synthwave-neon-pink px-2 py-1 hover:text-white hover:bg-synthwave-neon-pink/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ) : isFailed ? (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryBuild(session);
                            }}
                            disabled={retryingSessionId === session.sessionId}
                            className="flex items-center space-x-2 bg-transparent border-none text-synthwave-neon-cyan px-2 py-1 hover:text-white hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              className={`w-4 h-4 ${retryingSessionId === session.sessionId ? "animate-spin-ccw" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>
                              {retryingSessionId === session.sessionId
                                ? "Retrying..."
                                : "Retry Build"}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session);
                            }}
                            className="bg-transparent border-none text-synthwave-neon-pink px-2 py-1 hover:text-white hover:bg-synthwave-neon-pink/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="font-rajdhani text-xs text-synthwave-text-muted">
                            Program is being generated...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Paused Programs Section */}
        {programState.pausedPrograms.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-russo font-black text-xl md:text-2xl text-white mb-4 uppercase">
                Paused Training Programs
              </h2>
              <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Training programs you've paused. Resume anytime to continue your
                training journey to achieve something great and personalized to
                your goals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
              {programState.pausedPrograms.map((program) =>
                renderProgramCard(program),
              )}
            </div>
          </div>
        )}

        {/* Completed Programs Section */}
        {programState.completedPrograms.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-russo font-black text-xl md:text-2xl text-white mb-4 uppercase">
                Completed Programs
              </h2>
              <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Programs you've successfully completed. Celebrate your
                achievements!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
              {programState.completedPrograms.map((program) =>
                renderProgramCard(program, false),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Session Confirmation Modal */}
      {showDeleteSessionModal && sessionToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setShowDeleteSessionModal(false);
              setSessionToDelete(null);
            }
          }}
        >
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Program Session
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this program design session?
                This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteSessionModal(false);
                    setSessionToDelete(null);
                  }}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteSession}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && programToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
          onClick={(e) => {
            // Close modal if clicking on backdrop (not the modal content)
            if (e.target === e.currentTarget && !isDeleting) {
              handleCancelDelete();
            }
          }}
        >
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Training Program
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete "
                <strong className="text-white">{programToDelete.name}</strong>"?
                This will remove it from your programs list.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Delete</span>
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
        id="programs-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="beta-badge"
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

      {/* Custom animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </div>
  );
}

export default ManagePrograms;
