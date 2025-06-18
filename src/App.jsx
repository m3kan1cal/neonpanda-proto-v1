import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import FAQs from './components/FAQs';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navigation />
        <div className="border-none outline-none bg-synthwave-bg-primary">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/faqs" element={<FAQs />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;