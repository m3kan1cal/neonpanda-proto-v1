import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Breadcrumbs from "./components/shared/Breadcrumbs";
import PublicHeader from "./components/shared/PublicHeader";
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
import ProgramDesigner from "./components/ProgramDesigner";
import StreamingDebugTest from "./components/StreamingDebugTest";
import WorkoutDetails from "./components/WorkoutDetails";
import ManageWorkouts from "./components/ManageWorkouts";
import ManageExercises from "./components/ManageExercises";
import ManageMemories from "./components/ManageMemories";
import ManageCoachConversations from "./components/ManageCoachConversations";
import ViewReports from "./components/ViewReports";
import WeeklyReports from "./components/WeeklyReports";
import ManagePrograms from "./components/programs/ManagePrograms";
import ViewWorkouts from "./components/programs/ViewWorkouts";
import ProgramDashboard from "./components/programs/ProgramDashboard";
import Changelog from "./components/Changelog";
import Settings from "./components/Settings";
import Theme from "./components/Theme";
import BlogIndex from "./components/blog/BlogIndex";
import BlogPostRouter from "./components/blog/BlogPostRouter";
import SharedProgramPreview from "./components/shared-programs/SharedProgramPreview";
import ManageSharedPrograms from "./components/shared-programs/ManageSharedPrograms";
import { WelcomePage } from "./components/subscription";
import {
  NavigationProvider,
  useNavigationContext,
  BottomNav,
  MoreMenu,
  SidebarNav,
  QuickActionsFAB,
} from "./components/navigation";
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
    setCommandPaletteCommand,
  } = useNavigationContext();

  // Determine if current route is a public/marketing page (including auth pages)
  const publicRoutes = [
    "/",
    "/about",
    "/technology",
    "/privacy",
    "/terms",
    "/faqs",
    "/changelog",
    "/contact",
    "/template/synthwave",
    "/auth", // Includes all auth child routes (signin, signup, etc.)
    "/welcome", // Post-checkout welcome page
    "/blog", // Blog index and all blog posts
    "/shared", // Shared program previews (public access)
  ];
  const isPublicPage =
    publicRoutes.includes(location.pathname) ||
    publicRoutes.some(
      (route) => route !== "/" && location.pathname.startsWith(route),
    );

  // Check if we're on a chat page (hide bottom nav and FAB for focused conversation UX)
  const isChatPage =
    location.pathname.includes("/coach-conversations") ||
    location.pathname.includes("/coach-creator") ||
    location.pathname.includes("/program-designer");

  // Workout agent for command palette
  const workoutAgentRef = useRef(null);

  // Update page title based on current route
  usePageTitle();

  // Set up the auth failure handler to use React Router navigation
  useEffect(() => {
    setAuthFailureHandler(() => {
      navigate("/auth", { replace: true });
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
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setCommandPaletteCommand("");
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [setIsCommandPaletteOpen, setCommandPaletteCommand]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Conditional Navigation: Public Header vs Full App Navigation */}
      {isPublicPage ? (
        // Public pages: Simple header only
        <PublicHeader />
      ) : (
        // App pages: Full navigation system
        <>
          {/* Desktop Sidebar Navigation (≥ 768px) */}
          <SidebarNav />

          {/* Breadcrumbs - handles its own positioning */}
          <Breadcrumbs />
        </>
      )}

      {/* Main Content - conditional margin based on navigation type */}
      <div
        className={`border-none outline-none bg-synthwave-bg-tertiary ${
          isPublicPage
            ? "pt-16" // Public pages: just header spacing
            : isHomePage
              ? "pt-4 pb-20 md:pb-0" // App home: minimal top, bottom nav spacing
              : `pt-12 pb-20 md:pb-0 ${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"}` // App pages: breadcrumbs + sidebar
        }`}
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

          {/* Blog routes */}
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPostRouter />} />

          {/* Shared program preview (public access) */}
          <Route
            path="/shared/programs/:sharedProgramId"
            element={<SharedProgramPreview />}
          />

          {/* Authentication route */}
          <Route path="/auth" element={<AuthRouter />} />

          {/* Welcome page - Post-checkout success (protected, uses public theming) */}
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <WelcomePage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/coach-creator"
            element={
              <ProtectedRoute>
                <CoachCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coaches"
            element={
              <ProtectedRoute>
                <Coaches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds"
            element={
              <ProtectedRoute>
                <TrainingGrounds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/coach-conversations"
            element={
              <ProtectedRoute>
                <CoachConversations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/program-designer"
            element={
              <ProtectedRoute>
                <ProgramDesigner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/streaming-debug-test"
            element={
              <ProtectedRoute>
                <StreamingDebugTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/workouts"
            element={
              <ProtectedRoute>
                <WorkoutDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/manage-workouts"
            element={
              <ProtectedRoute>
                <ManageWorkouts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/manage-exercises"
            element={
              <ProtectedRoute>
                <ManageExercises />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/manage-memories"
            element={
              <ProtectedRoute>
                <ManageMemories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/manage-conversations"
            element={
              <ProtectedRoute>
                <ManageCoachConversations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/reports"
            element={
              <ProtectedRoute>
                <ViewReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/reports/weekly"
            element={
              <ProtectedRoute>
                <WeeklyReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/programs"
            element={
              <ProtectedRoute>
                <ManagePrograms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/programs/shared"
            element={
              <ProtectedRoute>
                <ManageSharedPrograms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/programs/dashboard"
            element={
              <ProtectedRoute>
                <ProgramDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/programs/workouts"
            element={
              <ProtectedRoute>
                <ViewWorkouts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-grounds/programs/:programId/day/:dayNumber"
            element={
              <ProtectedRoute>
                <ViewWorkouts />
              </ProtectedRoute>
            }
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
          setCommandPaletteCommand("");
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={workoutAgentRef.current}
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === "conversation-created" && data?.conversationId) {
            navigate(
              `/training-grounds/coach-conversations?userId=${data.userId || userId}&coachId=${data.coachId || coachId}&conversationId=${data.conversationId}`,
            );
          } else if (type === "shared-programs") {
            navigate(
              `/training-grounds/programs/shared?userId=${data.userId || userId}&coachId=${data.coachId || coachId}`,
            );
          } else if (type === "coach-creator" && data?.sessionId) {
            navigate(
              `/coach-creator?userId=${data.userId || userId}&coachCreatorSessionId=${data.sessionId}`,
            );
          } else if (type === "program-designer" && data?.sessionId) {
            navigate(
              `/training-grounds/program-designer?userId=${data.userId || userId}&coachId=${data.coachId}&programDesignerSessionId=${data.sessionId}`,
            );
          } else if (type === "exercises") {
            navigate(
              `/training-grounds/manage-exercises?userId=${data.userId || userId}&coachId=${data.coachId || coachId}`,
            );
          }
        }}
      />

      {/* App Navigation Components - Only for app pages, not public pages */}
      {!isPublicPage && (
        <>
          {/* Mobile Navigation (Phase 2) - Only visible on < 768px, hidden on chat pages */}
          {!isChatPage && <BottomNav />}
          <MoreMenu />

          {/* Quick Actions FAB (Phase 4) - Only visible on mobile with coach context, hidden on chat pages */}
          {!isChatPage && <QuickActionsFAB />}
        </>
      )}
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
