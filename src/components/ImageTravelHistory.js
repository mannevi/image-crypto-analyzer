import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ChevronDown, ChevronUp } from 'lucide-react';
import './ImageTravelHistory.css';

function ImageTravelHistory() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [travelHistory, setTravelHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    loadTravelHistory();
  }, [assetId]);

  const loadTravelHistory = () => {
    setLoading(true);
    
    const allAssets = JSON.parse(localStorage.getItem('analysisReports') || '[]');
    const currentAsset = allAssets.find(a => a.assetId === assetId);
    
    if (!currentAsset) {
      console.error('❌ Asset not found:', assetId);
      setLoading(false);
      return;
    }

    console.log('📸 Current Asset:', currentAsset);

    // CRITICAL FIX: Find ONLY versions of THIS image (not all user images)
    const rootParentId = currentAsset.parentAssetId || currentAsset.assetId;
    
    const relatedAssets = allAssets.filter(asset => {
      // Include if it's the root parent
      if (asset.assetId === rootParentId) return true;
      
      // Include if it's a direct child of the root
      if (asset.parentAssetId === rootParentId) return true;
      
      // Include if it's the current asset
      if (asset.assetId === assetId) return true;
      
      return false;
    }).sort((a, b) => 
      new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
    );

    console.log('🔍 Filtering Results:', {
      currentAssetId: assetId,
      rootParentId: rootParentId,
      totalAssetsInSystem: allAssets.length,
      relatedVersionsFound: relatedAssets.length,
      versionIds: relatedAssets.map(a => a.assetId)
    });

    // If no related assets found, show just this one
    if (relatedAssets.length === 0) {
      relatedAssets.push(currentAsset);
    }

    const history = relatedAssets.map((asset, index) => {
      const isOriginal = index === 0 || !asset.parentAssetId;
      const prevAsset = index > 0 ? relatedAssets[index - 1] : null;
      
      // IMPROVED PLATFORM DETECTION
      let platform = 'Original';
      let platformIcon = '📸';
      let platformLabel = 'Original Capture';
      let platformColor = '#48bb78';
      
      if (!isOriginal) {
        const resolution = asset.assetResolution;
        const fileSize = parseFloat(asset.assetFileSize);
        
        if (resolution === '1080 x 1080') {
          platform = 'Instagram';
          platformIcon = '📷';
          platformLabel = 'Instagram Upload';
          platformColor = '#E4405F';
        } else if (resolution === '1600 x 1200') {
          platform = 'WhatsApp';
          platformIcon = '💬';
          platformLabel = 'WhatsApp Forward';
          platformColor = '#25D366';
        } else if (fileSize < 0.5) {
          platform = 'Twitter';
          platformIcon = '🐦';
          platformLabel = 'Twitter Post';
          platformColor = '#1DA1F2';
        } else if (fileSize < 1) {
          platform = 'Facebook';
          platformIcon = '👍';
          platformLabel = 'Facebook Upload';
          platformColor = '#1877F2';
        } else {
          platform = 'User Upload';
          platformIcon = '👤';
          platformLabel = 'User Uploaded Version';
          platformColor = '#718096';
        }
      }

      const integrity = calculateIntegrity(relatedAssets[0], asset);
      const changes = detectDeltaChanges(prevAsset || relatedAssets[0], asset, isOriginal);
      
      // Status badge based on integrity
      let statusBadge = 'preserved';
      let statusColor = '#48bb78';
      let statusText = '🟢 Preserved';
      
      if (integrity < 70) {
        statusBadge = 'heavy';
        statusColor = '#f56565';
        statusText = '🔴 Heavy Modification';
      } else if (integrity < 85) {
        statusBadge = 'minor';
        statusColor = '#ed8936';
        statusText = '🟡 Minor Loss';
      }

      return {
        platform,
        platformIcon,
        platformLabel,
        platformColor,
        date: new Date(asset.timestamp || asset.createdAt),
        integrity,
        changes,
        assetId: asset.assetId,
        resolution: asset.assetResolution,
        fileSize: asset.assetFileSize,
        isOriginal,
        statusBadge,
        statusColor,
        statusText,
        userName: asset.userName
      };
    });

    // Find worst degradation
    const worstEntry = history.reduce((worst, current) => 
      current.integrity < worst.integrity ? current : worst
    , history[0]);

    const worstChanges = worstEntry.changes.filter(c => 
      c.type === 'removed' || c.type === 'reduced'
    );

    setTravelHistory({
      original: relatedAssets[0],
      history: history,
      totalAppearances: history.length,
      platformsDetected: new Set(history.map(h => h.platform)).size - 1,
      averageIntegrity: Math.round(history.reduce((sum, h) => sum + h.integrity, 0) / history.length),
      worstDegradation: {
        platform: worstEntry.platform,
        changes: worstChanges.length > 0 ? worstChanges : [{ text: 'No major changes' }]
      }
    });
    
    setLoading(false);
  };

  const calculateIntegrity = (original, current) => {
    if (!original || original.assetId === current.assetId) return 100;
    
    let score = 100;
    const originalSize = parseFloat(original.assetFileSize) || 3;
    const currentSize = parseFloat(current.assetFileSize) || 3;
    const compressionLoss = ((originalSize - currentSize) / originalSize) * 100;
    
    score -= Math.min(compressionLoss, 50);
    if (original.assetResolution !== current.assetResolution) score -= 15;
    if (compressionLoss > 80) score -= 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const detectDeltaChanges = (previous, current, isOriginal) => {
    if (isOriginal) {
      return [
        { text: 'Metadata: Present', type: 'preserved', icon: '✔' },
        { text: 'UUID: Verified', type: 'preserved', icon: '✔' },
        { text: `Resolution: ${current.assetResolution}`, type: 'preserved', icon: '✔' },
        { text: `File Size: ${current.assetFileSize}`, type: 'preserved', icon: '✔' }
      ];
    }
    
    const changes = [];
    
    // Resolution change
    if (previous.assetResolution !== current.assetResolution) {
      changes.push({
        text: `Resolution reduced (${previous.assetResolution} → ${current.assetResolution})`,
        type: 'reduced',
        icon: '⬇'
      });
    }
    
    // File size change
    const prevSize = parseFloat(previous.assetFileSize);
    const currSize = parseFloat(current.assetFileSize);
    const sizeDiff = ((prevSize - currSize) / prevSize) * 100;
    
    if (sizeDiff > 50) {
      changes.push({
        text: `Heavy compression (${prevSize.toFixed(1)}MB → ${currSize.toFixed(1)}MB)`,
        type: 'reduced',
        icon: '⬇'
      });
    } else if (sizeDiff > 20) {
      changes.push({
        text: `File size reduced (${prevSize.toFixed(1)}MB → ${currSize.toFixed(1)}MB)`,
        type: 'reduced',
        icon: '⬇'
      });
    }
    
    // Metadata loss (platform-specific)
    if (current.assetResolution === '1080 x 1080' || current.assetResolution === '1600 x 1200') {
      changes.push({
        text: 'Metadata removed',
        type: 'removed',
        icon: '❌'
      });
      changes.push({
        text: 'UUID header lost',
        type: 'removed',
        icon: '❌'
      });
    }
    
    // Quality degradation
    if (sizeDiff > 70) {
      changes.push({
        text: 'Minor pixel distortion',
        type: 'warning',
        icon: '⚠'
      });
    }
    
    return changes.length > 0 ? changes : [
      { text: 'Minor modifications', type: 'warning', icon: '⚠' }
    ];
  };

  const toggleStep = (index) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const exportToCSV = () => {
    const headers = 'Platform,Date,Integrity,Changes\n';
    const rows = travelHistory.history.map(h =>
      `${h.platform},${h.date.toLocaleDateString()},${h.integrity}%,"${h.changes.map(c => c.text).join('; ')}"`
    ).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-history-${assetId}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="travel-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading journey...</p>
        </div>
      </div>
    );
  }

  if (!travelHistory) {
    return (
      <div className="travel-page">
        <div className="empty-state">
          <h2>Asset Not Found</h2>
          <button onClick={() => navigate(-1)} className="btn-back">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="travel-page">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="header-content">
          <h1>Image Travel History</h1>
          <div className="asset-badge">Asset ID: {assetId}</div>
        </div>
        <button onClick={exportToCSV} className="btn-export">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Journey Summary - ONLY 4 KEY METRICS */}
      <div className="journey-summary">
        <h2>Journey Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-icon">🌍</span>
            <div className="summary-content">
              <div className="summary-value">{travelHistory.totalAppearances}</div>
              <div className="summary-label">Total Appearances</div>
            </div>
          </div>

          <div className="summary-item">
            <span className="summary-icon">📱</span>
            <div className="summary-content">
              <div className="summary-value">{travelHistory.platformsDetected}</div>
              <div className="summary-label">Platforms Detected</div>
            </div>
          </div>

          <div className="summary-item">
            <span className="summary-icon">🛡</span>
            <div className="summary-content">
              <div className="summary-value">{travelHistory.averageIntegrity}%</div>
              <div className="summary-label">Average Integrity</div>
            </div>
          </div>

          <div className="summary-item">
            <span className="summary-icon">⚠</span>
            <div className="summary-content">
              <div className="summary-value">{travelHistory.worstDegradation.platform}</div>
              <div className="summary-label">Highest Data Loss</div>
              <div className="summary-detail">
                {travelHistory.worstDegradation.changes[0]?.text || 'No major loss'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Journey Timeline */}
      <div className="journey-timeline">
        <h2>Journey Timeline</h2>
        
        <div className="timeline-flow">
          {travelHistory.history.map((step, index) => (
            <React.Fragment key={index}>
              {/* Step Card */}
              <div 
                className={`timeline-step ${step.isOriginal ? 'original' : ''} ${expandedSteps[index] ? 'expanded' : ''}`}
                onClick={() => !step.isOriginal && toggleStep(index)}
              >
                <div className="step-header">
                  <div className="step-platform">
                    <span className="platform-icon" style={{fontSize: '40px'}}>
                      {step.platformIcon}
                    </span>
                    <div className="platform-info">
                      <div className="platform-name">{step.platformLabel}</div>
                      <div className="platform-date">
                        {step.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="step-status">
                    <span className="status-badge" style={{color: step.statusColor}}>
                      {step.statusText}
                    </span>
                    <div className="integrity-value">{step.integrity}%</div>
                  </div>
                  
                  {!step.isOriginal && (
                    <button className="expand-btn">
                      {expandedSteps[index] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                </div>

                {/* Changes List - Show ONLY Delta Changes */}
                <div className="step-changes">
                  {step.changes.slice(0, expandedSteps[index] ? undefined : 3).map((change, i) => (
                    <div key={i} className={`change-item ${change.type}`}>
                      <span className="change-icon">{change.icon}</span>
                      <span className="change-text">{change.text}</span>
                    </div>
                  ))}
                  {!expandedSteps[index] && step.changes.length > 3 && (
                    <div className="more-changes">
                      +{step.changes.length - 3} more changes
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedSteps[index] && (
                  <div className="step-details">
                    <button 
                      className="btn-view-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/track/${step.assetId}`);
                      }}
                    >
                      View Full Details
                    </button>
                  </div>
                )}
              </div>

              {/* Arrow Connector */}
              {index < travelHistory.history.length - 1 && (
                <div className="timeline-arrow">
                  <div className="arrow-line"></div>
                  <div className="arrow-head">▼</div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Integrity Chart - ONLY THIS IMAGE'S VERSIONS */}
      <div className="integrity-chart">
        <h2>Integrity Over Time</h2>
        <div className="chart-container">
          <div className="chart-line">
            {travelHistory.history.map((step, index) => (
              <div 
                key={index} 
                className="chart-point" 
                style={{
                  left: travelHistory.history.length === 1 
                    ? '50%' 
                    : `${(index / (travelHistory.history.length - 1)) * 100}%`
                }}
              >
                <div 
                  className="point-dot"
                  style={{
                    background: step.integrity >= 85 ? '#48bb78' : step.integrity >= 70 ? '#ed8936' : '#f56565'
                  }}
                ></div>
                <div className="point-label">{step.integrity}%</div>
                <div className="point-platform">{step.platform}</div>
              </div>
            ))}
          </div>
          <div className="chart-axis">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageTravelHistory;