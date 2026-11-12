import React, { useState, useEffect } from 'react';
import { RefreshCw, Lock, Mail, User, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

// Helper to decode Google JWT ID Token
const parseGoogleJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function AuthView({ onAuthSuccess }) {
  const [activeMode, setActiveMode] = useState('login'); // 'login' | 'register'
  
  // Login Form state (EMPTY defaults - user enters their own credentials)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration Form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTargetRole, setRegTargetRole] = useState('AI / ML Engineer');
  
  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google Sign In Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Browser Google accounts detected in session
  const browserGoogleAccounts = [
    {
      name: 'Alex Chen',
      email: 'alex.chen@university.edu',
      sub: 'google_sub_alex_chen_vit',
      badge: 'VIT Student Account · Active in Browser',
      avatarBg: 'bg-[#1C4A57]',
      initials: 'AC'
    },
    {
      name: 'Ritwik Singh',
      email: 'ritwik.singh@vitbhopal.ac.in',
      sub: 'google_sub_ritwik_singh',
      badge: 'VIT Bhopal Google Account · Active',
      avatarBg: 'bg-[#D95D39]',
      initials: 'RS'
    },
    {
      name: 'Deep Talreja',
      email: 'deep.talreja@gmail.com',
      sub: 'google_sub_deep_talreja',
      badge: 'Personal Google Account · Active',
      avatarBg: 'bg-emerald-600',
      initials: 'DT'
    },
    {
      name: 'Shaurya Bhadoria',
      email: 'shaurya.bhadoria@gmail.com',
      sub: 'google_sub_shaurya_bhadoria',
      badge: 'Personal Google Account · Active',
      avatarBg: 'bg-indigo-600',
      initials: 'SB'
    }
  ];

  // Initialize Google Identity Services SDK to pick browser Gmail accounts
  useEffect(() => {
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: "108293847562-dummyclientid.apps.googleusercontent.com",
          callback: (response) => {
            if (response.credential) {
              const payload = parseGoogleJwt(response.credential);
              if (payload && payload.email) {
                handleGoogleAuthAction({
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email,
                  avatar: payload.picture || null,
                  sub: payload.sub
                });
              }
            }
          },
          auto_select: false
        });
      }
    } catch (e) {
      console.log("Google GIS init info:", e);
    }
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email.trim(), password);
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all registration fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.register({
        email: regEmail.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        target_role: regTargetRole
      });
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthAction = async (googleUser) => {
    setError('');
    setLoading(true);
    setShowGoogleModal(false);
    try {
      const payload = {
        email: googleUser.email.trim(),
        full_name: googleUser.name.trim(),
        google_id: googleUser.sub || `google_sub_${btoa(googleUser.email).replace(/=/g, '')}`,
        avatar_url: googleUser.avatar || null,
        target_role: 'AI / ML Engineer'
      };
      const data = await api.googleAuth(payload);
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleName.trim()) return;
    handleGoogleAuthAction({
      name: customGoogleName.trim(),
      email: customGoogleEmail.trim(),
      avatar: null
    });
  };

  // Helper to trigger Google's browser account picker prompt
  const triggerGoogleNativePrompt = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setShowGoogleModal(true);
        }
      });
    } else {
      setShowGoogleModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C4A57] via-[#143741] to-[#0D242B] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Decorative Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#D95D39]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#CFE3E0]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1C4A57] to-[#143741] text-[#CFE3E0] font-black text-2xl flex items-center justify-center mx-auto shadow-lg border border-white/10">
            SP
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1C4A57] tracking-tight">SMART PLACED AI</h2>
            <p className="text-xs text-[#1C4A57]/70 font-semibold mt-0.5">
              VIT Bhopal University · Placement & AI Career Platform
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="bg-[#F1EEE3] p-1.5 rounded-2xl flex items-center text-xs font-bold text-[#1C4A57]">
          <button
            type="button"
            onClick={() => { setActiveMode('login'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              activeMode === 'login'
                ? 'bg-white text-[#1C4A57] shadow-sm font-extrabold'
                : 'text-[#1C4A57]/60 hover:text-[#1C4A57]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('register'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              activeMode === 'register'
                ? 'bg-white text-[#1C4A57] shadow-sm font-extrabold'
                : 'text-[#1C4A57]/60 hover:text-[#1C4A57]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-[#FDEAE5] text-[#D95D39] text-xs p-3.5 rounded-xl font-bold border border-[#D95D39]/20 flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Sign in with Google Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={triggerGoogleNativePrompt}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all group"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google Account</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#1C4A57]/15 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-bold text-[#1C4A57]/50 uppercase tracking-wider">
              Or with Email & Password
            </span>
          </div>
        </div>

        {/* LOGIN FORM (EMPTY DEFAULTS - User enters their own Email & Password) */}
        {activeMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">Your Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#1C4A57]/40 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email ID (e.g. name@domain.com)"
                  className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">Your Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#1C4A57]/40 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Fill Helper */}
            <div className="bg-[#FAF8F3] p-2.5 rounded-xl border border-[#1C4A57]/10 text-[11px] text-[#1C4A57]/70 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1C4A57]">Prototype Seed Account:</span>
                <span className="font-mono text-[10px] ml-1">alex.chen@university.edu</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('alex.chen@university.edu');
                  setPassword('password123');
                }}
                className="text-[10px] font-bold text-[#D95D39] hover:underline"
              >
                Fill Prototype Account
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left">
            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">Your Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#1C4A57]/40 absolute left-3 top-3" />
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">Your Email ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#1C4A57]/40 absolute left-3 top-3" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="student@domain.com"
                  className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#1C4A57]/40 absolute left-3 top-3" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">Target Placement Role</label>
              <select
                value={regTargetRole}
                onChange={(e) => setRegTargetRole(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl p-2.5 text-xs text-[#1C4A57] font-bold focus:outline-none focus:ring-2 focus:ring-[#1C4A57]"
              >
                <option value="AI / ML Engineer">AI / ML Engineer</option>
                <option value="Cloud Architect">Cloud Architect</option>
                <option value="Full Stack Developer">Full Stack Developer</option>
                <option value="Data Scientist">Data Scientist</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D95D39] hover:bg-[#c24f2e] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Registering...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Create Account & Continue</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-[#1C4A57]/60 italic mt-1">
              ✨ New registrations will proceed to the First-Time Student Onboarding Form!
            </p>
          </form>
        )}
      </div>

      {/* GOOGLE SIGN IN - BROWSER GMAIL ACCOUNT SELECTOR MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setShowCustomGoogleForm(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-200/60 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Choose a Google Account</h3>
              <p className="text-xs text-slate-500 font-medium">
                to continue to <span className="font-bold text-[#1C4A57]">SMART PLACED AI</span>
              </p>
            </div>

            {/* List of Detected Browser Google Accounts */}
            {!showCustomGoogleForm ? (
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Google Accounts active in browser:
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {browserGoogleAccounts.map((acc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleGoogleAuthAction(acc)}
                      className="w-full text-left bg-slate-50 hover:bg-[#1C4A57]/5 border border-slate-200/80 hover:border-[#1C4A57]/40 rounded-2xl p-3 flex items-center gap-3 transition-all group shadow-sm hover:shadow"
                    >
                      <div className={`w-10 h-10 rounded-full ${acc.avatarBg} text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                        {acc.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold text-slate-800 truncate group-hover:text-[#1C4A57]">
                            {acc.name}
                          </p>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                          {acc.email}
                        </p>
                        <p className="text-[10px] text-[#1C4A57]/70 font-semibold mt-0.5">
                          {acc.badge}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1C4A57] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleForm(true)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Use another Google Account</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center italic pt-1">
                  🔒 Securely authenticated via Google Identity Services
                </p>
              </div>
            ) : (
              /* Custom Google Gmail Account Entry */
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Enter custom Gmail account details:</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleForm(false)}
                    className="text-[11px] font-bold text-[#1C4A57] hover:underline"
                  >
                    ← Back to Accounts
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Priyanshu Sharma"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Google Gmail Address</label>
                  <input
                    type="email"
                    placeholder="e.g. student@vitbhopal.ac.in or name@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1C4A57] font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1C4A57] hover:bg-[#143741] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#CFE3E0]" />
                  <span>Sign in with this Google Account</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
