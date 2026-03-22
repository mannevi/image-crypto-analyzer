import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

// ─── Capacitor detection ──────────────────────────────────────────────────────
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

const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// ─── Custom native BiometricPlugin (APK only) ─────────────────────────────────
const getNativeBiometric = () => {
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BiometricPlugin) {
      return window.Capacitor.Plugins.BiometricPlugin;
    }
    return null;
  } catch (e) {
    return null;
  }
};

// ─── WebAuthn helpers ─────────────────────────────────────────────────────────
const base64ToUint8 = (base64) => {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// ─── Component ────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [formData,         setFormData]         = useState({ email: '', username: '', password: '' });
  const [error,            setError]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(isMobileDevice());
  const [biometricEnrolled,  setBiometricEnrolled]  = useState(
    localStorage.getItem('biometricEnrolled') === 'true'
  );

  const navigate = useNavigate();

  useEffect(() => {
    checkBiometric();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check biometric availability ──────────────────────────────────────────
  const checkBiometric = async () => {
    try {
      const enrolled     = localStorage.getItem('biometricEnrolled') === 'true';
      const credentialId = localStorage.getItem('biometricCredentialId');

      await new Promise(r => setTimeout(r, 800));

      if (isCapacitor()) {
        // ── APK: use custom native plugin ────────────────────────────
        const plugin = getNativeBiometric();
        if (plugin) {
          try {
            const result = await plugin.isAvailable();
            console.log('🔍 Native isAvailable:', result.isAvailable);
            setBiometricAvailable(result.isAvailable);
          } catch (e) {
            console.log('🔍 isAvailable error:', e.message);
            setBiometricAvailable(true);
          }
        } else {
          console.log('🔍 Custom plugin not found');
          setBiometricAvailable(true);
        }
        setBiometricEnrolled(enrolled);

      } else {
        // ── Web: WebAuthn ─────────────────────────────────────────────
        if (!window.PublicKeyCredential) { setBiometricAvailable(false); return; }
        const available = await window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available || isMobileDevice());
        setBiometricEnrolled(available && enrolled && !!credentialId);
      }
    } catch (e) {
      console.log('🔍 checkBiometric error:', e.message);
      if (isMobileDevice()) setBiometricAvailable(true);
    }
  };

  // ── Biometric Login ───────────────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    setError('');
    const savedToken = localStorage.getItem('savedToken');
    const savedUser  = JSON.parse(localStorage.getItem('savedUser') || '{}');

    if (!savedToken || !savedUser?.id) {
      setError('Please login with password first to enable biometrics.');
      return;
    }

    const enrolled = localStorage.getItem('biometricEnrolled') === 'true';
    if (!enrolled) {
      setError('Please login with password first to set up biometrics.');
      return;
    }

    setBiometricLoading(true);

    try {
      if (isCapacitor()) {
        // ── APK: custom native BiometricPrompt ────────────────────────
        const plugin = getNativeBiometric();
        if (!plugin) {
          setError('Biometric plugin not ready. Please use password.');
          return;
        }

        // This calls the exact same Java BiometricPrompt as reference app
        await plugin.authenticate();

        // Auth passed!
        localStorage.setItem('userUUID', savedUser.id);
        onLogin(savedUser, savedToken);
        navigate(savedUser.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');

      } else {
        // ── Web: WebAuthn ─────────────────────────────────────────────
        const credentialId = localStorage.getItem('biometricCredentialId');
        if (!credentialId) {
          setError('No biometric registered. Please login with password first.');
          return;
        }

        const publicKeyOptions = {
          challenge       : crypto.getRandomValues(new Uint8Array(32)),
          rpId            : window.location.hostname,
          userVerification: 'required',
          timeout         : 60000,
          allowCredentials: [{
            id        : base64ToUint8(credentialId),
            type      : 'public-key',
            transports: ['internal']
          }]
        };

        const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });

        if (credential) {
          localStorage.setItem('userUUID', savedUser.id);
          onLogin(savedUser, savedToken);
          navigate(savedUser.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
        }
      }

    } catch (e) {
      console.log('🔍 biometricLogin error:', e.name, e.message, 'code:', e.code);
      if (
        e.message?.includes('cancel') ||
        e.message?.includes('Cancel') ||
        e.message?.includes('10') ||
        e.name === 'NotAllowedError'
      ) {
        setError('Biometric cancelled. Please use your password.');
      } else {
        setError(`Biometric error: ${e.message || e.name}. Please use your password.`);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── Password Login ────────────────────────────────────────────────────────
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

      localStorage.setItem('savedToken', data.access_token);
      localStorage.setItem('savedUser',  JSON.stringify(data.user));
      localStorage.setItem('userUUID',   data.user.id);
      localStorage.setItem(`lastLogin_${data.user.email}`, new Date().toISOString());

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

  // ── Enroll biometric ──────────────────────────────────────────────────────
  const enrollBiometricAfterLogin = async (user) => {
    try {
      if (isCapacitor()) {
        // APK: verify fingerprint once at enrollment to confirm it works
        const plugin = getNativeBiometric();
        if (plugin) {
          await plugin.authenticate(); // scan once to confirm
        }
        localStorage.setItem('biometricEnrolled', 'true');
        localStorage.setItem('biometricEmail',    user.email || '');
        setBiometricEnrolled(true);
        alert('✅ Fingerprint enabled! Next time tap the button to login instantly.');
      } else {
        // Web: WebAuthn
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
    }
  };

  const handleTabSwitch = (adminTab) => {
    setIsAdmin(adminTab);
    setFormData({ email: '', username: '', password: '' });
    setError('');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
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

        {/* Biometric Button */}
        {biometricAvailable && !isAdmin && (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
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
                cursor        : biometricLoading ? 'wait' : 'pointer',
                display       : 'flex',
                alignItems    : 'center',
                justifyContent: 'center',
                gap           : '8px',
                opacity       : biometricLoading ? 0.7 : 1,
                boxShadow     : '0 4px 12px rgba(99,102,241,0.3)'
              }}
            >
              {biometricLoading
                ? '⏳ Verifying...'
                : `👆 ${biometricEnrolled
                    ? 'Login with Fingerprint / Face ID'
                    : 'Use Biometric (login with password first)'}`
              }
            </button>

            {biometricEnrolled && !biometricLoading && (
              <p style={{
                textAlign   : 'center',
                fontSize    : '12px',
                color       : '#6b7280',
                marginTop   : '6px',
                marginBottom: '0'
              }}>
                Your UUID will auto-load and embed into every image
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        {biometricAvailable && !isAdmin && (
          <div style={{
            display     : 'flex',
            alignItems  : 'center',
            gap         : '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>or use password</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>
        )}

        {/* Password Form */}
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