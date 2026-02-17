import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, Filter, Calendar, CheckCircle, XCircle } from 'lucide-react';
import './AssetsPage.css';

function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load assets from localStorage
  useEffect(() => {
    const storedAssets = localStorage.getItem('analysisReports');
    if (storedAssets) {
      const parsedAssets = JSON.parse(storedAssets);
      setAssets(parsedAssets);
      setFilteredAssets(parsedAssets);
    }
  }, []);

  // Search functionality - searches ALL fields
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredAssets(assets);
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    const filtered = assets.filter(asset => {
      return (
        // Asset ID
        asset.assetId?.toLowerCase().includes(lowerQuery) ||
        // User ID / UUID
        asset.uniqueUserId?.toLowerCase().includes(lowerQuery) ||
        // Authorship Certificate ID
        asset.authorshipCertificateId?.toLowerCase().includes(lowerQuery) ||
        // Email
        asset.userEmail?.toLowerCase().includes(lowerQuery) ||
        // Username
        asset.userName?.toLowerCase().includes(lowerQuery) ||
        // Device ID
        asset.deviceId?.toLowerCase().includes(lowerQuery) ||
        // IP Address
        asset.ipAddress?.toLowerCase().includes(lowerQuery) ||
        // Report ID (using timestamp as ID)
        asset.reportId?.toLowerCase().includes(lowerQuery) ||
        // Status
        asset.status?.toLowerCase().includes(lowerQuery) ||
        // Detected Case
        asset.detectedCase?.toLowerCase().includes(lowerQuery)
      );
    });

    setFilteredAssets(filtered);
  };

  const viewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const downloadReport = (asset) => {
    // Create a downloadable JSON report
    const reportData = JSON.stringify(asset, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${asset.assetId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'Verified') {
      return <span className="badge-verified"><CheckCircle size={14} /> Verified</span>;
    }
    return <span className="badge-unknown"><XCircle size={14} /> Unknown</span>;
  };

  return (
    <div className="assets-page">
      <div className="assets-header">
        <div>
          <h1>Assets Management</h1>
          <p className="subtitle">View and search all encrypted assets and analysis reports</p>
        </div>
        <div className="assets-stats">
          <div className="stat-box">
            <span className="stat-number">{assets.length}</span>
            <span className="stat-label">Total Assets</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{assets.filter(a => a.status === 'Verified').length}</span>
            <span className="stat-label">Verified</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search by UUID, Asset ID, Authorship ID, Email, Username, Device ID, IP Address, Report ID..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              onClick={() => handleSearch('')}
              className="clear-search"
            >
              ✕
            </button>
          )}
        </div>
        <button className="filter-btn">
          <Filter size={18} />
          Filters
        </button>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="search-results-info">
          Found {filteredAssets.length} result{filteredAssets.length !== 1 ? 's' : ''} for "{searchQuery}"
        </div>
      )}

      {/* Assets Table */}
      <div className="assets-table-container">
        {filteredAssets.length > 0 ? (
          <table className="assets-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Creator</th>
                <th>Date</th>
                <th>Status</th>
                <th>Platform Copies</th>
                <th>Confidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.reportId}>
                  <td className="asset-id">{asset.assetId}</td>
                  <td>
                    <div className="creator-info">
                      <div className="creator-avatar">
                        {asset.userName?.charAt(0).toUpperCase() || asset.uniqueUserId?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="creator-name">{asset.userName || 'Unknown'}</div>
                        <div className="creator-email">{asset.userEmail || asset.uniqueUserId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="date-cell">
                      <Calendar size={14} />
                      {formatDate(asset.timestamp || asset.createdAt)}
                    </div>
                  </td>
                  <td>{getStatusBadge(asset.status)}</td>
                  <td className="platform-copies">{asset.platformCopies || 0}</td>
                  <td>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${asset.confidence}%` }}></div>
                      <span className="confidence-text">{asset.confidence}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => viewDetails(asset)}
                        className="btn-view"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => downloadReport(asset)}
                        className="btn-download"
                        title="Download Report"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Assets Found</h3>
            <p>
              {searchQuery 
                ? `No assets match your search "${searchQuery}"`
                : 'No analysis reports have been saved yet. Encrypted images will appear here after analysis.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAsset && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Asset Details</h2>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Status Banner */}
              <div className={`status-banner ${selectedAsset.status === 'Verified' ? 'verified' : 'unknown'}`}>
                <div className="status-icon">
                  {selectedAsset.status === 'Verified' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h3>{selectedAsset.detectedCase}</h3>
                  <p>Confidence: {selectedAsset.confidence}%</p>
                </div>
              </div>

              {/* Asset Information */}
              <div className="detail-section">
                <h3>Asset Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Asset ID:</span>
                    <span className="value">{selectedAsset.assetId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Authorship Certificate ID:</span>
                    <span className="value">{selectedAsset.authorshipCertificateId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Device ID:</span>
                    <span className="value">{selectedAsset.deviceId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Device Name:</span>
                    <span className="value">{selectedAsset.deviceName}</span>
                  </div>
                </div>
              </div>

              {/* Creator Information */}
              <div className="detail-section">
                <h3>Creator Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Name:</span>
                    <span className="value">{selectedAsset.userName || 'Unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Email:</span>
                    <span className="value">{selectedAsset.userEmail || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">User ID:</span>
                    <span className="value">{selectedAsset.uniqueUserId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">IP Address:</span>
                    <span className="value">{selectedAsset.ipAddress}</span>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="detail-section">
                <h3>Technical Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Resolution:</span>
                    <span className="value">{selectedAsset.assetResolution}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">File Size:</span>
                    <span className="value">{selectedAsset.assetFileSize}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(selectedAsset.timestamp || selectedAsset.createdAt)}</span>
                  </div>
                  {selectedAsset.gpsLocation?.available && (
                    <div className="detail-item">
                      <span className="label">GPS Location:</span>
                      <a 
                        href={selectedAsset.gpsLocation.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="value gps-link"
                      >
                        📍 {selectedAsset.gpsLocation.coordinates}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Results */}
              {selectedAsset.reasoning && selectedAsset.reasoning.length > 0 && (
                <div className="detail-section">
                  <h3>Analysis Results</h3>
                  <ul className="reasoning-list">
                    {selectedAsset.reasoning.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => downloadReport(selectedAsset)}
                className="btn-download-modal"
              >
                <Download size={16} />
                Download Full Report
              </button>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="btn-close-modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetsPage;