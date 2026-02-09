import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSearch, Clock, User, LogOut, Camera } from 'lucide-react';
import './UserDashboard.css';

function UserDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('analyze');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const launchAnalyzer = () => {
    navigate('/analyzer');
  };

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
            <li
              className={activeTab === 'analyze' ? 'active' : ''}
              onClick={() => setActiveTab('analyze')}
            >
              <FileSearch className="icon" />
              Analyze Image
            </li>
            <li
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              <Clock className="icon" />
              History
            </li>
            <li
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              <User className="icon" />
              Profile
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">
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

          {activeTab === 'history' && (
            <div className="history-section">
              <h1>Analysis History</h1>
              <div className="empty-state">
                <p>📋</p>
                <p>No analysis history yet</p>
                <p className="subtitle">
                  Your analyzed images will appear here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-section">
              <h1>User Profile</h1>
              
              <div className="profile-card">
                <div className="profile-avatar">
                  <div className="avatar-circle">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="profile-info">
                  <div className="info-item">
                    <label>Full Name</label>
                    <span>{user.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <span>{user.email}</span>
                  </div>
                  <div className="info-item">
                    <label>Role</label>
                    <span className="badge-user">User</span>
                  </div>
                  <div className="info-item">
                    <label>Member Since</label>
                    <span>{new Date().toLocaleDateString()}</span>
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

export default UserDashboard;