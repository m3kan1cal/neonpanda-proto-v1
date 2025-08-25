import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder, NewBadge } from './themes/SynthwaveComponents';
import CoachAgent from '../utils/agents/CoachAgent';

// Icons
const CoachIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const AdaptiveIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExpertIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1.657-2.657 1.657-2.657A8 8 0 0117.657 18.657z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-10V3a1 1 0 011-1h1a1 1 0 011 1v1M5 7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
  const agentRef = useRef(null);

  // Agent state (managed by CoachesAgent)
  const [agentState, setAgentState] = useState({
    coaches: [],
    isLoading: false,
    error: null,
    inProgressCoach: null
  });

  // Local loading states for button feedback
  const [isCreatingCustomCoach, setIsCreatingCustomCoach] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState(null);

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new CoachAgent({
        userId,
        onStateChange: (newState) => {
          setAgentState(newState);
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
  }, [navigate, userId]);



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

  // Show initial coach creator UI if no userId or no coaches found and no in-progress coach
  if (!agentRef.current || agentRef.current.shouldShowEmptyState()) {
    return (
      <div className={`${themeClasses.container} min-h-screen`}>
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              {!userId ? 'Create Your Personal Fitness Coach' : 'Create Your First Coach'}
            </h1>
            <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
              {!userId
                ? 'Get a personalized coach that learns from every interaction with you. The more you work together, the better your coach understands your needs, preferences, and progress patterns.'
                : 'You don\'t have any coaches yet. Create your first personalized coach that will learn and adapt to your unique fitness journey.'
              }
            </p>

            {/* Create Coach Button */}
            <button
              onClick={handleCreateCoach}
              disabled={isCreatingCustomCoach}
              className={`${themeClasses.neonButton} text-xl px-12 py-4 mb-16 flex items-center justify-center space-x-2 ${
                isCreatingCustomCoach ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isCreatingCustomCoach && (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isCreatingCustomCoach ? 'Creating Coach...' : 'Create My Coach'}</span>
            </button>

            {agentState.error && (
              <div className="text-center text-synthwave-neon-pink mb-8">
                <p className="font-rajdhani text-lg">{agentState.error}</p>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 - Personalized */}
            <NeonBorder color="pink" className="bg-synthwave-bg-card/50 p-8 text-center">
              <div className="text-synthwave-neon-pink mb-6 flex justify-center">
                <BrainIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase mb-4">
                AI-Powered Intelligence
              </h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Advanced AI that understands your unique goals, limitations, and preferences to create truly personalized training programs.
              </p>
            </NeonBorder>

            {/* Feature 2 - Adaptive */}
            <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 p-8 text-center">
              <div className="text-synthwave-neon-cyan mb-6 flex justify-center">
                <AdaptiveIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase mb-4">
                Adaptive Programming
              </h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Your coach evolves with you, adjusting workouts based on your progress, recovery, and changing goals.
              </p>
            </NeonBorder>

            {/* Feature 3 - Expert */}
            <NeonBorder color="purple" className="bg-synthwave-bg-card/50 p-8 text-center">
              <div className="text-synthwave-neon-purple mb-6 flex justify-center">
                <ExpertIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase mb-4">
                Expert Knowledge
              </h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Built on proven training methodologies and safety protocols to help you achieve your goals effectively and safely.
              </p>
            </NeonBorder>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
              <InfoIcon />
              <span>Your coach will be ready in about 15-20 minutes after creation</span>
            </div>
          </div>

          {/* Coach Templates Section for Empty State */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="font-russo font-black text-3xl md:text-4xl text-white mb-4 uppercase">
                Or Choose a Quick Start Template
              </h2>
              <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
                Get started instantly with a pre-configured coach tailored to specific goals and experience levels.
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
                  className="bg-transparent border-2 border-synthwave-neon-purple/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-purple hover:shadow-neon-purple hover:-translate-y-1 relative flex flex-col justify-between h-full"
                >
                    <div className="flex-1">
                      {/* New Badge */}
                      {isNewTemplate(template.metadata?.created_date) && <NewBadge />}


                      {/* Template Name */}
                      <h3 className="font-russo font-bold text-white text-lg uppercase mb-3 text-center">
                        {template.template_name}
                      </h3>

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
                        className={`
                          w-full px-4 py-3 rounded-lg font-rajdhani font-semibold text-sm uppercase tracking-wide transition-all duration-300 flex items-center justify-center space-x-2
                          ${userId
                            ? creatingTemplateId === template.template_id
                              ? 'bg-transparent border-2 border-synthwave-neon-purple text-synthwave-neon-purple opacity-75 cursor-not-allowed'
                              : 'bg-transparent border-2 border-synthwave-neon-purple text-synthwave-neon-purple hover:bg-synthwave-neon-purple hover:text-synthwave-bg-primary hover:shadow-neon-purple hover:-translate-y-1 active:translate-y-0'
                            : 'bg-gray-600/20 border border-gray-600/50 text-gray-500 cursor-not-allowed'
                          }
                        `}
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
          </div>
        </div>
      </div>
    );
  }

  // Show coaches list
  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Your Coaches
          </h1>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
            Manage your personalized coaching team. Each coach learns from your interactions and becomes more effective the more you work together.
          </p>
        </div>

        {/* Loading State */}
        {agentState.isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
              <div className="w-6 h-6 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
              <span>Loading your coaches...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {agentState.error && !agentState.isLoading && (
          <div className="text-center text-synthwave-neon-pink mb-8">
            <p className="font-rajdhani text-lg">{agentState.error}</p>
            <button
              onClick={handleRefresh}
              className={`${themeClasses.neonButton} text-sm px-6 py-2 mt-4`}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Coaches Grid */}
        {!agentState.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Add New Coach Card */}
            <div
              onClick={isCreatingCustomCoach ? undefined : handleCreateCoach}
              className={`bg-transparent border-2 border-synthwave-neon-pink/20 border-dashed rounded-lg p-6 transition-all duration-300 group ${
                isCreatingCustomCoach
                  ? 'opacity-75 cursor-not-allowed'
                  : 'hover:border-synthwave-neon-pink/60 hover:bg-synthwave-neon-pink/5 hover:-translate-y-1 cursor-pointer'
              }`}
            >
              <div className="text-center h-full flex flex-col justify-center items-center min-h-[300px]">
                {/* Plus Icon or Spinner */}
                <div className="text-synthwave-neon-pink/40 group-hover:text-synthwave-neon-pink/80 transition-colors duration-300 mb-4">
                  {isCreatingCustomCoach ? (
                    <div className="w-16 h-16 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>

                {/* Text */}
                <h3 className="font-russo font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-lg uppercase mb-2 transition-colors duration-300">
                  {isCreatingCustomCoach ? 'Creating Coach...' : 'Create New Coach'}
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center">
                  {isCreatingCustomCoach
                    ? 'Setting up your personalized coach'
                    : 'Build a custom coach or browse templates below'
                  }
                </p>
              </div>
            </div>

            {/* In-Progress Coach Card */}
            {agentState.inProgressCoach && (
              <div className="bg-transparent border-2 border-synthwave-neon-cyan/30 rounded-lg p-6 relative overflow-hidden">
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
                className="bg-transparent border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:shadow-neon-pink hover:-translate-y-1 flex flex-col justify-between h-full"
              >
                <div className="flex-1">
                  {/* Coach Name */}
                  <h3 className="font-russo font-bold text-white text-xl uppercase mb-4 text-center">
                    {agentRef.current?.formatCoachName(coach.coach_name)}
                  </h3>

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
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      const newSearchParams = new URLSearchParams();
                      newSearchParams.set('userId', userId);
                      newSearchParams.set('coachId', coach.coach_id);
                      navigate(`/training-grounds?${newSearchParams.toString()}`);
                    }}
                    className={`${themeClasses.neonButton} text-sm px-6 py-3 flex items-center justify-center space-x-2`}
                  >
                    <HomeIcon />
                    <span>Enter Training Grounds</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coach Templates Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="font-russo font-black text-3xl md:text-4xl text-white mb-4 uppercase">
              Quick Start Templates
            </h2>
            <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-2xl mx-auto leading-relaxed">
              Skip the setup and start with a pre-configured coach tailored to specific goals and experience levels.
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
                  className="bg-transparent border-2 border-synthwave-neon-purple/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-purple hover:shadow-neon-purple hover:-translate-y-1 relative flex flex-col justify-between h-full"
                >
                  <div className="flex-1">
                    {/* New Badge */}
                    {isNewTemplate(template.metadata?.created_date) && <NewBadge />}


                    {/* Template Name */}
                    <h3 className="font-russo font-bold text-white text-lg uppercase mb-3 text-center">
                      {template.template_name}
                    </h3>

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
                      className={`
                        w-full px-4 py-3 rounded-lg font-rajdhani font-semibold text-sm uppercase tracking-wide transition-all duration-300 flex items-center justify-center space-x-2
                        ${userId
                          ? creatingTemplateId === template.template_id
                            ? 'bg-transparent border-2 border-synthwave-neon-purple text-synthwave-neon-purple opacity-75 cursor-not-allowed'
                            : 'bg-transparent border-2 border-synthwave-neon-purple text-synthwave-neon-purple hover:bg-synthwave-neon-purple hover:text-synthwave-bg-primary hover:shadow-neon-purple hover:-translate-y-1 active:translate-y-0'
                          : 'bg-gray-600/20 border border-gray-600/50 text-gray-500 cursor-not-allowed'
                        }
                      `}
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

    </div>
  );
}

export default Coaches;