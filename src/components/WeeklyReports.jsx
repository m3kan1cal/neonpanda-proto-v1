import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { themeClasses } from "../utils/synthwaveThemeClasses";
import { NeonBorder } from './themes/SynthwaveComponents';
import { FullPageLoader, CenteredErrorState } from './shared/ErrorStates';
import WeeklyReportViewer from "./WeeklyReportViewer";
import ReportAgent from "../utils/agents/ReportAgent";
import { FloatingMenuManager } from './shared/FloatingMenuManager';

function Reports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const weekId = searchParams.get("weekId");
  const coachId = searchParams.get("coachId");

  const reportsAgentRef = useRef(null);
  const [reportAgentState, setReportAgentState] = useState({
    isLoadingItem: true,
    error: null,
  });
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState("formatted");

  useEffect(() => {
    if (!userId || !weekId) {
      const fallbackUrl = coachId
        ? `/training-grounds?userId=${userId}&coachId=${coachId}`
        : "/training-grounds";
      navigate(fallbackUrl, { replace: true });
      return;
    }
  }, [userId, weekId, coachId, navigate]);

  useEffect(() => {
    reportsAgentRef.current = new ReportAgent(userId, (s) =>
      setReportAgentState((prev) => ({ ...prev, ...s }))
    );
    return () => {
      reportsAgentRef.current?.destroy();
      reportsAgentRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      if (!reportsAgentRef.current) return;
      setReportAgentState((prev) => ({
        ...prev,
        isLoadingItem: true,
        error: null,
      }));
      const r = await reportsAgentRef.current.getReport(weekId);
      setReport(r);
      setReportAgentState((prev) => ({ ...prev, isLoadingItem: false }));
    };
    if (userId && weekId) load();
  }, [userId, weekId]);

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (reportAgentState.isLoadingItem) {
    return <FullPageLoader text="Loading weekly report..." />;
  }

  if (reportAgentState.error) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={reportAgentState.error}
        buttonText="Back to Training Grounds"
        onButtonClick={() => {
          const fallbackUrl = coachId
            ? `/training-grounds?userId=${userId}&coachId=${coachId}`
            : "/training-grounds";
          navigate(fallbackUrl);
        }}
        variant="error"
      />
    );
  }

  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Weekly Report
          </h1>

          <div className="space-y-2">
            {report ? (
              <>
                <div className="font-rajdhani text-2xl text-synthwave-neon-pink font-bold">
                  {(() => {
                    // Handle correct structure: report.analyticsData.structured_analytics
                    const structured =
                      report.analyticsData?.structured_analytics ||
                      report.structured_analytics ||
                      {};
                    const weekMeta = structured.metadata || {};

                    if (weekMeta.week_id) {
                      return `Week ${weekMeta.week_id}`;
                    }
                    if (report.weekId) {
                      return `Week ${report.weekId}`;
                    }
                    return "Weekly Report";
                  })()}
                </div>
                <div className="font-rajdhani text-lg text-synthwave-text-secondary space-y-1 text-center">
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Week Start:
                      </span>{" "}
                      {(() => {
                        // Handle correct structure: report.analyticsData.structured_analytics
                        const structured =
                          report.analyticsData?.structured_analytics ||
                          report.structured_analytics ||
                          {};
                        const weekMeta = structured.metadata || {};

                        // Use schema-compliant date_range structure first
                        if (weekMeta.date_range?.start) {
                          const startDate = new Date(weekMeta.date_range.start);
                          return startDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }
                        // Fallback to direct properties
                        if (report.weekStart) {
                          const startDate = new Date(report.weekStart);
                          return startDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }
                        return "Unknown";
                      })()}
                    </div>
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Week End:
                      </span>{" "}
                      {(() => {
                        // Handle correct structure: report.analyticsData.structured_analytics
                        const structured =
                          report.analyticsData?.structured_analytics ||
                          report.structured_analytics ||
                          {};
                        const weekMeta = structured.metadata || {};

                        // Use schema-compliant date_range structure first
                        if (weekMeta.date_range?.end) {
                          const endDate = new Date(weekMeta.date_range.end);
                          return endDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }
                        // Fallback to direct properties
                        if (report.weekEnd) {
                          const endDate = new Date(report.weekEnd);
                          return endDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }
                        return "Unknown";
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Total Volume:
                      </span>{" "}
                      {(() => {
                        // Handle correct structure: report.analyticsData.structured_analytics
                        const structured =
                          report.analyticsData?.structured_analytics ||
                          report.structured_analytics ||
                          {};
                        const tonnage =
                          structured.volume_breakdown?.working_sets
                            ?.total_tonnage;
                        if (typeof tonnage === "number") {
                          return `${tonnage.toLocaleString()} lbs`;
                        }
                        return "Unknown";
                      })()}
                    </div>
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Overload Score:
                      </span>{" "}
                      {(() => {
                        // Handle correct structure: report.analyticsData.structured_analytics
                        const structured =
                          report.analyticsData?.structured_analytics ||
                          report.structured_analytics ||
                          {};
                        const score =
                          structured.weekly_progression
                            ?.progressive_overload_score;

                        if (typeof score === "number") {
                          return `${score}/10`;
                        }
                        return "Unknown";
                      })()}
                    </div>
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Avg Duration:
                      </span>{" "}
                      {(() => {
                        // Handle correct structure: report.analyticsData.structured_analytics
                        const structured =
                          report.analyticsData?.structured_analytics ||
                          report.structured_analytics ||
                          {};
                        const duration =
                          structured.training_intelligence?.workout_pacing
                            ?.avg_session_duration;

                        if (typeof duration === "number") {
                          return `${duration}m`;
                        }
                        return "Unknown";
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="font-rajdhani text-2xl text-synthwave-neon-pink font-bold">
                  Loading...
                </div>
                <div className="font-rajdhani text-lg text-synthwave-text-secondary space-y-1 text-center">
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Week Start:
                      </span>{" "}
                      Loading...
                    </div>
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Week End:
                      </span>{" "}
                      Loading...
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Total Volume:
                      </span>{" "}
                      Loading...
                    </div>
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Overload Score:
                      </span>{" "}
                      Loading...
                    </div>
                    <div>
                      <span className="text-synthwave-neon-pink">
                        Avg Duration:
                      </span>{" "}
                      Loading...
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1">
          <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-full overflow-hidden">
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
              {report ? (
                viewMode === "formatted" ? (
                  <WeeklyReportViewer
                    report={report}
                    onToggleView={() => setViewMode("raw")}
                  />
                ) : (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => setViewMode("formatted")}
                    className={`${themeClasses.neonButton} text-sm px-4 py-2`}
                  >
                    View Formatted
                  </button>
                </div>
                <div className="border border-synthwave-neon-pink/30 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-synthwave-bg-primary/30">
                    <h3 className="font-russo font-bold text-white text-sm uppercase">
                      Raw Report JSON
                    </h3>
                  </div>
                  <div className="p-4 bg-synthwave-bg-card/20">
                    <pre className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded-lg p-4 text-synthwave-text-primary font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-synthwave-text-secondary font-rajdhani text-lg">
                No report data available
              </div>
            </div>
          )}
            </div>
          </NeonBorder>
        </div>
      </div>

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="weekly-report"
      />
    </div>
  );
}

export default Reports;
