import React, { useState } from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { ChevronDownIcon } from './themes/SynthwaveComponents';

// Icons from WorkoutViewer
const MetricsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const WorkoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const NotesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const AIIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const JsonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

// Collapsible section component matching WorkoutViewer
const CollapsibleSection = ({ title, icon, children, defaultOpen = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-synthwave-neon-pink/30 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-synthwave-bg-primary/30 hover:bg-synthwave-bg-primary/50 transition-colors duration-200 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-pink">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-sm uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-pink transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-synthwave-bg-card/20">
          {children}
        </div>
      )}
    </div>
  );
};

// Value display component with data attributes for JSON reconstruction
const ValueDisplay = ({ label, value, dataPath, className = "" }) => {
  if (value === null || value === undefined) return null;

  return (
    <div className={`flex justify-between items-center py-1 ${className}`} data-json-path={dataPath}>
      <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
        {label}:
      </span>
      <span className="text-synthwave-text-primary font-rajdhani text-base" data-json-value={JSON.stringify(value)}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value).replace(/_/g, ' ')}
      </span>
    </div>
  );
};

function WeeklyReportViewer({ report, onToggleView }) {
  if (!report) return null;

  const humanSummary = report.analyticsData?.human_summary || report.human_summary;
  const structured = report.analyticsData?.structured_analytics || report.structured_analytics || {};
  const weekMeta = structured.metadata || {};

  return (
    <div className="space-y-6" data-weekly-report-viewer>
      <div className="flex justify-end mb-6">
        <button onClick={onToggleView} className={`${themeClasses.neonButton} text-sm px-4 py-2 flex items-center space-x-2`}>
          <JsonIcon />
          <span>View Raw JSON</span>
        </button>
      </div>

      {/* 1. Analysis Metadata */}
      <CollapsibleSection
        title="Analysis Metadata"
        icon={<DatabaseIcon />}
        defaultOpen={true}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ValueDisplay
            label="Week ID"
            value={weekMeta.week_id}
            dataPath="structured_analytics.metadata.week_id"
          />
          <ValueDisplay
            label="Sessions Completed"
            value={weekMeta.sessions_completed}
            dataPath="structured_analytics.metadata.sessions_completed"
          />
          <ValueDisplay
            label="Sessions Planned"
            value={weekMeta.sessions_planned}
            dataPath="structured_analytics.metadata.sessions_planned"
          />
          <ValueDisplay
            label="Start Date"
            value={weekMeta.date_range?.start ? new Date(weekMeta.date_range.start).toLocaleDateString() : null}
            dataPath="structured_analytics.metadata.date_range.start"
          />
          <ValueDisplay
            label="End Date"
            value={weekMeta.date_range?.end ? new Date(weekMeta.date_range.end).toLocaleDateString() : null}
            dataPath="structured_analytics.metadata.date_range.end"
          />
          <ValueDisplay
            label="Data Completeness"
            value={typeof weekMeta.data_completeness === 'number' ? `${Math.round(weekMeta.data_completeness * 100)}%` : null}
            dataPath="structured_analytics.metadata.data_completeness"
          />
          <ValueDisplay
            label="Analysis Confidence"
            value={weekMeta.analysis_confidence}
            dataPath="structured_analytics.metadata.analysis_confidence"
          />
          <ValueDisplay
            label="Normalization Applied"
            value={weekMeta.normalization_applied}
            dataPath="structured_analytics.metadata.normalization_applied"
          />
          <ValueDisplay
            label="Normalization Timestamp"
            value={weekMeta.normalization_timestamp ? new Date(weekMeta.normalization_timestamp).toLocaleString() : null}
            dataPath="structured_analytics.metadata.normalization_timestamp"
          />
        </div>
      </CollapsibleSection>

      {/* 2. Coach Analysis & Insights */}
      {humanSummary && (
        <CollapsibleSection
          title="Coach Analysis & Insights"
          icon={<AIIcon />}
          defaultOpen={true}
        >
          <div className="font-rajdhani leading-relaxed text-white whitespace-pre-wrap text-base">
            {humanSummary}
          </div>
          <div className="mt-3 text-synthwave-text-secondary font-rajdhani text-sm">
            <span className="text-synthwave-neon-cyan">Generated by AI</span> •
            Comprehensive weekly analysis including performance trends, volume insights, and actionable recommendations
          </div>
        </CollapsibleSection>
      )}

      {/* 3. Actionable Insights */}
      {structured.actionable_insights && (
        <CollapsibleSection
          title="Actionable Insights"
          icon={<TargetIcon />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* Top Priority */}
            {structured.actionable_insights.top_priority && (
              <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3">
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Top Priority</h4>
                <div className="space-y-2">
                  <ValueDisplay
                    label="Insight"
                    value={structured.actionable_insights.top_priority.insight}
                    dataPath="structured_analytics.actionable_insights.top_priority.insight"
                  />
                  <ValueDisplay
                    label="Recommended Action"
                    value={structured.actionable_insights.top_priority.recommended_action}
                    dataPath="structured_analytics.actionable_insights.top_priority.recommended_action"
                  />
                  <ValueDisplay
                    label="Data Support"
                    value={structured.actionable_insights.top_priority.data_support}
                    dataPath="structured_analytics.actionable_insights.top_priority.data_support"
                  />
                  <ValueDisplay
                    label="Expected Outcome"
                    value={structured.actionable_insights.top_priority.expected_outcome}
                    dataPath="structured_analytics.actionable_insights.top_priority.expected_outcome"
                  />
                </div>
              </div>
            )}

            {/* Quick Wins */}
            {structured.actionable_insights.quick_wins && structured.actionable_insights.quick_wins.length > 0 && (
              <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3">
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Quick Wins</h4>
                <ul className="space-y-1">
                  {structured.actionable_insights.quick_wins.map((win, index) => (
                    <li key={index} className="text-white font-rajdhani text-base flex items-start space-x-2" data-json-path={`structured_analytics.actionable_insights.quick_wins[${index}]`} data-json-value={JSON.stringify(win)}>
                      <span className="text-synthwave-neon-cyan mt-1">•</span>
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {structured.actionable_insights.red_flags && (
              <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-orange/20 rounded-lg p-3">
                <h4 className="font-rajdhani font-bold text-synthwave-neon-orange text-base mb-2">Red Flags</h4>
                <div className="text-white font-rajdhani text-base" data-json-path="structured_analytics.actionable_insights.red_flags" data-json-value={JSON.stringify(structured.actionable_insights.red_flags)}>
                  {structured.actionable_insights.red_flags}
                </div>
              </div>
            )}

            {/* Week Ahead Focus */}
            {structured.actionable_insights.week_ahead_focus && (
              <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3">
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Week Ahead Focus</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ValueDisplay
                    label="Primary Goal"
                    value={structured.actionable_insights.week_ahead_focus.primary_goal}
                    dataPath="structured_analytics.actionable_insights.week_ahead_focus.primary_goal"
                  />
                  <ValueDisplay
                    label="Intensity Recommendation"
                    value={structured.actionable_insights.week_ahead_focus.intensity_recommendation}
                    dataPath="structured_analytics.actionable_insights.week_ahead_focus.intensity_recommendation"
                  />
                  <ValueDisplay
                    label="Volume Recommendation"
                    value={structured.actionable_insights.week_ahead_focus.volume_recommendation}
                    dataPath="structured_analytics.actionable_insights.week_ahead_focus.volume_recommendation"
                  />
                </div>
                {structured.actionable_insights.week_ahead_focus.exercises_to_push && structured.actionable_insights.week_ahead_focus.exercises_to_push.length > 0 && (
                  <div className="mt-3">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Exercises to Push: </span>
                    <span className="text-white font-rajdhani text-base">{structured.actionable_insights.week_ahead_focus.exercises_to_push.map(exercise => String(exercise).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                {structured.actionable_insights.week_ahead_focus.exercises_to_maintain && structured.actionable_insights.week_ahead_focus.exercises_to_maintain.length > 0 && (
                  <div className="mt-2">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Exercises to Maintain: </span>
                    <span className="text-white font-rajdhani text-base">{structured.actionable_insights.week_ahead_focus.exercises_to_maintain.map(exercise => String(exercise).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                {structured.actionable_insights.week_ahead_focus.technical_priorities && structured.actionable_insights.week_ahead_focus.technical_priorities.length > 0 && (
                  <div className="mt-2">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Technical Priorities: </span>
                    <span className="text-white font-rajdhani text-base">{structured.actionable_insights.week_ahead_focus.technical_priorities.map(priority => String(priority).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 4. Performance Markers */}
      {structured.performance_markers && (
        <CollapsibleSection
          title="Performance Markers"
          icon={<TargetIcon />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* General Performance Metrics */}
            <div>
              <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">General Performance</h4>
              <div className="grid grid-cols-2 gap-3">
                <ValueDisplay
                  label="Competition Readiness"
                  value={structured.performance_markers.competition_readiness}
                  dataPath="structured_analytics.performance_markers.competition_readiness"
                />
              </div>
            </div>

            {/* Benchmark WODs */}
            {structured.performance_markers.benchmark_wods && structured.performance_markers.benchmark_wods.length > 0 && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Benchmark WODs</h4>
                <div className="text-white font-rajdhani text-base">
                  {structured.performance_markers.benchmark_wods.join(', ')}
                </div>
              </div>
            )}

            {/* Performance Records */}
            {structured.performance_markers.records_set && structured.performance_markers.records_set.length > 0 && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Performance Records ({structured.performance_markers.records_set.length})</h4>
                <div className="space-y-3">
                  {structured.performance_markers.records_set.map((record, index) => (
                    <div key={index} className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-rajdhani font-bold text-synthwave-neon-pink text-base capitalize">
                          {record.exercise.replace(/_/g, ' ')}
                        </h5>
                        <span className={`text-sm font-rajdhani uppercase px-2 py-1 rounded ${
                          record.significance === 'major' ? 'bg-synthwave-neon-pink/20 text-synthwave-neon-pink' :
                          record.significance === 'moderate' ? 'bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan' :
                          'bg-synthwave-text-secondary/20 text-synthwave-text-secondary'
                        }`}>
                          {record.significance}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <ValueDisplay
                          label="New Best"
                          value={record.new_best}
                          dataPath={`structured_analytics.performance_markers.records_set[${index}].new_best`}
                        />
                        <ValueDisplay
                          label="Previous Best"
                          value={record.previous_best}
                          dataPath={`structured_analytics.performance_markers.records_set[${index}].previous_best`}
                        />
                        <ValueDisplay
                          label="Improvement Type"
                          value={record.improvement_type}
                          dataPath={`structured_analytics.performance_markers.records_set[${index}].improvement_type`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 5. Volume Breakdown */}
      {structured.volume_breakdown && (
        <CollapsibleSection
          title="Volume Breakdown"
          icon={<MetricsIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Working Sets Summary */}
            <div>
              <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Working Sets Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ValueDisplay
                  label="Total Tonnage"
                  value={structured.volume_breakdown.working_sets?.total_tonnage ? `${structured.volume_breakdown.working_sets.total_tonnage.toLocaleString()} lbs` : null}
                  dataPath="structured_analytics.volume_breakdown.working_sets.total_tonnage"
                />
                <ValueDisplay
                  label="Total Reps"
                  value={structured.volume_breakdown.working_sets?.total_reps}
                  dataPath="structured_analytics.volume_breakdown.working_sets.total_reps"
                />
                <ValueDisplay
                  label="Total Sets"
                  value={structured.volume_breakdown.working_sets?.total_sets}
                  dataPath="structured_analytics.volume_breakdown.working_sets.total_sets"
                />
                <ValueDisplay
                  label="Quality Reps"
                  value={structured.volume_breakdown.working_sets?.quality_reps}
                  dataPath="structured_analytics.volume_breakdown.working_sets.quality_reps"
                />
                <ValueDisplay
                  label="Failed Reps"
                  value={structured.volume_breakdown.working_sets?.failed_reps}
                  dataPath="structured_analytics.volume_breakdown.working_sets.failed_reps"
                />
                <ValueDisplay
                  label="Assisted Reps"
                  value={structured.volume_breakdown.working_sets?.assisted_reps}
                  dataPath="structured_analytics.volume_breakdown.working_sets.assisted_reps"
                />
                <ValueDisplay
                  label="Partial Reps"
                  value={structured.volume_breakdown.working_sets?.partial_reps}
                  dataPath="structured_analytics.volume_breakdown.working_sets.partial_reps"
                />
                <ValueDisplay
                  label="Skill Work Time"
                  value={structured.volume_breakdown.skill_work_time ? `${structured.volume_breakdown.skill_work_time}s` : null}
                  dataPath="structured_analytics.volume_breakdown.skill_work_time"
                />
                <ValueDisplay
                  label="Warm-up Volume"
                  value={structured.volume_breakdown.warm_up_volume ? `${structured.volume_breakdown.warm_up_volume} lbs` : null}
                  dataPath="structured_analytics.volume_breakdown.warm_up_volume"
                />
              </div>
            </div>

            {/* By Movement Detail */}
            {structured.volume_breakdown.by_movement_detail && structured.volume_breakdown.by_movement_detail.length > 0 && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">By Movement Detail</h4>
                <div className="space-y-2">
                  {structured.volume_breakdown.by_movement_detail.map((movement, index) => (
                    <div key={index} className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg capitalize">
                          {movement.movement.replace(/_/g, ' ')}
                        </h5>
                        <span className="text-sm font-rajdhani text-synthwave-text-secondary">
                          Avg Intensity: {movement.avg_intensity}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <ValueDisplay
                          label="Tonnage"
                          value={`${movement.tonnage.toLocaleString()} lbs`}
                          dataPath={`structured_analytics.volume_breakdown.by_movement_detail[${index}].tonnage`}
                        />
                        <ValueDisplay
                          label="Reps"
                          value={movement.reps}
                          dataPath={`structured_analytics.volume_breakdown.by_movement_detail[${index}].reps`}
                        />
                        <ValueDisplay
                          label="Sets"
                          value={movement.sets}
                          dataPath={`structured_analytics.volume_breakdown.by_movement_detail[${index}].sets`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditioning Work */}
            {structured.volume_breakdown.conditioning_work && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Conditioning Work</h4>
                <div className="grid grid-cols-2 gap-3">
                  <ValueDisplay
                    label="Time Domain"
                    value={structured.volume_breakdown.conditioning_work.time_domain ? `${structured.volume_breakdown.conditioning_work.time_domain}s` : null}
                    dataPath="structured_analytics.volume_breakdown.conditioning_work.time_domain"
                  />
                  <ValueDisplay
                    label="Work Capacity"
                    value={structured.volume_breakdown.conditioning_work.work_capacity}
                    dataPath="structured_analytics.volume_breakdown.conditioning_work.work_capacity"
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 6. Movement Analysis */}
      {structured.movement_analysis && (
        <CollapsibleSection
          title="Movement Analysis"
          icon={<ActivityIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Body Part Frequency */}
            {structured.movement_analysis.body_part_frequency && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Body Part Frequency</h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <ValueDisplay
                    label="Arms"
                    value={structured.movement_analysis.body_part_frequency.arms}
                    dataPath="structured_analytics.movement_analysis.body_part_frequency.arms"
                  />
                  <ValueDisplay
                    label="Back"
                    value={structured.movement_analysis.body_part_frequency.back}
                    dataPath="structured_analytics.movement_analysis.body_part_frequency.back"
                  />
                  <ValueDisplay
                    label="Chest"
                    value={structured.movement_analysis.body_part_frequency.chest}
                    dataPath="structured_analytics.movement_analysis.body_part_frequency.chest"
                  />
                  <ValueDisplay
                    label="Legs"
                    value={structured.movement_analysis.body_part_frequency.legs}
                    dataPath="structured_analytics.movement_analysis.body_part_frequency.legs"
                  />
                  <ValueDisplay
                    label="Shoulders"
                    value={structured.movement_analysis.body_part_frequency.shoulders}
                    dataPath="structured_analytics.movement_analysis.body_part_frequency.shoulders"
                  />
                </div>
              </div>
            )}

            {/* Pattern Balance */}
            {structured.movement_analysis.pattern_balance && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Movement Pattern Balance</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(structured.movement_analysis.pattern_balance).map(([pattern, data]) => (
                    <div key={pattern} className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded p-2">
                      <div className="font-rajdhani font-bold text-synthwave-neon-cyan text-base capitalize">{pattern.replace(/_/g, ' ')}</div>
                      <div className="text-white font-rajdhani text-base">
                        Frequency: {data.frequency} | Volume: {data.volume ? `${data.volume} lbs` : '0 lbs'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frequency Map */}
            {structured.movement_analysis.frequency_map && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Exercise Frequency</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(structured.movement_analysis.frequency_map).map(([exercise, frequency]) => (
                    <ValueDisplay
                      key={exercise}
                      label={exercise.replace(/_/g, ' ')}
                      value={frequency}
                      dataPath={`structured_analytics.movement_analysis.frequency_map.${exercise}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 7. Training Intelligence */}
      {structured.training_intelligence && (
        <CollapsibleSection
          title="Training Intelligence"
          icon={<BrainIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Workout Pacing */}
            {structured.training_intelligence.workout_pacing && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Workout Pacing</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ValueDisplay
                    label="Avg Session Duration"
                    value={structured.training_intelligence.workout_pacing.avg_session_duration ? `${structured.training_intelligence.workout_pacing.avg_session_duration}m` : null}
                    dataPath="structured_analytics.training_intelligence.workout_pacing.avg_session_duration"
                  />
                  <ValueDisplay
                    label="Density Score"
                    value={structured.training_intelligence.workout_pacing.density_score ? `${structured.training_intelligence.workout_pacing.density_score}/10` : null}
                    dataPath="structured_analytics.training_intelligence.workout_pacing.density_score"
                  />
                  <ValueDisplay
                    label="Work:Rest Ratio"
                    value={structured.training_intelligence.workout_pacing.work_to_rest_ratio}
                    dataPath="structured_analytics.training_intelligence.workout_pacing.work_to_rest_ratio"
                  />
                </div>
              </div>
            )}

            {/* Exercise Ordering */}
            {structured.training_intelligence.exercise_ordering && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Exercise Ordering</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ValueDisplay
                    label="Performance Impact"
                    value={structured.training_intelligence.exercise_ordering.performance_impact}
                    dataPath="structured_analytics.training_intelligence.exercise_ordering.performance_impact"
                  />
                  <ValueDisplay
                    label="Suggested Reorder"
                    value={structured.training_intelligence.exercise_ordering.suggested_reorder}
                    dataPath="structured_analytics.training_intelligence.exercise_ordering.suggested_reorder"
                  />
                </div>
                {structured.training_intelligence.exercise_ordering.current_pattern && structured.training_intelligence.exercise_ordering.current_pattern.length > 0 && (
                  <div className="mt-3">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Current Pattern: </span>
                    <span className="text-white font-rajdhani text-base">{structured.training_intelligence.exercise_ordering.current_pattern.join(' → ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Set Performance Analysis */}
            {structured.training_intelligence.set_performance_analysis && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Set Performance Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ValueDisplay
                    label="Failure Rate"
                    value={structured.training_intelligence.set_performance_analysis.failure_rate ? `${Math.round(structured.training_intelligence.set_performance_analysis.failure_rate * 100)}%` : null}
                    dataPath="structured_analytics.training_intelligence.set_performance_analysis.failure_rate"
                  />
                  <ValueDisplay
                    label="Avg Reps Drop"
                    value={structured.training_intelligence.set_performance_analysis.average_reps_drop}
                    dataPath="structured_analytics.training_intelligence.set_performance_analysis.average_reps_drop"
                  />
                  <ValueDisplay
                    label="Optimal Set Range"
                    value={structured.training_intelligence.set_performance_analysis.optimal_set_range}
                    dataPath="structured_analytics.training_intelligence.set_performance_analysis.optimal_set_range"
                  />
                  <ValueDisplay
                    label="Rest Optimization"
                    value={structured.training_intelligence.set_performance_analysis.rest_optimization}
                    dataPath="structured_analytics.training_intelligence.set_performance_analysis.rest_optimization"
                  />
                </div>
              </div>
            )}

            {/* General Training Intelligence */}
            <div>
              <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">General Intelligence</h4>
              <div className="grid grid-cols-2 gap-3">
                <ValueDisplay
                  label="Superset Efficiency"
                  value={structured.training_intelligence.superset_efficiency}
                  dataPath="structured_analytics.training_intelligence.superset_efficiency"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* 8. Weekly Progression */}
      {structured.weekly_progression && (
        <CollapsibleSection
          title="Weekly Progression"
          icon={<TrendingUpIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Overall Progression */}
            <div>
              <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Overall Progression</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ValueDisplay
                  label="Progressive Overload Score"
                  value={structured.weekly_progression.progressive_overload_score ? `${structured.weekly_progression.progressive_overload_score}/10` : null}
                  dataPath="structured_analytics.weekly_progression.progressive_overload_score"
                />
              </div>
            </div>

            {/* vs Last Week */}
            {structured.weekly_progression.vs_last_week && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">vs Last Week</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ValueDisplay
                    label="Volume Change"
                    value={structured.weekly_progression.vs_last_week.volume_change ? `${Math.round(structured.weekly_progression.vs_last_week.volume_change * 100)}%` : null}
                    dataPath="structured_analytics.weekly_progression.vs_last_week.volume_change"
                  />
                  <ValueDisplay
                    label="Intensity Change"
                    value={structured.weekly_progression.vs_last_week.intensity_change ? `${Math.round(structured.weekly_progression.vs_last_week.intensity_change * 100)}%` : null}
                    dataPath="structured_analytics.weekly_progression.vs_last_week.intensity_change"
                  />
                  <ValueDisplay
                    label="Exercise Overlap"
                    value={structured.weekly_progression.vs_last_week.exercise_overlap ? `${Math.round(structured.weekly_progression.vs_last_week.exercise_overlap * 100)}%` : null}
                    dataPath="structured_analytics.weekly_progression.vs_last_week.exercise_overlap"
                  />
                </div>

                {/* Performance Delta */}
                {structured.weekly_progression.vs_last_week.performance_delta && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {structured.weekly_progression.vs_last_week.performance_delta.improved && structured.weekly_progression.vs_last_week.performance_delta.improved.length > 0 && (
                      <div>
                        <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Improved: </span>
                        <span className="text-white font-rajdhani text-base">{structured.weekly_progression.vs_last_week.performance_delta.improved.map(item => String(item).replace(/_/g, ' ')).join(', ')}</span>
                      </div>
                    )}
                    {structured.weekly_progression.vs_last_week.performance_delta.maintained && structured.weekly_progression.vs_last_week.performance_delta.maintained.length > 0 && (
                      <div>
                        <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Maintained: </span>
                        <span className="text-white font-rajdhani text-base">{structured.weekly_progression.vs_last_week.performance_delta.maintained.map(item => String(item).replace(/_/g, ' ')).join(', ')}</span>
                      </div>
                    )}
                    {structured.weekly_progression.vs_last_week.performance_delta.decreased && structured.weekly_progression.vs_last_week.performance_delta.decreased.length > 0 && (
                      <div>
                        <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Decreased: </span>
                        <span className="text-white font-rajdhani text-base">{structured.weekly_progression.vs_last_week.performance_delta.decreased.map(item => String(item).replace(/_/g, ' ')).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Four Week Trend */}
            {structured.weekly_progression.four_week_trend && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Four Week Trend</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ValueDisplay
                    label="Phase Detected"
                    value={structured.weekly_progression.four_week_trend.phase_detected}
                    dataPath="structured_analytics.weekly_progression.four_week_trend.phase_detected"
                  />
                  <ValueDisplay
                    label="Volume Trend"
                    value={structured.weekly_progression.four_week_trend.volume_trend}
                    dataPath="structured_analytics.weekly_progression.four_week_trend.volume_trend"
                  />
                  <ValueDisplay
                    label="Intensity Trend"
                    value={structured.weekly_progression.four_week_trend.intensity_trend}
                    dataPath="structured_analytics.weekly_progression.four_week_trend.intensity_trend"
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 9. Coaching Synthesis */}
      {structured.coaching_synthesis && (
        <CollapsibleSection
          title="Coaching Synthesis"
          icon={<NotesIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Adherence Analysis */}
            {structured.coaching_synthesis.adherence_analysis && (
              <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3">
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Adherence Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ValueDisplay
                    label="Program Compliance"
                    value={structured.coaching_synthesis.adherence_analysis.program_compliance ? `${structured.coaching_synthesis.adherence_analysis.program_compliance}%` : null}
                    dataPath="structured_analytics.coaching_synthesis.adherence_analysis.program_compliance"
                  />
                </div>
                {structured.coaching_synthesis.adherence_analysis.common_modifications && structured.coaching_synthesis.adherence_analysis.common_modifications.length > 0 && (
                  <div className="mt-3">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Common Modifications: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.adherence_analysis.common_modifications.map(mod => String(mod).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                {structured.coaching_synthesis.adherence_analysis.skipped_exercises && structured.coaching_synthesis.adherence_analysis.skipped_exercises.length > 0 && (
                  <div className="mt-2">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Skipped Exercises: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.adherence_analysis.skipped_exercises.map(exercise => String(exercise).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Technical Focus */}
            {structured.coaching_synthesis.technical_focus && (
              <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3">
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Technical Focus</h4>
                {structured.coaching_synthesis.technical_focus.breakthrough_moments && structured.coaching_synthesis.technical_focus.breakthrough_moments.length > 0 && (
                  <div className="mb-3">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Breakthrough Moments: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.technical_focus.breakthrough_moments.map(moment => String(moment).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                {structured.coaching_synthesis.technical_focus.persistent_issues && structured.coaching_synthesis.technical_focus.persistent_issues.length > 0 && (
                  <div className="mb-3">
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Persistent Issues: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.technical_focus.persistent_issues.map(issue => String(issue).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                {structured.coaching_synthesis.technical_focus.primary_cues && structured.coaching_synthesis.technical_focus.primary_cues.length > 0 && (
                  <div>
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Primary Cues: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.technical_focus.primary_cues.map(cue => String(cue).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Workout Feedback */}
            {structured.coaching_synthesis.workout_feedback && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {structured.coaching_synthesis.workout_feedback.athlete_notes_summary && structured.coaching_synthesis.workout_feedback.athlete_notes_summary.length > 0 && (
                  <div>
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Athlete Notes: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.workout_feedback.athlete_notes_summary.map(note => String(note).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                {structured.coaching_synthesis.workout_feedback.coach_notes_summary && structured.coaching_synthesis.workout_feedback.coach_notes_summary.length > 0 && (
                  <div>
                    <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Coach Notes: </span>
                    <span className="text-white font-rajdhani text-base">{structured.coaching_synthesis.workout_feedback.coach_notes_summary.map(note => String(note).replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 10. Fatigue Management */}
      {structured.fatigue_management && (
        <CollapsibleSection
          title="Fatigue Management"
          icon={<MetricsIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Recovery Metrics */}
            <div>
              <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Recovery Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ValueDisplay
                  label="Recovery Score"
                  value={structured.fatigue_management.recovery_score ? `${structured.fatigue_management.recovery_score}/10` : null}
                  dataPath="structured_analytics.fatigue_management.recovery_score"
                />
                <ValueDisplay
                  label="Acute:Chronic Ratio"
                  value={structured.fatigue_management.acute_chronic_ratio}
                  dataPath="structured_analytics.fatigue_management.acute_chronic_ratio"
                />
                <ValueDisplay
                  label="Volume Spike"
                  value={structured.fatigue_management.volume_spike}
                  dataPath="structured_analytics.fatigue_management.volume_spike"
                />
                <ValueDisplay
                  label="Suggested Action"
                  value={structured.fatigue_management.suggested_action}
                  dataPath="structured_analytics.fatigue_management.suggested_action"
                />
              </div>
            </div>

            {/* Deload Indicators */}
            {structured.fatigue_management.deload_indicators && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Deload Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ValueDisplay
                    label="Performance Decline"
                    value={structured.fatigue_management.deload_indicators.performance_decline}
                    dataPath="structured_analytics.fatigue_management.deload_indicators.performance_decline"
                  />
                  <ValueDisplay
                    label="Elevated RPE"
                    value={structured.fatigue_management.deload_indicators.elevated_rpe}
                    dataPath="structured_analytics.fatigue_management.deload_indicators.elevated_rpe"
                  />
                  <ValueDisplay
                    label="High Failure Rate"
                    value={structured.fatigue_management.deload_indicators.high_failure_rate}
                    dataPath="structured_analytics.fatigue_management.deload_indicators.high_failure_rate"
                  />
                  <ValueDisplay
                    label="Coach Notes Mention Fatigue"
                    value={structured.fatigue_management.deload_indicators.coach_notes_mention_fatigue}
                    dataPath="structured_analytics.fatigue_management.deload_indicators.coach_notes_mention_fatigue"
                  />
                </div>
              </div>
            )}

            {/* Muscle Group Fatigue */}
            {structured.fatigue_management.muscle_group_fatigue && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Muscle Group Fatigue</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {structured.fatigue_management.muscle_group_fatigue.most_worked && structured.fatigue_management.muscle_group_fatigue.most_worked.length > 0 && (
                    <div>
                      <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Most Worked: </span>
                      <span className="text-white font-rajdhani text-base">{structured.fatigue_management.muscle_group_fatigue.most_worked.join(', ')}</span>
                    </div>
                  )}
                  {structured.fatigue_management.muscle_group_fatigue.needs_recovery && structured.fatigue_management.muscle_group_fatigue.needs_recovery.length > 0 && (
                    <div>
                      <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Needs Recovery: </span>
                      <span className="text-white font-rajdhani text-base">{structured.fatigue_management.muscle_group_fatigue.needs_recovery.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 11. Raw Aggregations */}
      {structured.raw_aggregations && (
        <CollapsibleSection
          title="Raw Aggregations"
          icon={<DatabaseIcon />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Daily Volume */}
            {structured.raw_aggregations.daily_volume && structured.raw_aggregations.daily_volume.length > 0 && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Daily Volume</h4>
                <div className="space-y-2">
                  {structured.raw_aggregations.daily_volume.map((day, index) => (
                    <div key={index} className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <ValueDisplay
                          label="Date"
                          value={new Date(day.date).toLocaleDateString()}
                          dataPath={`structured_analytics.raw_aggregations.daily_volume[${index}].date`}
                        />
                        <ValueDisplay
                          label="Duration"
                          value={`${day.duration}m`}
                          dataPath={`structured_analytics.raw_aggregations.daily_volume[${index}].duration`}
                        />
                        <ValueDisplay
                          label="Sets"
                          value={day.sets}
                          dataPath={`structured_analytics.raw_aggregations.daily_volume[${index}].sets`}
                        />
                        <ValueDisplay
                          label="Tonnage"
                          value={`${day.tonnage.toLocaleString()} lbs`}
                          dataPath={`structured_analytics.raw_aggregations.daily_volume[${index}].tonnage`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Summaries */}
            {structured.raw_aggregations.session_summaries && structured.raw_aggregations.session_summaries.length > 0 && (
              <div>
                <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg mb-2">Session Summaries</h4>
                <div className="space-y-2">
                  {structured.raw_aggregations.session_summaries.map((session, index) => (
                    <div key={index} className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <ValueDisplay
                          label="Date"
                          value={new Date(session.date).toLocaleDateString()}
                          dataPath={`structured_analytics.raw_aggregations.session_summaries[${index}].date`}
                        />
                        <ValueDisplay
                          label="Focus"
                          value={session.focus}
                          dataPath={`structured_analytics.raw_aggregations.session_summaries[${index}].focus`}
                        />
                        <ValueDisplay
                          label="Quality"
                          value={session.quality}
                          dataPath={`structured_analytics.raw_aggregations.session_summaries[${index}].quality`}
                        />
                        <ValueDisplay
                          label="Type"
                          value={session.type}
                          dataPath={`structured_analytics.raw_aggregations.session_summaries[${index}].type`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* 12. Data Quality */}
      {(typeof weekMeta.data_completeness === 'number' || structured.data_quality_report) && (
        <CollapsibleSection
          title="Data Quality"
          icon={<DatabaseIcon />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            {typeof weekMeta.data_completeness === 'number' && (
              <div>
                <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Data completeness: </span>
                <span className="text-white font-rajdhani text-base">{Math.round((weekMeta.data_completeness || 0) * 100)}%</span>
              </div>
            )}
            {structured.data_quality_report?.missing_critical_data?.length > 0 && (
              <div>
                <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Missing data: </span>
                <span className="text-white font-rajdhani text-base">{structured.data_quality_report.missing_critical_data.map(item => String(item).replace(/_/g, ' ')).join(', ')}</span>
              </div>
            )}
            {structured.data_quality_report?.improvement_suggestions?.length > 0 && (
              <div>
                <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Suggestions:</span>
                <ul className="mt-2 ml-4 space-y-1">
                  {structured.data_quality_report.improvement_suggestions.map((suggestion, index) => (
                    <li key={index} className="text-white font-rajdhani text-base flex items-start space-x-2">
                      <span className="text-synthwave-neon-cyan">•</span>
                      <span>{String(suggestion).replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

export default WeeklyReportViewer;