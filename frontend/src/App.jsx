import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardHub from './components/DashboardHub';
import ResumeAnalyzerView from './components/ResumeAnalyzerView';
import SkillAssessmentView from './components/SkillAssessmentView';
import RoadmapView from './components/RoadmapView';
import AdaptiveInterviewView from './components/AdaptiveInterviewView';
import CodingPracticeView from './components/CodingPracticeView';
import ProfileDashboard from './components/ProfileDashboard';
import OnboardingView from './components/OnboardingView';
import SmartPlacedLogo from './components/SmartPlacedLogo';
import { api } from './services/api';
import { usePreferences } from './context/PreferencesContext';
import { LANGUAGES } from './i18n/translations';
import { RefreshCw, Lock, Sun, Moon, Globe } from 'lucide-react';

export default function App() {
  const { t, theme, setTheme, language, setLanguage, resolvedTheme } = usePreferences();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [targetRole, setTargetRole] = useState('AI / ML Engineer');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSection, setProfileSection] = useState('overview');
  // Coding problem to open when jumping from a roadmap step to Coding Practice
  const [codingProblemId, setCodingProblemId] = useState(null);

  useEffect(() => {
    if (token) {
      loadProfile();
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadProfile = async () => {
    if (!token) return;
    try {
      setProfileError('');
      const data = await api.getProfile(token);
      setProfile(data);
      if (data.is_first_time) {
        // A brand-new account adopts whatever the student picked on the sign-in screen.
        api.updatePreferences(token, { theme, language }).catch(() => {});
      } else {
        setTheme(data.preferences?.theme);
        setLanguage(data.preferences?.language);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (err.message?.includes('401')) {
        handleLogout();
      } else {
        setProfileError(err.message || 'Failed to load profile');
      }
    }
  };

  // Applies a theme/language change instantly and saves it to the account when signed in.
  // Resolves true when the server copy was updated too.
  const handlePreferenceChange = async (key, value) => {
    if (key === 'theme') setTheme(value);
    if (key === 'language') setLanguage(value);
    if (!token) return false;
    try {
      await api.updatePreferences(token, { [key]: value });
      setProfile((prev) => (prev ? { ...prev, preferences: { ...prev.preferences, [key]: value } } : prev));
      return true;
    } catch (err) {
      console.error('Preference sync error:', err);
      return false;
    }
  };

  // Cross-view navigation (Resume -> Assessment -> Roadmap -> Coding Practice) starts at the top of the new view.
  const goToTab = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const openCodingProblem = (problemId) => {
    setCodingProblemId(problemId);
    goToTab('coding');
  };

  const openProfile = (section = 'overview') => {
    setProfileSection(section);
    setActiveTab('profile');
  };

  const handleOnboardingComplete = (savedProfile) => {
    setProfile(savedProfile);
    setActiveTab('dashboard');
    loadDashboard();
  };

  const loadDashboard = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.getDashboard(token);
      setDashboardData(data);
      setTargetRole(data.target_role);
      setUser((prev) => ({ ...prev, full_name: data.full_name }));
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      if (err.message?.includes('401') || err.message?.includes('credentials')) {
        localStorage.removeItem('token');
        setToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    setTargetRole(newRole);
    try {
      await api.setTargetRole(token, newRole);
      await loadDashboard();
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError(t('login.missing'));
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError('');
      const data = await api.login(authEmail.trim(), authPassword.trim());
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      setUser({ full_name: data.full_name });
      setTargetRole(data.target_role || 'AI / ML Engineer');
      setActiveTab('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const fillPrototypeCredentials = () => {
    setAuthEmail('alex.chen@university.edu');
    setAuthPassword('password123');
    setAuthError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setDashboardData(null);
    setProfile(null);
    setProfileError('');
    setProfileSection('overview');
    setCodingProblemId(null);
    setActiveTab('dashboard');
  };

  // Profile details take precedence over the dashboard payload for the navbar identity.
  const navUser = profile
    ? { full_name: profile.full_name, email: profile.email, avatar_url: profile.avatar_url }
    : user;

  // If unauthenticated, display clean login card
  if (!token) {
    return (
      <div className="min-h-screen bg-[#F1EEE3] flex flex-col justify-center items-center px-4 relative">
        {/* Quick language & theme controls before signing in */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <label className="flex items-center gap-1.5 bg-white border border-[#1C4A57]/15 rounded-xl pl-2.5 pr-1 py-1 shadow-sm">
            <Globe className="w-4 h-4 text-[#1C4A57]/70" />
            <span className="sr-only">{t('settings.language')}</span>
            <select
              value={language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1C4A57] py-1 pr-1 focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.nativeName}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => handlePreferenceChange('theme', resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
            title={resolvedTheme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
            className="p-2 bg-white border border-[#1C4A57]/15 rounded-xl text-[#1C4A57] shadow-sm hover:border-[#1C4A57] transition-colors"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-[#1C4A57]/15 text-center space-y-6">
          <div className="flex flex-col items-center">
            <SmartPlacedLogo
              size={52}
              variant={resolvedTheme === 'dark' ? 'light' : 'dark'}
              showText={true}
              showTagline={true}
            />
          </div>

          {authError && (
            <div className="bg-[#FDEAE5] text-[#D95D39] text-xs p-3 rounded-xl font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">{t('login.email')}</label>
              <input
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl p-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C4A57] block mb-1">{t('login.password')}</label>
              <input
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl p-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> {t('login.submitting')}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#CFE3E0]" /> {t('login.submit')}
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-[#1C4A57]/60 leading-relaxed">{t('login.newHint')}</p>

          <div className="pt-2 border-t border-[#1C4A57]/10 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={fillPrototypeCredentials}
              className="text-[11px] text-[#1C4A57] font-semibold hover:underline bg-[#F1EEE3] px-3 py-1.5 rounded-lg border border-[#1C4A57]/20 transition-all cursor-pointer"
            >
              {t('login.fillDemo', { email: 'alex.chen@university.edu' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in, but we don't yet know whether the first-time registration form is pending
  if (!profile && !profileError) {
    return (
      <div className="min-h-screen bg-[#F1EEE3] flex flex-col items-center justify-center gap-3 text-[#1C4A57]">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <p className="text-sm font-semibold">{t('common.loading')}</p>
      </div>
    );
  }

  if (profile?.is_first_time) {
    return (
      <OnboardingView
        token={token}
        profile={profile}
        onComplete={handleOnboardingComplete}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F1EEE3] flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={navUser}
        targetRole={targetRole}
        onRoleChange={handleRoleChange}
        overallReadiness={dashboardData?.overall_readiness || 68}
        onLogout={handleLogout}
        onOpenProfile={openProfile}
        onPreferenceChange={handlePreferenceChange}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardHub
            dashboardData={dashboardData}
            setActiveTab={setActiveTab}
            onRefresh={loadDashboard}
          />
        )}

        {activeTab === 'resume' && (
          <ResumeAnalyzerView
            token={token}
            targetRole={targetRole}
            onProfileUpdated={loadDashboard}
            onStartAssessment={() => goToTab('assessment')}
          />
        )}

        {activeTab === 'assessment' && (
          <SkillAssessmentView
            token={token}
            targetRole={targetRole}
            onProfileUpdated={loadDashboard}
            onOpenRoadmap={() => goToTab('roadmap')}
            onOpenResume={() => goToTab('resume')}
          />
        )}

        {activeTab === 'roadmap' && (
          <RoadmapView
            token={token}
            targetRole={targetRole}
            onOpenProblem={openCodingProblem}
            onProfileUpdated={loadDashboard}
          />
        )}

        {activeTab === 'interview' && (
          <AdaptiveInterviewView
            token={token}
            targetRole={targetRole}
            onProfileUpdated={loadDashboard}
          />
        )}

        {activeTab === 'coding' && (
          <CodingPracticeView
            token={token}
            targetRole={targetRole}
            onProfileUpdated={loadDashboard}
            initialProblemId={codingProblemId}
            onInitialProblemConsumed={() => setCodingProblemId(null)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileDashboard
            token={token}
            profile={profile}
            loadError={profileError}
            onRetry={loadProfile}
            dashboardData={dashboardData}
            targetRole={targetRole}
            section={profileSection}
            onSectionChange={setProfileSection}
            onProfileUpdated={(updated) => {
              setProfile(updated);
              setUser((prev) => ({ ...prev, full_name: updated.full_name }));
            }}
            onPreferenceChange={handlePreferenceChange}
            onLogout={handleLogout}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Persistent Status Footer */}
      <footer className="bg-[#143741] text-[#CFE3E0] py-4 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SMART PLACED AI</span>
            <span className="text-[#CFE3E0]/70">· {t('footer.tagline')}</span>
          </div>
          <span className="text-[#CFE3E0]/50 text-[11px]">{t('nav.loop')}</span>
        </div>
      </footer>
    </div>
  );
}
