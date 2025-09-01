import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navigation from "./components/Navigation";
import Breadcrumbs from "./components/Breadcrumbs";
import LandingPage from "./components/LandingPage";
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
import { ToastProvider } from "./contexts/ToastContext";
import ToastContainer from "./components/ToastContainer";
import { AuthProvider, useAuth, AuthRouter, ProtectedRoute } from "./auth";

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const { user, signOut } = useAuth();

  // Debug: Log user info to console (matching existing pattern)
  console.info("🔐 Authenticated user:", user);
  console.info("🆔 Custom User ID:", user?.attributes?.["custom:user_id"]);

  return (
    <div className="min-h-screen">
      <Navigation user={user} signOut={signOut} />
      <Breadcrumbs />
      <div
        className={`border-none outline-none bg-synthwave-bg-purple ${isHomePage ? "pt-[72px]" : "pt-24"}`}
      >
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/changelog" element={<Changelog />} />
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
