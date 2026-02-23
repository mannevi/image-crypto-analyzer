import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield, Hash, Fingerprint, Cpu, Link, Clock, Wrench, MapPin } from 'lucide-react';
import './PublicVerifyPage.css';

const formatTS = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

function PublicVerifyPage() {
  const [report, setReport] = useState(null);
  const [error, setError]   = useState(null);

  useEffect(() => {
    try {
      const params  = new URLSearchParams(window.location.search);
      const encoded = params.get('data');
      if (!encoded) throw new Error('No report data found in this link.');
      const decoded = decodeURIComponent(escape(atob(encoded)));
      const parsed  = JSON.parse(decoded);
      if (!parsed.v || !parsed.assetId) throw new Error('Invalid report format.');
      setReport(parsed);
    } catch (e) {
      setError(e.message || 'Failed to load verification report.');
    }
  }, []);

  if (error) return (
    <div className="pvp-error-page">
      <div className="pvp-error-box">
        <XCircle size={48} className="err-icon" />
        <h2>Invalid Verification Link</h2>
        <p>{error}</p>
        <p className="err-hint">Make sure you copied the full link from the Track Asset page.</p>
      </div>
    </div>
  );

  if (!report) return (
    <div className="pvp-loading">
      <div className="pvp-spinner" />
      <p>Loading verification report…</p>
    </div>
  );

  const isTampered = report.isTampered;
  const changes    = report.changes || [];

  return (
    <div className="pvp-root">
      {/* Top bar */}
      <div className="pvp-topbar">
        <div className="pvp-topbar-inner">
          <div className="pvp-logo">
            <Shield size={22} />
            <span>PINIT</span>
          </div>
          <div className="pvp-topbar-label">Public Verification Report</div>
        </div>
      </div>

      <div className="pvp-container">
        {/* Hero verdict */}
        <div className={`pvp-verdict ${isTampered ? 'tampered' : 'clean'}`}>
          <div className="pvp-verdict-icon">
            {isTampered ? <AlertTriangle size={44} /> : <CheckCircle size={44} />}
          </div>
          <div className="pvp-verdict-body">
            <h1>{isTampered ? 'Tampering Detected' : 'Image Verified — No Significant Changes'}</h1>
            <p className="pvp-verdict-sub">
              {report.visualVerdict && <strong>{report.visualVerdict}</strong>}
              {report.visualVerdict && ' · '}
              Similarity Score: <strong>{report.confidence}%</strong>
              &nbsp;·&nbsp;
              Compared: {report.comparedAt ? formatTS(report.comparedAt) : 'Unknown'}
            </p>
          </div>
          <div className="pvp-confidence-badge">{report.confidence}%</div>
        </div>

        {/* Similarity bar */}
        <div className="pvp-sim-bar-wrap">
          <div className="pvp-sim-bar-track">
            <div
              className={`pvp-sim-bar-fill ${report.confidence >= 80 ? 'high' : report.confidence >= 50 ? 'mid' : 'low'}`}
              style={{ width: `${report.confidence}%` }}
            />
          </div>
          <div className="pvp-sim-labels"><span>0%</span><span>Visual Similarity</span><span>100%</span></div>
        </div>

        {/* ── Forensic meta strip ──────────────────────────────────────────── */}
        <div className="pvp-forensic-strip">
          <div className="pvp-fmi">
            <Clock size={15} className="pvp-fmi-icon original" />
            <div>
              <div className="pvp-fmi-label">Original Capture Time</div>
              <div className="pvp-fmi-value">{report.originalCaptureTime ? formatTS(report.originalCaptureTime) : <span className="pvp-fmi-na">Not recorded</span>}</div>
            </div>
          </div>
          <div className="pvp-fmi">
            <Clock size={15} className="pvp-fmi-icon modified" />
            <div>
              <div className="pvp-fmi-label">Modified File Time</div>
              <div className="pvp-fmi-value">{report.modifiedFileTime ? formatTS(report.modifiedFileTime) : <span className="pvp-fmi-na">—</span>}</div>
            </div>
          </div>
          <div className="pvp-fmi">
            <Wrench size={15} className="pvp-fmi-icon tool" />
            <div>
              <div className="pvp-fmi-label">Editing Tool</div>
              <div className="pvp-fmi-value">
                {report.editingTool
                  ? <span className="pvp-tool-tag">{report.editingTool}</span>
                  : <span className="pvp-fmi-na">Not detected (PNG/no EXIF)</span>}
              </div>
            </div>
          </div>
          {(report.pixelChangedPct !== undefined && report.pixelChangedPct !== null) && (
            <div className="pvp-fmi">
              <MapPin size={15} className="pvp-fmi-icon pixel" />
              <div>
                <div className="pvp-fmi-label">Pixels Changed</div>
                <div className="pvp-fmi-value">{report.pixelChangedPct}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Two-column cards */}
        <div className="pvp-two-col">
          {/* Original Asset */}
          <div className="pvp-card pvp-original">
            <div className="pvp-card-head">
              <Shield size={16} /> Original Asset
              {report.certId && <span className="pvp-verified-badge"><CheckCircle size={12} /> Blockchain Verified</span>}
            </div>
            <div className="pvp-rows">
              <PRow label="Asset ID"         value={report.assetId} mono />
              <PRow label="Certificate ID"   value={report.certId || '—'} mono />
              <PRow label="Registered Owner" value={report.owner || '—'} />
              <PRow label="Registered"       value={report.registered ? formatTS(report.registered) : '—'} />
              <PRow label="Capture Time"     value={report.originalCaptureTime ? formatTS(report.originalCaptureTime) : '—'} />
              <PRow label="Resolution"       value={report.origResolution || '—'} />
              {report.origHash       && <PRow label="SHA-256"           value={report.origHash.substring(0, 24) + '…'} mono />}
              {report.origFingerprint && <PRow label="Visual Fingerprint" value={report.origFingerprint} mono />}
              {report.blockchainAnchor && <PRow label="Blockchain Anchor" value={report.blockchainAnchor.substring(0, 22) + '…'} mono />}
            </div>
          </div>

          {/* Submitted Version */}
          <div className={`pvp-card pvp-modified ${isTampered ? 'is-tampered' : 'is-clean'}`}>
            <div className="pvp-card-head">
              {isTampered ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              Submitted Version
              <span className={`pvp-status-tag ${isTampered ? 'tampered' : 'clean'}`}>
                {isTampered ? 'Altered Derivative' : 'Authentic'}
              </span>
            </div>
            <div className="pvp-rows">
              <PRow label="Resolution"       value={report.uploadedResolution || '—'} />
              <PRow label="File Size"        value={report.uploadedSize || '—'} />
              {report.modifiedFileTime && <PRow label="File Last Modified" value={formatTS(report.modifiedFileTime)} />}
              {report.editingTool      && <PRow label="Editing Tool"       value={report.editingTool} />}
              {report.uploadedFingerprint && <PRow label="Visual Fingerprint" value={report.uploadedFingerprint} mono />}
              <PRow label="pHash Similarity" value={report.pHashSim !== null && report.pHashSim !== undefined ? report.pHashSim + '%' : '—'} />
              {(report.pixelChangedPct !== undefined && report.pixelChangedPct !== null) &&
                <PRow label="Pixels Changed" value={report.pixelChangedPct + '%'} />}
              <PRow label="Compared At"      value={report.comparedAt ? formatTS(report.comparedAt) : '—'} />
              <PRow label="Verdict"          value={isTampered ? 'TAMPERED' : 'CLEAN'}
                    valueClass={isTampered ? 'danger' : 'success'} />
            </div>
          </div>
        </div>

        {/* Tampering Summary with category badges */}
        <div className="pvp-card pvp-changes-card">
          <div className="pvp-card-head"><AlertTriangle size={16} /> Complete Tampering Analysis</div>
          {changes.length === 0 ? (
            <div className="pvp-no-changes">
              <CheckCircle size={16} /> No modifications detected — image matches the vault original
            </div>
          ) : (
            <ul className="pvp-changes-list">
              {changes.map((c, i) => (
                <li key={i} className={`pvp-change-item ${c.type}`}>
                  <span className="pvp-change-dot" />
                  <div>
                    {c.category && <span className="pvp-change-category">{c.category}</span>}
                    <span>{c.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>



        {/* Vault security indicators */}
        {(report.origHash || report.origFingerprint || report.blockchainAnchor) && (
          <div className="pvp-card pvp-vault-card">
            <div className="pvp-card-head"><Cpu size={16} /> Vault Security Indicators</div>
            <div className="pvp-vault-chips">
              {report.origHash && (
                <div className="pvp-vault-item">
                  <Hash size={14} />
                  <div>
                    <div className="pvp-vault-label">SHA-256 File Hash</div>
                    <div className="pvp-vault-value mono">{report.origHash}</div>
                  </div>
                </div>
              )}
              {report.origFingerprint && (
                <div className="pvp-vault-item">
                  <Fingerprint size={14} />
                  <div>
                    <div className="pvp-vault-label">Perceptual Fingerprint (pHash)</div>
                    <div className="pvp-vault-value mono">{report.origFingerprint}</div>
                  </div>
                </div>
              )}
              {report.blockchainAnchor && (
                <div className="pvp-vault-item">
                  <Cpu size={14} />
                  <div>
                    <div className="pvp-vault-label">Blockchain Anchor</div>
                    <div className="pvp-vault-value mono">{report.blockchainAnchor}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pvp-footer">
          <Link size={14} /> Generated by PINIT · Report is cryptographically linked to the vault asset
          <span className="pvp-ts">{report.comparedAt ? new Date(report.comparedAt).toISOString() : ''}</span>
        </div>
      </div>
    </div>
  );
}

function PRow({ label, value, mono, valueClass }) {
  return (
    <div className="pvp-row">
      <span className="pvp-row-label">{label}</span>
      <span className={`pvp-row-value ${mono ? 'mono' : ''} ${valueClass || ''}`}>{value}</span>
    </div>
  );
}

export default PublicVerifyPage;