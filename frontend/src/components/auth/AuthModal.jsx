import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Alert from '../common/Alert';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, authModalTab } = useAuth();
  const isAdminLogin = authModalTab === 'admin';
  const navigate = useNavigate();

  // isNewUser: false for sign in, true when clicking "Don't have an account? Create one here"
  const [isNewUser, setIsNewUser] = useState(false);

  // step: 'input' | 'otp' | 'password'
  const [step, setStep] = useState('input');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (isAuthModalOpen) {
      setIsNewUser(false);
      setStep(authModalTab === 'admin' ? 'password' : 'input');
      setEmail('');
      setFullName('');
      setOtp('');
      setPassword('');
      setError('');
      setInfoMessage(
        authModalTab === 'admin'
          ? 'Administrator Portal. Public registration is disabled.'
          : ''
      );
    }
  }, [isAuthModalOpen, authModalTab]);

  if (!isAuthModalOpen) return null;

  // Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    if (isNewUser && !fullName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      await authApi.sendOtp(email, isNewUser ? 'register' : 'login');
      setStep('otp');
      setInfoMessage(`Code sent to ${email}. Please check your inbox and spam folder.`);
    } catch (err) {
      console.error('Error sending OTP:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || '';
      if (!isNewUser && (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('register') || err.response?.status === 400)) {
        setError('Account not found. Please click "Create One Here" below to register.');
      } else if (isNewUser && (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('sign in'))) {
        setError('Email is already registered. Please click "Sign In" below.');
      } else {
        setError(errMsg || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isNewUser) {
        const data = await authApi.register({
          email: email.trim(),
          otp: otp.trim(),
          fullName: fullName.trim()
        });
        login(data);
      } else {
        const data = await authApi.loginWithOtp({
          email: email.trim(),
          otp: otp.trim()
        });
        login(data);
        if (data.user?.role === 'ROLE_ADMIN') {
          navigate('/admin');
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || '';
      if (
        !isNewUser &&
        (errMsg.toLowerCase().includes('not found') ||
          errMsg.toLowerCase().includes('register') ||
          err.response?.status === 404)
      ) {
        setIsNewUser(true);
        setStep('input');
        setInfoMessage('Account not found. Enter your name to create one.');
      } else {
        setError(errMsg || 'Invalid or expired OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password fallback
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await authApi.login({ email, password });
      login(data);
      if (data.user?.role === 'ROLE_ADMIN') {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-none animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm border border-neutral-900 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h3 className="font-black text-xs tracking-widest uppercase text-black">
            {isAdminLogin
              ? 'Administrator Sign In'
              : step === 'password'
              ? 'Password Sign In'
              : isNewUser
              ? 'Create Account'
              : 'Sign In'}
          </h3>
          <button
            onClick={closeAuthModal}
            className="p-1 text-neutral-400 hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && <Alert type="error" message={error} className="mb-4" onClose={() => setError('')} />}
          {infoMessage && <Alert type="info" message={infoMessage} className="mb-4" onClose={() => setInfoMessage('')} />}

          {/* STEP 1: Input (Email, and Name if creating account) */}
          {step === 'input' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {isNewUser && (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus={!isNewUser}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email || (isNewUser && !fullName.trim())}
                className="w-full py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center"
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Send OTP'}
              </button>

              {/* Minimal toggle links */}
              <div className="pt-3 text-center space-y-2 border-t border-neutral-100">
                {!isNewUser ? (
                  <>
                    <p className="text-xs text-neutral-500">Don't have an account?</p>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setInfoMessage('');
                        setIsNewUser(true);
                      }}
                      className="w-full py-2 px-3 border border-black bg-white hover:bg-neutral-100 text-black text-xs font-bold uppercase tracking-wider transition"
                    >
                      Create One Here
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setStep('password');
                      }}
                      className="text-[11px] text-neutral-400 hover:text-black uppercase tracking-wider block mx-auto pt-1 transition"
                    >
                      Password Login
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-neutral-500">Already have an account?</p>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setInfoMessage('');
                        setIsNewUser(false);
                      }}
                      className="w-full py-2 px-3 border border-black bg-white hover:bg-neutral-100 text-black text-xs font-bold uppercase tracking-wider transition"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                    OTP Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="text-[11px] text-neutral-500 hover:text-black flex items-center gap-1 uppercase tracking-wider"
                  >
                    <ArrowLeft className="w-3 h-3" /> Edit
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3 py-2.5 text-base font-mono tracking-widest text-center border border-neutral-300 focus:border-black focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center"
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Verify OTP'}
              </button>

              <p className="text-[11px] text-neutral-400 font-mono text-center pt-1">
                Did not receive the code? Please check your spam/junk folder.
              </p>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-[11px] text-neutral-500 hover:text-black uppercase tracking-wider transition"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Password Fallback */}
          {step === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center"
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Sign In'}
              </button>

              {isAdminLogin ? (
                <div className="pt-2 text-center">
                  <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                    Admin access is restricted to direct sign in
                  </p>
                </div>
              ) : (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep('input');
                    }}
                    className="text-[11px] text-neutral-500 hover:text-black uppercase tracking-wider font-medium transition"
                  >
                    ← Use OTP
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
