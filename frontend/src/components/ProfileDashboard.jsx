import React, { useEffect, useRef, useState } from 'react';
import {
  Camera, Pencil, Settings, GraduationCap, Mail, CalendarDays, Briefcase, User, School,
  BookOpen, Award, Github, Linkedin, Code2, ExternalLink, Target, ArrowRight, X, CheckCircle2,
  Upload, Trash2, LayoutGrid, Link2, Circle,
} from 'lucide-react';
import Avatar from './profile/Avatar';
import ProfileForm from './profile/ProfileForm';
import SettingsPanel from './profile/SettingsPanel';
import ProfileSyncView from './ProfileSyncView';
import { usePreferences } from '../context/PreferencesContext';
import { localeFor } from '../i18n/translations';
import { api } from '../services/api';
import { imageFileToAvatarDataUrl } from '../utils/image';

const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// Items that make up "profile strength"; UG CGPA is excluded because it only applies to PG students.
const COMPLETION_ITEMS = [
  { key: 'avatar_url', label: 'profile.fields.photo' },
  { key: 'full_name', label: 'profile.fields.fullName' },
  { key: 'age', label: 'profile.fields.age' },
  { key: 'college_name', label: 'profile.fields.college' },
  { key: 'course_and_branch', label: 'profile.fields.course' },
  { key: 'cgpa', label: 'profile.fields.cgpa' },
  { key: 'tenth_percentage', label: 'profile.fields.tenth' },
  { key: 'twelfth_percentage', label: 'profile.fields.twelfth' },
  { key: 'work_experience', label: 'profile.fields.experience' },
];

// Roles are separated by blank lines; the first line of each is its title.
const parseExperience = (text) =>
  (text || '')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map(([title, ...rest]) => ({ title, description: rest.join(' ') }));

