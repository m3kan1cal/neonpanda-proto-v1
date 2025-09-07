import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { themeClasses } from "../utils/synthwaveThemeClasses";
import { NeonBorder } from './themes/SynthwaveComponents';
import { FullPageLoader, CenteredErrorState } from './shared/ErrorStates';
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

  // Show loading while validating userId or loading report
  if (isValidatingUserId || reportAgentState.isLoadingItem) {
    return <LoadingScreen message="Loading weekly report..." />;
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
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Weekly Report
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Comprehensive analysis of your weekly training performance including volume, progression, and insights.
            Toggle between formatted view and raw data using the tools above.
          </p>
        </div>

        <div className="flex-1">
          <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-full overflow-hidden">
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
          </NeonBorder>
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
