import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from "../../auth/hooks/useAuthorizeUser";
import { AccessDenied, LoadingScreen } from "../shared/AccessDenied";
import {
  buttonPatterns,
  containerPatterns,
  layoutPatterns,
  tooltipPatterns,
  typographyPatterns,
  iconButtonPatterns,
  formPatterns,
  inputPatterns,
} from "../../utils/ui/uiPatterns";
import { Tooltip } from "react-tooltip";
import CommandPaletteButton from "../shared/CommandPaletteButton";
import PageHeader from "../shared/PageHeader";
import PageHeaderSkeleton from "../shared/PageHeaderSkeleton";
import AppFooter from "../shared/AppFooter";
import TiptapEditor from "../shared/TiptapEditor";
import { useNavigationContext } from "../../contexts/NavigationContext";
import { logger } from "../../utils/logger";
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
import { getAllPrograms } from "../../utils/apis/programApi";
import ShareProgramModal from "../shared-programs/ShareProgramModal";
import ContextualChatDrawer from "../shared/ContextualChatDrawer";
import EntityChatFAB from "../shared/EntityChatFAB";
import { LIST_PAGE_SIZE } from "../../constants/pagination";
import LoadMoreButton from "../shared/LoadMoreButton";
import { notifyLoadMoreError } from "../../utils/loadMoreErrors";
import { useUserAvatarProps } from "../../auth/hooks/useUserAvatarProps";

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
  const { userInitial, userEmail, userDisplayName } = useUserAvatarProps();

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

  // Per-status "bucket" state. Manage Programs pages each status (active,
  // paused, completed) independently so buckets can load and fail in
  // isolation. Each bucket tracks its own page offset, authoritative
  // totalCount, loading flags, and error message. The aggregate `programs`
  // array is a derived union used for coach-agent initialization only.
  const makeEmptyBucket = () => ({
    items: [],
    offset: 0,
    totalCount: 0,
    isLoadingInitial: false,
    isLoadingMore: false,
    error: null,
  });

  const [programState, setProgramState] = useState({
    activeBucket: makeEmptyBucket(),
    pausedBucket: makeEmptyBucket(),
    completedBucket: makeEmptyBucket(),
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

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share program modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [programToShare, setProgramToShare] = useState(null);

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Edit modal state
  const [editingProgram, setEditingProgram] = useState(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [editProgramDescription, setEditProgramDescription] = useState("");
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  // In-progress sessions state
  const [inProgressSessions, setInProgressSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [retryingSessionId, setRetryingSessionId] = useState(null);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const previousBuildingSessionsRef = useRef(new Set()); // Track previous building sessions

  // Contextual chat drawer state — FAB-only entry point. The drawer hosts
  // a program designer session and exposes an in-drawer picker so users
  // can switch between in-progress sessions without leaving the page.
  // `programDesignerDrawerSessionId === null` means "start a new session";
  // a non-null value resumes an existing in-progress session.
  const [
    isProgramDesignerDrawerOpen,
    setIsProgramDesignerDrawerOpen,
  ] = useState(false);
  const [programDesignerDrawerSessionId, setProgramDesignerDrawerSessionId] =
    useState(null);
  const [programDesignerDrawerCoachId, setProgramDesignerDrawerCoachId] =
    useState(null);

  // Picker options for the in-drawer session switcher. Only resumable
  // sessions appear (incomplete and not currently building/failed) — those
  // are the ones users can meaningfully re-enter.
  const programDesignerSessionPickerOptions = useMemo(() => {
    return (inProgressSessions || [])
      .filter((s) => {
        if (!s?.sessionId) return false;
        if (s.isComplete) return false;
        const status = s.programGeneration?.status;
        return status !== "IN_PROGRESS" && status !== "FAILED";
      })
      .map((s) => ({
        sessionId: s.sessionId,
        coachId: s.coachId,
        title: s.coachName
          ? `Program Design — ${s.coachName}`
          : "Program Design Session",
      }));
  }, [inProgressSessions]);

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

  // Close delete modal on Escape key and cancel edit modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        // Cancel edit modal if active
        if (editingProgram) {
          handleCancelEditProgram();
          return;
        }
        // Close delete modal if open
        if (showDeleteModal && !isDeleting) {
          handleCancelDelete();
        }
      }
    };

    if (showDeleteModal || editingProgram) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [showDeleteModal, isDeleting, editingProgram]);

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
        logger.error("Error loading coach data:", error);
      } finally {
        setIsLoadingCoachData(false);
      }
    };

    loadCoach();
  }, [userId, coachId]);

  // Map PROGRAM_STATUS -> bucket key in programState so shared helpers can
  // target the right section without repeated conditional trees.
  const STATUS_TO_BUCKET_KEY = {
    [PROGRAM_STATUS.ACTIVE]: "activeBucket",
    [PROGRAM_STATUS.PAUSED]: "pausedBucket",
    [PROGRAM_STATUS.COMPLETED]: "completedBucket",
  };

  // Fetch a single status bucket. Returns the API result so the caller can
  // decide whether to treat this as an initial load or an append, and so
  // per-bucket failures don't cascade (a failed bucket just throws here).
  const fetchStatusBucket = async (status, { limit, offset }) => {
    const result = await getAllPrograms(userId, {
      status,
      includeArchived: false,
      sortOrder: "desc",
      limit,
      offset,
    });
    const items = result.programs || [];
    const totalCount =
      typeof result.totalCount === "number"
        ? result.totalCount
        : typeof result.count === "number"
          ? result.count
          : items.length;
    return { items, totalCount };
  };

  // Ensure we have a ProgramAgent for every coachId that appears in loaded
  // programs — agents are keyed by coach because mutation endpoints are
  // coach-scoped.
  const ensureAgentsForPrograms = (programs) => {
    programs.forEach((program) => {
      (program.coachIds || []).forEach((programCoachId) => {
        if (!programAgentsRef.current[programCoachId]) {
          programAgentsRef.current[programCoachId] = new ProgramAgent(
            userId,
            programCoachId,
            () => {},
          );
        }
      });
    });
  };

  // Initialize coach agent and fetch the first page of every status bucket.
  // Buckets are fetched in parallel but their loading/error state is tracked
  // independently so a failure in one never blocks rendering the others.
  useEffect(() => {
    if (!userId) return;

    const loadCoachesAndPrograms = async () => {
      setProgramState((prev) => ({
        ...prev,
        isLoadingCoaches: true,
        activeBucket: {
          ...prev.activeBucket,
          isLoadingInitial: true,
          error: null,
        },
        pausedBucket: {
          ...prev.pausedBucket,
          isLoadingInitial: true,
          error: null,
        },
        completedBucket: {
          ...prev.completedBucket,
          isLoadingInitial: true,
          error: null,
        },
      }));

      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent({ userId });
        }

        // Load coaches and each status bucket in parallel. We await
        // settled results so one bucket's failure doesn't short-circuit
        // the others.
        const [coachesResult, activeResult, pausedResult, completedResult] =
          await Promise.allSettled([
            coachAgentRef.current.loadCoaches(),
            fetchStatusBucket(PROGRAM_STATUS.ACTIVE, {
              limit: LIST_PAGE_SIZE,
              offset: 0,
            }),
            fetchStatusBucket(PROGRAM_STATUS.PAUSED, {
              limit: LIST_PAGE_SIZE,
              offset: 0,
            }),
            fetchStatusBucket(PROGRAM_STATUS.COMPLETED, {
              limit: LIST_PAGE_SIZE,
              offset: 0,
            }),
          ]);

        if (coachesResult.status === "fulfilled") {
          setCoaches(coachesResult.value || []);
        } else {
          logger.error("Error loading coaches:", coachesResult.reason);
          setCoaches([]);
        }

        setProgramState((prev) => {
          const next = { ...prev, isLoadingCoaches: false, error: null };
          const applyBucket = (bucketKey, result) => {
            if (result.status === "fulfilled") {
              ensureAgentsForPrograms(result.value.items);
              next[bucketKey] = {
                items: result.value.items,
                offset: result.value.items.length,
                totalCount: result.value.totalCount,
                isLoadingInitial: false,
                isLoadingMore: false,
                error: null,
              };
            } else {
              logger.error(`Error loading ${bucketKey}:`, result.reason);
              next[bucketKey] = {
                ...prev[bucketKey],
                isLoadingInitial: false,
                isLoadingMore: false,
                error: result.reason?.message || "Failed to load programs",
              };
            }
          };

          applyBucket("activeBucket", activeResult);
          applyBucket("pausedBucket", pausedResult);
          applyBucket("completedBucket", completedResult);
          return next;
        });
      } catch (error) {
        logger.error("Error loading coaches and programs:", error);
        setProgramState((prev) => ({
          ...prev,
          error: error.message || "Failed to load programs",
          isLoadingCoaches: false,
          activeBucket: {
            ...prev.activeBucket,
            isLoadingInitial: false,
            isLoadingMore: false,
          },
          pausedBucket: {
            ...prev.pausedBucket,
            isLoadingInitial: false,
            isLoadingMore: false,
          },
          completedBucket: {
            ...prev.completedBucket,
            isLoadingInitial: false,
            isLoadingMore: false,
          },
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
        logger.info(
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
      logger.error("Error loading in-progress sessions:", error);
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

  // Move a program between buckets on a status transition. Both buckets
  // are updated in a single setState so the UI never flickers through a
  // "missing" state, and both totalCounts are adjusted so hasMore stays
  // accurate. `offset` for the removed bucket is decremented so the next
  // Load more call doesn't skip a page boundary.
  const moveProgramBetweenBuckets = (
    programId,
    fromStatus,
    toStatus,
    patch = {},
  ) => {
    const fromKey = STATUS_TO_BUCKET_KEY[fromStatus];
    const toKey = STATUS_TO_BUCKET_KEY[toStatus];
    if (!fromKey || !toKey || fromKey === toKey) return;

    setProgramState((prev) => {
      const fromBucket = prev[fromKey];
      const toBucket = prev[toKey];
      const program = fromBucket.items.find((p) => p.programId === programId);
      if (!program) return prev;

      const updated = { ...program, ...patch, status: toStatus };
      return {
        ...prev,
        [fromKey]: {
          ...fromBucket,
          items: fromBucket.items.filter((p) => p.programId !== programId),
          offset: Math.max(0, fromBucket.offset - 1),
          totalCount: Math.max(0, fromBucket.totalCount - 1),
        },
        [toKey]: {
          ...toBucket,
          // Prepend so the just-transitioned item appears at the top of
          // its new bucket immediately.
          items: [updated, ...toBucket.items],
          offset: toBucket.offset + 1,
          totalCount: toBucket.totalCount + 1,
        },
      };
    });
  };

  // Fetch and append the next page for a single status bucket. Each
  // bucket has its own in-flight flag so one load-more in progress never
  // blocks another status. On failure we show a toast and leave offset /
  // totalCount / items untouched so the user can simply click again.
  const handleLoadMoreBucket = async (status) => {
    const bucketKey = STATUS_TO_BUCKET_KEY[status];
    if (!bucketKey) return;
    const bucket = programState[bucketKey];
    if (!bucket || bucket.isLoadingMore) return;
    if (bucket.items.length >= bucket.totalCount) return;

    setProgramState((prev) => ({
      ...prev,
      [bucketKey]: { ...prev[bucketKey], isLoadingMore: true, error: null },
    }));

    try {
      const { items, totalCount } = await fetchStatusBucket(status, {
        limit: LIST_PAGE_SIZE,
        offset: bucket.offset,
      });
      ensureAgentsForPrograms(items);

      setProgramState((prev) => {
        const current = prev[bucketKey];
        // Dedupe in case an optimistic mutation already placed a newly
        // transitioned item into this bucket before load-more returned.
        const seen = new Set(current.items.map((p) => p.programId));
        const appended = items.filter((p) => !seen.has(p.programId));
        return {
          ...prev,
          [bucketKey]: {
            ...current,
            items: [...current.items, ...appended],
            offset: current.offset + items.length,
            totalCount,
            isLoadingMore: false,
          },
        };
      });
    } catch (error) {
      logger.error(`Error loading more ${bucketKey}:`, error);
      setProgramState((prev) => ({
        ...prev,
        [bucketKey]: { ...prev[bucketKey], isLoadingMore: false },
      }));
      notifyLoadMoreError(toast, error);
    }
  };

  // Handle pause program
  const handlePauseProgram = async (program) => {
    const primaryCoachId = program.coachIds?.[0];
    const agent = programAgentsRef.current[primaryCoachId];
    if (!agent || !program?.programId) return;

    setUpdatingProgram({ programId: program.programId, action: "pause" });
    try {
      await agent.pauseProgram(program.programId);
      toast.success("Training program paused successfully");
      moveProgramBetweenBuckets(
        program.programId,
        PROGRAM_STATUS.ACTIVE,
        PROGRAM_STATUS.PAUSED,
      );
    } catch (error) {
      logger.error("Error pausing program:", error);
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
      moveProgramBetweenBuckets(
        program.programId,
        PROGRAM_STATUS.PAUSED,
        PROGRAM_STATUS.ACTIVE,
      );
    } catch (error) {
      logger.error("Error resuming program:", error);
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
      moveProgramBetweenBuckets(
        program.programId,
        PROGRAM_STATUS.ACTIVE,
        PROGRAM_STATUS.COMPLETED,
        { completedAt: new Date().toISOString() },
      );
    } catch (error) {
      logger.error("Error completing program:", error);
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

      // Remove from the owning bucket and decrement that bucket's
      // offset + totalCount so hasMore stays accurate without a refetch.
      const bucketKey = STATUS_TO_BUCKET_KEY[programToDelete.status];
      if (bucketKey) {
        setProgramState((prev) => {
          const bucket = prev[bucketKey];
          const wasPresent = bucket.items.some(
            (p) => p.programId === programToDelete.programId,
          );
          if (!wasPresent) return prev;
          return {
            ...prev,
            [bucketKey]: {
              ...bucket,
              items: bucket.items.filter(
                (p) => p.programId !== programToDelete.programId,
              ),
              offset: Math.max(0, bucket.offset - 1),
              totalCount: Math.max(0, bucket.totalCount - 1),
            },
          };
        });
      }

      toast.success("Training program deleted successfully");
      setShowDeleteModal(false);
      setProgramToDelete(null);
    } catch (error) {
      logger.error("Error deleting program:", error);
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

  // Edit modal handlers
  const handleEditProgramClick = (program) => {
    setEditingProgram(program);
    setEditProgramName(program.name || "");
    setEditProgramDescription(program.description || "");
  };

  const handleSaveEditProgram = async () => {
    if (!editingProgram || !editProgramName.trim()) return;
    setIsSavingProgram(true);
    try {
      const primaryCoachId = editingProgram.coachIds?.[0];
      const agent = programAgentsRef.current[primaryCoachId];
      if (!agent) {
        throw new Error("Failed to update program");
      }

      await agent.updateProgramStatus(editingProgram.programId, "update", {
        name: editProgramName.trim(),
        description: editProgramDescription.trim(),
      });

      // Optimistic in-place patch across all buckets. Status doesn't
      // change so counts/offsets stay correct.
      const updateProgram = (p) =>
        p.programId === editingProgram.programId
          ? {
              ...p,
              name: editProgramName.trim(),
              description: editProgramDescription.trim(),
            }
          : p;

      setProgramState((prevState) => ({
        ...prevState,
        activeBucket: {
          ...prevState.activeBucket,
          items: prevState.activeBucket.items.map(updateProgram),
        },
        pausedBucket: {
          ...prevState.pausedBucket,
          items: prevState.pausedBucket.items.map(updateProgram),
        },
        completedBucket: {
          ...prevState.completedBucket,
          items: prevState.completedBucket.items.map(updateProgram),
        },
      }));

      setEditingProgram(null);
      setEditProgramName("");
      setEditProgramDescription("");
      toast.success("Program updated successfully");
    } catch (err) {
      logger.error("Error updating program:", err);
      toast.error(err.message || "Failed to update program");
    } finally {
      setIsSavingProgram(false);
    }
  };

  const handleCancelEditProgram = () => {
    setEditingProgram(null);
    setEditProgramName("");
    setEditProgramDescription("");
  };

  // Handle share click - show modal
  const handleShareClick = (program) => {
    setProgramToShare(program);
    setShowShareModal(true);
  };

  // Handle share success
  const handleShareSuccess = (result) => {
    toast.success("Share link created successfully!");
  };

  // Handle share modal close
  const handleShareClose = () => {
    setShowShareModal(false);
    setProgramToShare(null);
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
      logger.error("Error deleting session:", error);
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
      logger.error("Error retrying build:", error);
      toast.error("Failed to retry build. Please try again.");
    } finally {
      setRetryingSessionId(null);
    }
  };

  const handleContinueSession = (session) => {
    // Resume the in-progress session in the dedicated full-page program
    // designer route. The session's own `coachId` (not URL params) is what
    // owns the session, so deep-link with that.
    if (!session?.sessionId) return;
    const sessionCoachId = session.coachId || coachId;
    if (!sessionCoachId) {
      toast.error("This session is missing a coach. Please try again.");
      return;
    }
    navigate(
      `/training-grounds/program-designer?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(sessionCoachId)}&programDesignerSessionId=${encodeURIComponent(session.sessionId)}`,
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

  // Handle create new program — navigate to the dedicated full-page program
  // designer experience. The contextual chat drawer is reserved for the FAB
  // entry point; the empty card on this page always takes users to the full
  // immersive route. Users without a coach are routed to /coaches first.
  const handleCreateProgram = () => {
    if (!userId) {
      navigate(`/coaches?userId=${userId || ""}`);
      return;
    }

    if (!coachId) {
      // No coach selected - navigate to coaches page to select one
      navigate(`/coaches?userId=${userId}`);
      return;
    }

    navigate(
      `/training-grounds/program-designer?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(coachId)}`,
    );
  };

  // FAB-only entry point for the contextual chat drawer. Always opens a
  // fresh program designer session; the in-drawer picker lets users switch
  // to an in-progress session without leaving the page.
  const handleOpenProgramDesignerDrawer = () => {
    if (!coachId) return;
    setProgramDesignerDrawerSessionId(null);
    setProgramDesignerDrawerCoachId(coachId);
    setIsProgramDesignerDrawerOpen(true);
  };

  // Picker bridge: parent owns the session id state, so swapping it here
  // makes the drawer's session-init effect re-run for the chosen session.
  const handleProgramDesignerPickerSelect = (sessionId) => {
    if (!sessionId) return;
    const session = inProgressSessions.find((s) => s.sessionId === sessionId);
    const sessionCoachId = session?.coachId || coachId;
    if (!sessionCoachId) return;
    setProgramDesignerDrawerSessionId(sessionId);
    setProgramDesignerDrawerCoachId(sessionCoachId);
  };

  const handleProgramDesignerPickerNew = () => {
    setProgramDesignerDrawerSessionId(null);
    setProgramDesignerDrawerCoachId(coachId);
  };

  const handleProgramDesignerOpenFullPage = () => {
    if (!programDesignerDrawerCoachId) return;
    if (programDesignerDrawerSessionId) {
      navigate(
        `/training-grounds/program-designer?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(programDesignerDrawerCoachId)}&programDesignerSessionId=${encodeURIComponent(programDesignerDrawerSessionId)}`,
      );
    } else {
      navigate(
        `/training-grounds/program-designer?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(programDesignerDrawerCoachId)}`,
      );
    }
  };

  const handleProgramDesignerDrawerClose = () => {
    setIsProgramDesignerDrawerOpen(false);
    setProgramDesignerDrawerSessionId(null);
    setProgramDesignerDrawerCoachId(null);
  };

  const handleProgramDesignerSessionComplete = () => {
    // Refresh in-progress sessions strip and program buckets so the building
    // program shows up immediately.
    loadInProgressSessions();
    if (typeof reloadCoachesAndProgramsRef.current === "function") {
      reloadCoachesAndProgramsRef.current();
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
        className={`${containerPatterns.cardMedium} p-4 md:p-6 flex flex-col justify-between h-full relative`}
      >
        {/* Actions Menu */}
        <div className="absolute top-3 right-3 z-10 actions-menu-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(
                openMenuId === program.programId ? null : program.programId,
              );
            }}
            className={`p-2 rounded-xl transition-colors duration-200 focus:outline-none active:outline-none focus:ring-1 focus:ring-synthwave-neon-cyan/50 cursor-pointer ${
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
            <div className="absolute right-0 mt-2 w-44 bg-synthwave-bg-card border border-synthwave-neon-cyan/20 rounded-xl shadow-[4px_4px_16px_rgba(0,255,255,0.06)] overflow-hidden z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditProgramClick(program);
                  setOpenMenuId(null);
                }}
                className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200 cursor-pointer"
              >
                <EditIcon />
                <span className="font-body font-medium text-sm">
                  Edit Program
                </span>
              </button>
              {(program.status === PROGRAM_STATUS.ACTIVE ||
                program.status === PROGRAM_STATUS.COMPLETED) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareClick(program);
                    setOpenMenuId(null);
                  }}
                  className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  <span className="font-body font-medium text-sm">
                    Share Program
                  </span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(program);
                  setOpenMenuId(null);
                }}
                className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200 cursor-pointer"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <TrashIcon />
                </div>
                <span className="font-body font-medium text-sm">
                  Delete Program
                </span>
              </button>
            </div>
          )}
        </div>

        {/* New Badge - placed after actions menu to appear on top in stacking order */}
        {isNew && <NewBadge />}

        <div className="flex-1">
          {/* Program Name */}
          <div className="flex items-start gap-3 mb-4 pr-10">
            <span className="shrink-0 mt-1 text-synthwave-neon-cyan">
              <WorkoutIconSmall />
            </span>
            <h3
              className="font-header font-bold text-white text-lg md:text-xl uppercase line-clamp-2"
              data-tooltip-id="program-name-tooltip"
              data-tooltip-content={program.name}
            >
              {program.name}
            </h3>
          </div>

          {/* Program Description — hidden on mobile and for completed programs */}
          {program.description &&
            program.status !== PROGRAM_STATUS.COMPLETED && (
              <p
                className={`${typographyPatterns.cardText} text-sm mb-4 hidden sm:line-clamp-3`}
              >
                {program.description}
              </p>
            )}

          {/* Program Details */}
          <div className="space-y-3">
            {/* Combined Workout Stats - only for active/paused programs */}
            {(program.status === PROGRAM_STATUS.ACTIVE ||
              program.status === PROGRAM_STATUS.PAUSED) &&
              workoutCount > 0 && (
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <WorkoutIconSmall />
                  {/* Mobile: simple totals; desktop: full ✓ / ✕ breakdown */}
                  <span className="text-sm sm:hidden">
                    <span className="text-synthwave-neon-cyan font-semibold">
                      {program.completedWorkouts || 0}
                    </span>
                    <span className="text-synthwave-text-secondary">
                      {" "}
                      / {workoutCount} workouts
                    </span>
                  </span>
                  <span className="text-sm hidden sm:inline">
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

            {/* Duration - only for completed programs */}
            {program.status === PROGRAM_STATUS.COMPLETED &&
              program.totalDays > 0 && (
                <div
                  className={`flex items-center space-x-2 ${typographyPatterns.cardText}`}
                >
                  <CalendarIcon />
                  <span className="text-sm">
                    <span className="text-synthwave-neon-cyan font-semibold">
                      {Math.ceil(program.totalDays / 7)}
                    </span>{" "}
                    {Math.ceil(program.totalDays / 7) === 1 ? "week" : "weeks"}{" "}
                    program
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
                    {/* Hide "Day X of Y •" on mobile; the progress bar carries the visual weight */}
                    <span className="hidden sm:inline">
                      Day {program.currentDay || 1} of {program.totalDays}{" "}
                      •{" "}
                    </span>
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

            {/* Created Date — active/paused only; completed date is more relevant for completed */}
            {program.status !== PROGRAM_STATUS.COMPLETED && (
              <div
                className={`hidden sm:flex items-center space-x-2 ${typographyPatterns.caption}`}
              >
                <CalendarIcon />
                <span>
                  Created {formatDate(program.createdAt, program.programId)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Always show navigation/share, conditionally show status actions */}
        <div className="mt-2 space-y-2">
          {/* View Dashboard Button - Always visible */}
          <button
            onClick={() => handleViewProgram(program)}
            disabled={isAnyActionInProgress}
            className={`${buttonPatterns.secondaryMedium} w-full space-x-2`}
          >
            <HomeIcon />
            <span>View Dashboard</span>
          </button>

          {/* Status-specific actions - Only for active/paused */}
          {showActions && program.status === PROGRAM_STATUS.ACTIVE && (
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

          {showActions && program.status === PROGRAM_STATUS.PAUSED && (
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
      </div>
    );
  };

  // Show skeleton loading while validating userId or while every bucket
  // is still on its initial load and nothing is yet rendered. Once any
  // bucket has items, we drop the skeleton so the others can render in
  // place as they resolve (independent-failure requirement).
  const isInitialLoading =
    (programState.activeBucket.isLoadingInitial &&
      programState.activeBucket.items.length === 0) ||
    (programState.pausedBucket.isLoadingInitial &&
      programState.pausedBucket.items.length === 0) ||
    (programState.completedBucket.isLoadingInitial &&
      programState.completedBucket.items.length === 0);
  const hasAnyProgram =
    programState.activeBucket.items.length > 0 ||
    programState.pausedBucket.items.length > 0 ||
    programState.completedBucket.items.length > 0;
  if (isValidatingUserId || (isInitialLoading && !hasAnyProgram)) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          <PageHeaderSkeleton showBeta showCoach showRightSlot />

          {/* Programs grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Add New Program Card skeleton */}
            <div className={`${containerPatterns.dashedCard} p-6 opacity-60`}>
              <div className="text-center h-full flex flex-col justify-between">
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-synthwave-text-muted/20 animate-pulse rounded-xl mb-2 md:mb-3"></div>
                  <div className="h-5 md:h-6 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-40 md:w-48 mb-2 md:mb-3"></div>
                  <div className="h-3 md:h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-48 md:w-56 mb-3 md:mb-4"></div>
                  <div className="hidden md:block h-6 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-32 mb-3"></div>
                </div>
                {/* Bottom features skeleton — desktop only, mirrors loaded card */}
                <div className="hidden md:block border-t border-synthwave-neon-pink/20 pt-3 mt-3">
                  <div className="grid grid-cols-1 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center space-x-2"
                      >
                        <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                        <div className="h-4 w-40 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Program card skeletons */}
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`${containerPatterns.cardMedium} p-4 md:p-6 flex flex-col justify-between`}
              >
                <div className="flex-1">
                  {/* Program name skeleton with pink dot */}
                  <div className="flex items-start gap-3 mb-4 pr-10">
                    <span className="shrink-0 mt-1 text-synthwave-neon-pink/30 animate-pulse">
                      <WorkoutIconSmall />
                    </span>
                    <div className="flex-1">
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-48 mb-2"></div>
                    </div>
                  </div>

                  {/* Description skeleton */}
                  <div className="hidden sm:block">
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-full mb-2"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-3/4 mb-4"></div>
                  </div>

                  {/* Program details skeleton */}
                  <div className="space-y-3">
                    {/* Workout stats */}
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-48"></div>
                    </div>
                    {/* Progress */}
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-40"></div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-synthwave-text-muted/20 rounded-full animate-pulse w-full"></div>
                    {/* Created date */}
                    <div className="hidden sm:flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-32"></div>
                    </div>
                  </div>
                </div>

                {/* Action buttons skeleton — View Dashboard + Pause/Complete */}
                <div className="mt-2 space-y-2">
                  <div className="h-10 rounded-full bg-synthwave-text-muted/20 animate-pulse"></div>
                  <div className="flex space-x-2">
                    <div className="h-10 flex-1 rounded-full bg-synthwave-text-muted/20 animate-pulse"></div>
                    <div className="h-10 flex-1 rounded-full bg-synthwave-text-muted/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* In-Progress Sessions skeleton */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <div className="h-7 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-80 mx-auto mb-4"></div>
              <div className="h-5 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-full max-w-2xl mx-auto mb-2"></div>
              <div className="h-5 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-full max-w-xl mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.dashedCardCyan} p-6 opacity-60`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="shrink-0 mt-1 text-synthwave-neon-cyan/30 animate-pulse">
                      <SparkleIcon />
                    </span>
                    <div className="flex-1">
                      <div className="h-5 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-48"></div>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-32"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-40"></div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="h-4 bg-synthwave-neon-cyan/30 animate-pulse rounded-xl w-36"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paused Programs Section Skeleton */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <div className="h-7 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-80 mx-auto mb-4"></div>
              <div className="h-5 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-full max-w-2xl mx-auto mb-2"></div>
              <div className="h-5 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-full max-w-xl mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2].map((i) => (
                <div
                  key={`paused-skeleton-${i}`}
                  className={`${containerPatterns.cardMedium} p-4 md:p-6 flex flex-col justify-between`}
                >
                  <div className="flex-1">
                    {/* Program name skeleton with pink dot */}
                    <div className="flex items-start gap-3 mb-4 pr-10">
                      <span className="shrink-0 mt-1 text-synthwave-neon-pink/30 animate-pulse">
                        <WorkoutIconSmall />
                      </span>
                      <div className="flex-1">
                        <div className="h-6 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-48 mb-2"></div>
                      </div>
                    </div>

                    {/* Description skeleton */}
                    <div className="hidden sm:block">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-full mb-2"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-3/4 mb-4"></div>
                    </div>

                    {/* Program details skeleton */}
                    <div className="space-y-3">
                      {/* Workout stats */}
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-48"></div>
                      </div>
                      {/* Progress */}
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-40"></div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 bg-synthwave-text-muted/20 rounded-full animate-pulse w-full"></div>
                      {/* Created date */}
                      <div className="hidden sm:flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 animate-pulse rounded-xl w-32"></div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons skeleton — View Dashboard + Resume */}
                  <div className="mt-2 space-y-2">
                    <div className="h-10 rounded-full bg-synthwave-text-muted/20 animate-pulse"></div>
                    <div className="h-10 rounded-full bg-synthwave-text-muted/20 animate-pulse"></div>
                  </div>
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
        <PageHeader
          title="Your Programs"
          titleTooltipId="programs-info"
          titleTooltipContent="Manage all your training programs. View progress, pause, resume, or complete programs across all your coaches."
          beta
          betaTooltipId="beta-badge"
          betaTooltipContent="Training programs are in beta. You may experience pre-release behavior. We appreciate your feedback!"
          coachData={coachData}
          onCoachClick={() =>
            navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)
          }
          rightSlot={
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          }
        />

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
          {/* Create New Program Card — opens the contextual chat drawer
              instantly, so there's no in-flight loading state on the card. */}
          <div
            onClick={handleCreateProgram}
            className={`${containerPatterns.dashedCard} p-4 md:p-6 group cursor-pointer`}
          >
            <div className="text-center h-full flex flex-col justify-between">
              {/* Top Section */}
              <div className="flex-1 flex flex-col justify-center items-center">
                {/* Plus Icon */}
                <div className="text-synthwave-neon-pink/40 group-hover:text-synthwave-neon-pink/80 transition-colors duration-300 mb-1 md:mb-3">
                  <svg
                    className="w-8 h-8 md:w-12 md:h-12"
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
                </div>

                {/* Title */}
                <h3 className="font-header font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-base md:text-lg uppercase mb-1 md:mb-3 transition-colors duration-300">
                  Design New Program
                </h3>

                {/* Description */}
                <p
                  className={`${typographyPatterns.cardText} text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-xs md:text-sm transition-colors duration-300 text-center mb-0 md:mb-4 max-w-xs mx-auto`}
                >
                  Chat with your coach to design a personalized training program
                </p>

                {/* Info Badge - hidden on mobile to reduce card height */}
                <div className="hidden md:block bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 px-3 py-1 mb-3">
                  <p className="font-body text-synthwave-neon-pink text-xs font-semibold">
                    5-10 minute guided conversation
                  </p>
                </div>
              </div>

              {/* Bottom Features - desktop only; mobile keeps the card compact */}
              <div className="hidden md:block border-t border-synthwave-neon-pink/20 pt-3 mt-3">
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
            </div>
          </div>

          {/* Active Programs */}
          {programState.activeBucket.items.map((program) =>
            renderProgramCard(program),
          )}
        </div>

        {/* Active bucket error (independent of other buckets) */}
        {programState.activeBucket.error &&
          programState.activeBucket.items.length === 0 && (
            <div
              className={`${containerPatterns.inlineError} text-center mt-6`}
            >
              <p className={`${typographyPatterns.description} text-red-400`}>
                {programState.activeBucket.error}
              </p>
            </div>
          )}

        {/* Active bucket load-more */}
        <LoadMoreButton
          onClick={() => handleLoadMoreBucket(PROGRAM_STATUS.ACTIVE)}
          isLoading={programState.activeBucket.isLoadingMore}
          hasMore={
            programState.activeBucket.items.length <
            programState.activeBucket.totalCount
          }
        />

        {/* In-Progress Program Design Sessions */}
        {inProgressSessions && inProgressSessions.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-header font-bold text-xl md:text-2xl text-white mb-4 uppercase">
                Your In-Progress Program Designs
              </h2>
              <p className="font-body text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
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
                let cardClass, statusColor;
                if (isFailed) {
                  cardClass = `${containerPatterns.dashedCardPinkBold} p-6 group`;
                  statusColor = "text-synthwave-neon-pink";
                } else if (isBuilding) {
                  cardClass = `${containerPatterns.dashedCardCyan} p-6`;
                  statusColor = "text-synthwave-neon-cyan";
                } else {
                  cardClass = `${containerPatterns.dashedCardCyan} p-6 group cursor-pointer`;
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
                    <div className="flex items-start gap-3 mb-4">
                      <span className={`shrink-0 mt-1 ${statusColor}`}>
                        <SparkleIcon />
                      </span>
                      <div className="flex-1">
                        <h3 className="font-header font-bold text-white text-lg uppercase">
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
                        <span className="font-body text-sm font-medium">
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
                        <span className="font-body text-sm">
                          Coach:{" "}
                          <span className="text-synthwave-neon-cyan">
                            {formatCoachName(session.coachName) || "Unknown"}
                          </span>
                        </span>
                      </div>

                      {/* Started Date */}
                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <CalendarIcon />
                        <span className="font-body text-sm">
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
                        <span className="font-body text-sm">
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
                            <span className="font-body text-sm font-medium">
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
                        <div className="rounded-xl bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 p-3 mt-3">
                          <p className="font-body text-xs text-synthwave-neon-pink">
                            {session.programGeneration.error}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Links */}
                    <div className="pt-2">
                      {isIncomplete && !isBuilding && !isFailed ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 bg-transparent border-none text-synthwave-neon-cyan px-2 py-1 rounded-full hover:text-white hover:bg-synthwave-neon-cyan/10 transition-all duration-200 font-body font-medium uppercase tracking-wide hover:cursor-pointer">
                            <ArrowRightIcon />
                            <span>Continue Session</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session);
                            }}
                            className="bg-transparent border-none text-synthwave-neon-pink px-2 py-1 rounded-full hover:text-white hover:bg-synthwave-neon-pink/10 transition-all duration-200 font-body font-medium uppercase tracking-wide hover:cursor-pointer"
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
                            className="flex items-center space-x-2 bg-transparent border-none text-synthwave-neon-cyan px-2 py-1 rounded-full hover:text-white hover:bg-synthwave-neon-cyan/10 transition-all duration-200 font-body font-medium uppercase tracking-wide hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="bg-transparent border-none text-synthwave-neon-pink px-2 py-1 rounded-full hover:text-white hover:bg-synthwave-neon-pink/10 transition-all duration-200 font-body font-medium uppercase tracking-wide hover:cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="font-body text-xs text-synthwave-text-muted">
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
        {programState.pausedBucket.items.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-header font-bold text-xl md:text-2xl text-white mb-4 uppercase">
                Paused Training Programs
              </h2>
              <p className="font-body text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Training programs you've paused. Resume anytime to continue your
                training journey to achieve something great and personalized to
                your goals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
              {programState.pausedBucket.items.map((program) =>
                renderProgramCard(program),
              )}
            </div>

            <LoadMoreButton
              onClick={() => handleLoadMoreBucket(PROGRAM_STATUS.PAUSED)}
              isLoading={programState.pausedBucket.isLoadingMore}
              hasMore={
                programState.pausedBucket.items.length <
                programState.pausedBucket.totalCount
              }
            />
          </div>
        )}

        {/* Paused bucket error when empty (so failure is visible but not
            blocking the other buckets) */}
        {programState.pausedBucket.error &&
          programState.pausedBucket.items.length === 0 && (
            <div className="mt-16">
              <div className={`${containerPatterns.inlineError} text-center`}>
                <p className={`${typographyPatterns.description} text-red-400`}>
                  {programState.pausedBucket.error}
                </p>
              </div>
            </div>
          )}

        {/* Completed Programs Section */}
        {programState.completedBucket.items.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-header font-bold text-xl md:text-2xl text-white mb-4 uppercase">
                Completed Programs
              </h2>
              <p className="font-body text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Programs you've successfully completed. Celebrate your
                achievements!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
              {programState.completedBucket.items.map((program) =>
                renderProgramCard(program, false),
              )}
            </div>

            <LoadMoreButton
              onClick={() => handleLoadMoreBucket(PROGRAM_STATUS.COMPLETED)}
              isLoading={programState.completedBucket.isLoadingMore}
              hasMore={
                programState.completedBucket.items.length <
                programState.completedBucket.totalCount
              }
            />
          </div>
        )}

        {/* Completed bucket error when empty */}
        {programState.completedBucket.error &&
          programState.completedBucket.items.length === 0 && (
            <div className="mt-16">
              <div className={`${containerPatterns.inlineError} text-center`}>
                <p className={`${typographyPatterns.description} text-red-400`}>
                  {programState.completedBucket.error}
                </p>
              </div>
            </div>
          )}
        <AppFooter />
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
              <h3 className="text-synthwave-neon-pink font-body text-xl font-bold mb-2">
                Delete Program Session
              </h3>
              <p className="font-body text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete{" "}
                <strong className="text-white">
                  this program design session
                </strong>
                ? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowDeleteSessionModal(false);
                    setSessionToDelete(null);
                  }}
                  disabled={isDeleting}
                  className={`${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteSession}
                  disabled={isDeleting}
                  className={`${buttonPatterns.primaryMedium} disabled:opacity-50 disabled:cursor-not-allowed space-x-2`}
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
              <h3 className="text-synthwave-neon-pink font-body text-xl font-bold mb-2">
                Delete Training Program
              </h3>
              <p className="font-body text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete{" "}
                <strong className="text-white">{programToDelete.name}</strong>?
                This will remove it from your programs list.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`${buttonPatterns.primaryMedium} disabled:opacity-50 disabled:cursor-not-allowed space-x-2`}
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

      {/* Edit Program Modal */}
      {editingProgram && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              e.target.tagName !== "TEXTAREA" &&
              !e.target.closest('[contenteditable="true"]') &&
              !isSavingProgram &&
              editProgramName.trim()
            ) {
              e.preventDefault();
              handleSaveEditProgram();
            }
          }}
        >
          <div
            className={`${containerPatterns.successModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="pb-4 mb-5 border-b border-synthwave-neon-cyan/20">
              <h3 className={typographyPatterns.cardTitle}>Edit Program</h3>
            </div>

            <div className="mb-5">
              <label className={formPatterns.label}>Program Name</label>
              <input
                type="text"
                className={`${inputPatterns.standard} text-base hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 disabled:cursor-not-allowed disabled:text-synthwave-text-muted disabled:border-synthwave-neon-pink/20 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0`}
                style={{ boxShadow: "none", outline: "none" }}
                onFocus={(e) => {
                  e.target.style.outline = "none";
                  e.target.style.boxShadow = "none";
                }}
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
                placeholder="Enter program name"
              />
            </div>

            <div className="mb-5">
              <label className={formPatterns.label}>Description</label>
              <TiptapEditor
                content={editProgramDescription}
                onUpdate={(_html, text) => setEditProgramDescription(text)}
                placeholder="Enter program description"
                disabled={isSavingProgram}
                mode="plain"
                className={`tiptap-editor-pink ${inputPatterns.textarea} text-base disabled:cursor-not-allowed disabled:text-synthwave-text-muted disabled:border-synthwave-neon-pink/20`}
                minHeight="80px"
                maxHeight="200px"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelEditProgram}
                disabled={isSavingProgram}
                className={`${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditProgram}
                disabled={isSavingProgram || !editProgramName.trim()}
                className={`${buttonPatterns.primaryMedium} disabled:opacity-50 disabled:cursor-not-allowed space-x-2`}
              >
                {isSavingProgram ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
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
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    </svg>
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Program Modal */}
      {showShareModal && programToShare && (
        <ShareProgramModal
          program={programToShare}
          userId={userId}
          onClose={handleShareClose}
          onSuccess={handleShareSuccess}
        />
      )}

      {/* Tooltips */}
      <Tooltip
        id="program-name-tooltip"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
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

      {/* Program Designer drawer — FAB-only entry point. The "Design New
          Program" card and in-progress session cards on this page navigate
          to the dedicated /training-grounds/program-designer route for the
          full immersive experience. The drawer is for users who want to
          design without leaving the management view; the picker lets them
          switch to an in-progress session inline. */}
      {coachData && coachId && (
        <EntityChatFAB
          onClick={handleOpenProgramDesignerDrawer}
          isOpen={isProgramDesignerDrawerOpen}
          tooltip="Design a new program"
        />
      )}
      <ContextualChatDrawer
        isOpen={isProgramDesignerDrawerOpen}
        onClose={handleProgramDesignerDrawerClose}
        variant="programDesignerSession"
        userId={userId}
        userInitial={userInitial}
        userEmail={userEmail}
        userDisplayName={userDisplayName}
        coachId={programDesignerDrawerCoachId}
        coachData={coachData}
        entityLabel="Program Designer"
        existingSessionId={programDesignerDrawerSessionId}
        onSessionComplete={handleProgramDesignerSessionComplete}
        sessionPickerOptions={programDesignerSessionPickerOptions}
        isLoadingSessionPicker={sessionsLoading}
        onSessionPickerSelect={handleProgramDesignerPickerSelect}
        onSessionPickerNew={handleProgramDesignerPickerNew}
        onOpenSessionFullPage={handleProgramDesignerOpenFullPage}
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
