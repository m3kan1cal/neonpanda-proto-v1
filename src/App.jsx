import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Breadcrumbs from './components/Breadcrumbs';
import LandingPage from './components/LandingPage';
import FAQs from './components/FAQs';
import ContactForm from './components/ContactForm';
import CoachCreator from './components/CoachCreator';
import Coaches from './components/Coaches';
import TrainingGrounds from './components/TrainingGrounds';
import CoachConversations from './components/CoachConversations';
import Workouts from './components/Workouts';
import ManageWorkouts from './components/ManageWorkouts';
import ManageMemories from './components/ManageMemories';
import ManageCoachConversations from './components/ManageCoachConversations';
import ViewReports from './components/ViewReports';
import WeeklyReports from './components/WeeklyReports';
import Changelog from './components/Changelog';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen">
      <Navigation />
      <Breadcrumbs />
      <div className={`border-none outline-none bg-synthwave-bg-purple ${isHomePage ? 'pt-[72px]' : 'pt-24'}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/contact" element={<ContactForm />} />
          <Route path="/coach-creator" element={<CoachCreator />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/training-grounds" element={<TrainingGrounds />} />
          <Route path="/training-grounds/coach-conversations" element={<CoachConversations />} />
          <Route path="/training-grounds/workouts" element={<Workouts />} />
          <Route path="/training-grounds/manage-workouts" element={<ManageWorkouts />} />
          <Route path="/training-grounds/manage-memories" element={<ManageMemories />} />
          <Route path="/training-grounds/manage-conversations" element={<ManageCoachConversations />} />
          <Route path="/training-grounds/reports" element={<ViewReports />} />
          <Route path="/training-grounds/reports/weekly" element={<WeeklyReports />} />

          {/* Trailing slash redirects handled at server level via amplify.yml */}
        </Routes>
      </div>
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}

export default App;