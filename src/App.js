import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import ImageCryptoAnalyzer from './components/ImageCryptoAnalyzer';
import AssetDetailPage from './components/AssetDetailPage';
import ImageTravelHistory from './components/ImageTravelHistory';
import PublicVerifyPage from './components/PublicVerifyPage';
import { getUser, getToken, removeToken, saveToken, saveUser } from './utils/auth';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole,    setUserRole]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  // Rehydrate session on mount
  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (token && user) {
      setCurrentUser(user);
      setUserRole(user.role);
    }
    setLoading(false);
  }, []);

  // Called from Login.js after successful login
  const handleLogin = (user, token) => {
    saveToken(token);
    saveUser(user);
    setCurrentUser(user);
    setUserRole(user.role);
      localStorage.setItem(`lastLogin_${user.email}`, new Date().toISOString());
  };

  const handleLogout = () => {
    removeToken();
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

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth role="admin">
              <AdminDashboard user={currentUser} onLogout={handleLogout} users={[]} />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/track/:assetId"
          element={
            <RequireAuth role="admin">
              <AssetDetailPage user={currentUser} />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/track/:assetId/history"
          element={
            <RequireAuth role="admin">
              <ImageTravelHistory />
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

      </Routes>
    </Router>
  );
}

export default App;