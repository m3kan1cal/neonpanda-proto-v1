import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { tooltipPatterns } from '../utils/ui/uiPatterns';

// RPE Color Scale Configuration
const RPE_COLOR_SCALE = {
  missing: 'bg-yellow-500/30 border-yellow-500/50 hover:bg-yellow-500/40',      // Missing/Rest days
  low: 'bg-yellow-400/60 border-yellow-400/70 hover:bg-yellow-400/80',          // RPE 1-3
  medium: 'bg-orange-500/60 border-orange-500/70 hover:bg-orange-500/80',       // RPE 4-6
  high: 'bg-synthwave-neon-pink/60 border-synthwave-neon-pink/70 hover:bg-synthwave-neon-pink/80',  // RPE 7-8
  highest: 'bg-purple-600/60 border-purple-600/70 hover:bg-purple-600/80'       // RPE 9-10
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Heat Map Square Component
const HeatMapSquare = ({ dayData, userId, coachId, date }) => {
  const navigate = useNavigate();

  const getRPEColorClass = (rpe) => {
    if (!rpe || rpe === 0) return RPE_COLOR_SCALE.missing;
    if (rpe <= 3) return RPE_COLOR_SCALE.low;
    if (rpe <= 6) return RPE_COLOR_SCALE.medium;
    if (rpe <= 8) return RPE_COLOR_SCALE.high;
    return RPE_COLOR_SCALE.highest;
  };

  const handleClick = () => {
    if (dayData?.primary_workout_id) {
      navigate(`/training-grounds/workouts?userId=${userId}&workoutId=${dayData.primary_workout_id}&coachId=${coachId}`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTooltipContent = () => {
    if (!dayData || dayData.workout_count === 0) {
      return `${formatDate(date)}: Rest Day`;
    }

    const rpeText = dayData.avg_rpe ? `RPE ${dayData.avg_rpe.toFixed(1)}` : 'No RPE';
    const intensityText = dayData.avg_intensity ? `Intensity ${dayData.avg_intensity.toFixed(1)}` : 'No Intensity';

    return `${formatDate(date)}: ${rpeText} • ${intensityText}`;
  };

  const hasWorkout = dayData?.workout_count > 0;

  return (
    <div
      onClick={handleClick}
      className={`
        w-12 h-12 rounded-lg border-2 transition-all duration-300
        ${getRPEColorClass(dayData?.avg_rpe)}
        ${hasWorkout ? 'cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-synthwave-neon-cyan/30' : 'cursor-default'}
        flex items-center justify-center relative group
      `}
      data-tooltip-id="heat-map-tooltip"
      data-tooltip-content={getTooltipContent()}
      data-tooltip-place="top"
    >
      {/* Workout count indicator */}
      {hasWorkout && (
        <span className="text-xs font-bold text-white drop-shadow-lg">
          {dayData.workout_count}
        </span>
      )}

      {/* Subtle glow effect for workout days */}
      {hasWorkout && (
        <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      )}
    </div>
  );
};

// Legend Component
const HeatMapLegend = () => {
  const legendItems = [
    { label: 'Rest', color: RPE_COLOR_SCALE.missing, range: '' },
    { label: 'Low', color: RPE_COLOR_SCALE.low, range: '(1-3)' },
    { label: 'Medium', color: RPE_COLOR_SCALE.medium, range: '(4-6)' },
    { label: 'High', color: RPE_COLOR_SCALE.high, range: '(7-8)' },
    { label: 'Highest', color: RPE_COLOR_SCALE.highest, range: '(9-10)' }
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      <span className="text-synthwave-text-secondary font-rajdhani text-sm font-medium">
        RPE Scale:
      </span>
      {legendItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded border ${item.color}`}></div>
          <span className="text-synthwave-text-secondary font-rajdhani text-xs">
            {item.label} {item.range}
          </span>
        </div>
      ))}
    </div>
  );
};

// Main Weekly Heat Map Component
const WeeklyHeatMap = ({ dailyVolumeData, weekStart, weekEnd, userId, coachId }) => {
  // Generate all 7 days of the week
  const generateWeekDays = () => {
    const days = [];
    const start = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // Find matching data for this date
      const dayData = dailyVolumeData?.find(d => d.date === dateString);

      days.push({
        date: dateString,
        dayOfWeek: DAYS_OF_WEEK[i],
        data: dayData || { workout_count: 0, avg_rpe: null, avg_intensity: null, primary_workout_id: null }
      });
    }

    return days;
  };

  const weekDays = generateWeekDays();

  // Calculate week summary stats
  const weekStats = {
    totalWorkouts: weekDays.reduce((sum, day) => sum + (day.data.workout_count || 0), 0),
    avgRPE: (() => {
      const rpeValues = weekDays.filter(day => day.data.avg_rpe).map(day => day.data.avg_rpe);
      return rpeValues.length > 0 ? (rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length) : null;
    })(),
    trainingDays: weekDays.filter(day => (day.data.workout_count || 0) > 0).length
  };

  return (
    <div className="space-y-4">
      {/* Week Summary */}
      <div className="text-center mb-4">
        <div className="flex justify-center items-center space-x-6 text-sm font-rajdhani">
          <div className="text-synthwave-text-secondary">
            <span className="text-synthwave-neon-cyan font-semibold">{weekStats.totalWorkouts}</span> workouts
          </div>
          <div className="text-synthwave-text-secondary">
            <span className="text-synthwave-neon-pink font-semibold">{weekStats.trainingDays}</span> training days
          </div>
          {weekStats.avgRPE && (
            <div className="text-synthwave-text-secondary">
              Avg RPE: <span className="text-synthwave-neon-cyan font-semibold">{weekStats.avgRPE.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Heat Map Grid */}
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center text-synthwave-text-secondary font-rajdhani text-xs font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Heat map squares */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day.date} className="flex justify-center">
              <HeatMapSquare
                dayData={day.data}
                userId={userId}
                coachId={coachId}
                date={day.date}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <HeatMapLegend />

      {/* Tooltip - using standardized tooltip pattern with custom positioning */}
      <Tooltip
        id="heat-map-tooltip"
        offset={24}
        delayShow={0}
        place="top"
        style={{
          backgroundColor: '#000',
          color: '#fff',
          borderRadius: '8px',
          fontFamily: 'Rajdhani',
          fontSize: '14px',
          padding: '8px 12px',
          zIndex: 99999,
          maxWidth: '150px',
          whiteSpace: 'normal',
          wordWrap: 'break-word'
        }}
      />
    </div>
  );
};

export default WeeklyHeatMap;
