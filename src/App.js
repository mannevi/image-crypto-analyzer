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

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────
const USERS_KEY = 'app-users';
const SESSION_KEY = 'app-session';

// Default admin credentials
const ADMIN = { username: 'admin', password: 'admin123' };

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'user'
  const [users, setUsers] = useState([]);

  // Rehydrate session on mount
  useEffect(() => {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) setUsers(JSON.parse(stored));

    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const { user, role } = JSON.parse(session);
      setCurrentUser(user);
      setUserRole(role);
    }
  }, []);

  // ── Auth handlers ──────────────────────────────────────────────────────────

  const handleLogin = (credentials, isAdmin) => {
    if (isAdmin) {
      if (credentials.username === ADMIN.username && credentials.password === ADMIN.password) {
        const adminUser = { username: ADMIN.username };
        setCurrentUser(adminUser);
        setUserRole('admin');
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: adminUser, role: 'admin' }));
        return { success: true, role: 'admin' };
      }
      return { success: false, message: 'Invalid admin credentials' };
    }

    // Regular user login
    const stored = localStorage.getItem(USERS_KEY);
    const allUsers = stored ? JSON.parse(stored) : [];
    const found = allUsers.find(
      u => u.email.toLowerCase() === credentials.email.toLowerCase() && u.password === credentials.password
    );

    if (found) {
      setCurrentUser(found);
      setUserRole('user');
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: found, role: 'user' }));
      return { success: true, role: 'user' };
    }
    return { success: false, message: 'Invalid email or password' };
  };

  const handleRegister = (userData) => {
    const stored = localStorage.getItem(USERS_KEY);
    const allUsers = stored ? JSON.parse(stored) : [];

    const exists = allUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (exists) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      createdAt: new Date().toISOString()
    };

    const updated = [...allUsers, newUser];
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    setUsers(updated);

    return { success: true, message: 'Account created successfully! Please log in.' };
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // ── Route guards ───────────────────────────────────────────────────────────

  const RequireAuth = ({ children, role }) => {
    if (!currentUser) return <Navigate to="/login" replace />;
    if (role && userRole !== role) {
      return <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'} replace />;
    }
    return children;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Router>
      <Routes>
        {/* Public — no auth required */}
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
              : <Register onRegister={handleRegister} />
          }
        />

        {/* Public verification report — shareable, no login needed */}
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

        {/* Shared: Image Analyzer (accessible by both roles) */}
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
              <AdminDashboard user={currentUser} onLogout={handleLogout} users={users} />
            </RequireAuth>
          }
        />

        {/* Asset Detail — navigated to from AssetTrackingPage */}
        <Route
          path="/admin/track/:assetId"
          element={
            <RequireAuth role="admin">
              <AssetDetailPage user={currentUser} />
            </RequireAuth>
          }
        />

        {/* Image Travel History — navigated to from AssetDetailPage */}
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