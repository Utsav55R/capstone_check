import React, { useEffect, useRef, useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Map, 
  MessageSquareCode, 
  Code2, 
  UserCircle,
  LogOut,
  ChevronDown,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import SmartPlacedLogo from './SmartPlacedLogo';
import Avatar from './profile/Avatar';
import { usePreferences } from '../context/PreferencesContext';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  user, 
  targetRole, 
  onRoleChange, 
  overallReadiness, 
  onLogout,
  onOpenProfile,
  onPreferenceChange
}) {
  const { t, resolvedTheme } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const openProfile = (section) => {
    setMenuOpen(false);
    onOpenProfile(section);
  };

  const isDark = resolvedTheme === 'dark';

  const roles = [
    "AI / ML Engineer",
    "Full Stack Developer",
    "Cloud / DevOps Engineer",
    "Game Developer",
    "Data Engineer",
    "Data Analyst",
  ];

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: BarChart3 },
    { id: 'resume', label: t('nav.resume'), icon: FileText },
    { id: 'assessment', label: t('nav.assessment'), icon: CheckCircle2 },
    { id: 'roadmap', label: t('nav.roadmap'), icon: Map },
    { id: 'interview', label: t('nav.interview'), icon: MessageSquareCode },
    { id: 'coding', label: t('nav.coding'), icon: Code2 },
    { id: 'profile', label: t('nav.profile'), icon: UserCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#1C4A57] text-[#F1EEE3] shadow-md border-b border-[#143741]">
      {/* Top Context Strip */}
      <div className="bg-[#143741] px-4 py-1.5 text-xs flex justify-between items-center text-[#CFE3E0] border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="bg-[#CFE3E0]/20 text-[#EAE5D6] px-2 py-0.5 rounded font-mono font-semibold text-[11px]">
            {t('nav.strip')}
          </span>
          <span className="hidden sm:inline text-[#CFE3E0]/80">
            {t('nav.stripSub')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-[#CFE3E0]/90 text-[11px]">
            {t('nav.loop')}
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <SmartPlacedLogo
            size={40}
            variant="light"
            showText={true}
            showTagline={true}
            onClickDashboard={() => setActiveTab('dashboard')}
          />

          {/* Center Target Role Selector */}
          <div className="hidden md:flex items-center bg-[#143741] px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-[#CFE3E0] mr-2 font-medium">{t('nav.targetRole')}</span>
            <div className="relative">
              <select
                value={targetRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="bg-[#1C4A57] text-[#EAE5D6] font-semibold text-xs rounded px-2.5 py-1 pr-6 border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#CFE3E0] cursor-pointer appearance-none"
              >
                {roles.map(r => (
                  <option key={r} value={r} className="bg-[#1C4A57] text-white">{r}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#CFE3E0] absolute right-1.5 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Theme toggle, user profile menu & readiness pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreferenceChange('theme', isDark ? 'light' : 'dark')}
              title={isDark ? t('nav.switchToLight') : t('nav.switchToDark')}
              aria-label={isDark ? t('nav.switchToLight') : t('nav.switchToDark')}
              className="p-2 text-[#CFE3E0] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 bg-[#143741] hover:bg-[#0F2D35] px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors"
              >
                <Avatar src={user?.avatar_url} name={user?.full_name} size={28} className="ring-2 ring-[#CFE3E0]/40" />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight max-w-[140px] truncate">{user?.full_name || 'Student'}</p>
                  <p className="text-[10px] text-[#CFE3E0]">{t('nav.placementReady')} <span className="font-bold text-[#EAE5D6]">{overallReadiness}/100</span></p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#CFE3E0] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#1C4A57]/15 overflow-hidden z-50">
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-[#1C4A57]/10 bg-[#FAF8F3]">
                    <Avatar src={user?.avatar_url} name={user?.full_name} size={40} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1C4A57] truncate">{user?.full_name || 'Student'}</p>
                      <p className="text-[11px] text-[#1C4A57]/60 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="py-1.5">
                    <button type="button" role="menuitem" onClick={() => openProfile('overview')}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-[#1C4A57] hover:bg-[#FAF8F3] flex items-center gap-2.5">
                      <UserCircle className="w-4 h-4" /> {t('nav.menu.profile')}
                    </button>
                    <button type="button" role="menuitem" onClick={() => openProfile('settings')}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-[#1C4A57] hover:bg-[#FAF8F3] flex items-center gap-2.5">
                      <Settings className="w-4 h-4" /> {t('nav.menu.settings')}
                    </button>
                  </div>
                  <div className="py-1.5 border-t border-[#1C4A57]/10">
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onLogout(); }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-[#D95D39] hover:bg-[#FDEAE5] flex items-center gap-2.5">
                      <LogOut className="w-4 h-4" /> {t('nav.menu.signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#CFE3E0] text-[#1C4A57] shadow-sm font-bold'
                    : 'text-[#CFE3E0] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1C4A57]' : 'text-[#CFE3E0]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
