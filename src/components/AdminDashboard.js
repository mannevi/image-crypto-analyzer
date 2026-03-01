import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart3, Settings, LogOut, FileSearch, Shield, CheckCircle, AlertTriangle, HardDrive, Activity, FolderOpen, RefreshCw, Eye, UserX, UserCheck } from 'lucide-react';

import { adminAPI } from '../api/client';
import './AdminDashboard.css';

function AdminDashboard({ user, onLogout }) {
  const [activeTab,  setActiveTab]  = useState('overview');
  const [stats,      setStats]      = useState({
    total_users: 0, total_assets: 0, total_reports: 0, tampered_found: 0
  });
  const [users,      setUsers]      = useState([]);
  const [assets,     setAssets]     = useState([]);
  const [reports,    setReports]    = useState([]);
  const [auditLog,   setAuditLog]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res);
    } catch (err) { console.error('Stats error:', err.message); }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.users || []);
    } catch (err) { console.error('Users error:', err.message); }
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      const res = await adminAPI.getAllVault();
      setAssets(res.assets || []);
    } catch (err) { console.error('Assets error:', err.message); }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const res = await adminAPI.getAllReports();
      setReports(res.reports || []);
    } catch (err) { console.error('Reports error:', err.message); }
  }, []);

  const loadAuditLog = useCallback(async () => {
    try {
      const res = await adminAPI.getAuditLog();
      setAuditLog(res.logs || []);
    } catch (err) { console.error('Audit log error:', err.message); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadUsers(), loadAssets(), loadReports(), loadAuditLog()]);
    setLoading(false);
  }, [loadStats, loadUsers, loadAssets, loadReports, loadAuditLog]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSuspend = async (userId) => {
    if (!window.confirm('Suspend this user?')) return;
    try {
      await adminAPI.suspendUser(userId, 'Admin action');
      await loadUsers();
      alert('User suspended');
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleActivate = async (userId) => {
    try {
      await adminAPI.activateUser(userId);
      await loadUsers();
      alert('User activated');
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleLogout = () => { onLogout(); navigate('/login'); };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const storageUsed = () => {
    const total = assets.reduce((sum, a) => {
      const s = parseFloat(a.file_size) || 0;
      return sum + s;
    }, 0);
    return total > 1024 ? (total / 1024).toFixed(1) + ' GB' : total.toFixed(1) + ' MB';
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard">
      <div className="admin-nav">
        <div className="nav-brand"><h2>🔍 Image Forensics App - Admin</h2></div>
        <div className="nav-user">
          <span>Admin: {user?.username || user?.name || 'Admin'}</span>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="admin-container">
        <div className="admin-sidebar">
          <ul className="sidebar-menu">
            {[
              ['overview',  <BarChart3 size={18} />, 'Overview'],
              ['users',     <Users size={18} />,     'Users'],
              ['assets',    <FolderOpen size={18} />, 'Assets'],
              ['reports',   <FileSearch size={18} />, 'Reports'],
              ['analytics', <Activity size={18} />,  'Analytics'],
              ['settings',  <Settings size={18} />,  'Settings'],
            ].map(([tab, icon, label]) => (
              <li key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}>
                {icon} {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-main">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="section-header">
                <div>
                  <h1>Dashboard Overview</h1>
                  <p className="subtitle">Image Forensics System Metrics</p>
                </div>
                <button onClick={loadAll} className="btn-refresh">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="loading-state">Loading data...</div>
              ) : (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon users-icon"><Users size={32} /></div>
                      <div className="stat-content">
                        <h3>{stats.total_users || users.length}</h3>
                        <p>Total Users</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon assets-icon"><Shield size={32} /></div>
                      <div className="stat-content">
                        <h3>{stats.total_assets || assets.length}</h3>
                        <p>Total Assets</p>
                        <small>PROOFS CREATED</small>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon reports-icon"><CheckCircle size={32} /></div>
                      <div className="stat-content">
                        <h3>{stats.total_reports || reports.length}</h3>
                        <p>Total Reports</p>
                        <small>VERIFICATIONS</small>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon tamper-icon"><AlertTriangle size={32} /></div>
                      <div className="stat-content">
                        <h3>{stats.tampered_found || 0}</h3>
                        <p>Tampered</p>
                        <small>TAMPER ALERTS</small>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon storage-icon"><HardDrive size={32} /></div>
                      <div className="stat-content">
                        <h3>{storageUsed()}</h3>
                        <p>Storage Used</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon health-icon"><Activity size={32} /></div>
                      <div className="stat-content">
                        <h3 style={{ color: '#10b981' }}>Active</h3>
                        <p>System Health</p>
                      </div>
                    </div>
                  </div>

                  <div className="recent-section">
                    <h2>Recent Registrations</h2>
                    {users.slice(0, 5).length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {users.slice(0, 5).map((u, i) => (
                            <tr key={i}>
                              <td>{u.username}</td>
                              <td>{u.email}</td>
                              <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                              <td>{formatDate(u.created_at)}</td>
                              <td>
                                <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`}>
                                  {u.is_active ? 'Active' : 'Suspended'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state">No users registered yet</div>
                    )}
                  </div>

                  <div className="recent-section">
                    <h2>Recent Activity</h2>
                    {auditLog.slice(0, 5).length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr><th>Action</th><th>Details</th><th>IP</th><th>Time</th></tr>
                        </thead>
                        <tbody>
                          {auditLog.slice(0, 5).map((log, i) => (
                            <tr key={i}>
                              <td><span className="action-badge">{log.action}</span></td>
                              <td>{JSON.stringify(log.details || {}).slice(0, 50)}</td>
                              <td>{log.ip_address || '—'}</td>
                              <td>{formatDate(log.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state">No activity recorded yet</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div className="users-section">
              <div className="section-header">
                <div>
                  <h1>User Management</h1>
                  <p className="subtitle">{users.length} registered users</p>
                </div>
                <button onClick={loadUsers} className="btn-refresh">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              {users.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Role</th>
                      <th>Joined</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={i}>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => { setSelectedUser(u); }}
                              className="btn-action btn-view" title="View">
                              <Eye size={14} />
                            </button>
                            {u.is_active ? (
                              <button
                                onClick={() => handleSuspend(u.id)}
                                className="btn-action btn-delete" title="Suspend"
                                disabled={u.role === 'admin'}>
                                <UserX size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(u.id)}
                                className="btn-action btn-view" title="Activate">
                                <UserCheck size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">No users found</div>
              )}

              {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>User Profile</h2>
                      <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
                    </div>
                    <div className="modal-body">
                      <div className="user-profile-details">
                        {[
                          ['Name',     selectedUser.username],
                          ['Email',    selectedUser.email],
                          ['Role',     selectedUser.role],
                          ['Status',   selectedUser.is_active ? 'Active' : 'Suspended'],
                          ['Joined',   formatDate(selectedUser.created_at)],
                          ['User ID',  selectedUser.id],
                        ].map(([label, value]) => (
                          <div key={label} className="detail-row">
                            <span className="detail-label">{label}:</span>
                            <span className="detail-value">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ASSETS ── */}
          {activeTab === 'assets' && (
            <div className="assets-section">
              <div className="section-header">
                <div>
                  <h1>All Assets</h1>
                  <p className="subtitle">{assets.length} total assets in vault</p>
                </div>
                <button onClick={loadAssets} className="btn-refresh">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              {assets.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>File Name</th><th>Asset ID</th><th>Owner</th>
                      <th>Size</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={i}>
                        <td>{a.file_name || '—'}</td>
                        <td><code className="uuid-small">{a.asset_id}</code></td>
                        <td>{a.owner_name || '—'}</td>
                        <td>{a.file_size || '—'}</td>
                        <td>{formatDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">No assets in vault yet</div>
              )}
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <div className="reports-section">
              <div className="section-header">
                <div>
                  <h1>Analysis Reports</h1>
                  <p className="subtitle">{reports.length} total reports</p>
                </div>
                <button onClick={loadReports} className="btn-refresh">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              {reports.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Asset ID</th><th>Verdict</th><th>Confidence</th>
                      <th>Tool</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr key={i}>
                        <td><code className="uuid-small">{r.asset_id || '—'}</code></td>
                        <td>
                          <span className={`status-dot ${r.is_tampered ? 'inactive' : 'active'}`}>
                            {r.is_tampered ? '⚠ Tampered' : '✓ Original'}
                          </span>
                        </td>
                        <td>{r.confidence}%</td>
                        <td>{r.editing_tool || '—'}</td>
                        <td>{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">No reports yet</div>
              )}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <div className="section-header">
                <div>
                  <h1>Analytics</h1>
                  <p className="subtitle">System usage overview</p>
                </div>
                <button onClick={loadAll} className="btn-refresh">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>User Activity</h3>
                  <div className="analytics-stat">
                    <span className="big-number">{users.filter(u => u.is_active).length}</span>
                    <span className="stat-label">Active Users</span>
                  </div>
                  <div className="analytics-stat">
                    <span className="big-number">{users.filter(u => !u.is_active).length}</span>
                    <span className="stat-label">Suspended Users</span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Image Analysis</h3>
                  <div className="analytics-stat">
                    <span className="big-number">{reports.length}</span>
                    <span className="stat-label">Total Analyses</span>
                  </div>
                  <div className="analytics-stat">
                    <span className="big-number" style={{ color: '#ef4444' }}>
                      {reports.filter(r => r.is_tampered).length}
                    </span>
                    <span className="stat-label">Tampered Detected</span>
                  </div>
                  <div className="analytics-stat">
                    <span className="big-number" style={{ color: '#10b981' }}>
                      {reports.filter(r => !r.is_tampered).length}
                    </span>
                    <span className="stat-label">Original Verified</span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Vault Storage</h3>
                  <div className="analytics-stat">
                    <span className="big-number">{assets.length}</span>
                    <span className="stat-label">Total Assets</span>
                  </div>
                  <div className="analytics-stat">
                    <span className="big-number">{storageUsed()}</span>
                    <span className="stat-label">Storage Used</span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Recent Audit Log</h3>
                  <div className="audit-list">
                    {auditLog.slice(0, 8).map((log, i) => (
                      <div key={i} className="audit-item">
                        <span className="audit-action">{log.action}</span>
                        <span className="audit-time">{formatDate(log.created_at)}</span>
                      </div>
                    ))}
                    {auditLog.length === 0 && <p>No activity yet</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <h1>Settings</h1>
              <p className="subtitle">System configuration</p>
              <div className="settings-card">
                <h3>Admin Account</h3>
                <div className="settings-info">
                  <div className="detail-row">
                    <span className="detail-label">Username:</span>
                    <span className="detail-value">{user?.username || 'admin'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{user?.email || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role:</span>
                    <span className="detail-value">Administrator</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;