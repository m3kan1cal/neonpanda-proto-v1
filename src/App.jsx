import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Navigation from "./components/Navigation";
import Breadcrumbs from "./components/Breadcrumbs";
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
import Workouts from "./components/Workouts";
import ManageWorkouts from "./components/ManageWorkouts";
import ManageMemories from "./components/ManageMemories";
import ManageCoachConversations from "./components/ManageCoachConversations";
import ViewReports from "./components/ViewReports";
import WeeklyReports from "./components/WeeklyReports";
import Changelog from "./components/Changelog";
import Theme from "./components/Theme";
import { ToastProvider } from "./contexts/ToastContext";
import ToastContainer from "./components/ToastContainer";
import { AuthProvider, useAuth, AuthRouter, ProtectedRoute } from "./auth";
import { setAuthFailureHandler } from "./utils/apis/apiConfig";
import { usePageTitle } from "./hooks/usePageTitle";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const { user, signOut } = useAuth();

  // Update page title based on current route
  usePageTitle();

  // Set up the auth failure handler to use React Router navigation
  useEffect(() => {
    setAuthFailureHandler(() => {
      console.info('Token refresh failed, navigating to /auth');
      navigate('/auth', { replace: true });
    });
  }, [navigate]);

  // Debug: Log user info to console (matching existing pattern)
  console.info("🔐 Authenticated user:", user);
  console.info("🆔 Custom User ID:", user?.attributes?.["custom:user_id"]);

  return (
    <div className="min-h-screen">
      <Navigation user={user} signOut={signOut} />
      <Breadcrumbs />
      <div
        className={`border-none outline-none bg-synthwave-bg-tertiary ${isHomePage ? "pt-[66px]" : "pt-24"}`}
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
          <Route path="/training-grounds" element={<ProtectedRoute><TrainingGrounds /></ProtectedRoute>} />
          <Route
            path="/training-grounds/coach-conversations"
            element={<ProtectedRoute><CoachConversations /></ProtectedRoute>}
          />
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
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
