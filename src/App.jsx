import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './HomePage';
import SchemeDetails from './components/SchemeDetails';
import Profile from './Profile';
import FindSchemes from './FindSchemes';
import { useLocation, useNavigate } from 'react-router-dom';

import FloatingChatAssistant from './components/FloatingChatAssistant';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (() => {
    if (location.pathname.startsWith('/find-schemes')) return 'find-schemes';
    if (location.pathname.startsWith('/profile')) return 'profile';
    return 'home';
  })();

  const handleTabChange = (tab) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'find-schemes') navigate('/find-schemes');
    else if (tab === 'profile') navigate('/profile');
  };

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scheme/:slug" element={<SchemeDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/find-schemes" element={<FindSchemes />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <FloatingChatAssistant />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
