import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart3, Settings, LogOut, FileSearch, Camera,
  Shield, CheckCircle, AlertTriangle, HardDrive, Activity,
  FolderOpen
} from 'lucide-react';
import AssetsPage from './AssetsPage';
import AssetTrackingPage from './AssetTrackingPage';
import VerifyPage from './VerifyPage';
import './AdminDashboard.css';

function AdminDashboard({ user, onLogout, users }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userAssets, setUserAssets] = useState({});
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalProofs: 0,
    verificationsToday: 0,
    tamperAlerts: 0,
    storageUsed: '0 MB',
    systemStatus: 'Active'
  });
  const navigate = useNavigate();

  // Load and initialize metrics
  useEffect(() => {
    const storedMetrics = localStorage.getItem('pinit-metrics');
    if (storedMetrics) {
      const parsed = JSON.parse(storedMetrics);
      setMetrics({ ...parsed, totalUsers: users.length });
    } else {
      const initialMetrics = {
        totalUsers: users.length,
        totalProofs: 0,
        verificationsToday: 0,
        tamperAlerts: 0,
        storageUsed: '0 MB',
        systemStatus: 'Active'
      };
      setMetrics(initialMetrics);
      localStorage.setItem('pinit-metrics', JSON.stringify(initialMetrics));
    }
  }, [users.length]);

  // Keep totalUsers synced with real users array
  useEffect(() => {
    setMetrics(prev => {
      const updated = { ...prev, totalUsers: users.length };
      localStorage.setItem('pinit-metrics', JSON.stringify(updated));
      return updated;
    });
  }, [users.length]);

  // One-time cleanup of auto-generated random user data
  useEffect(() => {
    const cleaned = localStorage.getItem('pinit-data-cleaned-v2');
    if (!cleaned) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('user-data-'))
        .forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('user-assets');
      localStorage.setItem('pinit-data-cleaned-v2', 'true');
    }
    const storedAssets = localStorage.getItem('user-assets');
    if (storedAssets) {
      setUserAssets(JSON.parse(storedAssets));
    }
  }, []);

  // Reload user assets when users list changes
  useEffect(() => {
    const storedAssets = localStorage.getItem('user-assets');
    if (storedAssets) {
      setUserAssets(JSON.parse(storedAssets));
    }
  }, [users]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getEnhancedUser = (userId) => {
    const baseUser = users.find(u => u.id === userId);
    if (!baseUser) return null;

    const assets = userAssets[userId] || [];
    const userData = localStorage.getItem(`user-data-${userId}`);
    const parsedUserData = userData ? JSON.parse(userData) : {};

    return {
      ...baseUser,
      phone: parsedUserData.phone || '',
      proofCount: assets.length,
      plan: parsedUserData.plan || 'Free',
      status: parsedUserData.status || 'Active',
      devices: parsedUserData.devices || [],
      assets
    };
  };

  const updateMetrics = (metricUpdates) => {
    setMetrics(prev => {
      const updated = { ...prev, ...metricUpdates };
      localStorage.setItem('pinit-metrics', JSON.stringify(updated));
      return updated;
    });
  };

  // ─── User Actions ─────────────────────────────────────────────────────────

  const handleViewProofs = (userId) => {
    setSelectedUser(getEnhancedUser(userId));
    setShowUserProfile(true);
  };

  const handleBlockUser = (userId) => {
    const userData = localStorage.getItem(`user-data-${userId}`);
    const parsedData = userData ? JSON.parse(userData) : {};
    const newStatus = parsedData.status === 'Blocked' ? 'Active' : 'Blocked';
    localStorage.setItem(`user-data-${userId}`, JSON.stringify({ ...parsedData, status: newStatus }));
    alert(`User ${newStatus === 'Blocked' ? 'blocked' : 'unblocked'} successfully`);
    setActiveTab('users');
  };

  const handleViewProfile = (userId) => {
    setSelectedUser(getEnhancedUser(userId));
    setShowUserProfile(true);
  };

  const closeUserProfile = () => {
    setShowUserProfile(false);
    setSelectedUser(null);
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const launchAnalyzer = () => {
    navigate('/analyzer');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="admin-dashboard">
      {/* Top Navigation */}
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

      {/* Main Layout */}
      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
          <ul className="sidebar-menu">
            <li
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 className="icon" /> Overview
            </li>
            <li
              className={activeTab === 'assets' ? 'active' : ''}
              onClick={() => setActiveTab('assets')}
            >
              <FolderOpen className="icon" /> Assets
            </li>
            <li
              className={activeTab === 'tracking' ? 'active' : ''}
              onClick={() => setActiveTab('tracking')}
            >
              <Activity className="icon" /> Track Assets
            </li>
            <li
              className={activeTab === 'verify' ? 'active' : ''}
              onClick={() => setActiveTab('verify')}
            >
              <Shield className="icon" /> Verify
            </li>
            <li
              className={activeTab === 'users' ? 'active' : ''}
              onClick={() => setActiveTab('users')}
            >
              <Users className="icon" /> Users
            </li>
            <li
              className={activeTab === 'analytics' ? 'active' : ''}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="icon" /> Analytics
            </li>
            <li
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="icon" /> Settings
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">

          {/* ── Overview ─────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              <h1>Dashboard Overview</h1>
              <p className="subtitle">Image Forensics System Metrics</p>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <Users className="stat-icon-lucide" size={32} color="#667eea" />
                  </div>
                  <div className="stat-info">
                    <h3>{metrics.totalUsers}</h3>
                    <p>Total Users</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <Shield className="stat-icon-lucide" size={32} color="#10b981" />
                  </div>
                  <div className="stat-info">
                    <h3>{metrics.totalProofs}</h3>
                    <p>Total Assets</p>
                    <span className="stat-label">Proofs Created</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <CheckCircle className="stat-icon-lucide" size={32} color="#3b82f6" />
                  </div>
                  <div className="stat-info">
                    <h3>{metrics.verificationsToday}</h3>
                    <p>Today Checks</p>
                    <span className="stat-label">Verifications Today</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <AlertTriangle
                      className="stat-icon-lucide"
                      size={32}
                      color={metrics.tamperAlerts > 0 ? '#f59e0b' : '#10b981'}
                    />
                  </div>
                  <div className="stat-info">
                    <h3 className={metrics.tamperAlerts > 0 ? 'warning-text' : ''}>{metrics.tamperAlerts}</h3>
                    <p>Tampered</p>
                    <span className="stat-label">Tamper Alerts</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <HardDrive className="stat-icon-lucide" size={32} color="#8b5cf6" />
                  </div>
                  <div className="stat-info">
                    <h3 className="storage-text">{metrics.storageUsed}</h3>
                    <p>Storage Used</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <Activity
                      className="stat-icon-lucide"
                      size={32}
                      color={metrics.systemStatus === 'Active' ? '#10b981' : '#ef4444'}
                    />
                  </div>
                  <div className="stat-info">
                    <h3 className={`status-text ${metrics.systemStatus === 'Active' ? 'active' : 'inactive'}`}>
                      {metrics.systemStatus}
                    </h3>
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
                    <p>Access encryption &amp; analysis tools</p>
                  </button>
                  <button onClick={() => setActiveTab('assets')} className="action-card">
                    <FolderOpen size={40} />
                    <h3>View Assets</h3>
                    <p>Browse all encrypted assets</p>
                  </button>
                  <button onClick={() => setActiveTab('tracking')} className="action-card">
                    <Activity size={40} />
                    <h3>Track Assets</h3>
                    <p>Monitor modifications &amp; versions</p>
                  </button>
                  <button onClick={() => setActiveTab('verify')} className="action-card">
                    <Shield size={40} />
                    <h3>Verify Image</h3>
                    <p>Check image authenticity</p>
                  </button>
                  <button onClick={() => setActiveTab('users')} className="action-card">
                    <Users size={40} />
                    <h3>Manage Users</h3>
                    <p>View and manage user accounts</p>
                  </button>
                  <button onClick={() => setActiveTab('analytics')} className="action-card">
                    <BarChart3 size={40} />
                    <h3>View Analytics</h3>
                    <p>System performance &amp; statistics</p>
                  </button>
                </div>
              </div>

              {/* Recent Registrations */}
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
                          <td><span className="badge-active">Active</span></td>
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

          {/* ── Assets ───────────────────────────────────────────────────── */}
          {activeTab === 'assets' && <AssetsPage />}

          {/* ── Track Assets ─────────────────────────────────────────────── */}
          {activeTab === 'tracking' && <AssetTrackingPage />}

          {/* ── Verify ───────────────────────────────────────────────────── */}
          {activeTab === 'verify' && <VerifyPage />}

          {/* ── Users ────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="users-section">
              <h1>User Management</h1>
              <p className="subtitle">Total Users: {users.length}</p>
              {users.length > 0 ? (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Signup Date</th>
                      <th>Proof Count</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const eu = getEnhancedUser(u.id);
                      return (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{eu.phone || '-'}</td>
                          <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="text-center">{eu.proofCount}</td>
                          <td>
                            <span className={`badge-plan badge-${eu.plan.toLowerCase()}`}>
                              {eu.plan}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-status ${eu.status === 'Active' ? 'badge-active' : 'badge-blocked'}`}>
                              {eu.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-action btn-view"
                                onClick={() => handleViewProofs(u.id)}
                                title="View Proofs"
                              >
                                <FileSearch size={16} /> Proofs
                              </button>
                              <button
                                className="btn-action btn-block"
                                onClick={() => handleBlockUser(u.id)}
                                title={eu.status === 'Blocked' ? 'Unblock User' : 'Block User'}
                              >
                                <Shield size={16} /> {eu.status === 'Blocked' ? 'Unblock' : 'Block'}
                              </button>
                              <button
                                className="btn-action btn-profile"
                                onClick={() => handleViewProfile(u.id)}
                                title="View Profile"
                              >
                                <Users size={16} /> Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No users registered yet</p>
              )}
            </div>
          )}

          {/* ── Analytics ────────────────────────────────────────────────── */}
          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <h1>Analytics</h1>
              <p className="subtitle">System Performance Metrics</p>

              <div className="analytics-summary">
                <div className="summary-card">
                  <h3>📊 Usage Statistics</h3>
                  <ul>
                    <li>Total Proofs: <strong>{metrics.totalProofs}</strong></li>
                    <li>Today's Verifications: <strong>{metrics.verificationsToday}</strong></li>
                    <li>Active Users: <strong>{metrics.totalUsers}</strong></li>
                  </ul>
                </div>
                <div className="summary-card">
                  <h3>⚠️ Security Alerts</h3>
                  <ul>
                    <li>Tamper Alerts: <strong className={metrics.tamperAlerts > 0 ? 'warning-text' : ''}>{metrics.tamperAlerts}</strong></li>
                    <li>System Status: <strong className="success-text">{metrics.systemStatus}</strong></li>
                  </ul>
                </div>
                <div className="summary-card">
                  <h3>💾 Storage</h3>
                  <ul>
                    <li>Used: <strong>{metrics.storageUsed}</strong></li>
                    <li>Status: <strong className="success-text">Healthy</strong></li>
                  </ul>
                </div>
              </div>

              <div className="analytics-placeholder">
                <p>📈</p>
                <p>Detailed Charts Coming Soon</p>
              </div>
            </div>
          )}

          {/* ── Settings ─────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <h1>System Settings</h1>

              <div className="settings-card">
                <h3>General Settings</h3>
                <div className="setting-item">
                  <label><input type="checkbox" defaultChecked /> Enable user registration</label>
                </div>
                <div className="setting-item">
                  <label><input type="checkbox" defaultChecked /> Enable image encryption</label>
                </div>
                <div className="setting-item">
                  <label><input type="checkbox" defaultChecked /> Enable GPS tracking</label>
                </div>
                <div className="setting-item">
                  <label><input type="checkbox" defaultChecked /> Enable device fingerprinting</label>
                </div>
                <button className="btn-save">Save Settings</button>
              </div>

              <div className="settings-card">
                <h3>Metrics Management</h3>
                <p className="info-text">
                  System metrics are updated dynamically based on actual events.
                  Use reset only for testing purposes.
                </p>
                <button
                  className="btn-save"
                  onClick={() => {
                    const reset = {
                      totalUsers: users.length,
                      totalProofs: 0,
                      verificationsToday: 0,
                      tamperAlerts: 0,
                      storageUsed: '0 MB',
                      systemStatus: 'Active'
                    };
                    setMetrics(reset);
                    localStorage.setItem('pinit-metrics', JSON.stringify(reset));
                    alert('Metrics reset successfully');
                  }}
                >
                  Reset All Metrics
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── User Profile Modal ─────────────────────────────────────────────── */}
      {showUserProfile && selectedUser && (
        <div className="modal-overlay" onClick={closeUserProfile}>
          <div className="modal-content user-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="btn-close" onClick={closeUserProfile}>×</button>
            </div>

            <div className="modal-body">
              <div className="profile-info-section">
                <h3>User Information</h3>
                <div className="profile-info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedUser.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedUser.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{selectedUser.phone || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Signup Date:</span>
                    <span className="info-value">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Proofs:</span>
                    <span className="info-value">{selectedUser.proofCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Plan:</span>
                    <span className={`badge-plan badge-${selectedUser.plan.toLowerCase()}`}>
                      {selectedUser.plan}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`badge-status ${selectedUser.status === 'Active' ? 'badge-active' : 'badge-blocked'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Devices:</span>
                    <span className="info-value">
                      {selectedUser.devices?.length > 0
                        ? selectedUser.devices.join(', ')
                        : 'No devices registered'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-assets-section">
                <h3>User Assets ({selectedUser.assets.length})</h3>
                {selectedUser.assets.length > 0 ? (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Asset ID</th>
                        <th>Name</th>
                        <th>Created Date</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.assets.map((asset, index) => (
                        <tr key={asset.id || index}>
                          <td>{asset.id || `ASSET-${index + 1}`}</td>
                          <td>{asset.name || 'Encrypted Image'}</td>
                          <td>{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td>{asset.type || 'Image'}</td>
                          <td><span className="badge-active">Verified</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">No assets created yet</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeUserProfile}>Close</button>
              <button
                className="btn-danger"
                onClick={() => {
                  handleBlockUser(selectedUser.id);
                  closeUserProfile();
                }}
              >
                {selectedUser.status === 'Blocked' ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;