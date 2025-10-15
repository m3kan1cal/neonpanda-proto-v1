import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { buttonPatterns, containerPatterns, layoutPatterns, typographyPatterns, tooltipPatterns } from '../utils/uiPatterns';
import { Tooltip } from 'react-tooltip';
import CompactCoachCard from './shared/CompactCoachCard';
import CommandPaletteButton from './shared/CommandPaletteButton';
import CommandPalette from './shared/CommandPalette';
import { InlineEditField } from './shared/InlineEditField';
import {
  NeonBorder,
  NewBadge,
  TrashIcon,
  CoachIcon,
  CalendarIcon,
  TargetIcon,
  TemplateIcon,
  SparkleIcon,
  PlayIcon,
  ArrowRightIcon,
  HomeIcon
} from './themes/SynthwaveComponents';
import CoachAgent from '../utils/agents/CoachAgent';
import CoachCreatorAgent from '../utils/agents/CoachCreatorAgent';
import { useToast } from '../contexts/ToastContext';

// Vesper coach data - static coach for coach creator
const vesperCoachData = {
  coach_id: 'vesper-coach-creator',
  coach_name: 'Vesper_the_Coach_Creator',
  name: 'Vesper',
  avatar: 'V',
  metadata: {
    title: 'Coach Creator Guide & Mentor',
    description: 'Your guide through the coach creation process'
  }
};

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

// Helper function to check if a template is new (created within last 3 months)
const isNewTemplate = (createdDate) => {
  if (!createdDate) return false;
  const templateDate = new Date(createdDate);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
  return templateDate >= threeMonthsAgo;
};

// Helper function to replace underscores with spaces and & with commas for display
const formatDisplayText = (text) => {
  if (!text) return text;
  return text.replace(/_/g, ' ').replace(/\s*&\s*/g, ', ');
};

