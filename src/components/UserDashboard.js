import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSearch, Clock, User, LogOut, Camera, LayoutDashboard, Image, Activity, Calendar, Database, Eye, Download, Trash2, CheckCircle, XCircle, Award, Share2, Copy } from 'lucide-react';
import './UserDashboard.css';

function UserDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // Real-time stats state
  const [stats, setStats] = useState({
    totalEncrypted: 0,
    totalAnalyzed: 0,
    lastActivity: null,
    lastEncryptedId: null,
    recentActivities: []
  });

  // Vault state
  const [vaultImages, setVaultImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Load stats from localStorage on mount
  useEffect(() => {
    loadStats();
    loadVaultImages();
    loadCertificates();
  }, []);

  // Listen for storage changes (real-time updates from analyzer)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'forensicsStats' || e.key === null) {
        loadStats();
      }
      if (e.key === 'vaultImages' || e.key === null) {
        loadVaultImages();
      }
      if (e.key === 'certificates' || e.key === null) {
        loadCertificates();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for updates every 2 seconds when tab is visible
    const interval = setInterval(() => {
      loadStats();
      loadVaultImages();
      loadCertificates();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadStats = () => {
    try {
      const savedStats = localStorage.getItem('forensicsStats');
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        setStats(parsed);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadVaultImages = () => {
    try {
      const savedVault = localStorage.getItem('vaultImages');
      if (savedVault) {
        const parsed = JSON.parse(savedVault);
        setVaultImages(parsed);
      }
    } catch (error) {
      console.error('Error loading vault images:', error);
    }
  };

  const loadCertificates = () => {
    try {
      const savedCerts = localStorage.getItem('certificates');
      if (savedCerts) {
        const parsed = JSON.parse(savedCerts);
        setCertificates(parsed);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const launchAnalyzer = () => {
    navigate('/analyzer');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccountCreationDate = () => {
    const storedDate = localStorage.getItem(`accountCreated_${user.email}`);
    if (storedDate) {
      return storedDate;
    } else {
      const creationDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      localStorage.setItem(`accountCreated_${user.email}`, creationDate);
      return creationDate;
    }
  };

  // ── Vault Actions ──────────────────────────────────────────────────────────

  const handleView = async (image) => {
    setSelectedImage(image);
    setShowViewModal(true);
    setIsVerifying(true);
    setVerificationResult(null);

    setTimeout(() => {
      const result = {
        verified: image.status === 'Verified',
        userId: image.userId,
        deviceId: image.deviceId || 'Unknown',
        gpsLocation: image.gpsLocation || 'Not Available',
        timestamp: image.dateEncrypted,
        confidence: image.status === 'Verified' ? 98 : 0
      };
      setVerificationResult(result);
      setIsVerifying(false);
    }, 1500);
  };

  const handleDownload = (image) => {
    if (image.thumbnail) {
      const link = document.createElement('a');
      link.href = image.thumbnail;
      link.download = `thumbnail-${image.fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Thumbnail not available');
    }
  };

  const handleDelete = (imageId) => {
    if (window.confirm('Are you sure you want to delete this image from the vault?')) {
      try {
        const updatedVault = vaultImages.filter(img => img.id !== imageId);
        localStorage.setItem('vaultImages', JSON.stringify(updatedVault));
        setVaultImages(updatedVault);

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'vaultImages',
          newValue: JSON.stringify(updatedVault),
          url: window.location.href,
          storageArea: localStorage
        }));

        alert('Image deleted from vault successfully');
      } catch (error) {
        console.error('Error deleting image:', error);
        alert('Failed to delete image');
      }
    }
  };

  // ── Certificate Actions ────────────────────────────────────────────────────

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  const handleDownloadCertificate = (certificate) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, canvas.width, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('OWNERSHIP CERTIFICATE', 50, 60);

    // Certificate Badge
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 100, canvas.width, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`✓ ${certificate.status}`, 50, 140);
    ctx.font = '16px Arial';
    ctx.fillText(`Confidence: ${certificate.confidence}%`, canvas.width - 200, 140);

    let y = 200;

    // Certificate Details
    ctx.fillStyle = '#1a202c';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('CERTIFICATE INFORMATION', 50, y);
    y += 40;

    ctx.font = '14px Arial';
    const details = [
      ['Certificate ID:', certificate.certificateId],
      ['Asset ID:', certificate.assetId],
      ['User ID:', certificate.userId],
      ['Date Created:', formatDate(certificate.dateCreated)],
      ['Confidence:', certificate.confidence + '%'],
      ['Status:', certificate.status]
    ];

    details.forEach(([label, value]) => {
      ctx.fillStyle = '#4a5568';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(label, 50, y);
      ctx.fillStyle = '#1a202c';
      ctx.font = '14px Arial';
      ctx.fillText(String(value).substring(0, 50), 250, y);
      y += 30;
    });

    y += 20;

    // Analysis Details if available
    if (certificate.analysisDetails) {
      ctx.fillStyle = '#1a202c';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('ANALYSIS DETAILS', 50, y);
      y += 40;

      ctx.font = '14px Arial';
      const analysisDetails = [
        ['Classification:', certificate.analysisDetails.classification],
        ['Device:', certificate.analysisDetails.deviceName],
        ['Resolution:', certificate.analysisDetails.resolution],
        ['File Size:', certificate.analysisDetails.fileSize]
      ];

      analysisDetails.forEach(([label, value]) => {
        if (value) {
          ctx.fillStyle = '#4a5568';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(label, 50, y);
          ctx.fillStyle = '#1a202c';
          ctx.font = '14px Arial';
          ctx.fillText(String(value).substring(0, 40), 250, y);
          y += 30;
        }
      });
    }

    // Footer
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Arial';
    ctx.fillText('Generated: ' + new Date().toLocaleString(), 50, canvas.height - 40);
    ctx.fillText('Image Forensics System', 50, canvas.height - 20);

    // Download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificate.certificateId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const handleCopyCertificateId = (certificateId) => {
    navigator.clipboard.writeText(certificateId).then(() => {
      setCopiedId(certificateId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleShareCertificate = (certificate) => {
    const shareText = `Certificate ID: ${certificate.certificateId}\nAsset ID: ${certificate.assetId}\nUser ID: ${certificate.userId}\nConfidence: ${certificate.confidence}%\nVerified: ${certificate.status}`;

    if (navigator.share) {
      navigator.share({
        title: 'Ownership Certificate',
        text: shareText
      }).catch(err => console.log('Share failed:', err));
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Certificate details copied to clipboard!');
      });
    }
  };

  const handleDeleteCertificate = (certificateId) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      try {
        const updatedCerts = certificates.filter(cert => cert.id !== certificateId);
        localStorage.setItem('certificates', JSON.stringify(updatedCerts));
        setCertificates(updatedCerts);

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'certificates',
          newValue: JSON.stringify(updatedCerts),
          url: window.location.href,
          storageArea: localStorage
        }));

        alert('Certificate deleted successfully');
      } catch (error) {
        console.error('Error deleting certificate:', error);
        alert('Failed to delete certificate');
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="user-dashboard">
      {/* Navigation Bar */}
      <div className="dashboard-nav">
        <div className="nav-brand">
          <h2>🔍 Image Forensics App</h2>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.name}</span>
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
            <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
              <LayoutDashboard className="icon" />
              Overview
            </li>
            <li className={activeTab === 'vault' ? 'active' : ''} onClick={() => setActiveTab('vault')}>
              <Database className="icon" />
              Vault
            </li>
            <li className={activeTab === 'certificates' ? 'active' : ''} onClick={() => setActiveTab('certificates')}>
              <Award className="icon" />
              Certificates
            </li>
            <li className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
              <Clock className="icon" />
              History
            </li>
            <li className={activeTab === 'analyze' ? 'active' : ''} onClick={() => setActiveTab('analyze')}>
              <FileSearch className="icon" />
              Analyze Image
            </li>
            <li className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              <User className="icon" />
              Profile
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="overview-section">
              <h1>Dashboard Overview</h1>
              <p className="subtitle">Real-time statistics and recent activity</p>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card stat-encrypted">
                  <div className="stat-icon">
                    <Image size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>{stats.totalEncrypted}</h3>
                    <p>Total Images Encrypted</p>
                  </div>
                </div>

                <div className="stat-card stat-analyzed">
                  <div className="stat-icon">
                    <FileSearch size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>{stats.totalAnalyzed}</h3>
                    <p>Total Images Analyzed</p>
                  </div>
                </div>

                <div className="stat-card stat-activity">
                  <div className="stat-icon">
                    <Calendar size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>{formatDate(stats.lastActivity)}</h3>
                    <p>Last Activity</p>
                  </div>
                </div>

                <div className="stat-card stat-uuid">
                  <div className="stat-icon">
                    <Activity size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>{stats.lastEncryptedId ? stats.lastEncryptedId.slice(0, 8) + '...' : 'None'}</h3>
                    <p>Last Encrypted Image ID</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity-section">
                <h2>Recent Activity</h2>
                {stats.recentActivities && stats.recentActivities.length > 0 ? (
                  <div className="activity-list">
                    {stats.recentActivities.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">
                          {activity.type === 'encrypted' ? '🔐' : '🔍'}
                        </div>
                        <div className="activity-details">
                          <p className="activity-title">
                            {activity.type === 'encrypted' ? 'Image Encrypted' : 'Image Analyzed'}
                          </p>
                          <p className="activity-meta">
                            {activity.fileName} • {formatDate(activity.timestamp)}
                          </p>
                          {activity.uuid && (
                            <p className="activity-uuid">UUID: {activity.uuid}</p>
                          )}
                        </div>
                        <div className="activity-badge">
                          {activity.type === 'encrypted' ? 'Encrypted' : 'Analyzed'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>📊</p>
                    <p>No recent activity</p>
                    <p className="subtitle">Start analyzing images to see activity here</p>
                  </div>
                )}
              </div>

              {/* Quick Action */}
              <div className="quick-action">
                <button onClick={launchAnalyzer} className="btn-quick-analyze">
                  <Camera size={20} />
                  Quick Analyze
                </button>
              </div>
            </div>
          )}

          {/* ── VAULT TAB ────────────────────────────────────────────────── */}
          {activeTab === 'vault' && (
            <div className="vault-section">
              <div className="vault-header">
                <div>
                  <h1>Image Vault</h1>
                  <p className="subtitle">View and manage your encrypted images</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('vaultImages');
                    setVaultImages([]);
                    alert('Vault cleared!');
                  }}
                  className="btn-empty-action"
                  style={{ background: '#ef4444' }}
                >
                  Clear Vault
                </button>
              </div>

              {vaultImages.length > 0 ? (
                <div className="vault-table-container">
                  <table className="vault-table">
                    <thead>
                      <tr>
                        <th>Thumbnail</th>
                        <th>File Name</th>
                        <th>Date Encrypted</th>
                        <th>UUID Used</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaultImages.map((image) => (
                        <tr key={image.id}>
                          <td>
                            <div className="thumbnail">
                              {image.thumbnail ? (
                                <img src={image.thumbnail} alt={image.fileName} />
                              ) : (
                                <div className="thumbnail-placeholder">
                                  <Image size={24} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="file-name-cell">
                              <span className="file-name">{image.fileName}</span>
                              <span className="file-size">{image.fileSize}</span>
                            </div>
                          </td>
                          <td>{formatDate(image.dateEncrypted)}</td>
                          <td>
                            <code className="uuid-code">{image.userId}</code>
                          </td>
                          <td>
                            <span className={`status-badge ${image.status === 'Verified' ? 'verified' : 'not-verified'}`}>
                              {image.status === 'Verified' ? (
                                <><CheckCircle size={14} /> Verified</>
                              ) : (
                                <><XCircle size={14} /> Not Verified</>
                              )}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button onClick={() => handleView(image)} className="btn-action btn-view" title="View Details">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => handleDownload(image)} className="btn-action btn-download" title="Download">
                                <Download size={16} />
                              </button>
                              <button onClick={() => handleDelete(image.id)} className="btn-action btn-delete" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>🗄️</p>
                  <p>Your vault is empty</p>
                  <p className="subtitle">Encrypt images in the Analyzer to see them here</p>
                  <button onClick={() => setActiveTab('analyze')} className="btn-empty-action">
                    <FileSearch size={18} /> Go to Analyzer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CERTIFICATES TAB ─────────────────────────────────────────── */}
          {activeTab === 'certificates' && (
            <div className="certificates-section">
              <div className="certificates-header">
                <div>
                  <h1>Ownership Certificates</h1>
                  <p className="subtitle">View and manage analysis certificates</p>
                </div>
              </div>

              {certificates.length > 0 ? (
                <div className="certificates-grid">
                  {certificates.map((certificate) => (
                    <div key={certificate.id} className="certificate-card">
                      <div className="certificate-header">
                        <div className="certificate-badge">
                          <Award size={24} />
                        </div>
                        <div className={`certificate-status ${certificate.confidence >= 90 ? 'high' : certificate.confidence >= 70 ? 'medium' : 'low'}`}>
                          {certificate.confidence}% Confidence
                        </div>
                      </div>

                      <div className="certificate-body">
                        <h3>{certificate.status}</h3>
                        <div className="certificate-info">
                          <div className="info-row">
                            <span className="info-label">Certificate ID:</span>
                            <div className="info-value-with-copy">
                              <code>{certificate.certificateId.slice(0, 16)}...</code>
                              <button
                                onClick={() => handleCopyCertificateId(certificate.certificateId)}
                                className="btn-copy-small"
                                title="Copy ID"
                              >
                                {copiedId === certificate.certificateId ? <CheckCircle size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Asset ID:</span>
                            <code className="info-value">{certificate.assetId}</code>
                          </div>
                          <div className="info-row">
                            <span className="info-label">User ID:</span>
                            <code className="info-value">{certificate.userId}</code>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Date Created:</span>
                            <span className="info-value">{formatDate(certificate.dateCreated)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="certificate-actions">
                        <button onClick={() => handleViewCertificate(certificate)} className="btn-cert-action btn-cert-view">
                          <Eye size={16} /> View
                        </button>
                        <button onClick={() => handleDownloadCertificate(certificate)} className="btn-cert-action btn-cert-download">
                          <Download size={16} /> Download
                        </button>
                        <button onClick={() => handleShareCertificate(certificate)} className="btn-cert-action btn-cert-share">
                          <Share2 size={16} /> Share
                        </button>
                        <button onClick={() => handleDeleteCertificate(certificate.id)} className="btn-cert-action btn-cert-delete">
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>📜</p>
                  <p>No certificates yet</p>
                  <p className="subtitle">Analyze images to generate ownership certificates</p>
                  <button onClick={() => setActiveTab('analyze')} className="btn-empty-action">
                    <FileSearch size={18} /> Go to Analyzer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="history-section">
              <div className="history-header">
                <div>
                  <h1>Activity History</h1>
                  <p className="subtitle">Track all encryption and analysis activities</p>
                </div>
              </div>

              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>File Name</th>
                        <th>UUID</th>
                        <th>Status</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentActivities.map((activity, index) => (
                        <tr key={index}>
                          <td>
                            <div className="action-cell">
                              <span className={`action-icon ${activity.type}`}>
                                {activity.type === 'encrypted' ? '🔐' : '🔍'}
                              </span>
                              <span className="action-text">
                                {activity.type === 'encrypted' ? 'Encrypted' : 'Analyzed'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="file-name-text">{activity.fileName}</span>
                          </td>
                          <td>
                            {activity.uuid ? (
                              <code className="uuid-code-small">{activity.uuid}</code>
                            ) : (
                              <span className="no-uuid">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge-small ${activity.type === 'encrypted' ? 'success' : 'info'}`}>
                              {activity.type === 'encrypted' ? 'Success' : 'Verified'}
                            </span>
                          </td>
                          <td>
                            <span className="date-time-text">{formatDate(activity.timestamp)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>📋</p>
                  <p>No activity history yet</p>
                  <p className="subtitle">Encrypt or analyze images to see activity here</p>
                  <button onClick={() => setActiveTab('analyze')} className="btn-empty-action">
                    <FileSearch size={18} /> Go to Analyzer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ANALYZE TAB (original feature preserved) ─────────────────── */}
          {activeTab === 'analyze' && (
            <div className="analyze-section">
              <h1>Image Forensics Analysis</h1>
              <p className="subtitle">
                Upload an image to detect potential manipulations and verify authenticity
              </p>

              {/* Launch Analyzer Card */}
              <div className="launch-card">
                <div className="launch-icon">
                  <Camera size={80} />
                </div>
                <h2>Launch Image Analyzer</h2>
                <p>
                  Access the full encryption and analysis system with UUID embedding,
                  GPS tracking, device fingerprinting, and AI-powered classification.
                </p>
                <button onClick={launchAnalyzer} className="btn-launch">
                  <FileSearch size={20} style={{ marginRight: '8px' }} />
                  Open Image Analyzer
                </button>
              </div>

              {/* Features Grid */}
              <div className="features-grid">
                <div className="feature-card">
                  <h3>🔐 UUID Encryption</h3>
                  <p>Embed unique identifiers into images with LSB steganography</p>
                </div>
                <div className="feature-card">
                  <h3>📍 GPS Tracking</h3>
                  <p>Capture and verify location data from EXIF and browser</p>
                </div>
                <div className="feature-card">
                  <h3>🤖 AI Classification</h3>
                  <p>Detect mobile captures, AI-generated, and web downloads</p>
                </div>
                <div className="feature-card">
                  <h3>🖥️ Device Fingerprinting</h3>
                  <p>Track device information and ownership certificates</p>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE TAB (enhanced, original fields preserved) ────────── */}
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h1>Profile & Security</h1>
              <p className="subtitle">Manage your account and view usage statistics</p>

              <div className="profile-container">
                {/* Account Information */}
                <div className="profile-card-enhanced">
                  <div className="card-header">
                    <h2>Account Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="profile-avatar-large">
                      <div className="avatar-circle-large">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="profile-info-grid">
                      <div className="info-item-enhanced">
                        <label>Full Name</label>
                        <span className="info-value">{user.name}</span>
                      </div>
                      <div className="info-item-enhanced">
                        <label>Email Address</label>
                        <span className="info-value">{user.email}</span>
                      </div>
                      <div className="info-item-enhanced">
                        <label>Role</label>
                        <span className="badge-user">User</span>
                      </div>
                      <div className="info-item-enhanced">
                        <label>User ID</label>
                        <span className="info-value">
                          <code className="user-id-code">{user.email.split('@')[0]}-{Date.now().toString(36).slice(-4)}</code>
                        </span>
                      </div>
                      <div className="info-item-enhanced">
                        <label>Account Created</label>
                        <span className="info-value">{getAccountCreationDate()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Information */}
                <div className="profile-card-enhanced">
                  <div className="card-header">
                    <h2>Usage Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="usage-stats">
                      <div className="usage-stat-item">
                        <div className="stat-icon encrypted-icon">🔐</div>
                        <div className="stat-content">
                          <div className="stat-value">{stats.totalEncrypted || 0}</div>
                          <div className="stat-label">Total Encrypted Images</div>
                        </div>
                      </div>
                      <div className="usage-stat-item">
                        <div className="stat-icon analyzed-icon">🔍</div>
                        <div className="stat-content">
                          <div className="stat-value">{stats.totalAnalyzed || 0}</div>
                          <div className="stat-label">Total Analyzed Images</div>
                        </div>
                      </div>
                      <div className="usage-stat-item">
                        <div className="stat-icon certificates-icon">📜</div>
                        <div className="stat-content">
                          <div className="stat-value">{certificates.length || 0}</div>
                          <div className="stat-label">Total Certificates</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="profile-card-enhanced">
                  <div className="card-header">
                    <h2>Security</h2>
                  </div>
                  <div className="card-body">
                    <div className="security-actions">
                      <button
                        className="security-btn change-password-btn"
                        onClick={() => alert('Change Password feature coming soon!\n\nFor now, you can reset your password through the login page.')}
                      >
                        <span className="btn-icon">🔑</span>
                        <span className="btn-text">Change Password</span>
                        <span className="btn-arrow">→</span>
                      </button>
                      <button className="security-btn logout-btn" onClick={handleLogout}>
                        <span className="btn-icon">🚪</span>
                        <span className="btn-text">Logout</span>
                        <span className="btn-arrow">→</span>
                      </button>
                    </div>

                    <div className="security-info">
                      <div className="security-info-item">
                        <span className="info-icon">🔒</span>
                        <span className="info-text">Your account is secured with encrypted authentication</span>
                      </div>
                      <div className="security-info-item">
                        <span className="info-icon">✓</span>
                        <span className="info-text">Last login: {formatDate(new Date().toISOString())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── VIEW MODAL ──────────────────────────────────────────────────────── */}
      {showViewModal && selectedImage && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Image Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="modal-image-preview">
                {selectedImage.thumbnail ? (
                  <img src={selectedImage.thumbnail} alt={selectedImage.fileName} />
                ) : (
                  <div className="image-placeholder">
                    <Image size={64} />
                  </div>
                )}
              </div>

              {isVerifying ? (
                <div className="verification-loading">
                  <div className="spinner"></div>
                  <p>Verifying image...</p>
                </div>
              ) : verificationResult ? (
                <div className={`verification-result ${verificationResult.verified ? 'verified' : 'not-verified'}`}>
                  <div className="verification-icon">
                    {verificationResult.verified ? <CheckCircle size={48} /> : <XCircle size={48} />}
                  </div>
                  <h3>{verificationResult.verified ? 'Verified Image' : 'Verification Failed'}</h3>
                  <p className="confidence">Confidence: {verificationResult.confidence}%</p>
                </div>
              ) : null}

              <div className="modal-details">
                <div className="detail-row">
                  <span className="detail-label">File Name:</span>
                  <span className="detail-value">{selectedImage.fileName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">File Size:</span>
                  <span className="detail-value">{selectedImage.fileSize}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date Encrypted:</span>
                  <span className="detail-value">{formatDate(selectedImage.dateEncrypted)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">User ID:</span>
                  <span className="detail-value"><code>{selectedImage.userId}</code></span>
                </div>
                {verificationResult && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">Device ID:</span>
                      <span className="detail-value"><code>{verificationResult.deviceId}</code></span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">GPS Location:</span>
                      <span className="detail-value">{verificationResult.gpsLocation}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <button onClick={() => handleDownload(selectedImage)} className="btn-modal btn-download-modal">
                  <Download size={18} /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CERTIFICATE MODAL ───────────────────────────────────────────────── */}
      {showCertificateModal && selectedCertificate && (
        <div className="modal-overlay" onClick={() => setShowCertificateModal(false)}>
          <div className="modal-content certificate-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ownership Certificate</h2>
              <button className="modal-close" onClick={() => setShowCertificateModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="certificate-modal-header">
                <div className="cert-badge-large">
                  <Award size={48} />
                </div>
                <h3>{selectedCertificate.classificationAnalysis?.detectedCase || selectedCertificate.status}</h3>
                <div className={`confidence-badge ${selectedCertificate.confidence >= 90 ? 'high' : selectedCertificate.confidence >= 70 ? 'medium' : 'low'}`}>
                  Confidence: {selectedCertificate.confidence}%
                </div>
              </div>

              {/* Ownership at Creation */}
              {selectedCertificate.ownershipAtCreation && (
                <div className="certificate-details-section">
                  <h4>OWNERSHIP AT CREATION</h4>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-item">
                      <span className="cert-label">Asset ID</span>
                      <code className="cert-value">{selectedCertificate.ownershipAtCreation.assetId}</code>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Authorship Certificate ID</span>
                      <div className="cert-value-copy">
                        <code>{selectedCertificate.ownershipAtCreation.authorshipCertificateId}</code>
                        <button
                          onClick={() => handleCopyCertificateId(selectedCertificate.ownershipAtCreation.authorshipCertificateId)}
                          className="btn-copy-inline"
                        >
                          {copiedId === selectedCertificate.ownershipAtCreation.authorshipCertificateId ? '✓' : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Unique User ID</span>
                      <code className="cert-value">{selectedCertificate.ownershipAtCreation.uniqueUserId}</code>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Asset File Size</span>
                      <span className="cert-value">{selectedCertificate.ownershipAtCreation.assetFileSize}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Asset Resolution</span>
                      <span className="cert-value">{selectedCertificate.ownershipAtCreation.assetResolution}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">User Encrypted Resolution</span>
                      <span className="cert-value">{selectedCertificate.ownershipAtCreation.userEncryptedResolution}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Time Stamp</span>
                      <span className="cert-value">{selectedCertificate.ownershipAtCreation.timeStamp}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Capture Location</span>
                      <span className="cert-value">{selectedCertificate.ownershipAtCreation.captureLocation}</span>
                    </div>
                    <div className="cert-detail-item full-width">
                      <span className="cert-label">GPS Location</span>
                      <span className="cert-value">{selectedCertificate.ownershipAtCreation.gpsLocation}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {selectedCertificate.technicalDetails && (
                <div className="certificate-details-section">
                  <h4>TECHNICAL DETAILS</h4>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-item">
                      <span className="cert-label">Total Pixels</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.totalPixels}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Pixels Verified</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.pixelsVerified}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Device Name</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.deviceName}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Device ID</span>
                      <code className="cert-value">{selectedCertificate.technicalDetails.deviceId}</code>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Device Source</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.deviceSource}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">IP Address</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.ipAddress}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">IP Source</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.ipSource}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Ownership Info</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.ownershipInfo}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Certificate</span>
                      <span className="cert-value">{selectedCertificate.technicalDetails.certificate}</span>
                    </div>
                    {selectedCertificate.technicalDetails.rotationDetected && (
                      <div className="cert-detail-item">
                        <span className="cert-label">Rotation Detected</span>
                        <span className="cert-value">{selectedCertificate.technicalDetails.rotationDetected}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classification Analysis */}
              {selectedCertificate.classificationAnalysis && (
                <div className="certificate-details-section">
                  <h4>CLASSIFICATION ANALYSIS</h4>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-item full-width">
                      <span className="cert-label">Detected Case</span>
                      <span className="cert-value">{selectedCertificate.classificationAnalysis.detectedCase}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Confidence</span>
                      <span className="cert-value">{selectedCertificate.classificationAnalysis.confidence}%</span>
                    </div>
                  </div>

                  {selectedCertificate.classificationAnalysis.reasoning && selectedCertificate.classificationAnalysis.reasoning.length > 0 && (
                    <div className="reasoning-section">
                      <span className="cert-label">Reasoning:</span>
                      <ul className="reasoning-list">
                        {selectedCertificate.classificationAnalysis.reasoning.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedCertificate.classificationAnalysis.metrics && (
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <span>Variance:</span>
                        <span>{selectedCertificate.classificationAnalysis.metrics.variance}</span>
                      </div>
                      <div className="metric-item">
                        <span>Noise Level:</span>
                        <span>{selectedCertificate.classificationAnalysis.metrics.noiseLevel}</span>
                      </div>
                      <div className="metric-item">
                        <span>Smooth Blocks:</span>
                        <span>{selectedCertificate.classificationAnalysis.metrics.smoothBlockRatio}</span>
                      </div>
                      <div className="metric-item">
                        <span>Edge Coherence:</span>
                        <span>{selectedCertificate.classificationAnalysis.metrics.edgeCoherence}</span>
                      </div>
                      <div className="metric-item">
                        <span>Uniformity:</span>
                        <span>{selectedCertificate.classificationAnalysis.metrics.uniformityRatio}</span>
                      </div>
                      <div className="metric-item">
                        <span>Entropy:</span>
                        <span>{selectedCertificate.classificationAnalysis.metrics.entropy}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Crop Information */}
              {selectedCertificate.cropInfo && selectedCertificate.cropInfo.isCropped && (
                <div className="certificate-details-section">
                  <h4>CROP INFORMATION</h4>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-item">
                      <span className="cert-label">Original Resolution</span>
                      <span className="cert-value">{selectedCertificate.cropInfo.originalResolution}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Current Resolution</span>
                      <span className="cert-value">{selectedCertificate.cropInfo.currentResolution}</span>
                    </div>
                    <div className="cert-detail-item">
                      <span className="cert-label">Remaining</span>
                      <span className="cert-value">{selectedCertificate.cropInfo.remainingPercentage}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {selectedCertificate.imagePreview && (
                <div className="certificate-image-preview">
                  <h4>ANALYZED IMAGE</h4>
                  <img src={selectedCertificate.imagePreview} alt="Certificate Preview" />
                </div>
              )}

              <div className="modal-actions">
                <button onClick={() => handleDownloadCertificate(selectedCertificate)} className="btn-modal btn-cert-download-modal">
                  <Download size={18} /> Download PNG Report
                </button>
                <button onClick={() => handleShareCertificate(selectedCertificate)} className="btn-modal btn-cert-share-modal">
                  <Share2 size={18} /> Share Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;