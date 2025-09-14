import React, { useState } from 'react';
import {
  Clock,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  User,
  MoreVertical,
  Play,
  Star,
  Award,
  Activity,
  ChevronRight,
  Filter,
  Search,
  Grid3x3,
  List,
  SortAsc,
  Eye,
  Edit3,
  Trash2,
  MapPin,
  MessageCircle,
  Flame,
  Brain,
  Heart
} from 'lucide-react';

const ModernWorkoutCards = () => {
  const [viewMode, setViewMode] = useState('cards');
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Sample workout data using your actual structure
  const workouts = [
    {
      workoutId: "ws_4sVTVPd6aJdRq_1757186073345",
      completedAt: "2025-01-15T18:55:00.000Z",
      discipline: "crossfit",
      workoutName: "Fran",
      workoutType: "metcon",
      duration: 527, // 8:47 in seconds
      location: "gym",
      coachIds: ["user_4sVTVPd6aJdRq_coach_main"],
      coachNames: ["Marcus_The_Technical_Coach"],
      conversationId: "conv_1756814020834_ttj5rxctq",
      confidence: 0.95,
      extractedAt: "2025-01-15T19:15:58.208Z",
      summary: "Completed Fran in 8:47 - a significant PR! The thrusters felt much more controlled than last attempt, and I managed to keep bigger sets on the pull-ups. Form breakdown was minimal even in the final round. Really happy with the pacing strategy we discussed.",
      performanceMetrics: {
        intensity: 9,
        perceived_exertion: 8,
        calories_burned: 180
      }
    },
    {
      workoutId: "ws_5bUWXQe7bKeSr_1757186073346",
      completedAt: "2025-01-14T17:30:00.000Z",
      discipline: "powerlifting",
      workoutName: "Heavy Bench Day",
      workoutType: "strength",
      duration: 2722, // 45:22 in seconds
      location: "gym",
      coachIds: ["user_4sVTVPd6aJdRq_coach_strength"],
      coachNames: ["Diana_The_Powerlifter"],
      conversationId: "conv_1756814020835_abc123",
      confidence: 0.92,
      extractedAt: "2025-01-14T18:45:30.150Z",
      summary: "Worked up to a heavy 3RM on bench press, hitting 245lbs for a solid triple. Form stayed tight throughout, and the pause work really paid off. Accessory work included weighted dips and close-grip work. Strength is definitely trending upward.",
      performanceMetrics: {
        intensity: 8,
        perceived_exertion: 7,
        calories_burned: 220
      }
    },
    {
      workoutId: "ws_6cVXYRf8cLfTs_1757186073347",
      completedAt: "2025-01-13T16:00:00.000Z",
      discipline: "hybrid",
      workoutName: "Fortis Terminus",
      workoutType: "hybrid",
      duration: 3600, // 60:00 in seconds
      location: "gym",
      coachIds: ["user_4sVTVPd6aJdRq_coach_main"],
      coachNames: ["Marcus_The_Strength_Builder"],
      conversationId: "conv_1756814020836_xyz789",
      confidence: 1.0,
      extractedAt: "2025-01-13T17:30:25.300Z",
      summary: "Completed \"Fortis Terminus\" - a hybrid strength and conditioning session featuring conventional deadlifts (3x3 at 255lbs), weighted dips/pull-ups superset (20lbs added), and shoulder accessory work. Finished with the \"Week Ender\" metcon (3 rounds: 500m row, 10 KB reverse lunges at 70# each hand, 5 T2B attempts), maintaining smart pacing throughout. Great week-ending workout that provided solid training stimulus without excessive fatigue for recovery.",
      performanceMetrics: {
        intensity: 7,
        perceived_exertion: 7,
        calories_burned: null
      }
    }
  ];

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getIntensityColor = (intensity) => {
    if (intensity >= 8) return 'from-red-500 to-pink-500';
    if (intensity >= 6) return 'from-orange-500 to-yellow-500';
    if (intensity >= 4) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  const getDisciplineBadge = (discipline) => {
    const styles = {
      'crossfit': 'bg-purple-100 text-purple-800 border-purple-200',
      'powerlifting': 'bg-red-100 text-red-800 border-red-200',
      'hybrid': 'bg-blue-100 text-blue-800 border-blue-200',
      'conditioning': 'bg-green-100 text-green-800 border-green-200'
    };
    return styles[discipline] || styles.hybrid;
  };

  const getWorkoutTypeIcon = (type) => {
    const icons = {
      'metcon': Zap,
      'strength': Target,
      'hybrid': Activity,
      'conditioning': Heart
    };
    return icons[type] || Activity;
  };

  // Modern Card Layout optimized for your data structure
  const ModernCard = ({ workout }) => {
    const WorkoutIcon = getWorkoutTypeIcon(workout.workoutType);
    const intensity = workout.performanceMetrics?.intensity || 5;

    return (
      <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:scale-[1.02]">
        {/* Intensity Header Gradient */}
        <div className={`h-2 bg-gradient-to-r ${getIntensityColor(intensity)}`}></div>

        <div className="p-6">
          {/* Top Row - Name & Discipline */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <WorkoutIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{workout.workoutName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDisciplineBadge(workout.discipline)}`}>
                    {workout.discipline}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(workout.completedAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {workout.location}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {workout.coachNames[0]?.replace(/_/g, ' ') || 'AI Coach'}
                </div>
              </div>
            </div>

            <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Performance Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatDuration(workout.duration)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Duration
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {workout.performanceMetrics?.calories_burned || '--'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3" />
                Calories
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {Math.round(workout.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <Brain className="w-3 h-3" />
                AI Confidence
              </div>
            </div>
          </div>

          {/* Intensity & Exertion Meters */}
          <div className="mb-4 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Intensity</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {workout.performanceMetrics?.intensity || 'N/A'}/10
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${getIntensityColor(intensity)}`}
                  style={{ width: `${(intensity / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Perceived Exertion</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {workout.performanceMetrics?.perceived_exertion || 'N/A'}/10
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${((workout.performanceMetrics?.perceived_exertion || 0) / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Summary Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {workout.summary}
            </p>
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Extracted {new Date(workout.extractedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Compact List View for your data structure
  const CompactRow = ({ workout }) => {
    const intensity = workout.performanceMetrics?.intensity || 5;
    const WorkoutIcon = getWorkoutTypeIcon(workout.workoutType);

    return (
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all group border border-gray-100 dark:border-gray-700">
        <div className={`w-1 h-16 bg-gradient-to-b ${getIntensityColor(intensity)} rounded-full`}></div>

        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <WorkoutIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>

        <div className="flex-1 grid grid-cols-7 gap-4 items-center">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{workout.workoutName}</div>
            <div className="text-sm text-gray-500">{workout.workoutType}</div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(workout.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>

          <div className="font-mono text-sm font-medium">{formatDuration(workout.duration)}</div>

          <div className="text-sm">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDisciplineBadge(workout.discipline)}`}>
              {workout.discipline}
            </span>
          </div>

          <div className="text-sm text-center">
            <div className="font-medium text-gray-900 dark:text-white">{intensity}/10</div>
            <div className="text-xs text-gray-500">intensity</div>
          </div>

          <div className="text-sm text-center">
            <div className="font-medium text-gray-900 dark:text-white">{Math.round(workout.confidence * 100)}%</div>
            <div className="text-xs text-gray-500">confidence</div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded transition-all">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all">
              <Eye className="w-4 h-4 text-gray-400" />
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workout History</h1>
          <p className="text-gray-600 dark:text-gray-400">AI-tracked fitness journey and progress</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workouts..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {workouts.map((workout) => (
            <ModernCard key={workout.workoutId} workout={workout} />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-3">
          {/* List Header */}
          <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400">
            <div>Workout</div>
            <div>Date</div>
            <div>Duration</div>
            <div>Discipline</div>
            <div>Intensity</div>
            <div>Confidence</div>
            <div>Actions</div>
          </div>

          {workouts.map((workout) => (
            <CompactRow key={workout.workoutId} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ModernWorkoutCards;