function Coaches() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const toast = useToast();

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);
  const agentRef = useRef(null);

  // Agent state (managed by CoachesAgent)
  const [agentState, setAgentState] = useState({
    coaches: [],
    isLoading: false,
    error: null,
    inProgressCoach: null
  });

  // In-progress sessions state (managed separately via CoachCreatorAgent)
  const [inProgressSessions, setInProgressSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Retry build state
  const [retryingSessionId, setRetryingSessionId] = useState(null);

  // Local loading states for button feedback
  const [isCreatingCustomCoach, setIsCreatingCustomCoach] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState(null);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  // Load in-progress sessions and check for building/failed coaches
  const loadInProgressSessions = async () => {
    if (!userId) return;

    setSessionsLoading(true);
    try {
      // Get incomplete sessions (still answering questions)
      const incompleteSessions = await CoachCreatorAgent.getInProgressSessions(userId);

      // Get completed sessions (to check for building/failed status)
      const completedSessions = await CoachCreatorAgent.getCompletedSessions(userId);

      // Filter for sessions that are building or failed
      const buildingOrFailedSessions = completedSessions.filter(session =>
        session.configGeneration?.status === 'IN_PROGRESS' ||
        session.configGeneration?.status === 'FAILED'
      );

      // Combine all sessions for display
      const allActiveSessions = [...incompleteSessions, ...buildingOrFailedSessions];
      setInProgressSessions(allActiveSessions);

      // If there's a building session, set up polling and in-progress coach card
      const buildingSession = buildingOrFailedSessions.find(
        session => session.configGeneration?.status === 'IN_PROGRESS'
      );

      if (buildingSession) {
        // Show building session as in-progress coach
        agentRef.current?._updateState({
          inProgressCoach: {
            sessionId: buildingSession.sessionId,
            timestamp: new Date(buildingSession.lastActivity || buildingSession.completedAt).getTime(),
            status: 'generating',
            message: 'Generating AI Coach Configuration'
          }
        });

        // Start polling for this session
        agentRef.current?.startPolling(buildingSession.sessionId);
      }
    } catch (error) {
      console.error('Error loading in-progress sessions:', error);
      setInProgressSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load in-progress sessions when userId changes
  useEffect(() => {
    if (userId) {
      loadInProgressSessions();
    }
  }, [userId]);

  // Handle delete click - show modal
  const handleDeleteClick = (session) => {
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!sessionToDelete || !userId) return;

    setIsDeleting(true);
    try {
      await CoachCreatorAgent.deleteCoachCreatorSession(userId, sessionToDelete.sessionId);
      // Remove the deleted session from the local state
      setInProgressSessions(prev => prev.filter(session => session.sessionId !== sessionToDelete.sessionId));
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      // Could show toast notification here
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  // Handle retry build for failed coach config builds
  const handleRetryBuild = async (session) => {
    if (!userId || !session.sessionId) return;

    setRetryingSessionId(session.sessionId);
    try {
      await agentRef.current?.createCoachFromSession(session.sessionId, userId);
      // Update the session status locally to show it's building again
      setInProgressSessions(prev => prev.map(s =>
        s.sessionId === session.sessionId
          ? {
              ...s,
              configGeneration: {
                status: 'IN_PROGRESS',
                startedAt: new Date().toISOString()
              },
              lastActivity: new Date().toISOString()
            }
          : s
      ));
      toast.success('Coach build started successfully');
    } catch (error) {
      console.error('Error retrying coach config build:', error);
      // Clear the agent error state to prevent it from showing on the page
      agentRef.current?._updateState({ error: null });
      // Show toast instead
      toast.error('Failed to retry build. Please try again.');
    } finally {
      setRetryingSessionId(null);
    }
  };

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new CoachAgent({
        userId,
        onStateChange: (newState) => {
          if (setAgentState) {
            setAgentState(newState);
          }
        },
        onNavigation: (type, data) => {
          if (type === 'coach-creator') {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set('userId', data.userId);
            newSearchParams.set('coachCreatorSessionId', data.sessionId);
            navigate(`/coach-creator?${newSearchParams.toString()}`);
          }
        },
        onError: (error) => {
          console.error('CoachAgent error:', error);
          // Could show toast notification here
        }
      });

      // Initialize after the component is ready
      setTimeout(() => {
        if (agentRef.current) {
          agentRef.current.initialize();
        }
      }, 0);
    } else {
      // Update agent when userId changes
      agentRef.current.setUserId(userId);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId]);



  const handleCreateCoach = async () => {
    if (!agentRef.current) return;

    setIsCreatingCustomCoach(true);
    try {
      await agentRef.current.createNewCoach(userId);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    } finally {
      setIsCreatingCustomCoach(false);
    }
  };

  const handleRefresh = async () => {
    if (!agentRef.current) return;

    try {
      await agentRef.current.refresh();
      await loadInProgressSessions(); // Also refresh sessions
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const handleCreateFromTemplate = async (templateId) => {
    if (!agentRef.current) return;

    setCreatingTemplateId(templateId);
    try {
      const coachConfig = await agentRef.current.createCoachFromTemplate(templateId, userId);

      // Redirect to training grounds for the newly created coach
      if (coachConfig && coachConfig.coach_id) {
        const newSearchParams = new URLSearchParams();
        newSearchParams.set('userId', userId);
        newSearchParams.set('coachId', coachConfig.coach_id);
        navigate(`/training-grounds?${newSearchParams.toString()}`);
      }
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    } finally {
      setCreatingTemplateId(null);
    }
  };

  // Show skeleton loading while validating userId or loading coaches
  if (isValidatingUserId || agentState.isLoading) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Title skeleton - compact size */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-72"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Coaches grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Add New Coach Card skeleton */}
            <div className={`${containerPatterns.dashedCard} opacity-60`}>
              <div className="text-center h-full flex flex-col justify-between min-h-[350px]">
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded animate-pulse mb-4"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-3"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-56 mb-4"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                </div>
              </div>
            </div>

            {/* Coach card skeletons */}
            {[1, 2].map((i) => (
              <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                <div className="flex-1">
                  {/* Coach name skeleton */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>

                  {/* Coach details skeleton */}
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
              <div className="h-10 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
              <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2].map((i) => (
                <div key={i} className={`${containerPatterns.dashedCardCyan} p-6 opacity-60`}>
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

          {/* Templates section skeleton */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <div className="h-8 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
              <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-2"></div>
              <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto"></div>
            </div>

            {/* Template cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${containerPatterns.templateCard} p-6 flex flex-col justify-between h-full min-h-[350px]`}>
                  <div className="flex-1">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                    </div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-full mb-2"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4 mb-4"></div>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      </div>
                    </div>
                  </div>
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
    return <AccessDenied message={userIdError || "You can only access your own coaches."} />;
  }

  // Redirect to home if no userId
  if (!userId) {
    navigate('/', { replace: true });
    return null;
  }

  // Show coaches list
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Coaches Header"
        >
          {/* Left section: Title + Vesper Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="coaches-info"
              data-tooltip-content="Manage your personalized coaching team. Each coach learns from your interactions and becomes more effective over time."
            >
              Your Coaches
            </h1>

            {/* Compact Vesper Coach Card */}
            <CompactCoachCard
              coachData={vesperCoachData}
              isOnline={true}
              onClick={() => navigate(`/coaches?userId=${userId}`)}
              tooltipContent="Go to Your Coaches"
            />
          </div>

          {/* Right section: Command Palette Button */}
          <div className="flex items-center gap-3">
            <CommandPaletteButton onClick={() => setIsCommandPaletteOpen(true)} />
          </div>
        </header>

        {/* Error State */}
        {agentState.error && (
          <div className="text-center text-synthwave-neon-pink mb-8">
            <p className="font-rajdhani text-lg">{agentState.error}</p>
            <button
              onClick={handleRefresh}
              className={`${buttonPatterns.primarySmall} mt-4`}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Coaches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto auto-rows-fr animate-fadeIn">
            {/* Add New Coach Card */}
            <div
              onClick={isCreatingCustomCoach ? undefined : handleCreateCoach}
              className={`${containerPatterns.dashedCard} group ${
                isCreatingCustomCoach
                  ? 'opacity-75 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              <div className="text-center h-full flex flex-col justify-between min-h-[350px]">
                {/* Top Section */}
                <div className="flex-1 flex flex-col justify-center items-center">
                  {/* Plus Icon or Spinner */}
                  <div className="text-synthwave-neon-pink/40 group-hover:text-synthwave-neon-pink/80 transition-colors duration-300 mb-4">
                    {isCreatingCustomCoach ? (
                      <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-russo font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-lg uppercase mb-3 transition-colors duration-300">
                    {isCreatingCustomCoach ? 'Creating Coach...' : 'Create Custom Coach'}
                  </h3>

                  {/* Description */}
                  <p className="font-rajdhani text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center mb-4">
                    {isCreatingCustomCoach
                      ? 'Setting up your personalized coach'
                      : 'Design your perfect coach through our guided process'
                    }
                  </p>

                  {/* Time Estimate */}
                  {!isCreatingCustomCoach && (
                    <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-lg px-3 py-1 mb-4">
                      <p className="font-rajdhani text-synthwave-neon-pink text-xs font-semibold">
                        Takes 25-30 minutes
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Features - Only show when not creating */}
                {!isCreatingCustomCoach && (
                  <div className="border-t border-synthwave-neon-pink/20 pt-3 mt-3 pb-4">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary transition-colors duration-300">
                        <svg className="w-3 h-3 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-rajdhani text-sm">Methodology Intelligence</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary transition-colors duration-300">
                        <svg className="w-3 h-3 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-rajdhani text-sm">Predictive Intelligence</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary transition-colors duration-300">
                        <svg className="w-3 h-3 text-synthwave-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-rajdhani text-sm">Movement & Mental Coaching</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* In-Progress Coach Card */}
            {agentState.inProgressCoach && (
              <div className={`${
                agentState.inProgressCoach.status === 'failed' || agentState.inProgressCoach.status === 'timeout'
                  ? 'bg-synthwave-bg-card/60 border-2 border-synthwave-neon-pink/50 rounded-2xl shadow-xl shadow-synthwave-neon-pink/20 hover:shadow-2xl hover:shadow-synthwave-neon-pink/30 transition-all duration-300 hover:-translate-y-1'
                  : 'bg-synthwave-bg-card/30 backdrop-blur-lg border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/30 hover:bg-synthwave-bg-card/40 transition-all duration-300'
              } p-6 relative overflow-hidden`}>
                {/* Animated background overlay - only for generating state */}
                {agentState.inProgressCoach.status === 'generating' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-synthwave-neon-cyan/5 to-synthwave-neon-pink/5 animate-pulse"></div>
                )}

                <div className="relative z-10">
                  {/* Status Icon */}
                  <div className={`mb-6 flex justify-center ${
                    agentState.inProgressCoach.status === 'failed' || agentState.inProgressCoach.status === 'timeout'
                      ? 'text-synthwave-neon-pink'
                      : 'text-synthwave-neon-cyan'
                  }`}>
                    {agentState.inProgressCoach.status === 'failed' || agentState.inProgressCoach.status === 'timeout' ? (
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="relative">
                        <CoachIcon />
                        <div className="absolute inset-0 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Status Title */}
                  <h3 className="font-russo font-bold text-white text-xl uppercase mb-4 text-center">
                    {agentState.inProgressCoach.status === 'failed' ? 'Coach Creation Failed' :
                     agentState.inProgressCoach.status === 'timeout' ? 'Coach Creation Timed Out' :
                     'Creating Your Coach...'}
                  </h3>

                  {/* Status Details */}
                  <div className="space-y-3">
                    {/* Error message for failed state */}
                    {(agentState.inProgressCoach.status === 'failed' || agentState.inProgressCoach.status === 'timeout') && (
                      <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-lg p-3 mb-3">
                        <p className="font-rajdhani text-sm text-synthwave-neon-pink">
                          {agentState.inProgressCoach.error || 'An error occurred during coach creation'}
                        </p>
                      </div>
                    )}

                    {/* Loading message for generating state */}
                    {agentState.inProgressCoach.status === 'generating' && (
                      <div className="flex items-center space-x-2 text-synthwave-neon-cyan">
                        <div className="w-5 h-5 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-rajdhani text-sm">
                          {agentState.inProgressCoach.message || 'Generating AI Coach Configuration'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                      <CalendarIcon />
                      <span className="font-rajdhani text-xs">
                        Started {agentRef.current?.formatDate(new Date(agentState.inProgressCoach.timestamp).toISOString())}
                      </span>
                    </div>

                    {agentState.inProgressCoach.status === 'generating' && (
                      <div className="text-center pt-4 border-t border-synthwave-neon-cyan/20">
                        <span className="font-rajdhani text-xs text-synthwave-text-muted">
                          This usually takes 2-5 minutes
                        </span>
                      </div>
                    )}

                    {/* Retry button for failed/timeout state */}
                    {(agentState.inProgressCoach.status === 'failed' || agentState.inProgressCoach.status === 'timeout') && (
                      <div className="pt-4 border-t border-synthwave-neon-pink/20">
                        <button
                          onClick={() => {
                            // Clear the failed in-progress coach and allow user to try again
                            agentRef.current?.clearInProgressCoach();
                          }}
                          className={`${buttonPatterns.secondary} w-full text-sm`}
                        >
                          Dismiss
                        </button>
                        <p className="font-rajdhani text-xs text-synthwave-text-muted text-center mt-2">
                          You can try creating a new coach or contact support if this problem persists.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress indicator - only for generating state */}
                  {agentState.inProgressCoach.status === 'generating' && (
                    <div className="mt-6">
                      <div className="w-full bg-synthwave-bg-primary/50 rounded-full h-2 border border-synthwave-neon-cyan/30">
                        <div className="bg-synthwave-neon-cyan h-full rounded-full animate-pulse shadow-neon-cyan" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Existing Coaches */}
            {agentState.coaches && agentState.coaches.map((coach) => (
              <div
                key={coach.coach_id}
                className={`${containerPatterns.cardMedium} p-6 flex flex-col justify-between h-full`}
              >
                <div className="flex-1">
                  {/* Coach Name with Inline Edit */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
                    <InlineEditField
                      value={agentRef.current?.formatCoachName(coach.coach_name)}
                      onSave={async (newName) => {
                        if (!newName || !newName.trim()) {
                          throw new Error('Coach name cannot be empty');
                        }
                        await agentRef.current?.updateCoachConfig(userId, coach.coach_id, {
                          coach_name: newName.trim()
                        });
                        // Update local state directly instead of full refresh
                        setAgentState(prevState => ({
                          ...prevState,
                          coaches: prevState.coaches.map(c =>
                            c.coach_id === coach.coach_id
                              ? { ...c, coach_name: newName.trim() }
                              : c
                          )
                        }));
                        toast.success('Coach name updated successfully');
                      }}
                      placeholder="Coach name..."
                      maxLength={50}
                      size="large"
                      displayClassName="font-russo font-bold text-white text-xl uppercase"
                      tooltipPrefix={`coach-${coach.coach_id}`}
                      onError={(error) => {
                        toast.error(error.message || 'Failed to update coach name');
                      }}
                    />
                  </div>

                  {/* Coach Details */}
                  <div className="space-y-3">
                    {/* Experience Level */}
                    <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                      <TargetIcon />
                      <span className="font-rajdhani text-sm">
                        {formatDisplayText(agentRef.current?.getExperienceLevelDisplay(coach.technical_config?.experience_level)) || 'General'} Level
                      </span>
                    </div>

                    {/* Programming Focus */}
                    <div className="flex items-start space-x-2 text-synthwave-text-secondary">
                      <div className="mt-0.5">
                        <TargetIcon />
                      </div>
                      <span className="font-rajdhani text-sm">
                        Focus: {formatDisplayText(agentRef.current?.getProgrammingFocusDisplay(coach.technical_config?.programming_focus))}
                      </span>
                    </div>

                    {/* Specializations */}
                    <div className="flex items-start space-x-2 text-synthwave-text-secondary">
                      <div className="mt-0.5">
                        <TargetIcon />
                      </div>
                      <span className="font-rajdhani text-sm">
                        {formatDisplayText(agentRef.current?.getSpecializationDisplay(coach.technical_config?.specializations))}
                      </span>
                    </div>

                    {/* Conversations Count */}
                    <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-rajdhani text-sm">
                        {coach.metadata?.total_conversations || 0} conversations
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center space-x-2 text-synthwave-text-muted">
                      <CalendarIcon />
                      <span className="font-rajdhani text-xs">
                        Created {agentRef.current?.formatDate(coach.metadata?.created_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      const newSearchParams = new URLSearchParams();
                      newSearchParams.set('userId', userId);
                      newSearchParams.set('coachId', coach.coach_id);
                      navigate(`/training-grounds?${newSearchParams.toString()}`);
                    }}
                    className={`${buttonPatterns.secondaryMedium} w-full space-x-2`}
                  >
                    <HomeIcon />
                    <span>Enter Training Grounds</span>
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* In-Progress Coach Creator Sessions */}
        {inProgressSessions && inProgressSessions.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="font-russo font-black text-xl md:text-2xl text-white mb-4 uppercase">
                Your In-Progress Coaches
              </h2>
              <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Great progress! You're building something amazing and personal. Pick up where you left off and bring your perfect coach to life.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto auto-rows-fr">
              {inProgressSessions.map((session) => {
                // Determine session status and styling
                const isBuilding = session.configGeneration?.status === 'IN_PROGRESS';
                const isFailed = session.configGeneration?.status === 'FAILED';
                const isIncomplete = !session.isComplete;

                // Get card styling based on status - all driven by uiPatterns.js for consistency
                let cardClass, dotColor, statusColor;
                if (isFailed) {
                  // Failed state: Pink theme with bold borders for emphasis
                  cardClass = `${containerPatterns.dashedCardPinkBold} p-6 group`;
                  dotColor = 'bg-synthwave-neon-pink';
                  statusColor = 'text-synthwave-neon-pink';
                } else if (isBuilding) {
                  // Building state: Cyan theme for in-progress indication
                  cardClass = `${containerPatterns.dashedCardCyan} p-6`;
                  dotColor = 'bg-synthwave-neon-cyan';
                  statusColor = 'text-synthwave-neon-cyan';
                } else {
                  // Incomplete state: Cyan theme with full interactivity
                  cardClass = `${containerPatterns.dashedCardCyan} p-6 group cursor-pointer`;
                  dotColor = 'bg-synthwave-neon-cyan';
                  statusColor = 'text-synthwave-neon-cyan';
                }

                return (
                  <div
                    key={session.sessionId}
                    onClick={() => {
                      // Only allow clicking for incomplete sessions
                      if (isIncomplete && !isBuilding && !isFailed) {
                        const newSearchParams = new URLSearchParams();
                        newSearchParams.set('userId', userId);
                        newSearchParams.set('coachCreatorSessionId', session.sessionId);
                        navigate(`/coach-creator?${newSearchParams.toString()}`);
                      }
                    }}
                    className={cardClass}
                  >
                    {/* Session Header */}
                    <div className="flex items-start space-x-3 mb-4">
                      <div className={`w-3 h-3 ${dotColor} rounded-full flex-shrink-0 mt-2`}></div>
                      <div className="flex-1">
                        <h3 className="font-russo font-bold text-white text-lg uppercase">
                          Coach Creator Session
                        </h3>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="space-y-3 mb-2">
                      {/* Status - matches format of other metadata fields */}
                      <div className={`flex items-center space-x-2 ${statusColor}`}>
                        {isFailed ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : isBuilding ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="font-rajdhani text-sm font-medium">
                          {isFailed ? 'Build Failed' : isBuilding ? 'Building Coach' : 'Answering Questions'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <CalendarIcon />
                        <span className="font-rajdhani text-sm">
                          Started {agentRef.current?.formatDate(session.startedAt)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-rajdhani text-sm">
                          Last activity {agentRef.current?.formatDate(session.lastActivity)}
                        </span>
                      </div>

                      {session.questionsCompleted && (
                        <div className="flex items-center space-x-2 text-synthwave-neon-cyan">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-rajdhani text-sm font-medium">
                            {session.questionsCompleted} questions answered
                          </span>
                        </div>
                      )}

                      {/* Show error message for failed builds */}
                      {isFailed && session.configGeneration?.error && (
                        <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-lg p-3 mt-3">
                          <p className="font-rajdhani text-xs text-synthwave-neon-pink">
                            {session.configGeneration.error}
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
                              e.stopPropagation(); // Prevent card click
                              handleDeleteClick(session);
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
                              e.stopPropagation(); // Prevent card click
                              handleRetryBuild(session);
                            }}
                            disabled={retryingSessionId === session.sessionId}
                            className="flex items-center space-x-2 bg-transparent border-none text-synthwave-neon-cyan px-2 py-1 hover:text-white hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              className={`w-4 h-4 ${retryingSessionId === session.sessionId ? 'animate-spin-ccw' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{retryingSessionId === session.sessionId ? 'Retrying...' : 'Retry Build'}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleDeleteClick(session);
                            }}
                            className="bg-transparent border-none text-synthwave-neon-pink px-2 py-1 hover:text-white hover:bg-synthwave-neon-pink/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="font-rajdhani text-xs text-synthwave-text-muted">
                            Coach configuration is being generated...
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

        {/* Coach Templates Section */}
        <div className="mt-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-synthwave-neon-cyan/30"></div>
              <span className="font-russo text-synthwave-neon-cyan text-lg uppercase mx-6 tracking-wider">OR</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-synthwave-neon-cyan/30"></div>
            </div>

            <h2 className="font-russo font-black text-xl md:text-2xl text-white mb-4 uppercase">
              Start Fast with Templates
            </h2>
            <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
              Need to get going quickly? Choose from pre-configured coaches designed for specific goals and experience levels. You can always customize them later.
            </p>
          </div>

          {/* Templates Loading State */}
          {agentState.templatesLoading && (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
                <div className="w-6 h-6 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                <span>Loading templates...</span>
              </div>
            </div>
          )}

          {/* Templates Error State */}
          {agentState.templatesError && !agentState.templatesLoading && (
            <div className="text-center text-synthwave-neon-pink mb-8">
              <p className="font-rajdhani text-lg">{agentState.templatesError}</p>
            </div>
          )}

          {/* Templates Grid */}
          {!agentState.templatesLoading && agentState.templates && agentState.templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto auto-rows-fr">
              {agentState.templates.map((template) => (
                <div
                  key={template.template_id}
                  onClick={() => {
                    if (userId && creatingTemplateId !== template.template_id) {
                      handleCreateFromTemplate(template.template_id);
                    }
                  }}
                  className={`${containerPatterns.templateCard} p-6 relative flex flex-col justify-between h-full ${
                    userId && creatingTemplateId !== template.template_id ? 'cursor-pointer' : creatingTemplateId === template.template_id ? 'cursor-wait' : 'cursor-not-allowed'
                  }`}
                >
                  <div className="flex-1">
                    {/* New Badge */}
                    {isNewTemplate(template.metadata?.created_date) && <NewBadge />}

                    {/* Template Name */}
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                      <h3 className="font-russo font-bold text-white text-lg uppercase">
                        {template.template_name}
                      </h3>
                    </div>

                    {/* Template Description */}
                    <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-4 leading-relaxed">
                      {template.description}
                    </p>

                    {/* Template Details */}
                    <div className="space-y-2 mb-6">
                      {/* Target Audience */}
                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <TargetIcon />
                        <span className="font-rajdhani text-xs">
                          {agentRef.current?.getTemplateAudienceDisplay(template.target_audience)}
                        </span>
                      </div>

                      {/* Popularity */}
                      <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                        <SparkleIcon />
                        <span className="font-rajdhani text-xs">
                          {template.metadata.popularity_score || 0} users
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="text-center">
                    <div
                      className={`w-full space-x-2 ${userId
                          ? creatingTemplateId === template.template_id
                            ? buttonPatterns.primaryMediumLoading
                            : buttonPatterns.primaryMedium
                          : buttonPatterns.primaryMediumDisabled
                        }`}
                      tabIndex={userId && creatingTemplateId !== template.template_id ? 0 : -1}
                      role="button"
                    >
                      {creatingTemplateId === template.template_id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        userId && <PlusIcon />
                      )}
                      <span>
                        {creatingTemplateId === template.template_id
                          ? 'Creating...'
                          : userId
                          ? 'Create Coach'
                          : 'Login Required'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Templates Message */}
          {!agentState.templatesLoading && agentState.templates && agentState.templates.length === 0 && !agentState.templatesError && (
            <div className="text-center text-synthwave-text-secondary">
              <p className="font-rajdhani text-lg">No templates available at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && sessionToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}>
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Coach Creator Session
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this coach creator session? This action cannot be undone.
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

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand('');
        }}
        prefilledCommand={commandPaletteCommand}
        userId={userId}
        coachId={vesperCoachData.coach_id}
        onNavigation={(type, data) => {
          if (type === 'conversation-created') {
            // Could navigate to a new conversation if needed
          }
        }}
      />

      {/* Tooltips */}
      <Tooltip
        id="coaches-info"
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
        @keyframes spin-ccw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-spin-ccw {
          animation: spin-ccw 1s linear infinite;
        }

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

export default Coaches;