import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const [step,     setStep]     = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [otp,      setOtp]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim())        { setError('Name is required'); return false; }
    if (!formData.email.trim())       { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Invalid email'); return false; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  // Step 1 — Register
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://pinit-backend.onrender.com/auth/register', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          username: formData.name,
          email   : formData.email,
          password: formData.password
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Registration failed'); return; }
      setStep(2);
    } catch {
      setError('Cannot connect to server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify OTP
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://pinit-backend.onrender.com/auth/verify-otp', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email: formData.email, code: otp })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Invalid OTP'); return; }
      setStep(3);
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    try {
      await fetch('https://pinit-backend.onrender.com/auth/resend-otp', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email: formData.email })
      });
      alert('New OTP sent to ' + formData.email);
    } catch {
      setError('Could not resend OTP.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">

        {step === 1 && (
          <>
            <div className="register-header">
              <h1>Create Account</h1>
              <p>Join Image Forensics App</p>
            </div>
            <form onSubmit={handleSubmit} className="register-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name}
                  onChange={handleChange} placeholder="Enter your full name" required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="Enter your email" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={formData.password}
                  onChange={handleChange} placeholder="Min 6 characters" required />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword}
                  onChange={handleChange} placeholder="Re-enter your password" required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating Account...' : 'Register'}
              </button>
              <div className="login-link">
                Already have an account? <Link to="/login">Login here</Link>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="register-header">
              <h1>Verify Email</h1>
              <p>Enter the 6-digit code sent to <strong>{formData.email}</strong></p>
            </div>
            <form onSubmit={handleOTPSubmit} className="register-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
              <div className="login-link">
                Didn't receive it?{' '}
                <span onClick={handleResendOTP} style={{ color: '#667eea', cursor: 'pointer', fontWeight: 600 }}>
                  Resend OTP
                </span>
              </div>
              <div className="login-link" style={{ marginTop: 8 }}>
                <span onClick={() => setStep(1)} style={{ color: '#999', cursor: 'pointer' }}>← Back</span>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <div className="register-header">
              <h1>All Done! ✅</h1>
              <p>Your account has been verified successfully.</p>
            </div>
            <div className="register-form" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 24, color: '#555' }}>
                You can now log in with your email and password.
              </p>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default Register;
