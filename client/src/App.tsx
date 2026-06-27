import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from './auth/MsalProvider';
import Login from './pages/Login';
import Home from './pages/Home';
import Submit from './pages/Submit';
import MyRequests from './pages/MyRequests';
import PendingApprovals from './pages/PendingApprovals';
import Detail from './pages/Detail';
import FinanceDashboard from './pages/FinanceDashboard';
import FileVault from './pages/FileVault';

export default function App() {
  const location = useLocation();

  // Handle Azure AD callback
  if (location.pathname === '/auth/callback') {
    const code = new URLSearchParams(location.search).get('code');
    if (code) {
      import('./auth/MsalProvider').then(({ handleAuthCallback }) => handleAuthCallback(code));
    }
    return <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] text-gray-400">
      <div className="text-center"><div className="text-3xl mb-3 animate-bounce">📋</div><p>正在登录...</p></div>
    </div>;
  }

  const authed = isAuthenticated();
  if (!authed && location.pathname !== '/login') return <Navigate to="/login" replace />;
  if (authed && location.pathname === '/login') return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/submit" element={<Submit />} />
      <Route path="/my-requests" element={<MyRequests />} />
      <Route path="/pending" element={<PendingApprovals />} />
      <Route path="/detail/:id" element={<Detail />} />
      <Route path="/finance" element={<FinanceDashboard />} />
      <Route path="/vault" element={<FileVault />} />
      <Route path="/search" element={<FinanceDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