function Card({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm ${className}`}>
      <div className="px-5 sm:px-6 py-4 border-b border-[#1C4A57]/10 flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-[#1C4A57] flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#1C4A57]/70" />} {title}
        </h2>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function InfoItem({ label, value, icon: Icon }) {
  const { t } = usePreferences();
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#1C4A57]/70" />
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#1C4A57]/55">{label}</dt>
        <dd className={`text-sm font-bold mt-0.5 break-words ${hasValue(value) ? 'text-[#1C4A57]' : 'text-[#1C4A57]/40 italic font-medium'}`}>
          {hasValue(value) ? value : t('profile.notProvided')}
        </dd>
      </div>
    </div>
  );
}

function ScoreTile({ label, value, display, max }) {
  const pct = hasValue(value) ? Math.min(100, (Number(value) / max) * 100) : 0;
  return (
    <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/10">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1C4A57]/55">{label}</p>
      <p className="text-2xl font-black text-[#1C4A57] mt-1 tabular-nums">{display}</p>
      <div className="h-1.5 rounded-full bg-[#1C4A57]/10 mt-3 overflow-hidden">
        <div className="h-full rounded-full bg-[#2E7D68] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProfileDashboard({
  token,
  profile,
  loadError,
  onRetry,
  dashboardData,
  targetRole,
  section,
  onSectionChange,
  onProfileUpdated,
  onPreferenceChange,
  onLogout,
  setActiveTab,
}) {
  const { t, language } = usePreferences();
  const [editing, setEditing] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);
  const toastTimer = useRef(null);

  const locale = localeFor(language);
  const num = (v, digits = 2) =>
    hasValue(v) ? new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(Number(v)) : null;

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => e.key === 'Escape' && setEditing(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [editing]);

  useEffect(() => {
    if (!photoMenuOpen) return undefined;
    const onClick = (e) => !photoMenuRef.current?.contains(e.target) && setPhotoMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [photoMenuOpen]);

  const showToast = (message, tone = 'success') => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const saveAvatar = async (dataUrl) => {
    setPhotoBusy(true);
    try {
      const updated = await api.updateAvatar(token, dataUrl);
      onProfileUpdated(updated);
      showToast(dataUrl ? t('profile.photoUpdated') : t('profile.photoRemoved'));
    } catch (err) {
      showToast(err.message || t('form.errors.generic'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await saveAvatar(await imageFileToAvatarDataUrl(file));
    } catch (err) {
      const key = { unsupported: 'form.errors.photoType', too_large: 'form.errors.photoSize' }[err.message];
      showToast(t(key || 'form.errors.photoRead'), 'error');
    }
  };

  const handleCameraClick = () => {
    if (profile?.avatar_url) setPhotoMenuOpen((open) => !open);
    else fileInputRef.current?.click();
  };

  const handleEditSubmit = async (details) => {
    const updated = await api.updateProfile(token, details);
    onProfileUpdated(updated);
    setEditing(false);
    showToast(t('profile.saved'));
  };

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-sm font-semibold text-[#1C4A57]/70 space-y-3">
        <p>{loadError ? t('profile.loadError') : t('profile.loading')}</p>
        {loadError && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-bold text-[#1C4A57] border border-[#1C4A57]/20 hover:border-[#1C4A57] px-4 py-2 rounded-lg transition-colors"
          >
            {t('profile.retry')}
          </button>
        )}
      </div>
    );
  }

  const role = targetRole || profile.target_role;
  const readiness = Math.round(dashboardData?.overall_readiness ?? profile.overall_readiness ?? 0);
  const tier = dashboardData?.readiness_tier || profile.readiness_tier;
  const links = dashboardData?.portfolio_links || profile.links || {};
  const leetcodeUrl = dashboardData?.leetcode_stats?.url || profile.links?.leetcode;
  const experience = parseExperience(profile.work_experience);
  const missing = COMPLETION_ITEMS.filter((item) => !hasValue(profile[item.key]));
  const completion = Math.round(((COMPLETION_ITEMS.length - missing.length) / COMPLETION_ITEMS.length) * 100);
  const memberSince = profile.member_since
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(profile.member_since))
    : null;

  const tabs = [
    { id: 'overview', label: t('profile.tabs.overview'), icon: LayoutGrid },
    { id: 'integrations', label: t('profile.tabs.integrations'), icon: Link2 },
    { id: 'settings', label: t('profile.tabs.settings'), icon: Settings },
  ];

  const education = [
    {
      icon: School,
      title: profile.college_name,
      subtitle: profile.course_and_branch || t('profile.currentProgram'),
      badge: hasValue(profile.cgpa) ? `${t('profile.fields.cgpa')} ${num(profile.cgpa)} / 10` : null,
    },
    hasValue(profile.ug_cgpa) && {
      icon: GraduationCap,
      title: t('profile.undergraduate'),
      subtitle: t('profile.fields.ugCgpa'),
      badge: `${num(profile.ug_cgpa)} / 10`,
    },
    {
      icon: BookOpen,
      title: t('profile.seniorSecondary'),
      subtitle: t('profile.fields.twelfth'),
      badge: hasValue(profile.twelfth_percentage) ? `${num(profile.twelfth_percentage)}%` : null,
    },
    {
      icon: Award,
      title: t('profile.secondary'),
      subtitle: t('profile.fields.tenth'),
      badge: hasValue(profile.tenth_percentage) ? `${num(profile.tenth_percentage)}%` : null,
    },
  ].filter(Boolean);

  const linkRows = [
    { icon: Github, label: 'GitHub', url: links.github },
    { icon: Linkedin, label: 'LinkedIn', url: links.linkedin },
    { icon: Code2, label: 'LeetCode', url: leetcodeUrl },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ===== Profile header ===== */}
      <section className="bg-white rounded-3xl border border-[#1C4A57]/15 shadow-sm overflow-hidden">
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-[#143741] via-[#1C4A57] to-[#2E7D68] overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="absolute -top-20 right-10 w-72 h-72 bg-[#D95D39]/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-[#A9CCC8]/20 rounded-full blur-3xl" />
        </div>

        <div className="px-5 sm:px-8">
          <div className="flex items-end justify-between gap-4 -mt-14 sm:-mt-16">
            <div className="relative" ref={photoMenuRef}>
              <Avatar
                src={profile.avatar_url}
                name={profile.full_name}
                size={120}
                className={`ring-4 ring-white shadow-lg ${photoBusy ? 'opacity-60' : ''}`}
              />
              <button
                type="button"
                onClick={handleCameraClick}
                disabled={photoBusy}
                title={t('profile.changePhoto')}
                aria-label={t('profile.changePhoto')}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#1C4A57] hover:bg-[#143741] text-white ring-4 ring-white flex items-center justify-center shadow-md transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoSelected}
              />
              {photoMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#1C4A57]/15 shadow-xl py-1.5 z-20">
                  <button
                    type="button"
                    onClick={() => { setPhotoMenuOpen(false); fileInputRef.current?.click(); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#1C4A57] hover:bg-[#FAF8F3] flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" /> {t('profile.uploadNewPhoto')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhotoMenuOpen(false); saveAvatar(null); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#D95D39] hover:bg-[#FDEAE5] flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('profile.removePhoto')}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pb-1">
              <button
                type="button"
                onClick={() => onSectionChange('settings')}
                className="h-10 px-3 sm:px-4 rounded-xl border border-[#1C4A57]/20 hover:border-[#1C4A57] text-[#1C4A57] text-sm font-bold flex items-center gap-2 bg-white transition-colors"
              >
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">{t('profile.settings')}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="h-10 px-4 rounded-xl bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Pencil className="w-4 h-4" /> {t('profile.editProfile')}
              </button>
            </div>
          </div>

          <div className="mt-4 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C4A57] tracking-tight break-words">{profile.full_name}</h1>
              <p className="text-sm sm:text-base font-semibold text-[#1C4A57]/80 mt-1">
                {t('profile.aspiring', { role })}
                {hasValue(profile.course_and_branch) && <span className="text-[#1C4A57]/60"> · {profile.course_and_branch}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs font-semibold text-[#1C4A57]/65">
                {hasValue(profile.college_name) && (
                  <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> {profile.college_name}</span>
                )}
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {profile.email}</span>
                {memberSince && (
                  <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {t('profile.memberSince', { date: memberSince })}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#CFE3E0] text-[#1C4A57] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> {role}
              </span>
              {tier && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#E6F4F0] text-[#2E7D68] border border-[#2E7D68]/20">
                  {t('profile.readinessTier', { tier })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <nav className="border-t border-[#1C4A57]/10 px-3 sm:px-6 flex gap-1 overflow-x-auto" aria-label={t('profile.sections')}>
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSectionChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative px-3 sm:px-4 py-3.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                  active ? 'text-[#1C4A57]' : 'text-[#1C4A57]/55 hover:text-[#1C4A57]'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
                {active && <span className="absolute left-2 right-2 -bottom-px h-[3px] rounded-t-full bg-[#2E7D68]" />}
              </button>
            );
          })}
        </nav>
      </section>

      {/* ===== Overview ===== */}
      {section === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title={t('profile.personalInfo')} icon={User}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoItem icon={User} label={t('profile.fields.fullName')} value={profile.full_name} />
                <InfoItem icon={CalendarDays} label={t('profile.fields.age')} value={hasValue(profile.age) ? t('profile.yearsOld', { age: profile.age }) : null} />
                <InfoItem icon={Mail} label={t('profile.fields.email')} value={profile.email} />
                <InfoItem icon={Target} label={t('profile.fields.targetRole')} value={role} />
                <InfoItem icon={School} label={t('profile.fields.college')} value={profile.college_name} />
                <InfoItem icon={BookOpen} label={t('profile.fields.course')} value={profile.course_and_branch} />
              </dl>
            </Card>

            <Card title={t('profile.education')} icon={GraduationCap}>
              <ol className="relative">
                {education.map((item, i) => (
                  <li key={item.title + i} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < education.length - 1 && (
                      <span className="absolute left-[19px] top-10 bottom-0 w-px bg-[#1C4A57]/15" aria-hidden="true" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-[#CFE3E0] text-[#1C4A57] flex items-center justify-center shrink-0">
                      <item.icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 pt-0.5">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-[#1C4A57] break-words">{item.title || t('profile.notProvided')}</p>
                        <p className="text-xs text-[#1C4A57]/60 mt-0.5">{item.subtitle}</p>
                      </div>
                      {item.badge && (
                        <span className="self-start sm:self-center text-xs font-black text-[#2E7D68] bg-[#E6F4F0] border border-[#2E7D68]/20 px-2.5 py-1 rounded-lg tabular-nums whitespace-nowrap">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card
              title={t('profile.experience')}
              icon={Briefcase}
              action={
                experience.length > 0 && (
                  <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-[#1C4A57]/70 hover:text-[#1C4A57] flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> {t('profile.edit')}
                  </button>
                )
              }
            >
              {experience.length ? (
                <ul className="space-y-5">
                  {experience.map((entry, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#EAE5D6] text-[#1C4A57] flex items-center justify-center shrink-0">
                        <Briefcase className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-extrabold text-[#1C4A57] break-words">{entry.title}</p>
                        {entry.description && <p className="text-sm text-[#1C4A57]/75 mt-1 leading-relaxed break-words">{entry.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F3] border border-[#1C4A57]/10 flex items-center justify-center mx-auto">
                    <Briefcase className="w-5 h-5 text-[#1C4A57]/50" />
                  </div>
                  <p className="text-sm font-bold text-[#1C4A57] mt-3">{t('profile.noExperience')}</p>
                  <p className="text-xs text-[#1C4A57]/60 mt-1">{t('profile.noExperienceHint')}</p>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-4 text-xs font-bold text-[#1C4A57] border border-[#1C4A57]/20 hover:border-[#1C4A57] px-3 py-2 rounded-lg transition-colors"
                  >
                    + {t('profile.addExperience')}
                  </button>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title={t('profile.academicSnapshot')} icon={Award}>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                <ScoreTile label={t('profile.fields.cgpa')} value={profile.cgpa} max={10}
                  display={hasValue(profile.cgpa) ? <>{num(profile.cgpa)}<span className="text-sm font-bold text-[#1C4A57]/50"> / 10</span></> : '—'} />
                <ScoreTile label={t('profile.fields.twelfth')} value={profile.twelfth_percentage} max={100}
                  display={hasValue(profile.twelfth_percentage) ? `${num(profile.twelfth_percentage)}%` : '—'} />
                <ScoreTile label={t('profile.fields.tenth')} value={profile.tenth_percentage} max={100}
                  display={hasValue(profile.tenth_percentage) ? `${num(profile.tenth_percentage)}%` : '—'} />
              </div>
            </Card>

            <section className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#1C4A57] to-[#143741] text-[#F1EEE3] shadow-sm relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#2E7D68]/40 rounded-full blur-2xl" />
              <p className="relative text-[11px] font-bold uppercase tracking-wider text-[#CFE3E0]/80">{t('profile.readiness')}</p>
              <div className="relative flex items-end gap-2 mt-2">
                <span className="text-5xl font-black tabular-nums">{readiness}</span>
                <span className="text-sm font-bold text-[#CFE3E0]/70 mb-1.5">/ 100</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/15 mt-3 overflow-hidden">
                <div className="h-full rounded-full bg-[#A9CCC8]" style={{ width: `${Math.min(100, readiness)}%` }} />
              </div>
              <p className="relative text-xs text-[#CFE3E0]/80 mt-3">
                {tier ? t('profile.readinessTier', { tier }) : ''} · {role}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="relative mt-4 w-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {t('profile.viewDashboard')} <ArrowRight className="w-4 h-4" />
              </button>
            </section>

            <Card title={t('profile.strength')} icon={CheckCircle2}>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-[#1C4A57] tabular-nums">{completion}%</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${completion === 100 ? 'bg-[#E6F4F0] text-[#2E7D68]' : 'bg-[#FFF5E6] text-[#B86E00]'}`}>
                  {completion === 100 ? t('profile.strengthAllStar') : t('profile.strengthIntermediate')}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#1C4A57]/10 mt-3 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2E7D68] to-[#1C4A57]" style={{ width: `${completion}%` }} />
              </div>
              {missing.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[#1C4A57]/70">{t('profile.strengthMissing')}</p>
                  <ul className="mt-2 space-y-1.5">
                    {missing.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => (item.key === 'avatar_url' ? fileInputRef.current?.click() : setEditing(true))}
                          className="w-full text-left text-xs font-semibold text-[#1C4A57] hover:bg-[#FAF8F3] rounded-lg px-2 py-1.5 -mx-2 flex items-center gap-2 transition-colors"
                        >
                          <Circle className="w-3.5 h-3.5 text-[#1C4A57]/40" /> {t(item.label)}
                          <span className="ml-auto text-[#2E7D68] font-bold">+ {t('profile.add')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-[#1C4A57]/70 mt-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D68]" /> {t('profile.strengthComplete')}
                </p>
              )}
            </Card>

            <Card
              title={t('profile.links')}
              icon={Link2}
              action={
                <button type="button" onClick={() => onSectionChange('integrations')} className="text-xs font-bold text-[#1C4A57]/70 hover:text-[#1C4A57]">
                  {t('profile.manage')}
                </button>
              }
            >
              <ul className="space-y-2">
                {linkRows.map(({ icon: Icon, label, url }) => (
                  <li key={label}>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-[#FAF8F3] group transition-colors"
                      >
                        <span className="w-9 h-9 rounded-lg bg-[#FAF8F3] border border-[#1C4A57]/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#1C4A57]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-[#1C4A57]">{label}</span>
                          <span className="block text-[11px] text-[#1C4A57]/55 truncate">{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#1C4A57]/40 group-hover:text-[#1C4A57]" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-2.5 -mx-2.5">
                        <span className="w-9 h-9 rounded-lg bg-[#FAF8F3] border border-[#1C4A57]/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#1C4A57]/40" />
                        </span>
                        <span className="text-xs font-semibold text-[#1C4A57]/50">{label} · {t('profile.notProvided')}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* ===== Integrations (existing telemetry & self-assessed skills) ===== */}
      {section === 'integrations' && (
        <ProfileSyncView dashboardData={dashboardData} targetRole={role} embedded />
      )}

      {/* ===== Settings ===== */}
      {section === 'settings' && (
        <div className="max-w-4xl">
          <div className="mb-5">
            <h2 className="text-xl font-black text-[#1C4A57] tracking-tight">{t('settings.title')}</h2>
            <p className="text-sm text-[#1C4A57]/65 mt-1">{t('settings.subtitle')}</p>
          </div>
          <SettingsPanel profile={profile} onPreferenceChange={onPreferenceChange} onLogout={onLogout} />
        </div>
      )}

      {/* ===== Edit profile dialog ===== */}
      {editing && (
        <div
          className="fixed inset-0 z-[60] bg-[#0C2229]/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(false)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#1C4A57]/15 my-auto">
            <div className="px-6 sm:px-8 py-5 border-b border-[#1C4A57]/10 flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-profile-title" className="text-lg font-black text-[#1C4A57]">{t('profile.editTitle')}</h2>
                <p className="text-xs text-[#1C4A57]/60 mt-0.5">{t('profile.editSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label={t('form.cancel')}
                className="p-2 rounded-lg text-[#1C4A57]/60 hover:text-[#1C4A57] hover:bg-[#FAF8F3] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 sm:px-8 py-6">
              <ProfileForm
                initialValues={profile}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditing(false)}
                submitLabel={t('profile.save')}
                submittingLabel={t('profile.saving')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2 border ${
            toast.tone === 'error'
              ? 'bg-[#FDEAE5] text-[#D95D39] border-[#D95D39]/20'
              : 'bg-[#1C4A57] text-[#F1EEE3] border-white/10'
          }`}
        >
          {toast.tone === 'error' ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-[#CFE3E0]" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
