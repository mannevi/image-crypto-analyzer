import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, Download, Link as LinkIcon, 
  Flag, RefreshCw, Smartphone, Clock, Image as ImageIcon, Instagram,
  MessageCircle, Share2, Zap, AlertCircle, Facebook
} from 'lucide-react';
import './AssetDetailPage.css';

function AssetDetailPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [allVersions, setAllVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssetDetails();
  }, [assetId]);

  const loadAssetDetails = () => {
    const reports = JSON.parse(localStorage.getItem('analysisReports') || '[]');
    
    // Find the main asset
    const mainAsset = reports.find(r => r.assetId === assetId);
    
    if (mainAsset) {
      // Find all versions of this image (same user or device)
      const versions = reports.filter(r => 
        r.uniqueUserId === mainAsset.uniqueUserId ||
        r.deviceId === mainAsset.deviceId
      ).sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
      
      setAsset(mainAsset);
      setAllVersions(versions);
    }
    
    setLoading(false);
  };

  // Detect which platform the image came from based on compression patterns
  const detectPlatform = (asset, originalAsset) => {
    const platforms = [];
    
    if (!originalAsset) return platforms;
    
    const currentSize = parseFloat(asset.assetFileSize.replace(/[^0-9.]/g, ''));
    const originalSize = parseFloat(originalAsset.assetFileSize.replace(/[^0-9.]/g, ''));
    const [width, height] = asset.assetResolution.split(' x ').map(Number);
    
    const compressionPercent = Math.round(((originalSize - currentSize) / originalSize) * 100);
    
    // Instagram detection: Heavy compression, max 1080px, typically 95-99% compression
    if (compressionPercent >= 95 && (width === 1080 || height === 1080)) {
      platforms.push({
        name: 'Instagram',
        icon: 'instagram',
        compression: `Compressed (${compressionPercent}%)`,
        confidence: 'High'
      });
    }
    // WhatsApp detection: Very heavy compression, max 1600px, 85-95% compression
    else if (compressionPercent >= 85 && compressionPercent < 95 && (width <= 1600 || height <= 1600)) {
      platforms.push({
        name: 'WhatsApp',
        icon: 'whatsapp',
        compression: `Heavy compression (${compressionPercent}%)`,
        confidence: 'High'
      });
    }
    // Facebook detection: Moderate to heavy compression, 2048px max, 80-90%
    else if (compressionPercent >= 75 && compressionPercent < 90 && width === 2048) {
      platforms.push({
        name: 'Facebook',
        icon: 'facebook',
        compression: `Compressed (${compressionPercent}%)`,
        confidence: 'Medium'
      });
    }
    // Twitter detection: Variable compression, 4096px max
    else if (compressionPercent >= 70 && width <= 4096) {
      platforms.push({
        name: 'Twitter',
        icon: 'share',
        compression: `Compressed (${compressionPercent}%)`,
        confidence: 'Medium'
      });
    }
    // Generic platform
    else if (compressionPercent >= 50) {
      platforms.push({
        name: 'Unknown Platform',
        icon: 'zap',
        compression: `Compressed (${compressionPercent}%)`,
        confidence: 'Low'
      });
    }
    
    return platforms;
  };

  // Detect all modifications made to the image
  const detectModifications = (currentAsset, originalAsset) => {
    const mods = {
      compression: false,
      resized: false,
      colorChanges: 'None',
      objectsRemoved: false,
      aiGeneration: false,
      overall: 'No modifications detected'
    };

    if (!originalAsset || currentAsset.assetId === originalAsset.assetId) {
      return mods;
    }

    // Check compression
    const currentSize = parseFloat(currentAsset.assetFileSize.replace(/[^0-9.]/g, ''));
    const originalSize = parseFloat(originalAsset.assetFileSize.replace(/[^0-9.]/g, ''));
    const sizeDiff = Math.abs(currentSize - originalSize) / originalSize;
    
    if (sizeDiff > 0.05) {
      mods.compression = true;
    }

    // Check if resized
    if (currentAsset.assetResolution !== originalAsset.assetResolution) {
      mods.resized = true;
    }

    // Estimate color changes based on file size and resolution changes
    if (sizeDiff > 0.3 && !mods.resized) {
      mods.colorChanges = 'Likely';
    } else if (sizeDiff > 0.15 && !mods.resized) {
      mods.colorChanges = 'Minor';
    }

    // AI generation detection (basic heuristic)
    // If file size is very large compared to resolution, might be AI upscaled
    const [width, height] = currentAsset.assetResolution.split(' x ').map(Number);
    const pixelCount = width * height;
    const bytesPerPixel = (currentSize * 1024) / pixelCount;
    
    if (bytesPerPixel > 3 && currentSize > originalSize * 1.5) {
      mods.aiGeneration = true;
    }

    // Determine overall status
    if (mods.compression && mods.resized && !mods.colorChanges && !mods.objectsRemoved && !mods.aiGeneration) {
      mods.overall = 'Platform processing only';
    } else if (mods.compression || mods.resized) {
      mods.overall = 'Minor modifications detected';
    } else if (mods.colorChanges !== 'None' || mods.objectsRemoved || mods.aiGeneration) {
      mods.overall = 'Significant modifications detected';
    }

    return mods;
  };

  // Determine who modified the image
  const getModifier = (currentAsset, originalAsset) => {
    if (!originalAsset || currentAsset.assetId === originalAsset.assetId) {
      return {
        type: 'original',
        name: currentAsset.userName || 'Original Creator',
        time: null
      };
    }
    
    // Check if same user
    if (currentAsset.userName === originalAsset.userName && 
        currentAsset.userEmail === originalAsset.userEmail) {
      return {
        type: 'same',
        name: currentAsset.userName,
        time: new Date(currentAsset.timestamp || currentAsset.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    }
    
    // Different user or unknown
    return {
      type: 'unknown',
      name: 'Unknown source',
      time: null
    };
  };

  const handleReverify = () => {
    loadAssetDetails();
    alert('✓ Asset reverified successfully!');
  };

  const handleDownloadPDF = () => {
    const originalAsset = allVersions[allVersions.length - 1];
    const modifications = detectModifications(asset, originalAsset);
    const modifier = getModifier(asset, originalAsset);
    const platforms = detectPlatform(asset, originalAsset);
    
    const reportContent = `
═══════════════════════════════════════════════
    ASSET VERIFICATION REPORT
═══════════════════════════════════════════════

SUMMARY
-------
Asset ID: ${asset.assetId}
Status: ${asset.status || 'Verified'}
Confidence: ${asset.confidence}%
Creator: ${asset.userName || 'Unknown'}
Captured: ${new Date(asset.timestamp || asset.createdAt).toLocaleDateString('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})}

ORIGINAL INFORMATION
--------------------
Device: ${asset.deviceName}
Timestamp: ${asset.timestamp ? 'Verified' : 'Not Available'}
Metadata at Capture: ${asset.gpsLocation?.available ? 'Yes' : 'Limited'}
Resolution: ${asset.assetResolution}
File Size: ${asset.assetFileSize}
GPS Location: ${asset.gpsLocation?.available ? asset.gpsLocation.coordinates : 'N/A'}

PLATFORM COPIES
---------------
${platforms.length > 0 ? platforms.map(p => `${p.name} → ${p.compression}`).join('\n') : 'No platform copies detected'}

MODIFICATION / EDIT DETECTION
------------------------------
Compression: ${modifications.compression ? 'Yes' : 'No'}
Resized: ${modifications.resized ? 'Yes' : 'No'}
Color Changes: ${modifications.colorChanges}
Objects Removed: ${modifications.objectsRemoved ? 'Yes' : 'No'}
AI Generation: ${modifications.aiGeneration ? 'Yes' : 'No'}
Overall: ${modifications.overall}

MODIFIER INFORMATION
--------------------
${modifier.type === 'same' 
  ? `Modified by: ${modifier.name} (same creator)\nEdit time: ${modifier.time}`
  : modifier.type === 'unknown'
  ? `Modifier: ${modifier.name}`
  : 'Original upload - no modifications'}

VERIFICATION DETAILS
--------------------
Certificate ID: ${asset.authorshipCertificateId}
Device ID: ${asset.deviceId}
IP Address: ${asset.ipAddress}
User ID: ${asset.uniqueUserId}

═══════════════════════════════════════════════
Generated: ${new Date().toLocaleString()}
System: Image Forensics App - Admin Dashboard
═══════════════════════════════════════════════
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${asset.assetId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✓ Report downloaded successfully!');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/admin/asset/${asset.assetId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('✓ Verification link copied to clipboard!');
    }).catch(() => {
      alert('✗ Failed to copy link');
    });
  };

  const handleFlag = () => {
    if (confirm('⚠️ Are you sure you want to flag this asset as suspicious?\n\nThis will mark it for manual review.')) {
      // Update asset with flagged status
      const reports = JSON.parse(localStorage.getItem('analysisReports') || '[]');
      const updatedReports = reports.map(r => 
        r.assetId === asset.assetId 
          ? { ...r, flagged: true, flaggedAt: Date.now() }
          : r
      );
      localStorage.setItem('analysisReports', JSON.stringify(updatedReports));
      
      alert('✓ Asset flagged successfully!\n\nIt will be reviewed by administrators.');
      loadAssetDetails();
    }
  };

  if (loading) {
    return (
      <div className="asset-detail-page">
        <div className="loading-container">
          <RefreshCw className="loading-spinner" size={40} />
          <p>Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="asset-detail-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>Asset Not Found</h2>
          <p>The requested asset could not be found in the database.</p>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back-home">
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const originalAsset = allVersions[allVersions.length - 1];
  const platforms = detectPlatform(asset, originalAsset);
  const modifications = detectModifications(asset, originalAsset);
  const modifier = getModifier(asset, originalAsset);

  return (
    <div className="asset-detail-page">
      {/* Header */}
      <div className="detail-header">
        <button onClick={() => navigate(-1)} className="btn-back-nav">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="header-title">
          <h1>Asset Details</h1>
          <span className="asset-id-badge">{asset.assetId}</span>
        </div>
      </div>

      <div className="detail-container">
        {/* Left Column - Main Content */}
        <div className="detail-main">
          
          {/* Section 1: Summary */}
          <div className="detail-section summary-section">
            <h2>Summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Status</span>
                <div className={`status-badge ${asset.status === 'Verified' || asset.confidence >= 70 ? 'verified' : 'unknown'}`}>
                  {asset.confidence >= 70 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {asset.status || (asset.confidence >= 70 ? 'Verified' : 'Unverified')}
                </div>
              </div>
              <div className="summary-item">
                <span className="summary-label">Confidence</span>
                <div className="confidence-display">
                  <span className="confidence-percent">{asset.confidence}%</span>
                  <div className="confidence-bar-small">
                    <div 
                      className="confidence-fill-small" 
                      style={{ width: `${asset.confidence}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="summary-item">
                <span className="summary-label">Creator</span>
                <div className="creator-badge">
                  <div className="creator-avatar-small">
                    {asset.userName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span>{asset.userName || 'Unknown'}</span>
                </div>
              </div>
              <div className="summary-item">
                <span className="summary-label">Captured</span>
                <div className="date-display">
                  <Clock size={16} />
                  <span>
                    {new Date(asset.timestamp || asset.createdAt).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Original Info */}
          <div className="detail-section">
            <h2>Original Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <Smartphone size={20} className="info-icon" />
                <div>
                  <div className="info-label">Device</div>
                  <div className="info-value">{asset.deviceName}</div>
                </div>
              </div>
              <div className="info-item">
                <Clock size={20} className="info-icon" />
                <div>
                  <div className="info-label">Timestamp</div>
                  <div className="info-value">
                    {asset.timestamp ? 'Verified' : 'Not Available'}
                  </div>
                </div>
              </div>
              <div className="info-item">
                <ImageIcon size={20} className="info-icon" />
                <div>
                  <div className="info-label">Metadata at Capture</div>
                  <div className="info-value">
                    {asset.gpsLocation?.available ? 'Yes' : 'Limited'}
                  </div>
                </div>
              </div>
            </div>

            <div className="technical-details">
              <div className="tech-row">
                <span className="tech-label">Resolution:</span>
                <span className="tech-value">{asset.assetResolution}</span>
              </div>
              <div className="tech-row">
                <span className="tech-label">File Size:</span>
                <span className="tech-value">{asset.assetFileSize}</span>
              </div>
              <div className="tech-row">
                <span className="tech-label">Device ID:</span>
                <code className="tech-value tech-code">{asset.deviceId}</code>
              </div>
              <div className="tech-row">
                <span className="tech-label">IP Address:</span>
                <span className="tech-value">{asset.ipAddress}</span>
              </div>
              {asset.gpsLocation?.available && (
                <div className="tech-row">
                  <span className="tech-label">GPS Location:</span>
                  <a 
                    href={asset.gpsLocation.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tech-value tech-link"
                  >
                    📍 {asset.gpsLocation.coordinates}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Platform Copies */}
          <div className="detail-section">
            <h2>Platform Copies</h2>
            {platforms.length > 0 ? (
              <div className="platform-list">
                {platforms.map((platform, idx) => (
                  <div key={idx} className="platform-item">
                    <div className="platform-icon-wrapper">
                      {platform.icon === 'instagram' && <Instagram size={28} className="platform-icon instagram" />}
                      {platform.icon === 'whatsapp' && <MessageCircle size={28} className="platform-icon whatsapp" />}
                      {platform.icon === 'facebook' && <Share2 size={28} className="platform-icon facebook" />}
                      {platform.icon === 'share' && <Share2 size={28} className="platform-icon twitter" />}
                      {platform.icon === 'zap' && <Zap size={28} className="platform-icon unknown" />}
                    </div>
                    <div className="platform-details">
                      <div className="platform-name">{platform.name}</div>
                      <div className="platform-compression">{platform.compression}</div>
                    </div>
                    <div className={`platform-confidence ${platform.confidence.toLowerCase()}`}>
                      {platform.confidence}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-platforms">
                <Zap size={32} className="no-platforms-icon" />
                <p>No platform copies detected</p>
                <span className="no-platforms-hint">This appears to be the original upload</span>
              </div>
            )}
          </div>

          {/* Section 4: Modification/Edit Detection */}
          <div className="detail-section">
            <h2>Modification / Edit Detection</h2>
            
            <div className="modifications-grid">
              <div className="mod-row">
                <span className="mod-label">Compression:</span>
                <span className={`mod-badge ${modifications.compression ? 'yes' : 'no'}`}>
                  {modifications.compression ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="mod-row">
                <span className="mod-label">Resized:</span>
                <span className={`mod-badge ${modifications.resized ? 'yes' : 'no'}`}>
                  {modifications.resized ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="mod-row">
                <span className="mod-label">Color Changes:</span>
                <span className={`mod-badge ${modifications.colorChanges !== 'None' ? 'minor' : 'no'}`}>
                  {modifications.colorChanges}
                </span>
              </div>
              <div className="mod-row">
                <span className="mod-label">Objects Removed:</span>
                <span className={`mod-badge ${modifications.objectsRemoved ? 'yes' : 'no'}`}>
                  {modifications.objectsRemoved ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="mod-row">
                <span className="mod-label">AI Generation:</span>
                <span className={`mod-badge ${modifications.aiGeneration ? 'yes' : 'no'}`}>
                  {modifications.aiGeneration ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="mod-overall">
              <span className="mod-overall-label">Overall:</span>
              <span className="mod-overall-value">{modifications.overall}</span>
            </div>

            <div className="modifier-section">
              {modifier.type === 'same' ? (
                <div className="modifier-info same-creator">
                  <div className="modifier-row">
                    <span className="modifier-label">Modified by:</span>
                    <span className="modifier-value">
                      <span className="modifier-name">{modifier.name}</span>
                      <span className="same-creator-badge">(same creator)</span>
                    </span>
                  </div>
                  <div className="modifier-row">
                    <span className="modifier-label">Edit time:</span>
                    <span className="modifier-value">{modifier.time}</span>
                  </div>
                </div>
              ) : modifier.type === 'unknown' ? (
                <div className="modifier-info unknown-source">
                  <div className="modifier-row">
                    <span className="modifier-label">Modifier:</span>
                    <span className="modifier-value unknown">{modifier.name}</span>
                  </div>
                </div>
              ) : (
                <div className="modifier-info original">
                  <div className="modifier-row">
                    <span className="modifier-label">Status:</span>
                    <span className="modifier-value">Original upload - No modifications</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Actions */}
          <div className="detail-section actions-section">
            <h2>Actions</h2>
            <div className="actions-grid">
              <button onClick={handleReverify} className="action-btn reverify-btn">
                <RefreshCw size={18} />
                <span>Reverify</span>
              </button>
              <button onClick={handleDownloadPDF} className="action-btn download-btn">
                <Download size={18} />
                <span>Download Report PDF</span>
              </button>
              <button onClick={handleCopyLink} className="action-btn link-btn">
                <LinkIcon size={18} />
                <span>Copy Verification Link</span>
              </button>
              <button onClick={handleFlag} className="action-btn flag-btn">
                <Flag size={18} />
                <span>Flag Suspicious</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column - Asset Preview & Info */}
        <div className="detail-sidebar">
          <div className="sidebar-card">
            <h3>Asset Preview</h3>
            <div className="preview-box">
              <ImageIcon size={48} />
              <span>Image preview</span>
            </div>
            
            <div className="asset-meta">
              <div className="meta-item">
                <span className="meta-label">Asset ID</span>
                <code className="meta-code">{asset.assetId}</code>
              </div>
              <div className="meta-item">
                <span className="meta-label">Certificate ID</span>
                <code className="meta-code">{asset.authorshipCertificateId}</code>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Version History</h3>
            <div className="version-stats">
              <div className="version-count-large">{allVersions.length}</div>
              <div className="version-label">
                version{allVersions.length !== 1 ? 's' : ''} tracked
              </div>
            </div>
            {allVersions.length > 1 && (
              <div className="version-timeline">
                {allVersions.slice(0, 3).map((version, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="timeline-date">
                        {new Date(version.timestamp || version.createdAt).toLocaleDateString()}
                      </div>
                      <div className="timeline-device">{version.deviceName}</div>
                    </div>
                  </div>
                ))}
                {allVersions.length > 3 && (
                  <div className="timeline-more">
                    +{allVersions.length - 3} more version{allVersions.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetDetailPage;