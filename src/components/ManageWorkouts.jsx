import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { useToast } from '../contexts/ToastContext';
import { WorkoutAgent } from '../utils/agents/WorkoutAgent';

// Icons
const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FireIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-4 2.5 0 4 1.5 4 4 0 .5 0 1 0 1s1-.5 1-1c0-1-1-2-1-2z" />
  </svg>
);

function ManageWorkouts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');

  const workoutAgentRef = useRef(null);
  const { showToast } = useToast();

  // State for workout management
  const [workoutState, setWorkoutState] = useState({
    workouts: [],
    isLoading: true,
    error: null,
    totalCount: 0
  });

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, navigate]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        setWorkoutState(prevState => ({
          ...prevState,
          workouts: newState.allWorkouts || newState.recentWorkouts || [],
          isLoading: newState.isLoadingRecentItems || newState.isLoadingItem || false,
          error: newState.error || null,
          totalCount: newState.totalWorkoutCount || 0
        }));
      });

      // Set up error callback
      workoutAgentRef.current.onError = (error) => {
        console.error('Workout agent error:', error);
        setWorkoutState(prevState => ({
          ...prevState,
          error: error.message || 'Failed to load workouts'
        }));
      };
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId]);

  // Load workouts from past month
  useEffect(() => {
    if (!userId || !workoutAgentRef.current) return;

    const loadWorkouts = async () => {
      try {
        setWorkoutState(prevState => ({ ...prevState, isLoading: true }));

        // Calculate date range for past month
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - 1);

        // Load workouts for the past month
        await workoutAgentRef.current.loadAllWorkouts({
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          sortBy: 'completedAt',
          sortOrder: 'desc',
          limit: 50  // Get up to 50 workouts from past month
        });
      } catch (error) {
        console.error('Error loading workout history:', error);
        setWorkoutState(prevState => ({
          ...prevState,
          error: 'Failed to load workout history',
          isLoading: false
        }));
      }
    };

    loadWorkouts();
  }, [userId]);

  // Handle delete click (placeholder)
  const handleDeleteClick = (workoutId, workoutName) => {
    console.info('Delete clicked for workout:', { workoutId, workoutName });
    showToast(`Delete functionality coming soon for "${workoutName}"`, 'info');
  };

  // Format date for display
  const formatWorkoutDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  // Render workout card
  const renderWorkoutCard = (workout) => {
    const dateInfo = formatWorkoutDate(workout.completedAt || workout.date);
    const workoutName = workout.workoutName || workout.summary?.split(' ')[0] || 'Workout';
    const duration = workout.duration || workout.workoutData?.duration;
    const discipline = workout.discipline || workout.workoutData?.discipline || 'fitness';

    return (
      <div
        key={workout.workoutId}
        className={`${themeClasses.glowCard} group cursor-pointer transition-all duration-300 hover:-translate-y-1 relative`}
        onClick={() => navigate(`/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${workout.coachIds?.[0] || 'default'}`)}
      >
        {/* Delete button - appears on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(workout.workoutId, workoutName);
          }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-synthwave-text-muted hover:text-synthwave-neon-pink p-1 rounded"
          title="Delete workout"
        >
          <TrashIcon />
        </button>

        {/* Workout header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-cyan mb-1`}>
              {workoutName}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-synthwave-text-secondary">
              <div className="flex items-center space-x-1">
                <CalendarIcon />
                <span>{dateInfo.date}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ClockIcon />
                <span>{dateInfo.time}</span>
              </div>
            </div>
          </div>
          <div className="text-xs uppercase tracking-wide text-synthwave-neon-pink font-rajdhani">
            {discipline}
          </div>
        </div>

        {/* Workout metadata */}
        <div className="space-y-2">
          {duration && (
            <div className="flex items-center space-x-2 text-sm text-synthwave-text-secondary">
              <FireIcon />
              <span>{duration} minutes</span>
            </div>
          )}

          {workout.summary && (
            <p className={`${themeClasses.cardText} text-sm line-clamp-2`}>
              {workout.summary}
            </p>
          )}
        </div>

        {/* Performance indicators */}
        {workout.workoutData?.performance_metrics && (
          <div className="mt-3 pt-3 border-t border-synthwave-neon-pink/20">
            <div className="flex justify-between text-xs text-synthwave-text-muted">
              {workout.workoutData.performance_metrics.intensity && (
                <span>Intensity: {workout.workoutData.performance_metrics.intensity}/10</span>
              )}
              {workout.workoutData.performance_metrics.perceived_exertion && (
                <span>RPE: {workout.workoutData.performance_metrics.perceived_exertion}/10</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Show loading state
  if (workoutState.isLoading) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">Loading workout history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Manage Workouts
          </h1>
          {workoutState.totalCount > 0 && (
            <p className="text-synthwave-text-secondary">
              {workoutState.workouts.length} workouts found
            </p>
          )}
        </div>

        {/* Error state */}
        {workoutState.error && (
          <div className="text-center py-12">
            <NeonBorder color="pink" className="max-w-md mx-auto p-6">
              <p className="text-synthwave-neon-pink mb-2">Error Loading Workouts</p>
              <p className="text-synthwave-text-secondary text-sm">{workoutState.error}</p>
            </NeonBorder>
          </div>
        )}

        {/* Empty state */}
        {!workoutState.isLoading && !workoutState.error && workoutState.workouts.length === 0 && (
          <div className="text-center py-12">
            <NeonBorder color="cyan" className="max-w-md mx-auto p-8">
              <h3 className="text-synthwave-neon-cyan mb-4">No Workouts Found</h3>
              <p className="text-synthwave-text-secondary mb-6">
                You haven't logged any workouts in the past month.
              </p>
              <button
                onClick={() => navigate(`/training-grounds?userId=${userId}`)}
                className={themeClasses.cyanButton}
              >
                Start Training
              </button>
            </NeonBorder>
          </div>
        )}

        {/* Workouts grid */}
        {!workoutState.isLoading && !workoutState.error && workoutState.workouts.length > 0 && (
          <div className={themeClasses.cardGrid}>
            {workoutState.workouts.map(renderWorkoutCard)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageWorkouts;
