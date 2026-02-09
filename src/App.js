import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import ImageCryptoAnalyzer from './components/ImageCryptoAnalyzer';
import './App.css';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) setUsers(JSON.parse(storedUsers));

    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) setUser(JSON.parse(currentUser));
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('users', JSON.stringify(users));
    }
  }, [users]);

  const handleRegister = (userData) => {
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      return { success: false, message: 'User with this email already exists' };
    }

    const newUser = {
      id: Date.now(),
      ...userData,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    setUsers([...users, newUser]);
    return { success: true };
  };

  const handleLogin = (credentials, isAdmin) => {
    if (isAdmin) {
      if (
        credentials.username === ADMIN_CREDENTIALS.username &&
        credentials.password === ADMIN_CREDENTIALS.password
      ) {
        const adminUser = { username: 'admin', role: 'admin' };
        setUser(adminUser);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        return { success: true, role: 'admin' };
      }
      return { success: false };
    }

    const foundUser = users.find(
      u => u.email === credentials.email && u.password === credentials.password
    );

    if (foundUser) {
      const session = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: 'user'
      };
      setUser(session);
      localStorage.setItem('currentUser', JSON.stringify(session));
      return { success: true, role: 'user' };
    }

    return { success: false };
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRole && user.role !== allowedRole) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={user ? <Navigate to="/user/dashboard" /> : <Login onLogin={handleLogin} />}
        />

        <Route
          path="/register"
          element={<Register onRegister={handleRegister} />}
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard user={user} onLogout={handleLogout} users={users} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRole="user">
              <UserDashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analyzer"
          element={
            <ProtectedRoute>
              <ImageCryptoAnalyzer />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
