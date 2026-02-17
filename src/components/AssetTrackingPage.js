import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, CheckCircle, XCircle, Activity, TrendingUp } from 'lucide-react';
import './AssetTrackingPage.css';

function AssetTrackingPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load assets from localStorage
  useEffect(() => {
    const storedAssets = localStorage.getItem('analysisReports');
    if (storedAssets) {
      const parsedAssets = JSON.parse(storedAssets);
      
      // Group by uniqueUserId to find versions
      const assetGroups = {};
      parsedAssets.forEach(asset => {
        const key = asset.uniqueUserId || asset.deviceId;
        if (!assetGroups[key]) {
          assetGroups[key] = [];
        }
        assetGroups[key].push(asset);
      });

      // Add version count to each asset
      const assetsWithVersions = parsedAssets.map(asset => {
        const key = asset.uniqueUserId || asset.deviceId;
        return {
          ...asset,
          versionCount: assetGroups[key].length
        };
      });

      setAssets(assetsWithVersions);
      setFilteredAssets(assetsWithVersions);
    }
  }, []);

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredAssets(assets);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = assets.filter(asset => 
      asset.assetId?.toLowerCase().includes(lowerQuery) ||
      asset.userName?.toLowerCase().includes(lowerQuery) ||
      asset.userEmail?.toLowerCase().includes(lowerQuery) ||
      asset.deviceId?.toLowerCase().includes(lowerQuery) ||
      asset.uniqueUserId?.toLowerCase().includes(lowerQuery) ||
      asset.ipAddress?.toLowerCase().includes(lowerQuery)
    );

    setFilteredAssets(filtered);
  };

  const handleAssetClick = (assetId) => {
    navigate(`/admin/track/${assetId}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status, confidence) => {
    if (status === 'Verified' || confidence >= 70) {
      return <span className="badge-verified"><CheckCircle size={14} /> Verified</span>;
    }
    return <span className="badge-unverified"><XCircle size={14} /> Unverified</span>;
  };

  const getVersionBadge = (count) => {
    if (count > 1) {
      return (
        <span className="version-badge modified">
          <TrendingUp size={14} />
          {count} versions
        </span>
      );
    }
    return (
      <span className="version-badge original">
        Original
      </span>
    );
  };

  return (
    <div className="asset-tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <div>
          <h1>Asset Tracking</h1>
          <p className="subtitle">Track image modifications, platforms, and version history</p>
        </div>
        <div className="tracking-stats">
          <div className="stat-card">
            <span className="stat-number">{assets.length}</span>
            <span className="stat-label">Total Assets</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {assets.filter(a => a.versionCount > 1).length}
            </span>
            <span className="stat-label">Modified</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {assets.filter(a => a.confidence >= 70).length}
            </span>
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
            placeholder="Search by Asset ID, Creator, Email, Device ID, User ID, IP Address..."
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
      </div>

      {/* Results Info */}
      {searchQuery && (
        <div className="search-results-info">
          Found {filteredAssets.length} result{filteredAssets.length !== 1 ? 's' : ''} for "{searchQuery}"
        </div>
      )}

      {/* Assets Table */}
      <div className="tracking-table-container">
        {filteredAssets.length > 0 ? (
          <table className="tracking-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Creator</th>
                <th>Date</th>
                <th>Status</th>
                <th>Versions</th>
                <th>Device</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.reportId}>
                  <td>
                    <span 
                      className="asset-id-link"
                      onClick={() => handleAssetClick(asset.assetId)}
                    >
                      {asset.assetId}
                    </span>
                  </td>
                  <td>
                    <div className="creator-info">
                      <div className="creator-avatar">
                        {asset.userName?.charAt(0).toUpperCase() || 'U'}
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
                  <td>{getStatusBadge(asset.status, asset.confidence)}</td>
                  <td>{getVersionBadge(asset.versionCount)}</td>
                  <td className="device-cell">{asset.deviceName}</td>
                  <td>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${asset.confidence}%` }}></div>
                      <span className="confidence-text">{asset.confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <Activity size={64} className="empty-icon" />
            <h3>No Assets Found</h3>
            <p>
              {searchQuery 
                ? `No assets match your search "${searchQuery}"`
                : 'No tracked assets available. Assets will appear here after encryption and analysis.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssetTrackingPage;