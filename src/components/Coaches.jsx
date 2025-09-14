import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { buttonPatterns, containerPatterns, layoutPatterns, typographyPatterns } from '../utils/uiPatterns';
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

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

// Helper function to check if a template is new (created within last 30 days)
const isNewTemplate = (createdDate) => {
  if (!createdDate) return false;
  const templateDate = new Date(createdDate);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return templateDate >= thirtyDaysAgo;
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

  // Local loading states for button feedback
  const [isCreatingCustomCoach, setIsCreatingCustomCoach] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState(null);

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load in-progress sessions
  const loadInProgressSessions = async () => {
    if (!userId) return;

    setSessionsLoading(true);
    try {
      const sessions = await CoachCreatorAgent.getInProgressSessions(userId);
      setInProgressSessions(sessions);
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
          {/* Header skeleton */}
          <div className="text-center mb-16">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto"></div>
          </div>

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
                <div key={i} className={`${containerPatterns.dashedCard} p-6 opacity-60`}>
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2"></div>
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
                    <div className="h-4 bg-synthwave-neon-pink/30 rounded animate-pulse w-36"></div>
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

  // Debug logging - temporary
  console.info('🐛 Coaches Debug:', {
    isCreatingCustomCoach,
    agentStateIsLoading: agentState.isLoading,
    hasInProgressCoach: !!agentState.inProgressCoach,
    agentStateError: agentState.error
  });

  // Show coaches list
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className={typographyPatterns.pageTitle}>
            Your Coaches
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto mb-4`}>
            Manage your personalized coaching team. Each coach learns from your interactions and becomes more effective the more you work together.
          </p>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                        Takes 15-20 minutes
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
              <div className={`${containerPatterns.loadingCard} p-6 relative overflow-hidden`}>
                {/* Animated background overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-synthwave-neon-cyan/5 to-synthwave-neon-pink/5 animate-pulse"></div>

                <div className="relative z-10">
                  {/* Coach Icon with loading animation */}
                  <div className="text-synthwave-neon-cyan mb-6 flex justify-center">
                    <div className="relative">
                      <CoachIcon />
                      <div className="absolute inset-0 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>

                  {/* Coach Name */}
                  <h3 className="font-russo font-bold text-white text-xl uppercase mb-4 text-center">
                    Creating Your Coach...
                  </h3>

                  {/* Status Details */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-synthwave-neon-cyan">
                      <div className="w-5 h-5 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-rajdhani text-sm">
                        Generating AI Coach Configuration
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-synthwave-text-secondary">
                      <CalendarIcon />
                      <span className="font-rajdhani text-xs">
                        Started {agentRef.current?.formatDate(new Date(agentState.inProgressCoach.timestamp).toISOString())}
                      </span>
                    </div>

                    <div className="text-center pt-4 border-t border-synthwave-neon-cyan/20">
                      <span className="font-rajdhani text-xs text-synthwave-text-muted">
                        This usually takes 2-5 minutes
                      </span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-6">
                    <div className="w-full bg-synthwave-bg-primary/50 rounded-full h-2 border border-synthwave-neon-cyan/30">
                      <div className="bg-synthwave-neon-cyan h-full rounded-full animate-pulse shadow-neon-cyan" style={{ width: '60%' }}></div>
                    </div>
                  </div>
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
                  {/* Coach Name */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
                    <h3 className="font-russo font-bold text-white text-xl uppercase">
                      {agentRef.current?.formatCoachName(coach.coach_name)}
                    </h3>
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
              <h2 className="font-russo font-black text-3xl md:text-4xl text-white mb-4 uppercase">
                Your In-Progress Coaches
              </h2>
              <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Great progress! You're building something amazing and personal. Pick up where you left off and bring your perfect coach to life.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {inProgressSessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => {
                    const newSearchParams = new URLSearchParams();
                    newSearchParams.set('userId', userId);
                    newSearchParams.set('coachCreatorSessionId', session.sessionId);
                    navigate(`/coach-creator?${newSearchParams.toString()}`);
                  }}
                  className={`${containerPatterns.dashedCard} p-6 group`}
                >
                  {/* Session Header */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                    <div className="flex-1">
                      <h3 className="font-russo font-bold text-white text-lg uppercase">
                        Coach Creator Session
                      </h3>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-3 mb-2">
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
                  </div>

                  {/* Action Links */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 bg-transparent border-none text-synthwave-neon-pink px-2 py-1 hover:text-white hover:bg-synthwave-neon-pink/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide hover:cursor-pointer">
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
                  </div>
                </div>
              ))}
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

            <h2 className="font-russo font-black text-3xl md:text-4xl text-white mb-4 uppercase">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {agentState.templates.map((template) => (
                <div
                  key={template.template_id}
                  className={`${containerPatterns.templateCard} p-6 relative flex flex-col justify-between h-full`}
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
                    <button
                      onClick={() => handleCreateFromTemplate(template.template_id)}
                      disabled={!userId || creatingTemplateId === template.template_id}
                      className={`w-full space-x-2 ${userId
                          ? creatingTemplateId === template.template_id
                            ? `${buttonPatterns.primaryMedium} opacity-75 cursor-not-allowed`
                            : buttonPatterns.primaryMedium
                          : 'bg-gray-600/20 border border-gray-600/50 text-gray-500 cursor-not-allowed px-4 py-2 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide min-h-[40px] flex items-center justify-center'
                        }`}
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
                    </button>
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
                  className={`flex-1 ${buttonPatterns.secondary} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primary} text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
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
    </div>
  );
}

export default Coaches;