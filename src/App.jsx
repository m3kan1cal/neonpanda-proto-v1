import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import FAQs from './components/FAQs';
import ContactForm from './components/ContactForm';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen">
          <Navigation />
          <div className="border-none outline-none bg-synthwave-bg-primary">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/contact" element={<ContactForm />} />
            </Routes>
          </div>
          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;