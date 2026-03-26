import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminLayout from './components/AdminLayout';
import ResetPassword from './components/ResetPassword';
import ImageCryptoAnalyzer from './components/ImageCryptoAnalyzer';
import AssetDetailPage from './components/AssetDetailPage';
import AssetTrackingPage from './components/AssetTrackingPage';
import VerifyPage from './components/VerifyPage';
import ImageTravelHistory from './components/ImageTravelHistory';
import PublicVerifyPage from './components/PublicVerifyPage';
import PublicCertificateView from './components/PublicCertificateView';
import { getUser, getToken, removeToken, saveToken, saveUser } from './utils/auth';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole,    setUserRole]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (token && user) {
      setCurrentUser(user);
      setUserRole(user.role);
      // Restore UUID on app startup
      localStorage.setItem('userUUID', user.id);
      // Refresh UUID from backend silently
      fetch('https://pinit-backend.onrender.com/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => { if (data.id) localStorage.setItem('userUUID', data.id); })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  // Fetch UUID from backend and store locally
  const refreshUUID = async (token) => {
    try {
      const res = await fetch('https://pinit-backend.onrender.com/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.id) {
        localStorage.setItem('userUUID', data.id);
      }
    } catch (e) {
      // Silently fail — UUID already saved from login response
    }
  };

  const handleLogin = (user, token) => {
    saveToken(token);
    saveUser(user);
    setCurrentUser(user);
    setUserRole(user.role);
    localStorage.setItem(`lastLogin_${user.email}`, new Date().toISOString());
    // Store UUID immediately from login response
    localStorage.setItem('userUUID', user.id);
    // Also refresh from backend to ensure latest UUID
    refreshUUID(token);
  };

  const handleLogout = () => {
  // Preserve biometric data before logout
  const biometricEnrolled = localStorage.getItem('biometricEnrolled');
  const biometricEmail    = localStorage.getItem('biometricEmail');
  const biometricCredId   = localStorage.getItem('biometricCredentialId');
  const savedToken        = localStorage.getItem('savedToken');
  const savedUser         = localStorage.getItem('savedUser');

  removeToken();

  // Restore biometric data after logout
  if (biometricEnrolled) localStorage.setItem('biometricEnrolled',    biometricEnrolled);
  if (biometricEmail)    localStorage.setItem('biometricEmail',        biometricEmail);
  if (biometricCredId)   localStorage.setItem('biometricCredentialId', biometricCredId);
  if (savedToken)        localStorage.setItem('savedToken',            savedToken);
  if (savedUser)         localStorage.setItem('savedUser',             savedUser);

  setCurrentUser(null);
  setUserRole(null);
};

  const RequireAuth = ({ children, role }) => {
    if (loading) return <div>Loading...</div>;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (role && userRole !== role) {
      return <Navigate
        to={userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />;
    }
    return children;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>

        {/* Public routes */}
        {/* Public routes */}
        <Route
          path="/login"
          element={
            currentUser
              ? <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'} replace />
              : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            currentUser
              ? <Navigate to="/user/dashboard" replace />
              : <Register />
          }
        />
        <Route path="/public/verify" element={<PublicVerifyPage />} />
        <Route path="/public/certificate/:certificateId" element={<PublicCertificateView />} />  {/* ← ADD THIS */}


        {/* User routes */}
        <Route
          path="/user/dashboard"
          element={
            <RequireAuth role="user">
              <UserDashboard user={currentUser} onLogout={handleLogout} />
            </RequireAuth>
          }
        />

        {/* Analyzer accessible by both roles */}
        <Route
          path="/analyzer"
          element={
            <RequireAuth>
              <ImageCryptoAnalyzer user={currentUser} />
            </RequireAuth>
          }
        />

        {/* ── Admin routes — all wrapped in AdminLayout ── */}
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth role="admin">
              <AdminLayout user={currentUser} onLogout={handleLogout}>
                <AdminDashboard user={currentUser} onLogout={handleLogout} />
              </AdminLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/assets"
          element={
            <RequireAuth role="admin">
              <AdminLayout user={currentUser} onLogout={handleLogout}>
                <AssetTrackingPage user={currentUser} />
              </AdminLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/verify"
          element={
            <RequireAuth role="admin">
              <AdminLayout user={currentUser} onLogout={handleLogout}>
                <VerifyPage user={currentUser} />
              </AdminLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/track/:assetId"
          element={
            <RequireAuth role="admin">
              <AdminLayout user={currentUser} onLogout={handleLogout}>
                <AssetDetailPage user={currentUser} />
              </AdminLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/track/:assetId/history"
          element={
            <RequireAuth role="admin">
              <AdminLayout user={currentUser} onLogout={handleLogout}>
                <ImageTravelHistory />
              </AdminLayout>
            </RequireAuth>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            currentUser
              ? <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'} replace />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

      </Routes>
    </Router>
  );
}

export default App;