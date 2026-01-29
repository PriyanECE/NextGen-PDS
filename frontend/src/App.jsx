import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import ScanDispense from './pages/ScanDispense';
import AdminDashboard from './pages/AdminDashboard';
import AddBeneficiary from './pages/AddBeneficiary'; // New Page
import ShopHistory from './pages/ShopHistory';
import Payment from './pages/Payment';
import VoiceHelp from './pages/VoiceHelp';
import VoiceChatbot from './components/VoiceChatbot';

// Placeholder for Protected Route logic
const ProtectedRoute = ({ children, isAdmin }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAuthenticated = !!user;

  // Normalize Role: Mapping 'manager' from DB to 'admin' for frontend consistency
  const role = user?.role === 'manager' ? 'admin' : 'employee';

  if (!isAuthenticated) return <Navigate to="/" />;

  // Redirect Logic: No Overlap
  if (isAdmin && role !== 'admin') {
    // Employee tries to access /admin -> Send to /home
    return <Navigate to="/home" />;
  }

  if (!isAdmin && role === 'admin') {
    // Admin tries to access Employee pages -> Send to /admin
    return <Navigate to="/admin" />;
  }

  return children;
};

import { VoiceCommandProvider } from './context/VoiceCommandContext';

function App() {
  return (
    <Router>
      <VoiceCommandProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/scan" element={
              <ProtectedRoute>
                <ScanDispense />
              </ProtectedRoute>
            } />
            <Route path="/payment" element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <ShopHistory />
              </ProtectedRoute>
            } />
            <Route path="/add-beneficiary" element={
              <ProtectedRoute>
                <AddBeneficiary />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute isAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute>
                <VoiceHelp />
              </ProtectedRoute>
            } />
          </Routes>

          {/* Global Chatbot Widget */}
          <VoiceChatbot />
        </div>
      </VoiceCommandProvider>
    </Router>
  );
}

export default App;
