import React from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';

function WeeklyReportViewer({ report, onToggleView }) {
  if (!report) return null;

  const humanSummary = report.human_summary;
  const structured = report.structured_analytics || {};
  const weekMeta = structured.metadata || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onToggleView} className={`${themeClasses.neonButton} text-sm px-4 py-2`}>
          View Raw JSON
        </button>
      </div>

      {humanSummary && (
        <div className="border border-synthwave-neon-purple/30 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-synthwave-bg-primary/30">
            <h3 className="font-russo font-bold text-white text-sm uppercase">Coach Summary</h3>
          </div>
          <div className="p-4 bg-synthwave-bg-card/20 font-rajdhani leading-relaxed text-synthwave-text-secondary whitespace-pre-wrap">
            {humanSummary}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-synthwave-neon-cyan/30 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-synthwave-bg-primary/30">
            <h3 className="font-russo font-bold text-white text-sm uppercase">Week</h3>
          </div>
          <div className="p-4 bg-synthwave-bg-card/20 text-synthwave-text-secondary font-rajdhani text-sm space-y-1">
            <div><span className="text-synthwave-neon-cyan">ID:</span> {weekMeta.week_id || report.weekId || 'Unknown'}</div>
            <div><span className="text-synthwave-neon-cyan">Range:</span> {(report.weekStart && report.weekEnd) ? `${report.weekStart} → ${report.weekEnd}` : (weekMeta.week_range || 'Unknown')}</div>
            {typeof weekMeta.workout_count === 'number' && (
              <div><span className="text-synthwave-neon-cyan">Workouts:</span> {weekMeta.workout_count}</div>
            )}
          </div>
        </div>

        <div className="border border-synthwave-neon-cyan/30 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-synthwave-bg-primary/30">
            <h3 className="font-russo font-bold text-white text-sm uppercase">Confidence</h3>
          </div>
          <div className="p-4 bg-synthwave-bg-card/20 text-synthwave-text-secondary font-rajdhani text-sm space-y-1">
            <div><span className="text-synthwave-neon-cyan">Analysis:</span> {weekMeta.analysis_confidence || structured?.metadata?.analysis_confidence || 'medium'}</div>
            {typeof weekMeta.data_completeness === 'number' && (
              <div><span className="text-synthwave-neon-cyan">Data completeness:</span> {Math.round((weekMeta.data_completeness || 0) * 100)}%</div>
            )}
          </div>
        </div>
      </div>

      {structured.performance_trends && (
        <div className="border border-synthwave-neon-pink/30 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-synthwave-bg-primary/30">
            <h3 className="font-russo font-bold text-white text-sm uppercase">Performance Trends</h3>
          </div>
          <div className="p-4 bg-synthwave-bg-card/20 text-synthwave-text-secondary font-rajdhani text-sm">
            <pre className="whitespace-pre-wrap">{JSON.stringify(structured.performance_trends, null, 2)}</pre>
          </div>
        </div>
      )}

      {structured.recommendations && (
        <div className="border border-synthwave-neon-pink/30 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-synthwave-bg-primary/30">
            <h3 className="font-russo font-bold text-white text-sm uppercase">Recommendations</h3>
          </div>
          <div className="p-4 bg-synthwave-bg-card/20 text-synthwave-text-secondary font-rajdhani text-sm">
            <pre className="whitespace-pre-wrap">{JSON.stringify(structured.recommendations, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyReportViewer;

