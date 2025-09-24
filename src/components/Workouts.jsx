import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import { themeClasses } from "../utils/synthwaveThemeClasses";
import { buttonPatterns, containerPatterns, layoutPatterns } from "../utils/uiPatterns";
import { NeonBorder } from "./themes/SynthwaveComponents";
import CoachHeader from "./shared/CoachHeader";
import WorkoutAgent from "../utils/agents/WorkoutAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { useToast } from "../contexts/ToastContext";
import WorkoutViewer from "./WorkoutViewer";
import { FloatingMenuManager } from "./shared/FloatingMenuManager";
import CommandPalette from './shared/CommandPalette';
import IconButton from './shared/IconButton';
import {
  FullPageLoader,
  CenteredErrorState,
  EmptyState,
} from "./shared/ErrorStates";
import { CloseIcon, WorkoutIcon } from "./themes/SynthwaveComponents";

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

const SaveIcon = () => (
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
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const CancelIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const JsonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

function Workouts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const workoutId = searchParams.get("workoutId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);

  // View state
  const [viewMode, setViewMode] = useState("formatted"); // 'formatted' or 'raw'

  // Workout title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');

  const workoutAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  const { addToast, success, error, info } = useToast();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      // Cmd/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteCommand('');
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [isCommandPaletteOpen]);

  // Workout state
  const [workoutAgentState, setWorkoutAgentState] = useState({
    currentWorkout: null,
    recentWorkouts: [],
    isLoadingRecentItems: false,
    isLoadingItem: !!(userId && workoutId && coachId), // Start loading if we have required params
    error: null,
  });

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !workoutId || !coachId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, workoutId, coachId, navigate]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        // Use the agent states directly
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          // Get loading states from agent
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          // Get data from agent
          recentWorkouts: newState.recentWorkouts || [],
          error: newState.error || null,
          // Keep our current workout separate from the agent's state
          currentWorkout: prevState.currentWorkout,
        }));
      });

      // Set up additional callbacks
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

  // Load coach data for FloatingMenuManager
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const coachData = await coachAgentRef.current.loadCoachDetails(userId, coachId);
        setCoachData(coachData);
      } catch (error) {
        console.error('Failed to load coach data:', error);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Auto-scroll to top when workoutId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [workoutId]);

  // Load specific workout
  useEffect(() => {
    if (!userId || !workoutId || !workoutAgentRef.current) return;

    const loadWorkout = async () => {
      try {
        // Clear any existing workout and set loading state
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          currentWorkout: null,
          isLoadingItem: true,
          error: null,
        }));

        // Use the workout agent to get the specific workout
        // The agent will handle isLoadingItem state internally via state callback
        const workout = await workoutAgentRef.current.getWorkout(workoutId);

        setWorkoutAgentState((prevState) => ({
          ...prevState,
          currentWorkout: workout,
        }));
      } catch (error) {
        console.error("Error loading workout:", error);
        // Error state is handled by the agent
      }
    };

    loadWorkout();
  }, [userId, workoutId]);

  const handleToggleView = () => {
    setViewMode(viewMode === "formatted" ? "raw" : "formatted");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Workout title editing handlers
  const handleEditTitle = () => {
    setEditTitleValue(
      workoutAgentState.currentWorkout?.workoutData?.workout_name || ""
    );
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (
      !editTitleValue.trim() ||
      !workoutAgentRef.current ||
      !workoutAgentState.currentWorkout
    )
      return;

    setIsSavingTitle(true);
    try {
      await workoutAgentRef.current.updateWorkout(
        userId,
        workoutAgentState.currentWorkout.workoutId,
        {
          workoutData: {
            workout_name: editTitleValue.trim(),
          },
        }
      );

      // Update local state with the new title
      setWorkoutAgentState((prevState) => ({
        ...prevState,
        currentWorkout: {
          ...prevState.currentWorkout,
          workoutData: {
            ...prevState.currentWorkout.workoutData,
            workout_name: editTitleValue.trim(),
          },
        },
      }));

      setIsEditingTitle(false);
      info("Workout title updated successfully");
    } catch (error) {
      console.error("Error updating workout title:", error);
      error("Failed to update workout title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditTitleValue("");
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Delete workout handlers
  const handleDeleteClick = (workout) => {
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete || !workoutAgentRef.current || !userId) return;

    setIsDeleting(true);
    try {
      await workoutAgentRef.current.deleteWorkout(
        userId,
        workoutToDelete.workoutId
      );
      success("Workout deleted successfully");
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
      // Navigate back to manage workouts after successful deletion
      navigate(
        `/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`
      );
    } catch (error) {
      console.error("Error deleting workout:", error);
      error("Failed to delete workout");
      // Close modal even on error so user can try again
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  // Close delete modal or cancel title edit when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (showDeleteModal) {
          handleCancelDelete();
        } else if (isEditingTitle) {
          handleCancelEdit();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteModal, isEditingTitle]);

  // Render workout list
  const renderWorkoutList = () => (
    <div className="space-y-2">
      {workoutAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading workouts...</span>
          </div>
        </div>
      ) : workoutAgentState.recentWorkouts.length === 0 ? (
        <EmptyState title="No workouts found" size="medium" />
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Workouts
          </div>
          {workoutAgentState.recentWorkouts.map((workout) => (
            <div
              key={workout.workoutId}
              onClick={() => {
                if (workout.workoutId !== workoutId) {
                  navigate(
                    `/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${coachId}`
                  );
                }
                // Close the popover after clicking
                handleClosePopover();
              }}
              className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                workout.workoutId === workoutId
                  ? "bg-synthwave-bg-primary/50 border-synthwave-neon-pink"
                  : "bg-synthwave-bg-primary/30 border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50"
              }`}
            >
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
                  <LightningIcon />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // Render conversation list
  const renderConversationList = () => (
    <div className="space-y-2">
      {coachConversationAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading conversations...</span>
          </div>
        </div>
      ) : coachConversationAgentState.recentConversations.length === 0 ? (
        <EmptyState title="No conversations found" size="medium" />
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Conversations
          </div>
          {coachConversationAgentState.recentConversations.map((conv) => (
            <div
              key={conv.conversationId}
              onClick={() => handleConversationClick(conv.conversationId)}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
            >
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
          ))}
        </>
      )}
    </div>
  );

  // Show skeleton loading while validating userId or loading workout
  if (
    isValidatingUserId ||
    (workoutAgentState.isLoadingItem &&
      (!workoutAgentState.currentWorkout ||
        workoutAgentState.currentWorkout.workoutId !== workoutId))
  ) {
    return (
      <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
        <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
          {/* Header skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>

            {/* Coach header skeleton */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="text-left">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-2"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
              </div>
            </div>

            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mx-auto"></div>
          </div>

          {/* Main Content Area skeleton */}
          <div className="flex-1">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              <div className="p-6 h-full overflow-y-auto space-y-6">
                {/* Action buttons skeleton */}
                <div className="flex justify-end space-x-2">
                  <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                  <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                </div>

                {/* Workout sections skeleton */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                      </div>
                      <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
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
        message={userIdError || "You can only access your own workouts."}
      />
    );
  }

  // Show error state
  if (workoutAgentState.error) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={workoutAgentState.error}
        buttonText="Back to Training Grounds"
        onButtonClick={() =>
          navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)
        }
        variant="error"
      />
    );
  }

  const workout = workoutAgentState.currentWorkout;

  return (
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Workout Details
          </h1>

          {/* Coach Header */}
          {coachData && (
            <CoachHeader coachData={coachData} isOnline={true} />
          )}

          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            View detailed breakdown of your completed workout including exercises, sets, reps, and performance metrics.
            Use the tools above to manage or export your workout data.
          </p>
          <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
            <div className="flex items-center space-x-1 bg-synthwave-bg-primary/30 px-2 py-1 rounded border border-synthwave-neon-pink/20">
              <span className="text-synthwave-neon-pink">⌘</span>
              <span>+ K</span>
            </div>
            <span>for Command Palette</span>
            <div className="flex items-center space-x-1">
              <span>(</span>
              <svg className="w-4 h-4 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Works on any page )</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                {workout ? (
                  <WorkoutViewer
                    workout={workout}
                    onToggleView={handleToggleView}
                    onDeleteWorkout={handleDeleteClick}
                    viewMode={viewMode}
                    isEditingTitle={isEditingTitle}
                    editTitleValue={editTitleValue}
                    isSavingTitle={isSavingTitle}
                    onEditTitle={handleEditTitle}
                    onSaveTitle={handleSaveTitle}
                    onCancelEdit={handleCancelEdit}
                    onTitleChange={setEditTitleValue}
                    onTitleKeyPress={handleTitleKeyPress}
                    formatDate={formatDate}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <EmptyState title="No workout data available" size="large" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand('');
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={workoutAgentRef.current}
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === 'conversation-created') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="workouts"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && workoutToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}>
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Workout
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete "
                {workoutAgentRef.current?.formatWorkoutSummary(
                  workoutToDelete,
                  true
                ) || "this workout"}
                "? This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workouts;
