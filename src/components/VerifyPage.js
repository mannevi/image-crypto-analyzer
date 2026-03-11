import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Image as ImageIcon, Info, FileText, Shield, Eye, Cpu } from 'lucide-react';
import './VerifyPage.css';

function VerifyPage() {
  const [selectedFile,       setSelectedFile]       = useState(null);
  const [preview,            setPreview]            = useState(null);
  const [verifying,          setVerifying]          = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [activeTab,          setActiveTab]          = useState('verification');
  const fileInputRef = useRef(null);

  const generateImageHash = (imageData) => {
    const data = imageData.data;
    let hash = 0;
    const step = Math.floor(data.length / 1000);
    for (let i = 0; i < data.length; i += step) { hash = ((hash << 5) - hash) + data[i]; hash |= 0; }
    hash = ((hash << 5) - hash) + imageData.width;
    hash = ((hash << 5) - hash) + imageData.height;
    return Math.abs(hash).toString(36).toUpperCase().padStart(12, '0');
  };

  const extractUUID = (imageData) => {
    const data = imageData.data;
    let binaryMessage = '';
    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) binaryMessage += (data[i + j] & 1).toString();
    }
    for (let i = 0; i < binaryMessage.length - 800; i += 8) {
      let text = '';
      for (let j = i; j < i + 5000; j += 8) {
        const byte = binaryMessage.substr(j, 8);
        if (byte.length < 8) break;
        const charCode = parseInt(byte, 2);
        if (charCode === 0) break;
        text += String.fromCharCode(charCode);
        if (text.includes('END') && text.startsWith('IMGCRYPT')) {
          return { found: true, message: text, userId: text.split('|')[1] || '' };
        }
      }
    }
    return { found: false, userId: '' };
  };

  const extractUUIDWithRotation = (sourceCanvas) => {
    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    return extractUUID(imageData);
  };

  const performELA = (canvas) => {
    return new Promise((resolve) => {
      const elaCanvas = document.createElement('canvas');
      elaCanvas.width = canvas.width; elaCanvas.height = canvas.height;
      const elaCtx = elaCanvas.getContext('2d');
      elaCtx.drawImage(canvas, 0, 0);
      elaCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.onload = () => {
          const compCanvas = document.createElement('canvas');
          compCanvas.width = canvas.width; compCanvas.height = canvas.height;
          const compCtx = compCanvas.getContext('2d');
          compCtx.drawImage(img2, 0, 0);
          const orig = elaCtx.getImageData(0, 0, canvas.width, canvas.height);
          const comp = compCtx.getImageData(0, 0, canvas.width, canvas.height);
          let totalDiff = 0, highDiffPixels = 0;
          for (let i = 0; i < orig.data.length; i += 4) {
            const dr = Math.abs(orig.data[i] - comp.data[i]);
            const dg = Math.abs(orig.data[i+1] - comp.data[i+1]);
            const db = Math.abs(orig.data[i+2] - comp.data[i+2]);
            const diff = (dr + dg + db) / 3;
            totalDiff += diff;
            if (diff > 15) highDiffPixels++;
          }
          const totalPixels = orig.data.length / 4;
          const avgDiff = totalDiff / totalPixels;
          const highDiffRatio = highDiffPixels / totalPixels;
          URL.revokeObjectURL(url);
          resolve({
            avgDiff: avgDiff.toFixed(2),
            highDiffRatio: (highDiffRatio * 100).toFixed(1),
            tamperingScore: Math.min(100, Math.round(highDiffRatio * 500)),
            verdict: highDiffRatio > 0.15 ? 'Possible tampering detected' : highDiffRatio > 0.05 ? 'Minor inconsistencies found' : 'No significant tampering detected',
          });
        };
        img2.src = url;
      }, 'image/jpeg', 0.75);
    });
  };

  const inspectMetadata = (file, canvas) => {
    const editingSoftware = [];
    const fileName = file.name.toLowerCase();
    const expectedSize = canvas.width * canvas.height * 0.1;
    const sizeRatio = file.size / expectedSize;
    if (fileName.includes('edit') || fileName.includes('modified') || fileName.includes('copy')) editingSoftware.push('Suspicious filename pattern');
    return {
      fileType: file.type, fileSize: (file.size / 1024).toFixed(2) + ' KB',
      dimensions: canvas.width + ' x ' + canvas.height, sizeRatio: sizeRatio.toFixed(2),
      editingSoftware, metadataClean: editingSoftware.length === 0,
      verdict: editingSoftware.length > 0 ? 'Editing software signatures detected' : 'No editing software detected',
    };
  };

  const detectAI = (canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let noiseScore = 0, uniformPixels = 0;
    const sampleSize = Math.min(10000, data.length / 4);
    const step = Math.floor(data.length / 4 / sampleSize);
    for (let i = 0; i < sampleSize; i++) {
      const idx = i * step * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const avg = (r + g + b) / 3;
      const variance = Math.abs(r-avg) + Math.abs(g-avg) + Math.abs(b-avg);
      if (variance < 5) uniformPixels++;
      noiseScore += variance;
    }
    const avgNoise = noiseScore / sampleSize;
    const uniformRatio = uniformPixels / sampleSize;
    let aiProbability = 0;
    if (uniformRatio > 0.3) aiProbability += 30;
    if (avgNoise < 8)       aiProbability += 25;
    if (canvas.width === canvas.height) aiProbability += 10;
    if (canvas.width >= 512 && canvas.width <= 1024) aiProbability += 10;
    aiProbability = Math.min(95, Math.max(5, aiProbability));
    return {
      aiProbability, uniformRatio: (uniformRatio * 100).toFixed(1), avgNoise: avgNoise.toFixed(2),
      verdict: aiProbability > 70 ? 'Likely AI generated' : aiProbability > 40 ? 'Possibly AI generated' : 'Likely authentic photo',
      label: aiProbability > 70 ? 'HIGH' : aiProbability > 40 ? 'MEDIUM' : 'LOW',
    };
  };

  const lookupOwnerFromBackend = async (uuid) => {
    try {
      const { adminAPI } = await import('../api/client');
      const assets = await adminAPI.getAllVault();
      const list = assets?.data || assets || [];
      const match = list.find(a => a.owner_name === uuid || a.asset_id === uuid);
      if (match) return {
        found: true, ownerName: match.owner_name || 'Unknown',
        ownerEmail: match.owner_email || '—', assetId: match.asset_id,
        fileName: match.file_name, capturedOn: match.capture_timestamp || match.created_at,
        resolution: match.resolution, fileHash: match.file_hash,
        deviceId: match.device_id, certId: match.certificate_id,
      };
      return { found: false };
    } catch (e) { return { found: false }; }
  };

  const downloadReport = () => {
    if (!verificationResult) return;
    const r = verificationResult;
    const now = new Date().toLocaleString();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Forensic Report - PINIT</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1a1a2e}h1{color:#6366f1;border-bottom:3px solid #6366f1;padding-bottom:10px}h2{color:#4f46e5;margin-top:24px}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:8px 12px;border-bottom:1px solid #e5e7eb}td:first-child{font-weight:600;color:#374151;width:40%}.verdict-box{padding:16px;border-radius:8px;margin:16px 0}.authentic{background:#d1fae5;border-left:4px solid #10b981}.tampered{background:#fee2e2;border-left:4px solid #ef4444}.footer{margin-top:40px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}</style>
</head><body>
<h1>Image Forensic Report - PINIT</h1><p>Generated: ${now}</p>
<div class="verdict-box ${r.matchFound ? 'authentic' : 'tampered'}"><strong>Overall Verdict:</strong> ${r.matchFound ? 'Authentic - Owner Verified' : 'Unknown Origin - No Match Found'}</div>
<h2>Ownership Information</h2><table>
<tr><td>Owner UUID</td><td>${r.uuid || '—'}</td></tr>
<tr><td>Owner Name</td><td>${r.ownerInfo?.ownerName || r.asset?.userName || '—'}</td></tr>
<tr><td>Owner Email</td><td>${r.ownerInfo?.ownerEmail || '—'}</td></tr>
<tr><td>Captured On</td><td>${r.ownerInfo?.capturedOn ? new Date(r.ownerInfo.capturedOn).toLocaleString() : '—'}</td></tr>
<tr><td>Device ID</td><td>${r.ownerInfo?.deviceId || '—'}</td></tr>
<tr><td>Certificate ID</td><td>${r.ownerInfo?.certId || '—'}</td></tr>
</table>
<h2>Watermark Status</h2><table>
<tr><td>Watermark Found</td><td>${r.hasUUID ? 'Yes' : 'No'}</td></tr>
<tr><td>UUID Extracted</td><td>${r.uuid || '—'}</td></tr>
<tr><td>Match Confidence</td><td>${r.confidence || 0}%</td></tr>
</table>
<h2>ELA Analysis</h2><table>
<tr><td>Tampering Score</td><td>${r.ela?.tamperingScore || 0}/100</td></tr>
<tr><td>High Diff Pixels</td><td>${r.ela?.highDiffRatio || '—'}%</td></tr>
<tr><td>ELA Verdict</td><td>${r.ela?.verdict || '—'}</td></tr>
</table>
<h2>AI Detection</h2><table>
<tr><td>AI Probability</td><td>${r.ai?.aiProbability || 0}%</td></tr>
<tr><td>Risk Level</td><td>${r.ai?.label || '—'}</td></tr>
<tr><td>AI Verdict</td><td>${r.ai?.verdict || '—'}</td></tr>
</table>
<h2>Metadata Inspection</h2><table>
<tr><td>File Type</td><td>${r.metadata?.fileType || '—'}</td></tr>
<tr><td>File Size</td><td>${r.metadata?.fileSize || '—'}</td></tr>
<tr><td>Dimensions</td><td>${r.metadata?.dimensions || '—'}</td></tr>
<tr><td>Editing Software</td><td>${r.metadata?.editingSoftware?.join(', ') || 'None detected'}</td></tr>
<tr><td>Metadata Verdict</td><td>${r.metadata?.verdict || '—'}</td></tr>
</table>
<h2>Final Conclusion</h2>
<div class="verdict-box ${r.ela?.tamperingScore > 50 || r.ai?.aiProbability > 70 ? 'tampered' : 'authentic'}">
${r.matchFound ? 'Owner identity verified via watermark. ' : 'Owner could not be verified. '}
${r.ela?.tamperingScore > 50 ? 'Tampering likely detected. ' : 'No tampering detected. '}
${r.ai?.aiProbability > 70 ? 'Likely AI generated. ' : 'Likely authentic photo.'}
</div>
<div class="footer">Generated by PINIT - Image Forensics and Verification Platform</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PINIT_Forensic_Report_' + Date.now() + '.html'; a.click();
    URL.revokeObjectURL(url);
  };

  const verifyImage = async () => {
    if (!selectedFile) { alert('Please select an image first'); return; }
    setVerifying(true); setVerificationResult(null);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const uuidResult = extractUUIDWithRotation(canvas);
      const elaResult  = await performELA(canvas);
      const aiResult   = detectAI(canvas);
      const metaResult = inspectMetadata(selectedFile, canvas);
      let ownerInfo = { found: false }, matchFound = false, confidence = 0, asset = null, changes = [];
      if (uuidResult.found) {
        ownerInfo = await lookupOwnerFromBackend(uuidResult.userId);
        if (ownerInfo.found) {
          matchFound = true; confidence = 90;
          const origRes = ownerInfo.resolution?.replace(/\s/g,'').split('x') || [];
          if (origRes.length === 2 && (parseInt(origRes[0]) !== canvas.width || parseInt(origRes[1]) !== canvas.height)) {
            changes.push('Resolution changed from original'); confidence -= 10;
          }
        }
      }
      if (!matchFound) {
        try {
          const { adminAPI } = await import('../api/client');
          const assets = await adminAPI.getAllVault();
          const list = (assets?.data || assets || []).map(a => ({
            ...a, assetResolution: a.resolution || '0x0',
            uniqueUserId: a.owner_name || null, userName: a.owner_name || null,
            userEmail: a.owner_email || null, assetFileSize: a.file_size || null,
            fileHash: a.file_hash || null, deviceId: a.device_id || null,
            assetId: a.asset_id || null, certificateId: a.certificate_id || null,
            dateEncrypted: a.capture_timestamp || a.created_at,
          }));
          asset = list.find(a => a.uniqueUserId && uuidResult.found && a.uniqueUserId === uuidResult.userId);
          if (asset) { matchFound = true; confidence = 88; }
        } catch (e) {}
      }
      if (elaResult.tamperingScore > 30) changes.push('ELA: ' + elaResult.verdict);
      if (aiResult.aiProbability > 50)   changes.push('AI: ' + aiResult.verdict);
      if (!uuidResult.found)             changes.push('Watermark not found or removed');
      setVerificationResult({
        matchFound, asset, ownerInfo, confidence: Math.max(0, Math.min(100, confidence)),
        changes, hasUUID: uuidResult.found, uuid: uuidResult.userId || null,
        ela: elaResult, ai: aiResult, metadata: metaResult,
      });
      setVerifying(false); setActiveTab('verification');
    };
    img.src = preview;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file); setVerificationResult(null);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const tabStyle = (id) => ({
    padding:'8px 16px', borderRadius:'20px', border:'none', cursor:'pointer',
    fontWeight:'600', fontSize:'13px',
    background: activeTab === id ? '#6366f1' : '#f3f4f6',
    color: activeTab === id ? 'white' : '#374151',
  });

  const cardStyle = { background:'white', borderRadius:'12px', padding:'20px', marginBottom:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' };
  const rowStyle  = { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6' };
  const labelStyle = { fontWeight:'600', color:'#374151', fontSize:'14px' };
  const valueStyle = { color:'#1f2937', fontSize:'14px', textAlign:'right', maxWidth:'60%' };

  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="verify-header">
          <h1>🔍 Image Forensic Verification</h1>
          <p>Upload an image to verify ownership, detect tampering, and generate a forensic report</p>
        </div>

        <div className="upload-section"
          onDrop={(e) => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f&&f.type.startsWith('image/')){setSelectedFile(f);setVerificationResult(null);const r=new FileReader();r.onload=(ev)=>setPreview(ev.target.result);r.readAsDataURL(f);}}}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor:'pointer' }}>
          {preview ? (
            <div className="preview-container">
              <img src={preview} alt="Preview" className="preview-image"/>
              <div className="preview-overlay"><p>Click to change image</p></div>
            </div>
          ) : (
            <div className="upload-placeholder">
              <Upload size={48} className="upload-icon"/>
              <h3>Drop image here or click to upload</h3>
              <p>Supports: JPG, PNG, JPEG</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{display:'none'}}/>
        </div>

        {selectedFile && (
          <div className="file-info">
            <ImageIcon size={20}/>
            <div>
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">{(selectedFile.size/1024).toFixed(2)} KB</div>
            </div>
          </div>
        )}

        <button onClick={verifyImage} disabled={!selectedFile||verifying} className="btn-verify">
          {verifying ? '🔄 Running Forensic Analysis...' : '🔍 Verify & Analyze Image'}
        </button>

        {verificationResult && (
          <div className="results-section">
            <div className={`result-banner ${verificationResult.matchFound ? 'success' : 'error'}`}>
              <div className="result-icon">
                {verificationResult.matchFound ? <CheckCircle size={32}/> : <XCircle size={32}/>}
              </div>
              <div>
                <h2>{verificationResult.matchFound ? '✅ Owner Verified' : '❌ Unknown Origin'}</h2>
                <p>{verificationResult.matchFound ? `Confidence: ${verificationResult.confidence}% — Watermark ${verificationResult.hasUUID?'Found':'Not Found'}` : 'Image not found in database'}</p>
              </div>
            </div>

            <div style={{display:'flex',gap:'8px',margin:'16px 0',flexWrap:'wrap'}}>
              {[{id:'verification',label:'👤 Ownership'},{id:'ela',label:'📊 ELA'},{id:'ai',label:'🤖 AI Check'},{id:'metadata',label:'🗂️ Metadata'},{id:'report',label:'📄 Report'}].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(tab.id)}>{tab.label}</button>
              ))}
            </div>

            {activeTab === 'verification' && (
              <div>
                <div style={cardStyle}>
                  <h3 style={{marginTop:0}}>👤 Owner Information</h3>
                  {[
                    ['Owner UUID',        verificationResult.uuid || '—'],
                    ['Owner Name',        verificationResult.ownerInfo?.ownerName || verificationResult.asset?.userName || '—'],
                    ['Owner Email',       verificationResult.ownerInfo?.ownerEmail || verificationResult.asset?.userEmail || '—'],
                    ['Captured On',       verificationResult.ownerInfo?.capturedOn ? new Date(verificationResult.ownerInfo.capturedOn).toLocaleString() : '—'],
                    ['Device ID',         verificationResult.ownerInfo?.deviceId || verificationResult.asset?.deviceId || '—'],
                    ['Certificate ID',    verificationResult.ownerInfo?.certId || verificationResult.asset?.certificateId || '—'],
                    ['Watermark Status',  verificationResult.hasUUID ? '✅ Valid watermark found' : '❌ No watermark'],
                  ].map(([l,v]) => (
                    <div key={l} style={rowStyle}><span style={labelStyle}>{l}</span><span style={valueStyle}>{v}</span></div>
                  ))}
                </div>
                {verificationResult.changes?.length > 0 && (
                  <div style={cardStyle}>
                    <h3 style={{marginTop:0}}>⚠️ Detected Issues</h3>
                    {verificationResult.changes.map((c,i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',color:'#b45309'}}>
                        <AlertCircle size={16}/> {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ela' && (
              <div style={cardStyle}>
                <h3 style={{marginTop:0}}>📊 Error Level Analysis (ELA)</h3>
                <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>ELA detects edited regions by analyzing compression inconsistencies.</p>
                <div style={{textAlign:'center',margin:'16px 0'}}>
                  <div style={{fontSize:'48px',fontWeight:'800',color: verificationResult.ela.tamperingScore>50?'#ef4444':verificationResult.ela.tamperingScore>25?'#f59e0b':'#10b981'}}>
                    {verificationResult.ela.tamperingScore}
                  </div>
                  <div style={{fontSize:'14px',color:'#6b7280'}}>Tampering Score / 100</div>
                </div>
                {[['ELA Verdict',verificationResult.ela.verdict],['High Diff Pixels',verificationResult.ela.highDiffRatio+'%'],['Avg Pixel Diff',verificationResult.ela.avgDiff]].map(([l,v]) => (
                  <div key={l} style={rowStyle}><span style={labelStyle}>{l}</span><span style={{...valueStyle,color:l==='ELA Verdict'?(verificationResult.ela.tamperingScore>50?'#ef4444':'#10b981'):'#1f2937',fontWeight:l==='ELA Verdict'?'700':'400'}}>{v}</span></div>
                ))}
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={cardStyle}>
                <h3 style={{marginTop:0}}>🤖 AI Image Detection</h3>
                <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>Analyzes pixel patterns to detect AI-generated images.</p>
                <div style={{textAlign:'center',margin:'20px 0'}}>
                  <div style={{fontSize:'56px',fontWeight:'800',color:verificationResult.ai.aiProbability>70?'#ef4444':verificationResult.ai.aiProbability>40?'#f59e0b':'#10b981'}}>
                    {verificationResult.ai.aiProbability}%
                  </div>
                  <div style={{fontSize:'14px',color:'#6b7280',marginBottom:'8px'}}>AI Probability</div>
                  <span style={{padding:'4px 16px',borderRadius:'20px',background:verificationResult.ai.aiProbability>70?'#fee2e2':verificationResult.ai.aiProbability>40?'#fef3c7':'#d1fae5',color:verificationResult.ai.aiProbability>70?'#991b1b':verificationResult.ai.aiProbability>40?'#92400e':'#065f46',fontWeight:'700'}}>
                    {verificationResult.ai.verdict}
                  </span>
                </div>
                {[['Risk Level',verificationResult.ai.label],['Uniform Pixels',verificationResult.ai.uniformRatio+'%'],['Avg Noise Level',verificationResult.ai.avgNoise]].map(([l,v]) => (
                  <div key={l} style={rowStyle}><span style={labelStyle}>{l}</span><span style={valueStyle}>{v}</span></div>
                ))}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div style={cardStyle}>
                <h3 style={{marginTop:0}}>🗂️ Metadata Inspection</h3>
                {[
                  ['File Type',       verificationResult.metadata.fileType],
                  ['File Size',       verificationResult.metadata.fileSize],
                  ['Dimensions',      verificationResult.metadata.dimensions],
                  ['Size Ratio',      verificationResult.metadata.sizeRatio],
                  ['Editing Software',verificationResult.metadata.editingSoftware?.length>0?verificationResult.metadata.editingSoftware.join(', '):'✅ None detected'],
                  ['Metadata Status', verificationResult.metadata.verdict],
                ].map(([l,v]) => (
                  <div key={l} style={rowStyle}><span style={labelStyle}>{l}</span><span style={{...valueStyle,color:l==='Metadata Status'?(verificationResult.metadata.metadataClean?'#10b981':'#ef4444'):'#1f2937',fontWeight:l==='Metadata Status'?'700':'400'}}>{v}</span></div>
                ))}
              </div>
            )}

            {activeTab === 'report' && (
              <div style={cardStyle}>
                <h3 style={{marginTop:0}}>📄 Forensic Report Summary</h3>
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'16px',marginBottom:'16px'}}>
                  {[
                    ['Owner UUID',       verificationResult.uuid||'—'],
                    ['Owner Name',       verificationResult.ownerInfo?.ownerName||verificationResult.asset?.userName||'—'],
                    ['Watermark Status', verificationResult.hasUUID?'✅ Valid':'❌ Not found'],
                    ['ELA Analysis',     verificationResult.ela?.verdict],
                    ['AI Detection',     verificationResult.ai?.aiProbability+'% — '+verificationResult.ai?.verdict],
                    ['Metadata',         verificationResult.metadata?.verdict],
                    ['Match Confidence', verificationResult.confidence+'%'],
                  ].map(([l,v]) => (
                    <div key={l} style={rowStyle}><span style={labelStyle}>{l}</span><span style={valueStyle}>{v}</span></div>
                  ))}
                </div>
                <div style={{padding:'12px 16px',borderRadius:'8px',background:verificationResult.ela?.tamperingScore>50||verificationResult.ai?.aiProbability>70?'#fee2e2':'#d1fae5',marginBottom:'16px',fontWeight:'600',fontSize:'14px'}}>
                  <strong>Conclusion: </strong>
                  {verificationResult.matchFound?'✅ Image ownership verified. ':'❓ Owner not verified. '}
                  {verificationResult.ela?.tamperingScore>50?'⚠️ Possible tampering detected. ':'✅ No tampering detected. '}
                  {verificationResult.ai?.aiProbability>70?'🤖 Likely AI generated.':'📷 Likely authentic photo.'}
                </div>
                <button onClick={downloadReport} style={{width:'100%',padding:'12px',background:'#6366f1',color:'white',border:'none',borderRadius:'8px',fontSize:'15px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                  <FileText size={18}/> Download Forensic Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyPage;