import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import TrainingGroundsAgent from '../utils/agents/TrainingGroundsAgent';
import WorkoutAgent from '../utils/agents/WorkoutAgent';

// Icons
const ConversationIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ProgramIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const WorkoutIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ResourcesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const MessagesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);



const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const LightningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

function TrainingGrounds() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');

  const [showCoachDetails, setShowCoachDetails] = useState(false);
  const agentRef = useRef(null);
  const workoutAgentRef = useRef(null);

  // Agent state (managed by TrainingGroundsAgent)
  const [agentState, setAgentState] = useState({
    coachData: null,
    recentConversations: [],
    isLoading: false,
    isLoadingConversations: false,
    isCreatingConversation: false,
    error: null,
  });

  // Workout state (managed by WorkoutAgent)
  const [workoutState, setWorkoutState] = useState({
    recentWorkouts: [],
    totalWorkoutCount: 0,
    isLoading: false,
    error: null,
  });

  // Create stable callback reference with useCallback
  const handleWorkoutStateChange = useCallback((newState) => {
    console.info('TrainingGrounds: WorkoutAgent state changed:', newState);
    setWorkoutState(newState);
  }, []); // Empty dependency array = stable reference

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

    // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new TrainingGroundsAgent({
        userId,
        coachId,
        onStateChange: (newState) => {
          setAgentState(newState);
        },
        onNavigation: (type, data) => {
          if (type === 'conversation-created') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          } else if (type === 'view-conversation') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        },
        onError: (error) => {
          console.error('TrainingGroundsAgent error:', error);
          // Could show toast notification here
        }
      });
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [navigate]);

  // Initialize workout agent with stable callback
  useEffect(() => {
    if (!workoutAgentRef.current) {
      console.info('TrainingGrounds: Creating new WorkoutAgent with stable callback');
      workoutAgentRef.current = new WorkoutAgent(null, handleWorkoutStateChange);
    }

    return () => {
      if (workoutAgentRef.current) {
        console.info('TrainingGrounds: Cleaning up WorkoutAgent');
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [handleWorkoutStateChange]);

  // Initialize data when userId or coachId changes
  useEffect(() => {
    if (agentRef.current && userId && coachId) {
      agentRef.current.initialize(userId, coachId);
    }
  }, [userId, coachId]);

  // Initialize workout data when userId changes
  useEffect(() => {
    console.info('TrainingGrounds: userId changed:', userId);
    console.info('TrainingGrounds: workoutAgentRef.current:', workoutAgentRef.current);

    if (workoutAgentRef.current && userId) {
      console.info('TrainingGrounds: Setting userId on WorkoutAgent:', userId);
      workoutAgentRef.current.setUserId(userId);
    } else {
      console.warn('TrainingGrounds: Missing workoutAgentRef or userId:', {
        hasWorkoutAgent: !!workoutAgentRef.current,
        userId
      });
    }
  }, [userId]);

  const handleStartNewConversation = async () => {
    if (!agentRef.current || !userId || !coachId || agentState.isCreatingConversation) return;

    try {
      await agentRef.current.createNewConversation(userId, coachId);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const handleViewConversation = (conversationId) => {
    if (!agentRef.current) return;
    agentRef.current.navigateToConversation(conversationId);
  };

  const formatConversationDate = (dateString) => {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const truncateTitle = (title, maxLength = 30) => {
    if (!title || title.length <= maxLength) return title || 'Untitled';
    return title.substring(0, maxLength) + '...';
  };

  const renderWorkoutList = () => (
    <div className="space-y-2">
      {workoutState.isLoading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading workouts...</span>
          </div>
        </div>
      ) : workoutState.error ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-neon-pink text-sm mb-2">
            Workout API Error
          </div>
          <div className="font-rajdhani text-synthwave-text-muted text-xs">
            {workoutState.error}
          </div>
        </div>
      ) : workoutState.recentWorkouts.length === 0 ? (
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
          {workoutState.recentWorkouts.map((workout) => (
            <div
              key={workout.workoutId}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {workoutAgentRef.current?.formatWorkoutSummary(workout) || 'Workout'}
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 flex items-center space-x-2">
                    <span>{workoutAgentRef.current?.formatWorkoutTime(workout.completedAt) || 'Unknown time'}</span>
                    {workout.extractionMetadata?.confidence && (
                      <span className={`${workoutAgentRef.current?.getConfidenceColorClass(workout.extractionMetadata.confidence) || 'text-synthwave-text-secondary'}`}>
                        • {workoutAgentRef.current?.getConfidenceDisplay(workout.extractionMetadata.confidence) || 'Unknown'}
                      </span>
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





  if (!userId || !coachId) {
    return (
      <div className={`${themeClasses.container} min-h-screen`}>
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
            Invalid Training Grounds Access
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-8">
            Both User ID and Coach ID are required to access the Training Grounds.
          </p>
          <button
            onClick={() => navigate('/coaches')}
            className={`${themeClasses.neonButton} text-lg px-8 py-3`}
          >
            Return to Coaches
          </button>
        </div>
      </div>
    );
  }

  if (agentState.isLoading) {
    return (
      <div className={`${themeClasses.container} min-h-screen`}>
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
              <div className="w-6 h-6 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
              <span>Loading Training Grounds...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agentState.error) {
    return (
      <div className={`${themeClasses.container} min-h-screen`}>
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
            Training Grounds Error
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-neon-pink mb-8">
            {agentState.error}
          </p>
          <button
            onClick={() => navigate('/coaches')}
            className={`${themeClasses.neonButton} text-lg px-8 py-3`}
          >
            Back to Coaches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          {/* Title */}
          <div className="text-center">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Training Grounds
            </h1>
            <div className="font-rajdhani text-xl text-synthwave-text-secondary mb-4 flex items-center justify-center space-x-3">
              <span className="text-synthwave-neon-pink">{agentState.coachData?.name}</span>
              <button
                onClick={() => setShowCoachDetails(true)}
                className="text-synthwave-neon-pink hover:text-synthwave-neon-pink transition-all duration-300 p-1 rounded-full hover:bg-synthwave-neon-pink/10 hover:shadow-lg hover:shadow-synthwave-neon-pink/50"
                title="View coach details"
              >
                <InfoIcon />
              </button>
            </div>
                        <div className="font-rajdhani text-lg text-synthwave-text-secondary mb-4 space-y-1">
              <div>
                <span className="text-synthwave-neon-pink">Specialization:</span> {agentState.coachData?.specialization}
              </div>
              <div>
                <span className="text-synthwave-neon-pink">Level:</span> {agentState.coachData?.experienceLevel} •
                <span className="text-synthwave-neon-pink"> Focus:</span> {agentState.coachData?.programmingFocus}
              </div>
              <div>
                <span className="text-synthwave-neon-pink">Methodology:</span> {agentState.coachData?.primaryMethodology}
              </div>
            </div>
            <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto">
              Your dedicated workspace for all activities with this coach. Track progress, access resources, and stay connected.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 max-w-5xl mx-auto">
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
              {agentState.isLoading ? (
                <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                agentState.coachData?.totalConversations || 0
              )}
            </div>
            <div className="font-rajdhani text-sm text-synthwave-text-secondary">
              Total Conversations
            </div>
          </div>
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
              {workoutState.isLoading ? (
                <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                workoutState.totalWorkoutCount || 0
              )}
            </div>
            <div className="font-rajdhani text-sm text-synthwave-text-secondary">
              Total Workouts
            </div>
          </div>
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
              {agentState.isLoading ? (
                <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                agentState.coachData?.activePrograms || 0
              )}
            </div>
            <div className="font-rajdhani text-sm text-synthwave-text-secondary">
              Active Programs
            </div>
          </div>
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
              24
            </div>
            <div className="font-rajdhani text-sm text-synthwave-text-secondary">
              Days Training
            </div>
          </div>
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Conversations Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <ConversationIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Conversations
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Chat with your coach for personalized guidance and support.
            </p>

            {/* Recent Conversations List */}
            <div className="space-y-3 mb-6">
              {agentState.isLoadingConversations ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
                    <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading conversations...</span>
                  </div>
                </div>
              ) : agentState.recentConversations.length > 0 ? (
                <>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                    Recent Conversations
                  </div>
                  {agentState.recentConversations.map((conversation) => (
                    <div
                      key={conversation.conversationId}
                      onClick={() => handleViewConversation(conversation.conversationId)}
                      className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-rajdhani text-sm text-white font-medium truncate">
                            {truncateTitle(conversation.title)}
                          </div>
                          <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                            {formatConversationDate(conversation.metadata?.lastActivity || conversation.createdAt)} • {conversation.metadata?.totalMessages || 0} messages
                          </div>
                        </div>
                        <div className="text-synthwave-neon-pink ml-2">
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                    No conversations yet
                  </div>
                </div>
              )}
            </div>

            {/* Start New Conversation Button */}
            <div className="text-center">
              <button
                onClick={handleStartNewConversation}
                disabled={agentState.isCreatingConversation}
                className={`${themeClasses.neonButton} text-sm px-6 py-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2`}
              >
                {agentState.isCreatingConversation ? 'Creating...' : 'Start New Conversation'}
              </button>
            </div>
          </div>

          {/* Training Programs Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-cyan/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-cyan hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-cyan">
                <ProgramIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Training Programs
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Active training programs and workout plans.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>

          {/* Analytics & Insights Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-purple/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-purple hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-purple">
                <AnalyticsIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Analytics & Insights
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Performance analytics and personalized insights.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>

          {/* Workout History Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <WorkoutIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Workout History
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Recent completed workouts and session logs.
            </p>

            {/* Workout List */}
            <div className="mb-6">
              {renderWorkoutList()}
            </div>

            {/* Log Workout Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  // TODO: Implement workout logging functionality
                  console.log('Log Workout clicked - functionality to be implemented');
                }}
                className={`${themeClasses.neonButton} text-sm px-6 py-3 transition-all duration-300 inline-flex items-center space-x-2 mx-auto`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Log Workout</span>
              </button>
            </div>
          </div>

          {/* Resources & Tools Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-cyan/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-cyan hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-cyan">
                <ResourcesIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Resources & Tools
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Exercise library, tools, and coaching resources.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>

          {/* Messages & Notifications Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-purple/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-purple hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-purple">
                <MessagesIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Messages & Notifications
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Important messages and system notifications.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Coach Details Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowCoachDetails(true)}
          className="bg-synthwave-bg-card/90 border-2 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:border-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          title="View coach details"
        >
          <InfoIcon />
        </button>
      </div>

      {/* Mobile Coach Details Modal */}
      {showCoachDetails && (
        <div className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-synthwave-bg-card/95 border-2 border-synthwave-neon-pink/30 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-synthwave-neon-pink/30 pb-4 mb-6">
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Coach Details
                </h3>
                <button
                  onClick={() => setShowCoachDetails(false)}
                  className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300"
                >
                  <ChevronRightIcon />
                </button>
              </div>

              {agentState.coachData && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Basic Information
                    </h4>
                    <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Name:</span>
                      <span className="text-white font-medium">{agentState.coachData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Created:</span>
                      <span className="text-white">{agentState.coachData.rawCoach && new Date(agentState.coachData.joinedDate).toLocaleDateString()}</span>
                    </div>
                    </div>
                  </div>

                  {/* Training Configuration */}
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Training Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-synthwave-text-secondary block mb-1">Experience Level:</span>
                        <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                          {agentState.coachData.experienceLevel}
                        </span>
                      </div>
                      <div>
                        <span className="text-synthwave-text-secondary block mb-1">Programming Focus:</span>
                        <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                          {agentState.coachData.programmingFocus}
                        </span>
                      </div>
                      <div>
                        <span className="text-synthwave-text-secondary block mb-1">Specializations:</span>
                        <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                          {agentState.coachData.specialization}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Activity Statistics
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-synthwave-bg-primary/30 rounded p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-synthwave-text-secondary text-sm">Total Conversations</span>
                          <span className="text-synthwave-neon-pink font-bold text-lg">{agentState.coachData.totalConversations}</span>
                        </div>
                      </div>
                      <div className="bg-synthwave-bg-primary/30 rounded p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-synthwave-text-secondary text-sm">Active Programs</span>
                          <span className="text-synthwave-neon-pink font-bold text-lg">{agentState.coachData.activePrograms}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Mobile Sections - abbreviated for space */}
                  {(agentState.coachData.rawCoach?.coachConfig?.metadata?.methodology_profile ||
                    agentState.coachData.rawCoach?.coachConfig?.technical_config?.methodology ||
                    agentState.coachData.rawCoach?.coachConfig?.selected_methodology) && (
                    <div>
                      <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                        Methodology
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Primary:</span>
                          <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                            {agentState.coachData.primaryMethodology}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {agentState.coachData.rawCoach?.coachConfig?.metadata?.safety_profile?.equipment && (
                    <div>
                      <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                        Equipment
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.equipment.map((eq, idx) => (
                          <span key={idx} className="text-white bg-synthwave-neon-cyan/20 px-2 py-1 rounded text-xs">
                            {eq.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Coach Details Panel - Slides from Right */}
      <div className="hidden lg:block">
        {/* Toggle Button */}
        <button
          onClick={() => setShowCoachDetails(!showCoachDetails)}
          className={`fixed top-1/2 -translate-y-1/2 bg-synthwave-bg-card/90 border-2 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:border-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 p-3 rounded-l-lg transition-all duration-300 hover:-translate-x-1 z-50 ${
            showCoachDetails ? 'right-96' : 'right-0'
          }`}
          title={showCoachDetails ? "Hide coach details" : "Show coach details"}
        >
          <div className="flex items-center space-x-1">
            <InfoIcon />
            {showCoachDetails ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </div>
        </button>

        {/* Details Panel - Slides from Right */}
        <div className={`fixed top-20 right-0 h-[calc(100vh-5rem)] bg-synthwave-bg-card/95 backdrop-blur-sm border-l-2 border-synthwave-neon-pink/30 transition-all duration-300 z-40 ${
          showCoachDetails ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="w-96 h-full overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-synthwave-neon-pink/30 pb-4 mb-6">
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Coach Details
              </h3>
              <button
                onClick={() => setShowCoachDetails(false)}
                className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300"
              >
                <ChevronRightIcon />
              </button>
            </div>

            {agentState.coachData && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Name:</span>
                      <span className="text-white font-medium">{agentState.coachData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Coach ID:</span>
                      <span className="text-white font-mono text-xs">{coachId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Created:</span>
                                              <span className="text-white">{new Date(agentState.coachData.joinedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Training Configuration */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    Training Configuration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-synthwave-text-secondary block mb-1">Experience Level:</span>
                      <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                        {agentState.coachData.experienceLevel}
                      </span>
                    </div>
                    <div>
                      <span className="text-synthwave-text-secondary block mb-1">Programming Focus:</span>
                      <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                        {agentState.coachData.programmingFocus}
                      </span>
                    </div>
                    <div>
                      <span className="text-synthwave-text-secondary block mb-1">Specializations:</span>
                      <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                        {agentState.coachData.specialization}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    Activity Statistics
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-synthwave-bg-primary/30 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-synthwave-text-secondary text-sm">Total Conversations</span>
                        <span className="text-synthwave-neon-pink font-bold text-lg">{agentState.coachData.totalConversations}</span>
                      </div>
                    </div>
                    <div className="bg-synthwave-bg-primary/30 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-synthwave-text-secondary text-sm">Active Programs</span>
                        <span className="text-synthwave-neon-pink font-bold text-lg">{agentState.coachData.activePrograms}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Methodology Profile - Show if we have methodology data from any source */}
                {(agentState.coachData.rawCoach?.coachConfig?.metadata?.methodology_profile ||
                  agentState.coachData.rawCoach?.coachConfig?.technical_config?.methodology ||
                  agentState.coachData.rawCoach?.coachConfig?.selected_methodology) && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Methodology Profile
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-synthwave-text-secondary block mb-1">Primary Methodology:</span>
                        <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                          {agentState.coachData.primaryMethodology}
                        </span>
                      </div>
                      {agentState.coachData.rawCoach.coachConfig?.metadata?.methodology_profile?.experience && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Experience:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.metadata.methodology_profile.experience.map((exp, idx) => (
                              <span key={idx} className="text-white bg-synthwave-bg-primary/30 px-2 py-1 rounded text-xs">
                                {exp.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentState.coachData.rawCoach.coachConfig?.metadata?.methodology_profile?.preferences && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Preferences:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.metadata.methodology_profile.preferences.map((pref, idx) => (
                              <span key={idx} className="text-white bg-synthwave-bg-primary/30 px-2 py-1 rounded text-xs">
                                {pref.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Show note if only basic methodology is available */}
                      {!agentState.coachData.rawCoach.coachConfig?.metadata?.methodology_profile && (
                        <div className="text-xs text-synthwave-text-muted bg-synthwave-bg-primary/10 p-2 rounded">
                          Basic methodology configuration. Extended profile available in newer coach versions.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Safety Profile */}
                {agentState.coachData.rawCoach?.coachConfig?.metadata?.safety_profile && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Safety & Equipment Profile
                    </h4>
                    <div className="space-y-3 text-sm">
                      {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.equipment && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Available Equipment:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.equipment.map((eq, idx) => (
                              <span key={idx} className="text-white bg-synthwave-neon-cyan/20 px-2 py-1 rounded text-xs">
                                {eq.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.contraindications && agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.contraindications.length > 0 && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Contraindications:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.contraindications.map((contra, idx) => (
                              <span key={idx} className="text-synthwave-neon-pink bg-synthwave-neon-pink/20 px-2 py-1 rounded text-xs">
                                {contra.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.modifications && agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.modifications.length > 0 && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Required Modifications:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.modifications.map((mod, idx) => (
                              <span key={idx} className="text-white bg-synthwave-bg-primary/30 px-2 py-1 rounded text-xs">
                                {mod.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Time Constraints:</span>
                          <div className="text-white bg-synthwave-bg-primary/30 px-2 py-1 rounded text-xs inline-block">
                            {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration && typeof agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration === 'string'
                              ? agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration.replace(/_/g, ' ')
                              : agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration || 'Not specified'
                            } • {agentState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.preferred_time || 'Not specified'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Personality */}
                {agentState.coachData.rawCoach?.coachConfig?.selected_personality && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Personality Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-synthwave-text-secondary block mb-1">Primary Template:</span>
                        <span className="text-white bg-synthwave-bg-primary/50 px-2 py-1 rounded text-xs">
                          {agentState.coachData.rawCoach.coachConfig.selected_personality.primary_template && typeof agentState.coachData.rawCoach.coachConfig.selected_personality.primary_template === 'string'
                            ? agentState.coachData.rawCoach.coachConfig.selected_personality.primary_template.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            : agentState.coachData.rawCoach.coachConfig.selected_personality.primary_template || 'Not specified'}
                        </span>
                      </div>
                      {agentState.coachData.rawCoach.coachConfig.selected_personality.secondary_influences && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Secondary Influences:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.selected_personality.secondary_influences.map((inf, idx) => (
                              <span key={idx} className="text-white bg-synthwave-bg-primary/30 px-2 py-1 rounded text-xs">
                                {inf.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentState.coachData.rawCoach.coachConfig.selected_personality.selection_reasoning && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Selection Reasoning:</span>
                          <div className="text-xs text-synthwave-text-secondary bg-synthwave-bg-primary/20 p-2 rounded leading-relaxed">
                            {agentState.coachData.rawCoach.coachConfig.selected_personality.selection_reasoning.substring(0, 200)}...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Technical Configuration */}
                {agentState.coachData.rawCoach?.coachConfig?.technical_config && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Advanced Technical Config
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-synthwave-bg-primary/20 rounded p-2">
                          <span className="text-synthwave-text-muted block mb-1">Goal Timeline:</span>
                          <span className="text-white">
                            {agentState.coachData.rawCoach.coachConfig.technical_config.goal_timeline && typeof agentState.coachData.rawCoach.coachConfig.technical_config.goal_timeline === 'string'
                              ? agentState.coachData.rawCoach.coachConfig.technical_config.goal_timeline.replace(/_/g, ' ')
                              : agentState.coachData.rawCoach.coachConfig.technical_config.goal_timeline || 'Not specified'}
                          </span>
                        </div>
                        <div className="bg-synthwave-bg-primary/20 rounded p-2">
                          <span className="text-synthwave-text-muted block mb-1">Training Frequency:</span>
                          <span className="text-white">{agentState.coachData.rawCoach.coachConfig.technical_config.training_frequency} days/week</span>
                        </div>
                        <div className="bg-synthwave-bg-primary/20 rounded p-2">
                          <span className="text-synthwave-text-muted block mb-1">Intensity:</span>
                          <span className="text-white">
                            {agentState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity && typeof agentState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity === 'string'
                              ? agentState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity.replace(/_/g, ' ')
                              : agentState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity || 'Not specified'}
                          </span>
                        </div>
                        <div className="bg-synthwave-bg-primary/20 rounded p-2">
                          <span className="text-synthwave-text-muted block mb-1">Methodology:</span>
                          <span className="text-white">
                            {agentState.coachData.rawCoach.coachConfig.technical_config.methodology && typeof agentState.coachData.rawCoach.coachConfig.technical_config.methodology === 'string'
                              ? agentState.coachData.rawCoach.coachConfig.technical_config.methodology.replace(/_/g, ' ')
                              : agentState.coachData.rawCoach.coachConfig.technical_config.methodology || 'Not specified'}
                          </span>
                        </div>
                      </div>
                      {agentState.coachData.rawCoach.coachConfig.technical_config.injury_considerations && agentState.coachData.rawCoach.coachConfig.technical_config.injury_considerations.length > 0 && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Injury Considerations:</span>
                          <div className="flex flex-wrap gap-1">
                            {agentState.coachData.rawCoach.coachConfig.technical_config.injury_considerations.map((inj, idx) => (
                              <span key={idx} className="text-synthwave-neon-pink bg-synthwave-neon-pink/20 px-2 py-1 rounded text-xs">
                                {inj.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentState.coachData.rawCoach.coachConfig.technical_config.safety_constraints && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-1">Safety Constraints:</span>
                          <div className="text-xs text-synthwave-text-secondary bg-synthwave-bg-primary/20 p-2 rounded space-y-1">
                            {agentState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.volume_progression_limit && (
                              <div>Volume Progression: {agentState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.volume_progression_limit}</div>
                            )}
                            {agentState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.contraindicated_exercises && (
                              <div>Contraindicated: {agentState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.contraindicated_exercises.join(', ').replace(/_/g, ' ')}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* System Information */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    System Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="bg-synthwave-bg-primary/20 rounded p-2">
                      <span className="text-synthwave-text-muted block mb-1">Coach Type:</span>
                      <span className="text-white font-mono">{agentState.coachData.rawCoach.type || 'AI Coach'}</span>
                    </div>
                    <div className="bg-synthwave-bg-primary/20 rounded p-2">
                      <span className="text-synthwave-text-muted block mb-1">Version:</span>
                      <span className="text-white font-mono">
                        {agentState.coachData.rawCoach.coachConfig?.metadata?.version || 'v1.0'}
                      </span>
                    </div>
                    <div className="bg-synthwave-bg-primary/20 rounded p-2">
                      <span className="text-synthwave-text-muted block mb-1">Entity Type:</span>
                      <span className="text-white font-mono">{agentState.coachData.rawCoach.entityType}</span>
                    </div>
                    <div className="bg-synthwave-bg-primary/20 rounded p-2">
                      <span className="text-synthwave-text-muted block mb-1">Last Updated:</span>
                      <span className="text-white font-mono">{new Date(agentState.coachData.rawCoach.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default TrainingGrounds;