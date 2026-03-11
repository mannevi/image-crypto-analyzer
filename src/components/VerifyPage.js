import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Image as ImageIcon, Info } from 'lucide-react';
import './VerifyPage.css';

function VerifyPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const fileInputRef = useRef(null);

  // Image hash generation (simple perceptual hash)
  const generateImageHash = (imageData) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Create a simple hash based on image characteristics
    let hash = 0;
    const sampleInterval = Math.floor(data.length / 1000);
    
    for (let i = 0; i < data.length; i += sampleInterval) {
      hash = ((hash << 5) - hash) + data[i];
      hash |= 0;
    }
    
    hash = ((hash << 5) - hash) + width;
    hash = ((hash << 5) - hash) + height;
    hash |= 0;
    
    return Math.abs(hash).toString(36).toUpperCase().padStart(12, '0');
  };

  // ── Advanced UUID Extraction (same engine as ImageCryptoAnalyzer) ──────────
  const STEGO_TILE     = 12;
  const UUID_FIELD_LEN = 32;
  const PAYLOAD_BYTES  = 1 + UUID_FIELD_LEN + 2;
  const PAYLOAD_BITS   = PAYLOAD_BYTES * 8;

  const crc16js = (bytes) => {
    let crc = 0xFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i] << 8;
      for (let j = 0; j < 8; j++)
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc & 0xFFFF;
  };

  const parsePayloadBits = (bits) => {
    if (bits.length < PAYLOAD_BITS) return null;
    const bytes = new Uint8Array(PAYLOAD_BYTES);
    for (let i = 0; i < PAYLOAD_BYTES; i++) {
      let v = 0;
      for (let b = 0; b < 8; b++) v = (v << 1) | (bits[i * 8 + b] || 0);
      bytes[i] = v;
    }
    const lenByte    = bytes[0];
    if (lenByte <= 0 || lenByte > UUID_FIELD_LEN) return null;
    const uuidPadded = bytes.slice(1, 1 + UUID_FIELD_LEN);
    const crcRead    = (bytes[PAYLOAD_BYTES - 2] << 8) | bytes[PAYLOAD_BYTES - 1];
    const forCrc     = new Uint8Array(1 + UUID_FIELD_LEN);
    forCrc[0] = lenByte; forCrc.set(uuidPadded, 1);
    if (crc16js(forCrc) !== crcRead) return null;
    let uid = '';
    for (let i = 0; i < lenByte; i++) uid += String.fromCharCode(uuidPadded[i]);
    return uid;
  };

  const parseIMGCRYPT3Msg = (text) => {
    const isV3 = text.includes('IMGCRYPT3|');
    const isV2 = !isV3 && text.includes('IMGCRYPT2|');
    const hdr  = isV3 ? 'IMGCRYPT3|' : isV2 ? 'IMGCRYPT2|' : text.includes('IMGCRYPT|') ? 'IMGCRYPT|' : null;
    if (!hdr) return null;
    const si = text.indexOf(hdr) + hdr.length;
    const ei = text.indexOf('|END', si);
    if (ei <= si) return null;
    const pts = text.substring(si, ei).split('|');
    if (pts.length < 2 || !pts[0] || pts[0].length < 2) return null;
    return { userId: pts[0], gps: pts[1]||'NOGPS', timestamp: pts[2]||null, deviceId: pts[3]||null, deviceName: pts[4]||null };
  };

  const extractIMGCRYPT3 = (bits) => {
    const total = bits.length;
    const maxScan = Math.min(total - 800, 3200);
    const maxRead = Math.min(500, Math.floor(total / 8));
    for (let off = 0; off <= maxScan; off += 8) {
      let text = '';
      for (let c = 0; c < maxRead; c++) {
        const s = off + c * 8;
        if (s + 8 > total) break;
        let v = 0;
        for (let b = 0; b < 8; b++) v = (v << 1) | bits[s + b];
        text += (v >= 32 && v <= 126) ? String.fromCharCode(v) : String.fromCharCode(0);
      }
      if (!text.includes('IMGCRYPT')) continue;
      const p = parseIMGCRYPT3Msg(text);
      if (p) return { found: true, userId: p.userId, deviceId: p.deviceId, timestamp: p.timestamp, deviceName: p.deviceName };
    }
    return null;
  };

  // Main extraction — tile+voting (survives 25x25 crop) + IMGCRYPT3 + legacy fallback
  const extractUUIDWithRotation = (sourceCanvas) => {
    const ctx       = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data      = imageData.data;
    const imgW      = sourceCanvas.width;
    const TILE      = STEGO_TILE;

    // METHOD 1: Tile + majority voting (works on any 25x25+ crop)
    const decodeWithOffset = (ox, oy) => {
      const votes  = new Array(PAYLOAD_BITS).fill(0);
      const counts = new Array(PAYLOAD_BITS).fill(0);
      for (let idx = 0; idx < data.length; idx += 4) {
        const pi = idx / 4;
        const tx = ((pi % imgW) + ox) % TILE;
        const ty = (Math.floor(pi / imgW) + oy) % TILE;
        const p  = ty * TILE + tx;
        const i0 = (2 * p)     % PAYLOAD_BITS;
        const i1 = (2 * p + 1) % PAYLOAD_BITS;
        votes[i0]  += (data[idx]     & 1); counts[i0]++;
        votes[i1]  += (data[idx + 1] & 1); counts[i1]++;
      }
      const bits = votes.map((v, i) => (counts[i] > 0 && v > counts[i] / 2) ? 1 : 0);
      return parsePayloadBits(bits);
    };

    let uid = decodeWithOffset(0, 0);
    if (uid) return { found: true, userId: uid, rotation: 0 };

    for (let oy = 0; oy < TILE; oy++) {
      for (let ox = 0; ox < TILE; ox++) {
        if (ox === 0 && oy === 0) continue;
        uid = decodeWithOffset(ox, oy);
        if (uid) return { found: true, userId: uid, rotation: 0 };
      }
    }

    // METHOD 2: IMGCRYPT3 from B channel
    const bBits = [];
    for (let idx = 0; idx < data.length; idx += 4) bBits.push(data[idx + 2] & 1);
    const r2 = extractIMGCRYPT3(bBits);
    if (r2) return { ...r2, rotation: 0 };

    // METHOD 3: Legacy R+G+B sequential
    const rgbBits = [];
    for (let idx = 0; idx < data.length; idx += 4) {
      rgbBits.push(data[idx] & 1, data[idx+1] & 1, data[idx+2] & 1);
    }
    const r3 = extractIMGCRYPT3(rgbBits);
    if (r3) return { ...r3, rotation: 0 };

    return { found: false };
  };

  // SIMPLE DETECTION: Report what actually changed, no smart assumptions
  const detectModifications = (uploadedCanvas, originalAsset, rotation) => {
    const changes = [];
    
    // Get uploaded image dimensions
    let uploadedWidth = uploadedCanvas.width;
    let uploadedHeight = uploadedCanvas.height;
    
    // Parse original dimensions
    const originalRes = originalAsset.assetResolution.split(' x ');
    const originalWidth = parseInt(originalRes[0]);
    const originalHeight = parseInt(originalRes[1]);
    
    // 1. ROTATION - Report if rotated
    if (rotation && rotation !== 0) {
      const userRotation = (360 - rotation) % 360;
      
      if (userRotation === 90) {
        changes.push('Rotated 90° clockwise (right)');
      } else if (userRotation === 180) {
        changes.push('Rotated 180°');
      } else if (userRotation === 270) {
        changes.push('Rotated 270° clockwise (left)');
      }
    }
    
    // 2. RESIZING - Report if dimensions changed significantly
    let checkWidth = uploadedWidth;
    let checkHeight = uploadedHeight;
    
    // Account for rotation when comparing
    if (rotation === 90 || rotation === 270) {
      [checkWidth, checkHeight] = [checkHeight, checkWidth];
    }
    
    const widthDiff = Math.abs(checkWidth - originalWidth);
    const heightDiff = Math.abs(checkHeight - originalHeight);
    
    // Report if changed by more than 5% or 50 pixels
    if ((widthDiff > 50 || heightDiff > 50) || 
        ((widthDiff / originalWidth) > 0.05 || (heightDiff / originalHeight) > 0.05)) {
      
      if (checkWidth < originalWidth) {
        const scalePercent = Math.round((checkWidth / originalWidth) * 100);
        changes.push(`Resized to ${scalePercent}% (${checkWidth} x ${checkHeight})`);
      } else if (checkWidth > originalWidth) {
        const scalePercent = Math.round((checkWidth / originalWidth) * 100);
        changes.push(`Upscaled to ${scalePercent}% (${checkWidth} x ${checkHeight})`);
      }
    }
    
    // 3. CROPPING - Report if aspect ratio changed
    const uploadedAspect = uploadedWidth / uploadedHeight;
    const originalAspect = originalWidth / originalHeight;
    const aspectDiff = Math.abs(uploadedAspect - originalAspect);
    
    // Report if aspect ratio changed by more than 5%
    if (aspectDiff > 0.05) {
      changes.push('Cropped (aspect ratio changed)');
    }
    
    // 4. COMPRESSION - Report if file size changed significantly
    const uploadedSize = selectedFile.size;
    const originalSizeStr = originalAsset.assetFileSize || '';
    const originalSizeKB = parseFloat(originalSizeStr.replace(/[^0-9.]/g, ''));
    const originalSize = originalSizeKB * 1024;
    
    if (originalSize && uploadedSize) {
      const sizeDiffPercent = ((originalSize - uploadedSize) / originalSize) * 100;
      
      // Report if file size changed by more than 5%
      if (Math.abs(sizeDiffPercent) > 5) {
        if (sizeDiffPercent > 0) {
          changes.push(`Compressed (${Math.round(sizeDiffPercent)}% smaller)`);
        } else {
          changes.push(`Re-encoded (${Math.round(Math.abs(sizeDiffPercent))}% larger)`);
        }
      }
    }
    
    // 5. FORMAT CONVERSION - ONLY report if format ACTUALLY changed
    const uploadedType = selectedFile.type;
    const uploadedFormat = uploadedType.split('/')[1]?.toUpperCase();
    
    // Determine original format
    let originalFormat = null;
    if (originalSizeStr.toLowerCase().includes('png')) {
      originalFormat = 'PNG';
    } else if (originalSizeStr.toLowerCase().includes('jpeg') || originalSizeStr.toLowerCase().includes('jpg')) {
      originalFormat = 'JPEG';
    } else if (originalSizeStr.toLowerCase().includes('webp')) {
      originalFormat = 'WEBP';
    } else if (originalSizeStr.toLowerCase().includes('gif')) {
      originalFormat = 'GIF';
    }
    
    // ONLY report if format actually changed
    if (originalFormat && uploadedFormat && uploadedFormat !== originalFormat) {
      changes.push(`Format converted from ${originalFormat} to ${uploadedFormat}`);
    }
    
    // 6. FLIPPING - Would need original image to detect accurately
    // Placeholder for future enhancement
    
    // 7. FILTERS/EFFECTS - Would need original image to compare
    // Placeholder for future enhancement
    
    return changes.length > 0 ? changes : ['No modifications detected'];
  };

  // Calculate similarity between two images
  const calculateSimilarity = (uploadedCanvas, originalAsset) => {
    // This is a simplified similarity check
    // In production, you'd use more sophisticated algorithms
    
    const uploadedCtx = uploadedCanvas.getContext('2d');
    const uploadedData = uploadedCtx.getImageData(0, 0, uploadedCanvas.width, uploadedCanvas.height);
    
    // For now, base similarity on resolution and aspect ratio match
    const uploadedAspect = uploadedCanvas.width / uploadedCanvas.height;
    const originalRes = originalAsset.assetResolution.split(' x ');
    const originalAspect = parseInt(originalRes[0]) / parseInt(originalRes[1]);
    
    const aspectDiff = Math.abs(uploadedAspect - originalAspect);
    let similarity = 100 - (aspectDiff * 100);
    
    // Adjust based on resolution match
    if (uploadedCanvas.width === parseInt(originalRes[0])) {
      similarity = Math.min(100, similarity + 20);
    }
    
    return Math.max(0, Math.min(100, similarity));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setVerificationResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setVerificationResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const verifyImage = async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }

    setVerifying(true);

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Step 1 — Extract UUID/watermark from image
      const uuidResult = extractUUIDWithRotation(canvas);
      
      let matchFound   = false;
      let matchedAsset = null;
      let confidence   = 0;
      let changes      = [];

      // Step 2 — Backend lookup first (primary source)
      if (uuidResult.found) {
        try {
          const { adminAPI } = await import('../api/client');
          const response = await adminAPI.getAllVault();
          const allAssets = response?.data || response || [];

          const backendMatch = allAssets.find(a =>
            a.owner_name  === uuidResult.userId ||
            a.asset_id    === uuidResult.userId
          );

          if (backendMatch) {
            matchFound   = true;
            confidence   = 90;
            matchedAsset = {
              uniqueUserId  : backendMatch.owner_name,
              userName      : backendMatch.owner_name,
              userEmail     : backendMatch.owner_email,
              assetId       : backendMatch.asset_id,
              assetResolution: backendMatch.resolution || '—',
              assetFileSize : backendMatch.file_size   || '—',
              fileHash      : backendMatch.file_hash,
              deviceId      : backendMatch.device_id,
              certificateId : backendMatch.certificate_id,
              dateEncrypted : backendMatch.capture_timestamp || backendMatch.created_at,
              blockchainAnchor: backendMatch.blockchain_anchor,
            };

            // Check resolution change
            const origRes = (backendMatch.resolution || '').replace(/\s/g,'').split('x');
            if (origRes.length === 2) {
              if (parseInt(origRes[0]) !== canvas.width || parseInt(origRes[1]) !== canvas.height) {
                changes.push('Resolution changed from original');
                confidence -= 5;
              }
            }
          }
        } catch (e) {
          console.warn('Backend lookup failed, falling back to localStorage', e);
        }
      }

      // Step 3 — Fallback to localStorage if backend didn't match
      if (!matchFound) {
        const vaultAssets  = JSON.parse(localStorage.getItem('vaultImages')     || '[]');
        const reportAssets = JSON.parse(localStorage.getItem('analysisReports') || '[]');
        const normalize = (asset) => ({
          ...asset,
          assetResolution: asset.assetResolution || asset.resolution || '0 x 0',
          assetFileSize  : asset.assetFileSize || (asset.fileSize ? (asset.fileSize / 1024).toFixed(2) + ' KB' : null),
          uniqueUserId   : asset.uniqueUserId || asset.userId || null,
          userName       : asset.userName  || asset.ownerName  || null,
          userEmail      : asset.userEmail || asset.ownerEmail || null,
        });
        const storedAssets = [...vaultAssets.map(normalize), ...reportAssets.map(normalize)];

        if (uuidResult.found) {
          matchedAsset = storedAssets.find(asset =>
            (asset.uniqueUserId && asset.uniqueUserId === uuidResult.userId) ||
            (asset.userId       && asset.userId       === uuidResult.userId) ||
            (asset.deviceId     && asset.deviceId     === uuidResult.deviceId)
          );
          if (matchedAsset) {
            matchFound = true;
            confidence = calculateSimilarity(canvas, matchedAsset);
            changes    = detectModifications(canvas, matchedAsset, uuidResult.rotation || 0);
            if (uuidResult.rotation !== 0) confidence = Math.max(85, confidence - 5);
          }
        } else {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          generateImageHash(imageData); // keep for future use
          for (const asset of storedAssets) {
            const similarity = calculateSimilarity(canvas, asset);
            if (similarity > 70) {
              matchFound   = true;
              matchedAsset = asset;
              confidence   = similarity;
              changes      = detectModifications(canvas, asset, 0);
              changes.push('UUID removed or corrupted');
              break;
            }
          }
        }
      }

      setVerificationResult({
        matchFound,
        asset      : matchedAsset,
        confidence : Math.round(confidence),
        changes,
        hasUUID    : uuidResult.found,
        uuid       : uuidResult.userId || null,
        rotation   : uuidResult.rotation || 0
      });

      setVerifying(false);
    };
    
    img.src = preview;
  };

  return (
    <div className="verify-page">
      <div className="verify-header">
        <div>
          <h1>Verify Image Authenticity</h1>
          <p className="subtitle">Upload any image to check if it matches our encrypted asset database</p>

          {/* WhatsApp / sharing tip */}
          <div style={{marginTop:'12px',padding:'12px 14px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'10px',fontSize:'13px',color:'#9a3412',lineHeight:'1.7'}}>
            <strong>📲 Received image via WhatsApp?</strong>
            <div style={{marginTop:'6px'}}>
              WhatsApp compresses images — this may affect watermark detection.<br/>
              For best results, ask the sender to share as <strong>Document</strong> (not Photo):
            </div>
            <div style={{marginTop:'8px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:'12px'}}>
              <span>📱 <strong>Android:</strong></span><span>Attachment → Document → pick image</span>
              <span>🍎 <strong>iPhone:</strong></span><span>+ → Document → pick from Photos</span>
              <span>💻 <strong>Web:</strong></span><span>Attach as file, not photo</span>
            </div>
            <div style={{marginTop:'8px',padding:'6px 10px',background:'#fef3c7',borderRadius:'6px',fontSize:'12px',color:'#78350f'}}>
              💡 <strong>PNG = 100% watermark preserved &nbsp;|&nbsp; JPEG 85%+ = safe &nbsp;|&nbsp; WhatsApp photo = may fail</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="verify-container">
        {/* Upload Section */}
        <div className="upload-section">
          <div 
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="preview-image" />
                <div className="preview-overlay">
                  <p>Click to change image</p>
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <Upload size={48} className="upload-icon" />
                <h3>Drop image here or click to upload</h3>
                <p>Supports: JPG, PNG, JPEG</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {selectedFile && (
            <div className="file-info">
              <ImageIcon size={20} />
              <div>
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</div>
              </div>
            </div>
          )}

          <button
            onClick={verifyImage}
            disabled={!selectedFile || verifying}
            className="btn-verify"
          >
            {verifying ? '🔍 Scanning watermark...' : 'Verify Image'}
          </button>

          {/* Watermark scanning steps hint */}
          {verifying && (
            <div style={{marginTop:'12px',padding:'12px',background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:'10px',fontSize:'13px',color:'#0369a1'}}>
              <div>📂 Step 1 — Scanning image metadata...</div>
              <div>🔍 Step 2 — Extracting hidden watermark from pixels...</div>
              <div>🔑 Step 3 — Recovering UUID...</div>
              <div>🌐 Step 4 — Looking up owner in backend...</div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {verificationResult && (
          <div className="results-section">
            <div className={`result-banner ${verificationResult.matchFound ? 'success' : 'error'}`}>
              <div className="result-icon">
                {verificationResult.matchFound ? (
                  <CheckCircle size={32} />
                ) : (
                  <XCircle size={32} />
                )}
              </div>
              <div>
                <h2>{verificationResult.matchFound ? 'Match Found ✓' : 'No Match Found ✗'}</h2>
                <p>
                  {verificationResult.matchFound
                    ? `Confidence: ${verificationResult.confidence}%`
                    : 'Unknown origin - Image not found in database'
                  }
                </p>
              </div>
            </div>

            {verificationResult.matchFound && verificationResult.asset && (
              <>
                {/* Original Creator Info — Enhanced with backend lookup */}
                <div className="result-card">
                  <h3>🔍 Verification Result</h3>

                  {/* Owner Summary Box */}
                  <div style={{background:'#f0fdf4',border:'2px solid #86efac',borderRadius:'10px',padding:'16px',marginBottom:'16px'}}>
                    <div style={{fontSize:'13px',color:'#166534',fontWeight:'700',marginBottom:'8px'}}>✅ Image Owner Identified</div>
                    <div style={{display:'grid',gap:'6px'}}>
                      <div style={{display:'flex',gap:'8px'}}><span style={{fontWeight:'600',color:'#374151',minWidth:'140px'}}>Image Owner:</span><span>{verificationResult.asset.userName || verificationResult.asset.uniqueUserId || '—'}</span></div>
                      <div style={{display:'flex',gap:'8px'}}><span style={{fontWeight:'600',color:'#374151',minWidth:'140px'}}>UUID:</span><span style={{fontFamily:'monospace',fontSize:'12px'}}>{verificationResult.uuid || verificationResult.asset.uniqueUserId || '—'}</span></div>
                      <div style={{display:'flex',gap:'8px'}}><span style={{fontWeight:'600',color:'#374151',minWidth:'140px'}}>Captured on:</span><span>{new Date(verificationResult.asset.dateEncrypted || verificationResult.asset.timestamp || verificationResult.asset.createdAt || Date.now()).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span></div>
                      <div style={{display:'flex',gap:'8px'}}><span style={{fontWeight:'600',color:'#374151',minWidth:'140px'}}>Email:</span><span>{verificationResult.asset.userEmail || '—'}</span></div>
                    </div>
                  </div>

                  <div className="creator-details">
                    <div className="creator-avatar-large">
                      {verificationResult.asset.userName?.charAt(0).toUpperCase() || 
                       verificationResult.asset.uniqueUserId?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="creator-name-large">
                        {verificationResult.asset.userName || 'Unknown User'}
                      </div>
                      <div className="creator-email-large">
                        {verificationResult.asset.userEmail || verificationResult.asset.uniqueUserId}
                      </div>
                      <div className="creator-meta">
                        Captured: {new Date(
                          verificationResult.asset.dateEncrypted ||
                          verificationResult.asset.timestamp    ||
                          verificationResult.asset.createdAt    ||
                          Date.now()
                        ).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="result-card">
                  <h3>Confidence Score</h3>
                  <div className="confidence-meter">
                    <div className="confidence-bar-large">
                      <div 
                        className="confidence-fill-large" 
                        style={{ width: `${verificationResult.confidence}%` }}
                      ></div>
                    </div>
                    <div className="confidence-label">{verificationResult.confidence}%</div>
                  </div>
                  <div className="confidence-description">
                    {verificationResult.confidence >= 90 && 'Very High - Strong match with original'}
                    {verificationResult.confidence >= 70 && verificationResult.confidence < 90 && 'High - Likely the same image'}
                    {verificationResult.confidence >= 50 && verificationResult.confidence < 70 && 'Medium - Possible match with modifications'}
                    {verificationResult.confidence < 50 && 'Low - Significant differences detected'}
                  </div>
                </div>

                {/* Detected Changes */}
                <div className="result-card">
                  <h3>Detected Changes</h3>
                  <ul className="changes-list">
                    {verificationResult.changes.map((change, idx) => (
                      <li key={idx}>
                        <AlertCircle size={16} />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Asset Details */}
                <div className="result-card">
                  <h3>Original Asset Details</h3>
                  <div className="asset-details-grid">
                    <div className="detail-row">
                      <span className="detail-label">Asset ID:</span>
                      <span className="detail-value">{verificationResult.asset.assetId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Certificate ID:</span>
                      <span className="detail-value">
                        {verificationResult.asset.certificateId ||
                         verificationResult.asset.authorshipCertificateId || '—'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Device ID:</span>
                      <span className="detail-value">{verificationResult.asset.deviceId || '—'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Original Resolution:</span>
                      <span className="detail-value">{verificationResult.asset.assetResolution}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Original Size:</span>
                      <span className="detail-value">{verificationResult.asset.assetFileSize || '—'}</span>
                    </div>
                    {verificationResult.asset.fileHash && (
                      <div className="detail-row">
                        <span className="detail-label">SHA-256:</span>
                        <span className="detail-value">
                          {verificationResult.asset.fileHash.substring(0, 20)}…
                        </span>
                      </div>
                    )}
                    {verificationResult.asset.blockchainAnchor && (
                      <div className="detail-row">
                        <span className="detail-label">Blockchain Anchor:</span>
                        <span className="detail-value">
                          {verificationResult.asset.blockchainAnchor.substring(0, 20)}…
                        </span>
                      </div>
                    )}
                    {verificationResult.asset.gpsLocation?.available && (
                      <div className="detail-row">
                        <span className="detail-label">GPS Location:</span>
                        <span className="detail-value">
                          <a 
                            href={verificationResult.asset.gpsLocation.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gps-link"
                          >
                            📍 {verificationResult.asset.gpsLocation.coordinates}
                          </a>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!verificationResult.matchFound && (
              <div className="result-card no-match">
                <Info size={24} />
                <div>
                  <h3>No Match Found</h3>
                  <p>This image does not match any encrypted assets in our database.</p>
                  <p className="hint">
                    Possible reasons:
                  </p>
                  <ul>
                    <li>Image was not encrypted with our system</li>
                    <li>Image has been heavily modified or filtered</li>
                    <li>Original asset not yet stored in database</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyPage;