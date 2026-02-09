import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart3, Settings, LogOut, FileSearch, Camera } from 'lucide-react';
import './AdminDashboard.css';

function AdminDashboard({ user, onLogout, users }) {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const launchAnalyzer = () => {
    navigate('/analyzer');
  };

  return (
    <div className="admin-dashboard">
      {/* Navigation Bar */}
      <div className="dashboard-nav">
        <div className="nav-brand">
          <h2>🔍 Image Forensics App - Admin</h2>
        </div>
        <div className="nav-user">
          <span>Admin: {user.username}</span>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Dashboard Container */}
      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
          <ul className="sidebar-menu">
            <li
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 className="icon" />
              Overview
            </li>
            <li
              className={activeTab === 'users' ? 'active' : ''}
              onClick={() => setActiveTab('users')}
            >
              <Users className="icon" />
              Users
            </li>
            <li
              className={activeTab === 'analytics' ? 'active' : ''}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="icon" />
              Analytics
            </li>
            <li
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="icon" />
              Settings
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {activeTab === 'overview' && (
            <>
              <h1>Dashboard Overview</h1>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{users.length}</h3>
                    <p>Total Users</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>0</h3>
                    <p>Images Analyzed</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <h3>Active</h3>
                    <p>System Health</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <button onClick={launchAnalyzer} className="action-card">
                    <Camera size={40} />
                    <h3>Launch Image Analyzer</h3>
                    <p>Access encryption & analysis tools</p>
                  </button>
                  <button onClick={() => setActiveTab('users')} className="action-card">
                    <Users size={40} />
                    <h3>Manage Users</h3>
                    <p>View and manage user accounts</p>
                  </button>
                </div>
              </div>

              {/* Recent Users */}
              <div className="recent-users">
                <h2>Recent Registrations</h2>
                {users.length > 0 ? (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Registered</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(-5).reverse().map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className="badge-active">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">No users registered yet</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="users-section">
              <h1>User Management</h1>
              {users.length > 0 ? (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Registered</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className="badge-active">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No users registered yet</p>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <h1>Analytics</h1>
              <div className="analytics-placeholder">
                <p>📊</p>
                <p>Analytics Coming Soon</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-section">
              <h1>System Settings</h1>
              
              <div className="settings-card">
                <h3>General Settings</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable user registration
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable image encryption
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable GPS tracking
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable device fingerprinting
                  </label>
                </div>
                <button className="btn-save">Save Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;