import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { containerPatterns, layoutPatterns } from '../utils/uiPatterns';
import { FullPageLoader, CenteredErrorState } from './shared/ErrorStates';
import CoachHeader from './shared/CoachHeader';
import WeeklyReportViewer from "./WeeklyReportViewer";
import ReportAgent from "../utils/agents/ReportAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import CommandPalette from './shared/CommandPalette';

function Reports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const weekId = searchParams.get("weekId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);

  const reportsAgentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const [reportAgentState, setReportAgentState] = useState({
    isLoadingItem: true,
    error: null,
  });
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState("formatted");

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      // Cmd/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteCommand('');
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [isCommandPaletteOpen]);

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

  // Load coach data for FloatingMenuManager
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(userId, coachId);
        setCoachData(loadedCoachData);
      } catch (error) {
        console.error('Failed to load coach data:', error);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleToggleView = () => {
    setViewMode(viewMode === "formatted" ? "raw" : "formatted");
  };

  // Show skeleton loading while validating userId or loading report
  if (isValidatingUserId || reportAgentState.isLoadingItem) {
    return (
      <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
        <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
          {/* Header skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>

            {/* Coach header skeleton */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="text-left">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-2"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
              </div>
            </div>

            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mx-auto"></div>
          </div>

          {/* Main Content Area skeleton */}
          <div className="flex-1">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              <div className="p-6 h-full overflow-y-auto space-y-6">
                {/* Action buttons skeleton */}
                <div className="flex justify-end space-x-2">
                  <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                </div>

                {/* Report sections skeleton */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                      </div>
                      <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own weekly reports."}
      />
    );
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
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Weekly Report
          </h1>

          {/* Coach Header */}
          {coachData && (
            <CoachHeader coachData={coachData} isOnline={true} />
          )}

          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Comprehensive analysis of your weekly training performance including volume, progression, and insights.
            Toggle between formatted view and raw data using the tools above.
          </p>
          <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
            <div className="flex items-center space-x-1 bg-synthwave-bg-primary/30 px-2 py-1 rounded border border-synthwave-neon-pink/20">
              <span className="text-synthwave-neon-pink">⌘</span>
              <span>+ K</span>
            </div>
            <span>for Command Palette</span>
            <div className="flex items-center space-x-1">
              <span>(</span>
              <svg className="w-4 h-4 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Works on any page )</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                {report ? (
                  <WeeklyReportViewer
                    report={report}
                    onToggleView={handleToggleView}
                    viewMode={viewMode}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-synthwave-text-secondary font-rajdhani text-lg">
                      No report data available
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand('');
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={null} // Will need to be provided if workout functionality is needed
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === 'conversation-created') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="weekly-report"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />
    </div>
  );
}

export default Reports;
