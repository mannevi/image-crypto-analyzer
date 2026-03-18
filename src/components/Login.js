import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

// ─── Capacitor native biometric (APK only) ───────────────────────────────────
// Multiple ways to detect Capacitor — check all of them
const isCapacitor = () => {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()) return true;
    if (window.Capacitor && window.Capacitor.platform &&
        window.Capacitor.platform !== 'web') return true;
    if (window.cordova) return true;
    return false;
  } catch {
    return false;
  }
};

// Detect if running on a mobile device (regardless of Capacitor)
const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// @aparajita/capacitor-biometric-auth — supports Capacitor 8
const getBiometricAuth = async () => {
  if (!isCapacitor()) return null;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    return BiometricAuth;
  } catch (e) {
    console.log('BiometricAuth plugin not found:', e.message);
    return null;
  }
};

// ─── WebAuthn helpers ────────────────────────────────────────────────────────

// base64 → Uint8Array (needed to pass stored credential ID back to WebAuthn)
const base64ToUint8 = (base64) => {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// ─── Component ───────────────────────────────────────────────────────────────

function Login({ onLogin }) {
  const [isAdmin,            setIsAdmin]            = useState(false);
  const [formData,           setFormData]           = useState({ email: '', username: '', password: '' });
  const [error,              setError]              = useState('');
  const [loading,            setLoading]            = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled,  setBiometricEnrolled]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkBiometric();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check if biometric is available AND enrolled on this device ────────────
  const checkBiometric = async () => {
    try {
      const savedToken   = localStorage.getItem('savedToken');
      const savedUser    = localStorage.getItem('savedUser');
      const enrolled     = localStorage.getItem('biometricEnrolled') === 'true';
      const credentialId = localStorage.getItem('biometricCredentialId');

      // Delay to ensure Capacitor bridge is fully ready
      await new Promise(r => setTimeout(r, 800));

      const cap     = isCapacitor();
      const mobile  = isMobileDevice();

      console.log('🔍 checkBiometric — isCapacitor:', cap, '| isMobile:', mobile);
      console.log('🔍 window.Capacitor:', !!window.Capacitor);
      console.log('🔍 savedToken:', !!savedToken, '| savedUser:', !!savedUser);

      if (cap) {
        // ── Native APK via Capacitor ─────────────────────────────────────
        const BiometricAuth = await getBiometricAuth();
        console.log('🔍 BiometricAuth plugin:', !!BiometricAuth);

        if (!BiometricAuth) {
          // Plugin missing — but still on mobile so show button anyway
          // using WebAuthn as fallback
          if (mobile) {
            setBiometricAvailable(true);
            setBiometricEnrolled(!!(savedToken && savedUser));
          }
          return;
        }

        try {
          const result = await BiometricAuth.checkBiometry();
          console.log('🔍 checkBiometry result:', JSON.stringify(result));

          // Show button if biometry available OR if it's just not enrolled yet
          // (result.isAvailable may be false if no fingerprints enrolled in OS)
          if (result.isAvailable) {
            setBiometricAvailable(true);
            const hasSession = !!(savedToken && savedUser);
            setBiometricEnrolled(hasSession);
            if (hasSession) handleBiometricLogin();
          } else {
            console.log('🔍 Biometry unavailable, reason:', result.reason,
                        '| errorCode:', result.errorCode);
            // Still show button — let authenticate() give proper error
            setBiometricAvailable(true);
            setBiometricEnrolled(false);
          }
        } catch (e) {
          console.log('🔍 checkBiometry threw:', e.message);
          // Show button anyway on mobile
          setBiometricAvailable(true);
          setBiometricEnrolled(!!(savedToken && savedUser));
        }

      } else if (mobile) {
        // ── Mobile device but Capacitor not detected ─────────────────────
        // Could be WebView where window.Capacitor not injected yet
        // Show button and use WebAuthn as fallback
        console.log('🔍 Mobile detected but Capacitor not found — showing button anyway');
        setBiometricAvailable(true);
        setBiometricEnrolled(!!(savedToken && savedUser && enrolled));

      } else {
        // ── Web browser (desktop/laptop) — use WebAuthn ──────────────────
        if (!window.PublicKeyCredential) return;
        const available = await window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable();
        console.log('🔍 WebAuthn available:', available);
        if (available) {
          setBiometricAvailable(true);
          const isEnrolled = enrolled && !!credentialId && !!savedToken && !!savedUser;
          setBiometricEnrolled(isEnrolled);
          if (isEnrolled) handleBiometricLogin();
        }
      }
    } catch (e) {
      console.log('🔍 checkBiometric outer error:', e.message);
      // On any error — if mobile, still show the button
      if (isMobileDevice()) {
        setBiometricAvailable(true);
        setBiometricEnrolled(false);
      }
    }
  };

  // ── Biometric Login ────────────────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    const savedToken = localStorage.getItem('savedToken');
    const savedUser  = JSON.parse(localStorage.getItem('savedUser') || '{}');

    if (!savedToken || !savedUser?.id) {
      setError('Please login with password first to enable biometrics.');
      return;
    }

    try {
      const cap = isCapacitor();
      console.log('🔍 handleBiometricLogin — isCapacitor:', cap);

      if (cap) {
        // ── Native APK fingerprint ────────────────────────────────────────
        const BiometricAuth = await getBiometricAuth();
        if (!BiometricAuth) throw new Error('Plugin not available');

        await BiometricAuth.authenticate({
          reason              : 'Login to Image Forensics App',
          cancelTitle         : 'Cancel',
          allowDeviceCredential: true,
          iosFallbackTitle    : 'Use PIN'
        });

        // Passed — restore session
        localStorage.setItem('userUUID', savedUser.id);
        onLogin(savedUser, savedToken);
        navigate(savedUser.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');

      } else {
        // ── Web / WebAuthn fallback ───────────────────────────────────────
        const credentialId = localStorage.getItem('biometricCredentialId');

        const publicKeyOptions = {
          challenge       : crypto.getRandomValues(new Uint8Array(32)),
          rpId            : window.location.hostname,
          userVerification: 'required',
          timeout         : 60000
        };

        if (credentialId) {
          publicKeyOptions.allowCredentials = [{
            id        : base64ToUint8(credentialId),
            type      : 'public-key',
            transports: ['internal']
          }];
        }

        const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });

        if (credential) {
          localStorage.setItem('userUUID', savedUser.id);
          onLogin(savedUser, savedToken);
          navigate(savedUser.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
        }
      }
    } catch (e) {
      console.log('🔍 biometricLogin error:', e.name, e.message);
      if (
        e.name === 'NotAllowedError' ||
        e.message?.includes('cancelled') ||
        e.message?.includes('cancel') ||
        e.message?.includes('Cancel') ||
        e.code === 10  // BiometricAuth cancel code
      ) {
        setError('Biometric cancelled. Please use your password.');
      } else if (e.name === 'InvalidStateError') {
        setError('No biometric registered. Please login with password first.');
      } else if (e.name === 'SecurityError') {
        setError('Biometric requires HTTPS. Please use your password.');
      } else {
        // Final fallback — token still valid, just restore session
        if (savedToken && savedUser?.id) {
          localStorage.setItem('userUUID', savedUser.id);
          onLogin(savedUser, savedToken);
          navigate(savedUser.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
        } else {
          setError('Biometric failed. Please login with password.');
        }
      }
    }
  };

  // ── Password Login ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isAdmin ? '/auth/admin-login' : '/auth/login';
      const body     = isAdmin
        ? { username: formData.username, password: formData.password }
        : { email: formData.email,       password: formData.password };

      const res  = await fetch(`https://pinit-backend.onrender.com${endpoint}`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Invalid credentials');
        return;
      }

      // ── Save everything needed for future biometric login ───────────────
      localStorage.setItem('savedToken', data.access_token);
      localStorage.setItem('savedUser',  JSON.stringify(data.user));
      localStorage.setItem('userUUID',   data.user.id);
      localStorage.setItem(`lastLogin_${data.user.email}`, new Date().toISOString());

      // ── If biometric is available but not enrolled yet — prompt to enroll ─
      const credentialId = localStorage.getItem('biometricCredentialId');
      const enrolled     = localStorage.getItem('biometricEnrolled') === 'true';
      if (biometricAvailable && !enrolled && !credentialId && !isAdmin) {
        const wantEnroll = window.confirm(
          '👆 Would you like to set up fingerprint login for next time?\n\n' +
          'This will let you login instantly without a password.'
        );
        if (wantEnroll) {
          await enrollBiometricAfterLogin(data.user);
        }
      }

      onLogin(data.user, data.access_token);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');

    } catch (err) {
      setError('Cannot connect to server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Enroll biometric after successful password login ───────────────────────
  const enrollBiometricAfterLogin = async (user) => {
    try {
      if (isCapacitor()) {
        // ── APK: biometric already set up in Android OS settings ────────────
        // No WebAuthn credential needed — just mark as enrolled
        // @aparajita/capacitor-biometric-auth handles everything natively
        localStorage.setItem('biometricEnrolled', 'true');
        localStorage.setItem('biometricEmail',    user.email || '');
        setBiometricEnrolled(true);
        alert('✅ Fingerprint enabled! Next time you can login with just your fingerprint.');
      } else {
        // ── Web: use WebAuthn credential creation ────────────────────────────
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: {
              name: 'Image Forensics App',
              id  : window.location.hostname
            },
            user: {
              id         : new TextEncoder().encode(user.email || user.id),
              name       : user.email || user.id,
              displayName: user.name  || user.username || 'User'
            },
            pubKeyCredParams: [
              { alg: -7,   type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification       : 'required',
              requireResidentKey     : false
            },
            timeout: 60000
          }
        });

        if (credential) {
          const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem('biometricCredentialId', credId);
          localStorage.setItem('biometricEmail',        user.email);
          localStorage.setItem('biometricEnrolled',     'true');
          setBiometricEnrolled(true);
          alert('✅ Fingerprint registered! Next time you can login with just your fingerprint.');
        }
      }
    } catch (e) {
      console.log('Biometric enrollment skipped:', e.message);
      // Non-critical — just skip silently
    }
  };

  const handleTabSwitch = (adminTab) => {
    setIsAdmin(adminTab);
    setFormData({ email: '', username: '', password: '' });
    setError('');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Image Forensics App</h1>
          <p>Analyze and detect image manipulations</p>
        </div>

        <div className="tabs">
          <button className={`tab ${!isAdmin ? 'active' : ''}`} onClick={() => handleTabSwitch(false)}>
            User Login
          </button>
          <button className={`tab ${isAdmin ? 'active' : ''}`} onClick={() => handleTabSwitch(true)}>
            Admin Login
          </button>
        </div>

        {/* ── Biometric Button — only for users, only when available ───────── */}
        {biometricAvailable && !isAdmin && (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={handleBiometricLogin}
              style={{
                width         : '100%',
                padding       : '14px',
                background    : biometricEnrolled
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'linear-gradient(135deg, #64748b, #475569)',
                color         : 'white',
                border        : 'none',
                borderRadius  : '8px',
                fontSize      : '16px',
                fontWeight    : '600',
                cursor        : 'pointer',
                display       : 'flex',
                alignItems    : 'center',
                justifyContent: 'center',
                gap           : '8px',
                boxShadow     : '0 4px 12px rgba(99,102,241,0.3)'
              }}
            >
              👆 {biometricEnrolled ? 'Login with Fingerprint / Face ID' : 'Use Biometric (login with password first)'}
            </button>

            {biometricEnrolled && (
              <p style={{
                textAlign  : 'center',
                fontSize   : '12px',
                color      : '#6b7280',
                marginTop  : '6px',
                marginBottom: '0'
              }}>
                Your UUID will auto-load and embed into every image
              </p>
            )}
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        {biometricAvailable && !isAdmin && (
          <div style={{
            display       : 'flex',
            alignItems    : 'center',
            gap           : '12px',
            marginBottom  : '16px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>or use password</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>
        )}

        {/* ── Password Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          {isAdmin ? (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input type="text" id="username" name="username" value={formData.username}
                onChange={handleChange} placeholder="Enter admin username" required />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="Enter your email" required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={formData.password}
              onChange={handleChange} placeholder="Enter your password" required />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {!isAdmin && (
            <div className="register-link">
              Don't have an account? <Link to="/register">Register here</Link>
            </div>
          )}
          {isAdmin && (
            <div className="admin-info">
              <small>Contact admin for credentials</small>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}

export default Login;