import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Breadcrumbs from "./components/shared/Breadcrumbs";
import CommandPalette from "./components/shared/CommandPalette";
import WorkoutAgent from "./utils/agents/WorkoutAgent";
import LandingPage from "./components/LandingPage";
import AboutUs from "./components/AboutUs";
import Technology from "./components/Technology";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import FAQs from "./components/FAQs";
import ContactForm from "./components/ContactForm";
import CoachCreator from "./components/CoachCreator";
import Coaches from "./components/Coaches";
import TrainingGrounds from "./components/TrainingGrounds";
import CoachConversations from "./components/CoachConversations";
import StreamingDebugTest from "./components/StreamingDebugTest";
import Workouts from "./components/Workouts";
import ManageWorkouts from "./components/ManageWorkouts";
import ManageMemories from "./components/ManageMemories";
import ManageCoachConversations from "./components/ManageCoachConversations";
import ViewReports from "./components/ViewReports";
import WeeklyReports from "./components/WeeklyReports";
import Changelog from "./components/Changelog";
import Settings from "./components/Settings";
import Theme from "./components/Theme";
import { NavigationProvider, useNavigationContext, BottomNav, MoreMenu, SidebarNav, QuickActionsFAB } from "./components/navigation";
import { ToastProvider } from "./contexts/ToastContext";
import ToastContainer from "./components/shared/ToastContainer";
import { AuthProvider, useAuth, AuthRouter, ProtectedRoute } from "./auth";
import { setAuthFailureHandler } from "./utils/apis/apiConfig";
import { usePageTitle } from "./hooks/usePageTitle";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const {
    isSidebarCollapsed,
    userId,
    coachId,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteCommand,
    setCommandPaletteCommand
  } = useNavigationContext();

  // Check if we're on a chat page (hide bottom nav and FAB for focused conversation UX)
  const isChatPage = location.pathname.includes('/coach-conversations') ||
                     location.pathname.includes('/coach-creator');

  // Workout agent for command palette
  const workoutAgentRef = useRef(null);

  // Update page title based on current route
  usePageTitle();

  // Set up the auth failure handler to use React Router navigation
  useEffect(() => {
    setAuthFailureHandler(() => {
      navigate('/auth', { replace: true });
    });
  }, [navigate]);

  // Initialize workout agent for command palette
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, () => {});
    } else {
      workoutAgentRef.current.setUserId(userId);
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId]);

  // Global keyboard shortcuts for command palette
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
  }, [setIsCommandPaletteOpen, setCommandPaletteCommand]);

  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar Navigation (≥ 768px) */}
      <SidebarNav />

      {/* Breadcrumbs - handles its own positioning */}
      <Breadcrumbs />

      {/* Main Content - with left margin on desktop for sidebar */}
      <div
        className={`border-none outline-none bg-synthwave-bg-tertiary ${isHomePage ? "pt-4" : "pt-12"} pb-20 md:pb-0 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}
      >
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/technology" element={<Technology />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/template/synthwave" element={<Theme />} />
          <Route path="/contact" element={<ContactForm />} />

          {/* Authentication route */}
          <Route path="/auth" element={<AuthRouter />} />

          {/* Protected routes */}
          <Route path="/coach-creator" element={<ProtectedRoute><CoachCreator /></ProtectedRoute>} />
          <Route path="/coaches" element={<ProtectedRoute><Coaches /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/training-grounds" element={<ProtectedRoute><TrainingGrounds /></ProtectedRoute>} />
          <Route
            path="/training-grounds/coach-conversations"
            element={<ProtectedRoute><CoachConversations /></ProtectedRoute>}
          />
          <Route path="/streaming-debug-test" element={<ProtectedRoute><StreamingDebugTest /></ProtectedRoute>} />
          <Route path="/training-grounds/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
          <Route
            path="/training-grounds/manage-workouts"
            element={<ProtectedRoute><ManageWorkouts /></ProtectedRoute>}
          />
          <Route
            path="/training-grounds/manage-memories"
            element={<ProtectedRoute><ManageMemories /></ProtectedRoute>}
          />
          <Route
            path="/training-grounds/manage-conversations"
            element={<ProtectedRoute><ManageCoachConversations /></ProtectedRoute>}
          />
          <Route path="/training-grounds/reports" element={<ProtectedRoute><ViewReports /></ProtectedRoute>} />
          <Route
            path="/training-grounds/reports/weekly"
            element={<ProtectedRoute><WeeklyReports /></ProtectedRoute>}
          />

          {/* Trailing slash redirects handled at server level via amplify.yml */}
        </Routes>
      </div>
      <ToastContainer />

      {/* Command Palette - Global */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand('');
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={workoutAgentRef.current}
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === 'conversation-created' && data?.conversationId) {
            navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Mobile Navigation (Phase 2) - Only visible on < 768px, hidden on chat pages */}
      {!isChatPage && <BottomNav />}
      <MoreMenu />

      {/* Quick Actions FAB (Phase 4) - Only visible on mobile with coach context, hidden on chat pages */}
      {!isChatPage && <QuickActionsFAB />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
