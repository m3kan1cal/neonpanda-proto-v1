import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
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

    try {
      await agentRef.current.createNewCoach(userId);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
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

  // Show initial coach creator UI if no userId or no coaches found and no in-progress coach
  if (!agentRef.current || agentRef.current.shouldShowEmptyState()) {
    return (
      <div className={`${themeClasses.container} min-h-screen`}>
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              {!userId ? 'Create Your Virtual Fitness Coach' : 'Create Your First Coach'}
            </h1>
            <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
              {!userId
                ? 'Get a personalized virtual coach with adaptive intelligence tailored to your goals, experience, and preferences. Takes about 15-20 minutes to set up your perfect training partner.'
                : 'You don\'t have any coaches yet. Create your first personalized virtual coach to get started with your fitness journey.'
              }
            </p>

            {/* Create Coach Button */}
            <button
              onClick={handleCreateCoach}
              className={`${themeClasses.neonButton} text-xl px-12 py-4 mb-16`}
            >
              Create My Coach
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
            Your Virtual Coaches
          </h1>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
            Manage your personalized virtual coaches. Each coach is tailored to specific goals and training preferences.
          </p>

          {/* Create New Coach Button */}
          <button
            onClick={handleCreateCoach}
            className={`${themeClasses.neonButton} text-lg px-8 py-3 mb-8`}
          >
            Create New Coach
          </button>
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
        {!agentState.isLoading && (agentState.coaches.length > 0 || agentState.inProgressCoach) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
            {agentState.coaches.map((coach) => (
              <div
                key={coach.coach_id}
                className="bg-transparent border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:shadow-neon-pink hover:-translate-y-1"
              >
                {/* Coach Icon */}
                <div className="text-synthwave-neon-pink mb-6 flex justify-center">
                  <CoachIcon />
                </div>

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
                      {agentRef.current?.getExperienceLevelDisplay(coach.technical_config?.experience_level) || 'General'} Level
                    </span>
                  </div>

                  {/* Programming Focus */}
                  <div className="flex items-start space-x-2 text-synthwave-text-secondary">
                    <div className="mt-0.5">
                      <TargetIcon />
                    </div>
                    <span className="font-rajdhani text-sm">
                      Focus: {agentRef.current?.getProgrammingFocusDisplay(coach.technical_config?.programming_focus)}
                    </span>
                  </div>

                  {/* Specializations */}
                  <div className="flex items-start space-x-2 text-synthwave-text-secondary">
                    <div className="mt-0.5">
                      <TargetIcon />
                    </div>
                    <span className="font-rajdhani text-sm">
                      {agentRef.current?.getSpecializationDisplay(coach.technical_config?.specializations)}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center space-x-2 text-synthwave-text-muted">
                    <CalendarIcon />
                    <span className="font-rajdhani text-xs">
                      Created {agentRef.current?.formatDate(coach.metadata?.created_date)}
                    </span>
                  </div>

                  {/* Conversations Count */}
                  <div className="text-center pt-2 border-t border-synthwave-neon-pink/20">
                    <span className="font-rajdhani text-xs text-synthwave-text-muted">
                      {coach.metadata?.total_conversations || 0} conversations
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      const newSearchParams = new URLSearchParams();
                      newSearchParams.set('userId', userId);
                      newSearchParams.set('coachId', coach.coach_id);
                      navigate(`/training-grounds?${newSearchParams.toString()}`);
                    }}
                    className="bg-transparent border border-synthwave-neon-pink/50 text-synthwave-neon-pink px-4 py-2 rounded font-rajdhani text-sm uppercase tracking-wide transition-all duration-300 hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink"
                  >
                    Enter Training Grounds
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Coaches;