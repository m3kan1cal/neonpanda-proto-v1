import React, { useState } from "react";
import { containerPatterns } from "../utils/ui/uiPatterns";
import {
  MetricsIcon,
  NotesIcon,
  AIIcon,
  DatabaseIcon,
  TargetIcon,
  TrendingUpIcon,
  BrainIcon,
  ActivityIcon,
} from "./themes/SynthwaveComponents";
import IconButton from "./shared/IconButton";
import WeeklyHeatMap from "./WeeklyHeatMap";

// Value display component
const ValueDisplay = ({ label, value, dataPath, className = "" }) => {
  if (value === null || value === undefined) return null;

  return (
    <div
      className={`flex items-center gap-1.5 font-rajdhani text-sm ${className}`}
      data-json-path={dataPath}
    >
      <span className="text-synthwave-text-secondary">{label}:</span>
      <span
        className="text-synthwave-neon-cyan font-medium"
        data-json-value={JSON.stringify(value)}
      >
        {typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : String(value).replace(/_/g, " ")}
      </span>
    </div>
  );
};

function WeeklyReportViewerV2({
  report,
  onToggleView,
  viewMode = "formatted",
  userId,
  coachId,
}) {
  const [collapsedSections, setCollapsedSections] = useState(
    new Set(["coach-analysis"]),
  );
  const [collapsedSubsections, setCollapsedSubsections] = useState(
    new Set(["quality-metrics", "extraction-details"]),
  );

  if (!report) return null;

  const humanSummary =
    report.analyticsData?.human_summary || report.human_summary;
  const structured =
    report.analyticsData?.structured_analytics ||
    report.structured_analytics ||
    {};
  const weekMeta = structured.metadata || {};

  const toggleCollapse = (sectionId) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleSubsection = (subsectionId) => {
    setCollapsedSubsections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subsectionId)) {
        newSet.delete(subsectionId);
      } else {
        newSet.add(subsectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Raw JSON Section - only shown in raw mode */}
      {viewMode === "raw" && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer ${collapsedSections.has("raw-json") ? "" : ""}`}
            onClick={() => toggleCollapse("raw-json")}
            role="button"
            tabIndex={0}
            aria-expanded={!collapsedSections.has("raw-json")}
            aria-controls="raw-json-content"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleCollapse("raw-json");
              }
            }}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Raw Report Data
              </h3>
            </div>
            <svg
              className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("raw-json") ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          {!collapsedSections.has("raw-json") && (
            <div id="raw-json-content" className="px-6 pb-6 space-y-3">
              <pre className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 p-4 text-synthwave-text-primary font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Two-column layout: 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - 60% (3 of 5 columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Weekly Training Intensity Heat Map */}
          <WeeklyHeatMap
            dailyVolumeData={structured.raw_aggregations?.daily_volume || []}
            weekStart={report.weekStart}
            weekEnd={report.weekEnd}
            userId={userId}
            coachId={coachId}
          />

          {/* Coach Analysis & Insights */}
          {humanSummary && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("coach-analysis") ? "" : ""}`}
                onClick={() => toggleCollapse("coach-analysis")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("coach-analysis")}
                aria-controls="coach-analysis-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("coach-analysis");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Coach Analysis & Insights
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("coach-analysis") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("coach-analysis") && (
                <div
                  id="coach-analysis-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Analysis Content */}
                  <div>
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Weekly Analysis
                    </h4>
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                      <div className="font-rajdhani leading-relaxed text-synthwave-text-secondary whitespace-pre-wrap text-sm">
                        {humanSummary}
                      </div>
                      <div className="mt-3 p-3 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-cyan/20">
                        <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                          Generated by AI
                        </span>
                        <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                          {" "}
                          • Comprehensive weekly analysis including performance
                          trends, volume insights, and actionable
                          recommendations
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Volume Breakdown */}
          {structured.volume_breakdown && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("volume-breakdown")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("volume-breakdown")}
                aria-controls="volume-breakdown-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("volume-breakdown");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Volume Breakdown
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("volume-breakdown") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("volume-breakdown") && (
                <div
                  id="volume-breakdown-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Working Sets Summary */}
                  <div>
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Working Sets Summary
                    </h4>
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <ValueDisplay
                          label="Total Tonnage"
                          value={
                            structured.volume_breakdown.working_sets
                              ?.total_tonnage
                              ? `${structured.volume_breakdown.working_sets.total_tonnage.toLocaleString()} lbs`
                              : null
                          }
                        />
                        <ValueDisplay
                          label="Total Reps"
                          value={
                            structured.volume_breakdown.working_sets?.total_reps
                          }
                        />
                        <ValueDisplay
                          label="Total Sets"
                          value={
                            structured.volume_breakdown.working_sets?.total_sets
                          }
                        />
                        <ValueDisplay
                          label="Quality Reps"
                          value={
                            structured.volume_breakdown.working_sets
                              ?.quality_reps
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* By Movement Detail - collapsible */}
                  {structured.volume_breakdown.by_movement_detail &&
                    structured.volume_breakdown.by_movement_detail.length >
                      0 && (
                      <div>
                        <button
                          onClick={() => toggleSubsection("movement-detail")}
                          className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                        >
                          <span>By Movement Detail</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${collapsedSubsections.has("movement-detail") ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {!collapsedSubsections.has("movement-detail") && (
                          <div className="space-y-2 animate-fadeIn">
                            {structured.volume_breakdown.by_movement_detail.map(
                              (movement, index) => (
                                <div
                                  key={index}
                                  className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-rajdhani font-bold text-synthwave-neon-cyan text-base capitalize">
                                      {movement.movement.replace(/_/g, " ")}
                                    </h5>
                                    <span className="text-sm font-rajdhani text-synthwave-text-secondary">
                                      Avg Intensity: {movement.avg_intensity}%
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <ValueDisplay
                                      label="Tonnage"
                                      value={`${movement.tonnage.toLocaleString()} lbs`}
                                    />
                                    <ValueDisplay
                                      label="Reps"
                                      value={movement.reps}
                                    />
                                    <ValueDisplay
                                      label="Sets"
                                      value={movement.sets}
                                    />
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - 40% (2 of 5 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actionable Insights */}
          {structured.actionable_insights && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("actionable-insights")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("actionable-insights")}
                aria-controls="actionable-insights-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("actionable-insights");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Actionable Insights
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("actionable-insights") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("actionable-insights") && (
                <div
                  id="actionable-insights-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Quick Wins */}
                  {structured.actionable_insights.quick_wins &&
                    structured.actionable_insights.quick_wins.length > 0 && (
                      <div>
                        <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                          Quick Wins
                        </h4>
                        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                          <ul className="space-y-1">
                            {structured.actionable_insights.quick_wins.map(
                              (win, index) => (
                                <li
                                  key={index}
                                  className="text-synthwave-text-secondary font-rajdhani text-sm flex items-start space-x-2"
                                >
                                  <span className="text-synthwave-neon-cyan mt-1">
                                    •
                                  </span>
                                  <span>{win}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Performance Markers */}
          {structured.performance_markers && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("performance-markers")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("performance-markers")}
                aria-controls="performance-markers-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("performance-markers");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Performance Markers
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("performance-markers") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("performance-markers") && (
                <div
                  id="performance-markers-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Performance Records */}
                  {structured.performance_markers.records_set &&
                    structured.performance_markers.records_set.length > 0 && (
                      <div>
                        <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                          Performance Records (
                          {structured.performance_markers.records_set.length})
                        </h4>
                        <div className="space-y-2">
                          {structured.performance_markers.records_set.map(
                            (record, index) => (
                              <div
                                key={index}
                                className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-rajdhani font-bold text-synthwave-neon-pink text-base capitalize">
                                    {record.exercise.replace(/_/g, " ")}
                                  </h5>
                                  <span
                                    className={`text-xs font-rajdhani uppercase px-2 py-1 rounded ${
                                      record.significance === "major"
                                        ? "bg-synthwave-neon-pink/20 text-synthwave-neon-pink"
                                        : record.significance === "moderate"
                                          ? "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan"
                                          : "bg-synthwave-text-secondary/20 text-synthwave-text-secondary"
                                    }`}
                                  >
                                    {record.significance}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                  <ValueDisplay
                                    label="New Best"
                                    value={record.new_best}
                                  />
                                  <ValueDisplay
                                    label="Previous Best"
                                    value={record.previous_best}
                                  />
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Coaching Synthesis */}
          {structured.coaching_synthesis && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("coaching-synthesis")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("coaching-synthesis")}
                aria-controls="coaching-synthesis-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("coaching-synthesis");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Coaching Synthesis
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("coaching-synthesis") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("coaching-synthesis") && (
                <div
                  id="coaching-synthesis-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Adherence Analysis */}
                  {structured.coaching_synthesis.adherence_analysis && (
                    <div>
                      <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                        Adherence Analysis
                      </h4>
                      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <div className="col-span-2">
                            <ValueDisplay
                              label="Program Compliance"
                              value={
                                structured.coaching_synthesis.adherence_analysis
                                  .program_compliance
                                  ? `${structured.coaching_synthesis.adherence_analysis.program_compliance}%`
                                  : null
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analysis Metadata */}
          <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
              onClick={() => toggleCollapse("analysis-metadata")}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedSections.has("analysis-metadata")}
              aria-controls="analysis-metadata-content"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCollapse("analysis-metadata");
                }
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Analysis Metadata
                </h3>
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("analysis-metadata") ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            {!collapsedSections.has("analysis-metadata") && (
              <div
                id="analysis-metadata-content"
                className="px-6 pb-6 space-y-3"
              >
                <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ValueDisplay label="Week ID" value={weekMeta.week_id} />
                    <ValueDisplay
                      label="Sessions Completed"
                      value={weekMeta.sessions_completed}
                    />
                    <ValueDisplay
                      label="Data Completeness"
                      value={
                        typeof weekMeta.data_completeness === "number"
                          ? `${Math.round(weekMeta.data_completeness * 100)}%`
                          : null
                      }
                    />
                    <ValueDisplay
                      label="Analysis Confidence"
                      value={weekMeta.analysis_confidence}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Movement Analysis */}
          {structured.movement_analysis && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("movement-analysis")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("movement-analysis")}
                aria-controls="movement-analysis-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("movement-analysis");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Movement Analysis
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("movement-analysis") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("movement-analysis") && (
                <div
                  id="movement-analysis-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Body Part Frequency */}
                  {structured.movement_analysis.body_part_frequency && (
                    <div>
                      <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                        Body Part Frequency
                      </h4>
                      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <ValueDisplay
                            label="Arms"
                            value={
                              structured.movement_analysis.body_part_frequency
                                .arms
                            }
                          />
                          <ValueDisplay
                            label="Back"
                            value={
                              structured.movement_analysis.body_part_frequency
                                .back
                            }
                          />
                          <ValueDisplay
                            label="Chest"
                            value={
                              structured.movement_analysis.body_part_frequency
                                .chest
                            }
                          />
                          <ValueDisplay
                            label="Legs"
                            value={
                              structured.movement_analysis.body_part_frequency
                                .legs
                            }
                          />
                          <ValueDisplay
                            label="Shoulders"
                            value={
                              structured.movement_analysis.body_part_frequency
                                .shoulders
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Training Intelligence */}
          {structured.training_intelligence && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("training-intelligence")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("training-intelligence")}
                aria-controls="training-intelligence-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("training-intelligence");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Training Intelligence
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("training-intelligence") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("training-intelligence") && (
                <div
                  id="training-intelligence-content"
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Workout Pacing */}
                  {structured.training_intelligence.workout_pacing && (
                    <div>
                      <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                        Workout Pacing
                      </h4>
                      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <ValueDisplay
                            label="Avg Session Duration"
                            value={
                              structured.training_intelligence.workout_pacing
                                .avg_session_duration
                                ? `${structured.training_intelligence.workout_pacing.avg_session_duration}m`
                                : null
                            }
                          />
                          <ValueDisplay
                            label="Density Score"
                            value={
                              structured.training_intelligence.workout_pacing
                                .density_score
                                ? `${structured.training_intelligence.workout_pacing.density_score}/10`
                                : null
                            }
                          />
                          <ValueDisplay
                            label="Work:Rest Ratio"
                            value={
                              structured.training_intelligence.workout_pacing
                                .work_to_rest_ratio
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Weekly Progression */}
          {structured.weekly_progression && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("weekly-progression")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("weekly-progression")}
                aria-controls="weekly-progression-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("weekly-progression");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Weekly Progression
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("weekly-progression") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("weekly-progression") && (
                <div
                  id="weekly-progression-content"
                  className="px-6 pb-6 space-y-4"
                >
                  <div>
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Overall Progression
                    </h4>
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="col-span-2">
                          <ValueDisplay
                            label="Progressive Overload Score"
                            value={
                              structured.weekly_progression
                                .progressive_overload_score
                                ? `${structured.weekly_progression.progressive_overload_score}/10`
                                : null
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* vs Last Week */}
                  {structured.weekly_progression.vs_last_week && (
                    <div>
                      <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                        vs Last Week
                      </h4>
                      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <ValueDisplay
                            label="Volume Change"
                            value={
                              structured.weekly_progression.vs_last_week
                                .volume_change
                                ? `${Math.round(structured.weekly_progression.vs_last_week.volume_change * 100)}%`
                                : null
                            }
                          />
                          <ValueDisplay
                            label="Intensity Change"
                            value={
                              structured.weekly_progression.vs_last_week
                                .intensity_change
                                ? `${Math.round(structured.weekly_progression.vs_last_week.intensity_change * 100)}%`
                                : null
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fatigue Management */}
          {structured.fatigue_management && (
            <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
              <div
                className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${collapsedSections.has("") ? "" : ""}`}
                onClick={() => toggleCollapse("fatigue-management")}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsedSections.has("fatigue-management")}
                aria-controls="fatigue-management-content"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse("fatigue-management");
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
                  <h3 className="font-russo font-bold text-white text-lg uppercase">
                    Fatigue Management
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has("fatigue-management") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {!collapsedSections.has("fatigue-management") && (
                <div
                  id="fatigue-management-content"
                  className="px-6 pb-6 space-y-4"
                >
                  <div>
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Recovery Metrics
                    </h4>
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <ValueDisplay
                          label="Recovery Score"
                          value={
                            structured.fatigue_management.recovery_score
                              ? `${structured.fatigue_management.recovery_score}/10`
                              : null
                          }
                        />
                        <ValueDisplay
                          label="Acute:Chronic Ratio"
                          value={
                            structured.fatigue_management.acute_chronic_ratio
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyReportViewerV2;
