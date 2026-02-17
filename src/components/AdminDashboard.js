import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart3, Settings, LogOut, Camera, FolderOpen, Shield, Activity } from 'lucide-react';
import AssetsPage from './AssetsPage';
import AssetTrackingPage from './AssetTrackingPage';
import VerifyPage from './VerifyPage';
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

  // Get stats
  const totalReports = JSON.parse(localStorage.getItem('analysisReports') || '[]');
  const verifiedAssets = totalReports.filter(r => r.status === 'Verified' || r.confidence >= 70);

  return (
    <div className="admin-dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-nav">
        <div className="nav-brand">
          <span className="brand-icon">🔍</span>
          <h2>Image Forensics App - Admin</h2>
        </div>
        <div className="nav-user">
          <span className="admin-label">Admin: {user.username}</span>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
          <ul className="sidebar-menu">
            <li
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 className="menu-icon" />
              <span>Overview</span>
            </li>
            <li
              className={activeTab === 'assets' ? 'active' : ''}
              onClick={() => setActiveTab('assets')}
            >
              <FolderOpen className="menu-icon" />
              <span>Assets</span>
            </li>
            <li
              className={activeTab === 'tracking' ? 'active' : ''}
              onClick={() => setActiveTab('tracking')}
            >
              <Activity className="menu-icon" />
              <span>Track Assets</span>
            </li>
            <li
              className={activeTab === 'verify' ? 'active' : ''}
              onClick={() => setActiveTab('verify')}
            >
              <Shield className="menu-icon" />
              <span>Verify</span>
            </li>
            <li
              className={activeTab === 'users' ? 'active' : ''}
              onClick={() => setActiveTab('users')}
            >
              <Users className="menu-icon" />
              <span>Users</span>
            </li>
            <li
              className={activeTab === 'analytics' ? 'active' : ''}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="menu-icon" />
              <span>Analytics</span>
            </li>
            <li
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="menu-icon" />
              <span>Settings</span>
            </li>
          </ul>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-content">
              <h1 className="page-title">Dashboard Overview</h1>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon users">
                    <Users size={32} />
                  </div>
                  <div className="stat-details">
                    <h3 className="stat-number">{users.length}</h3>
                    <p className="stat-label">Total Users</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon reports">
                    <BarChart3 size={32} />
                  </div>
                  <div className="stat-details">
                    <h3 className="stat-number">{totalReports.length}</h3>
                    <p className="stat-label">Total Reports</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon verified">
                    <Shield size={32} />
                  </div>
                  <div className="stat-details">
                    <h3 className="stat-number">{verifiedAssets.length}</h3>
                    <p className="stat-label">Verified Assets</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon active">
                    <Activity size={32} />
                  </div>
                  <div className="stat-details">
                    <h3 className="stat-number">Active</h3>
                    <p className="stat-label">System Status</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions-section">
                <h2 className="section-title">Quick Actions</h2>
                <div className="actions-grid">
                  <div className="action-card" onClick={launchAnalyzer}>
                    <div className="action-icon">
                      <Camera size={32} />
                    </div>
                    <div className="action-content">
                      <h3 className="action-title">Launch Analyzer</h3>
                      <p className="action-description">Encrypt and analyze new images</p>
                    </div>
                  </div>

                  <div className="action-card" onClick={() => setActiveTab('assets')}>
                    <div className="action-icon">
                      <FolderOpen size={32} />
                    </div>
                    <div className="action-content">
                      <h3 className="action-title">View Assets</h3>
                      <p className="action-description">Browse all encrypted assets</p>
                    </div>
                  </div>

                  <div className="action-card" onClick={() => setActiveTab('tracking')}>
                    <div className="action-icon">
                      <Activity size={32} />
                    </div>
                    <div className="action-content">
                      <h3 className="action-title">Track Assets</h3>
                      <p className="action-description">Monitor modifications & versions</p>
                    </div>
                  </div>

                  <div className="action-card" onClick={() => setActiveTab('verify')}>
                    <div className="action-icon">
                      <Shield size={32} />
                    </div>
                    <div className="action-content">
                      <h3 className="action-title">Verify Image</h3>
                      <p className="action-description">Check image authenticity</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && <AssetsPage />}

          {/* Track Assets Tab */}
          {activeTab === 'tracking' && <AssetTrackingPage />}

          {/* Verify Tab */}
          {activeTab === 'verify' && <VerifyPage />}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="users-content">
              <h1 className="page-title">User Management</h1>
              
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((u) => (
                        <tr key={u.id}>
                          <td className="user-name">{u.name}</td>
                          <td className="user-email">{u.email}</td>
                          <td className="user-date">
                            {new Date(u.createdAt).toLocaleDateString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td>
                            <span className="status-badge active">Active</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="empty-cell">
                          No users registered yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="placeholder-content">
              <h1 className="page-title">Analytics & Insights</h1>
              <p className="placeholder-text">Advanced analytics coming soon...</p>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="placeholder-content">
              <h1 className="page-title">System Settings</h1>
              <p className="placeholder-text">Configuration options coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;