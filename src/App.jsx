import React, { Suspense, lazy, useEffect, useRef } from "react";
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
import Changelog from "./components/Changelog";
import Theme from "./components/Theme";
import RetroTemplate from "./components/themes/RetroComponents";
import BlogIndex from "./components/blog/BlogIndex";
import BlogPostRouter from "./components/blog/BlogPostRouter";
import SharedProgramPreview from "./components/shared-programs/SharedProgramPreview";
import DocsLayout from "./components/docs/DocsLayout";
import DocsHome from "./components/docs/DocsHome";
import CreatingACoach from "./components/docs/CreatingACoach";
import LoggingWorkouts from "./components/docs/LoggingWorkouts";
import CoachConversationsDoc from "./components/docs/CoachConversations";

// Heavy authenticated pages — lazy loaded so they don't bloat the initial bundle
const CoachCreator = lazy(() => import("./components/CoachCreator"));
const Coaches = lazy(() => import("./components/Coaches"));
const TrainingGroundsV2 = lazy(() => import("./components/TrainingGroundsV2"));
const CoachConversations = lazy(
  () => import("./components/CoachConversations"),
);
const ProgramDesigner = lazy(() => import("./components/ProgramDesigner"));
const WorkoutDetails = lazy(() => import("./components/WorkoutDetails"));
const ManageWorkouts = lazy(() => import("./components/ManageWorkouts"));
const ManageExercises = lazy(() => import("./components/ManageExercises"));
const ManageMemories = lazy(() => import("./components/ManageMemories"));
const ManageCoachConversations = lazy(
  () => import("./components/ManageCoachConversations"),
);
const ViewReports = lazy(() => import("./components/ViewReports"));
const Analytics = lazy(() => import("./components/analytics/TrainingPulse"));
const WeeklyReports = lazy(() => import("./components/WeeklyReports"));
const ManagePrograms = lazy(
  () => import("./components/programs/ManagePrograms"),
);
const ViewWorkouts = lazy(() => import("./components/programs/ViewWorkouts"));
const ProgramDashboard = lazy(
  () => import("./components/programs/ProgramDashboard"),
);
const Settings = lazy(() => import("./components/Settings"));
const ManageSharedPrograms = lazy(
  () => import("./components/shared-programs/ManageSharedPrograms"),
);
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
import { AuthProvider, AuthRouter, ProtectedRoute } from "./auth";
import { setAuthFailureHandler } from "./utils/apis/apiConfig";
import { usePageTitle } from "./hooks/usePageTitle";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const {
    userId,
    coachId,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteCommand,
    setCommandPaletteCommand,
    isInlineCoachDrawerOpen,
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
    "/template/retro",
    "/auth", // Includes all auth child routes (signin, signup, etc.)
    "/welcome", // Post-checkout welcome page
    "/blog", // Blog index and all blog posts
    "/docs", // Documentation pages
    "/shared", // Shared program previews (public access)
  ];
  const isPublicPage =
    publicRoutes.includes(location.pathname) ||
    publicRoutes.some(
      (route) => route !== "/" && location.pathname.startsWith(route),
    );

  // Retro template is full-page with its own nav; show no app/public header
  const isRetroTemplatePage = location.pathname === "/template/retro";

  // Check if we're on a chat page (hide bottom nav and FAB for focused conversation UX)
  const isChatPage =
    location.pathname.includes("/coach-conversations") ||
    location.pathname.includes("/coach-creator") ||
    location.pathname.includes("/program-designer");

  const hideMobileImmersiveChrome = isChatPage || isInlineCoachDrawerOpen;

  const hideQuickFabOnEntityCoachMobile =
    location.pathname === "/training-grounds" ||
    location.pathname === "/training-grounds/workouts";

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
        const isMobileShell =
          typeof window !== "undefined" &&
          window.matchMedia("(max-width: 767px)").matches;
        if (isMobileShell && isInlineCoachDrawerOpen) {
          return;
        }
        setCommandPaletteCommand("");
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [
    setIsCommandPaletteOpen,
    setCommandPaletteCommand,
    isInlineCoachDrawerOpen,
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col bg-synthwave-gradient">
      {/* Conditional Navigation: Public Header vs Full App Navigation */}
      {isRetroTemplatePage ? null : isPublicPage ? (
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
        className={`flex-1 flex flex-col border-none outline-none bg-transparent ${
          isRetroTemplatePage
            ? "pt-0" // Retro template: full viewport, own nav
            : isPublicPage
              ? "pt-16" // Public pages: just header spacing
              : isHomePage
                ? "pt-4 pb-20 md:pb-0" // App home: minimal top, bottom nav spacing
                : "pt-12 pb-20 md:pb-0 md:ml-20 md:mr-20" // App pages: breadcrumbs + sidebar (symmetric margins, sidebar is floating overlay)
        }`}
      >
        <Suspense
          fallback={<div className="min-h-screen bg-synthwave-gradient" />}
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
            <Route path="/template/retro" element={<RetroTemplate />} />
            <Route path="/contact" element={<ContactForm />} />

            {/* Documentation routes */}
            <Route path="/docs" element={<DocsLayout />}>
              <Route index element={<DocsHome />} />
              <Route path="creating-a-coach" element={<CreatingACoach />} />
              <Route path="logging-workouts" element={<LoggingWorkouts />} />
              <Route
                path="coach-conversations"
                element={<CoachConversationsDoc />}
              />
            </Route>

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
                  <TrainingGroundsV2 />
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
              path="/training-grounds/training-pulse"
              element={
                <ProtectedRoute>
                  <Analytics />
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
        </Suspense>
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
          {/* Mobile shell: hidden on chat routes and while inline coach drawer is open */}
          {!hideMobileImmersiveChrome && <BottomNav />}
          {!hideMobileImmersiveChrome && <MoreMenu />}

          {!hideMobileImmersiveChrome && !hideQuickFabOnEntityCoachMobile && (
            <QuickActionsFAB />
          )}
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
