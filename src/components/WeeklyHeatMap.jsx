import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { tooltipPatterns, heatMapPatterns } from '../utils/ui/uiPatterns';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Heat Map Square Component
const HeatMapSquare = ({ dayData, userId, coachId, date }) => {
  const navigate = useNavigate();

  const getRPEColorClass = (rpe) => {
    if (!rpe || rpe === 0) return heatMapPatterns.status.rpe.missing;
    if (rpe <= 3) return heatMapPatterns.status.rpe.low;
    if (rpe <= 6) return heatMapPatterns.status.rpe.medium;
    if (rpe <= 8) return heatMapPatterns.status.rpe.high;
    return heatMapPatterns.status.rpe.highest;
  };

  const handleClick = () => {
    if (dayData?.primary_workout_id) {
      navigate(`/training-grounds/workouts?workoutId=${dayData.primary_workout_id}&userId=${userId}&coachId=${coachId}`);
    }
  };

  const formatDate = (dateString) => {
    // Parse date string in a timezone-safe way (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
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
        ${heatMapPatterns.dayCell}
        ${getRPEColorClass(dayData?.avg_rpe)}
        ${hasWorkout ? heatMapPatterns.dayCellInteractive : heatMapPatterns.dayCellStatic}
        ${hasWorkout ? 'hover:shadow-synthwave-neon-cyan/30' : ''}
      `}
      data-tooltip-id="heat-map-tooltip"
      data-tooltip-content={getTooltipContent()}
      data-tooltip-place="top"
    >
      {/* Workout count indicator */}
      {hasWorkout && (
        <span className={heatMapPatterns.workoutCount}>
          {dayData.workout_count}
        </span>
      )}

      {/* Glow effect for workout days */}
      {hasWorkout && (
        <div className={heatMapPatterns.glowOverlay}></div>
      )}
    </div>
  );
};

// Legend Component
const HeatMapLegend = () => {
  const legendItems = [
    { label: 'Rest', color: heatMapPatterns.status.rpe.missing, range: '' },
    { label: 'Low', color: heatMapPatterns.status.rpe.low, range: '(1-3)' },
    { label: 'Medium', color: heatMapPatterns.status.rpe.medium, range: '(4-6)' },
    { label: 'High', color: heatMapPatterns.status.rpe.high, range: '(7-8)' },
    { label: 'Highest', color: heatMapPatterns.status.rpe.highest, range: '(9-10)' }
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

    // Parse date string in a timezone-safe way (YYYY-MM-DD format)
    // Create date at local midnight to avoid timezone shifts
    const [year, month, day] = weekStart.split('-').map(Number);
    const start = new Date(year, month - 1, day); // month is 0-indexed in Date constructor

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      // Format as YYYY-MM-DD
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
