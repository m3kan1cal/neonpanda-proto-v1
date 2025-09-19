import React, { useState, useEffect } from 'react';
import {
  Zap,
  Users,
  MessageCircle,
  Flame,
  Target,
  Award,
  Clock,
  TrendingUp,
  Activity,
  Calendar
} from 'lucide-react';

const QuickStatsBar = ({
  stats = null,
  variant = 'default',
  showAnimations = true,
  className = ''
}) => {
  const [animatedValues, setAnimatedValues] = useState({});

  // Default stats data - easily replaceable with props
  const defaultStats = [
    {
      id: 'workouts',
      icon: Zap,
      value: 12,
      label: 'Workouts',
      color: 'blue',
      sublabel: 'this week'
    },
    {
      id: 'coaches',
      icon: Users,
      value: 3,
      label: 'Active Coaches',
      color: 'green',
      sublabel: 'available'
    },
    {
      id: 'messages',
      icon: MessageCircle,
      value: 47,
      label: 'Messages',
      color: 'purple',
      sublabel: 'exchanged'
    },
    {
      id: 'streak',
      icon: Flame,
      value: 8,
      label: 'Day Streak',
      color: 'amber',
      sublabel: 'current'
    }
  ];

  const statsToShow = stats || defaultStats;

  // Color mapping for different themes
  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        hoverBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30',
        icon: 'text-blue-600 dark:text-blue-400',
        accent: 'bg-blue-500'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        hoverBg: 'group-hover:bg-green-100 dark:group-hover:bg-green-900/30',
        icon: 'text-green-600 dark:text-green-400',
        accent: 'bg-green-500'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        hoverBg: 'group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30',
        icon: 'text-purple-600 dark:text-purple-400',
        accent: 'bg-purple-500'
      },
      amber: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        hoverBg: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30',
        icon: 'text-amber-600 dark:text-amber-400',
        accent: 'bg-amber-500'
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        hoverBg: 'group-hover:bg-red-100 dark:group-hover:bg-red-900/30',
        icon: 'text-red-600 dark:text-red-400',
        accent: 'bg-red-500'
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        hoverBg: 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30',
        icon: 'text-indigo-600 dark:text-indigo-400',
        accent: 'bg-indigo-500'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  // Animate values on mount
  useEffect(() => {
    if (showAnimations) {
      const timer = setTimeout(() => {
        const animated = {};
        statsToShow.forEach(stat => {
          animated[stat.id] = stat.value;
        });
        setAnimatedValues(animated);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      const immediate = {};
      statsToShow.forEach(stat => {
        immediate[stat.id] = stat.value;
      });
      setAnimatedValues(immediate);
    }
  }, [statsToShow, showAnimations]);

  // Determine grid columns based on number of stats
  const getGridCols = () => {
    const count = statsToShow.length;
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
    if (count === 4) return 'grid-cols-2 md:grid-cols-4';
    if (count === 5) return 'grid-cols-2 md:grid-cols-5';
    return 'grid-cols-2 md:grid-cols-6';
  };

  // Different variants for different contexts
  const getContainerClasses = () => {
    const base = "rounded-xl transition-all duration-200";

    switch (variant) {
      case 'minimal':
        return `${base} bg-transparent`;
      case 'elevated':
        return `${base} bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700`;
      case 'gradient':
        return `${base} bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900`;
      default:
        return `${base} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`;
    }
  };

  const StatItem = ({ stat }) => {
    const Icon = stat.icon;
    const colors = getColorClasses(stat.color);
    const displayValue = showAnimations ?
      (animatedValues[stat.id] || 0) :
      stat.value;

    return (
      <div className="flex items-center gap-3 group cursor-pointer">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.hoverBg} transition-colors duration-200`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold text-gray-900 dark:text-white transition-all duration-300">
            {displayValue}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            {stat.label}
          </div>
          {stat.sublabel && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {stat.sublabel}
            </div>
          )}
        </div>

        {/* Optional trend indicator */}
        {stat.trend && (
          <div className={`text-xs font-medium ${
            stat.trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-3 h-3 ${stat.trend < 0 ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${getContainerClasses()} p-4 ${className}`}>
      <div className={`grid ${getGridCols()} gap-4`}>
        {statsToShow.map((stat) => (
          <StatItem key={stat.id} stat={stat} />
        ))}
      </div>
    </div>
  );
};

// Example usage with different configurations
const QuickStatsExample = () => {
  // Example: Training Grounds stats
  const trainingStats = [
    { id: 'workouts', icon: Zap, value: 12, label: 'Workouts', color: 'blue', sublabel: 'this week' },
    { id: 'coaches', icon: Users, value: 3, label: 'Coaches', color: 'green', sublabel: 'active' },
    { id: 'messages', icon: MessageCircle, value: 47, label: 'Messages', color: 'purple', sublabel: 'recent' },
    { id: 'streak', icon: Flame, value: 8, label: 'Streak', color: 'amber', sublabel: 'days' }
  ];

  // Example: Profile stats
  const profileStats = [
    { id: 'prs', icon: Award, value: 14, label: 'PRs', color: 'amber', sublabel: 'personal records' },
    { id: 'total_time', icon: Clock, value: '47h', label: 'Total Time', color: 'blue', sublabel: 'training' },
    { id: 'consistency', icon: Target, value: '89%', label: 'Consistency', color: 'green', sublabel: 'goal rate' },
    { id: 'active_days', icon: Calendar, value: 23, label: 'Active Days', color: 'purple', sublabel: 'this month' }
  ];

  // Example: Coach dashboard stats
  const coachStats = [
    { id: 'clients', icon: Users, value: 28, label: 'Clients', color: 'blue', sublabel: 'active' },
    { id: 'sessions', icon: Activity, value: 156, label: 'Sessions', color: 'green', sublabel: 'completed' },
    { id: 'response_time', icon: Clock, value: '2m', label: 'Response', color: 'purple', sublabel: 'avg time' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Default Style</h3>
        <QuickStatsBar stats={trainingStats} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Elevated Variant</h3>
        <QuickStatsBar stats={profileStats} variant="elevated" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Gradient Variant</h3>
        <QuickStatsBar stats={coachStats} variant="gradient" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Minimal Variant</h3>
        <QuickStatsBar stats={trainingStats} variant="minimal" />
      </div>
    </div>
  );
};

export default QuickStatsExample;