import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { VoiceCommandProvider } from './context/VoiceCommandContext';
import VoiceChatbot from './components/VoiceChatbot';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const ScanDispense = lazy(() => import('./pages/ScanDispense'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AddBeneficiary = lazy(() => import('./pages/AddBeneficiary'));
const ShopHistory = lazy(() => import('./pages/ShopHistory'));
const VoiceHelp = lazy(() => import('./pages/VoiceHelp'));

// Admin Sub-Pages
const AddEmployee = lazy(() => import('./pages/admin/AddEmployee'));
const AdminNetwork = lazy(() => import('./pages/admin/AdminNetwork'));
const AssignShop = lazy(() => import('./pages/admin/AssignShop'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={48} className="text-brand-500 animate-spin" />
      <p className="text-slate-400 font-medium">Loading Smart PDS...</p>
    </div>
  </div>
);

// Protected Route Logic
const ProtectedRoute = ({ children, isAdmin }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAuthenticated = !!user;
  const role = (user?.role === 'manager' || user?.role === 'admin') ? 'admin' : 'employee';

  if (!isAuthenticated) return <Navigate to="/" />;
  if (isAdmin && role !== 'admin') return <Navigate to="/home" />;
  if (!isAdmin && role === 'admin') return <Navigate to="/admin" />;

  return children;
};

function App() {
  return (
    <Router>
      <VoiceCommandProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Login />} />

              {/* Employee Routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanDispense /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><ShopHistory /></ProtectedRoute>} />
              <Route path="/add-beneficiary" element={<ProtectedRoute><AddBeneficiary /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><VoiceHelp /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute isAdmin={true}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/setup/employee/new" element={<ProtectedRoute isAdmin={true}><AddEmployee /></ProtectedRoute>} />
              <Route path="/admin/network" element={<ProtectedRoute isAdmin={true}><AdminNetwork /></ProtectedRoute>} />
              <Route path="/admin/network/assign" element={<ProtectedRoute isAdmin={true}><AssignShop /></ProtectedRoute>} />
              <Route path="/admin/inventory" element={<ProtectedRoute isAdmin={true}><AdminInventory /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute isAdmin={true}><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/requests" element={<ProtectedRoute isAdmin={true}><AdminRequests /></ProtectedRoute>} />
            </Routes>
          </Suspense>

          {/* Global Voice Assistant */}
          <VoiceChatbot />
        </div>
      </VoiceCommandProvider>
    </Router>
  );
}

export default App;
