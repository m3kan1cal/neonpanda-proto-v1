import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import WeeklyReportViewer from './WeeklyReportViewer';
import ReportAgent from '../utils/agents/ReportAgent';

function Reports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const weekId = searchParams.get('weekId');
  const coachId = searchParams.get('coachId');

  const reportsAgentRef = useRef(null);
  const [state, setState] = useState({ isLoadingItem: true, error: null });
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState('formatted');

  useEffect(() => {
    if (!userId || !weekId) {
      const fallbackUrl = coachId ? `/training-grounds?userId=${userId}&coachId=${coachId}` : '/training-grounds';
      navigate(fallbackUrl, { replace: true });
      return;
    }
  }, [userId, weekId, coachId, navigate]);

  useEffect(() => {
    reportsAgentRef.current = new ReportAgent(userId, (s) => setState(prev => ({ ...prev, ...s })));
    return () => { reportsAgentRef.current?.destroy(); reportsAgentRef.current = null; };
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      if (!reportsAgentRef.current) return;
      setState(prev => ({ ...prev, isLoadingItem: true, error: null }));
      const r = await reportsAgentRef.current.getReport(weekId);
      setReport(r);
      setState(prev => ({ ...prev, isLoadingItem: false }));
    };
    if (userId && weekId) load();
  }, [userId, weekId]);

  if (state.isLoadingItem) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">Loading weekly report...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{state.error}</p>
          <button onClick={() => {
            const fallbackUrl = coachId ? `/training-grounds?userId=${userId}&coachId=${coachId}` : '/training-grounds';
            navigate(fallbackUrl);
          }} className={`${themeClasses.buttonPrimary} px-6 py-2 rounded-lg`}>
            Back to Training Grounds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">Weekly Report</h1>
        </div>

        <div className="flex-1">
          {report ? (
            viewMode === 'formatted' ? (
              <WeeklyReportViewer report={report} onToggleView={() => setViewMode('raw')} />
            ) : (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button onClick={() => setViewMode('formatted')} className={`${themeClasses.neonButton} text-sm px-4 py-2`}>
                    View Formatted
                  </button>
                </div>
                <div className="border border-synthwave-neon-pink/30 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-synthwave-bg-primary/30">
                    <h3 className="font-russo font-bold text-white text-sm uppercase">Raw Report JSON</h3>
                  </div>
                  <div className="p-4 bg-synthwave-bg-card/20">
                    <pre className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded-lg p-4 text-synthwave-text-primary font-mono text-sm overflow-x-auto whitespace-pre-wrap">{JSON.stringify(report, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full"><div className="text-synthwave-text-secondary font-rajdhani text-lg">No report data available</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;

