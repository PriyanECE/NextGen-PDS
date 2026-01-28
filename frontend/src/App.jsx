import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import ScanDispense from './pages/ScanDispense';
import AdminDashboard from './pages/AdminDashboard';
import AddBeneficiary from './pages/AddBeneficiary'; // New Page
import ShopHistory from './pages/ShopHistory';
import Payment from './pages/Payment';
import VoiceChatbot from './components/VoiceChatbot';

// Placeholder for Protected Route logic
const ProtectedRoute = ({ children, isAdmin }) => {
  // TODO: Implement actual auth check
  const isAuthenticated = true; // Mock
  const userRole = isAdmin ? 'admin' : 'user'; // Mock, assume admin for dev

  if (!isAuthenticated) return <Navigate to="/" />;
  if (isAdmin && userRole !== 'admin') return <Navigate to="/home" />;
  return children;
};

function App() {
  return (
    <Router>
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
        </Routes>

        {/* Global Chatbot Widget */}
        {/* <VoiceChatbot /> */}
      </div>
    </Router>
  );
}

export default App;
