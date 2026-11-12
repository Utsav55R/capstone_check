import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, Languages, Check, CheckCircle2, ShieldCheck, LogOut, Palette, Mail, KeyRound } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { LANGUAGES } from '../../i18n/translations';

// Inline colors on purpose: previews must show each theme as-is, unaffected by the active theme.
const PREVIEW_PALETTES = {
  light: { page: '#F1EEE3', header: '#1C4A57', card: '#FFFFFF', line: '#CFE3E0', accent: '#2E7D68' },
  dark: { page: '#0E1619', header: '#1C4A57', card: '#162126', line: '#2A3F45', accent: '#5CC5A5' },
};

function ThemePreview({ palette }) {
  return (
    <div className="h-full w-full p-2 flex flex-col gap-1.5" style={{ background: palette.page }}>
      <div className="h-2.5 rounded-sm" style={{ background: palette.header }} />
      <div className="flex-1 flex gap-1.5">
        <div className="flex-1 rounded-sm p-1.5 flex flex-col gap-1" style={{ background: palette.card }}>
          <div className="h-1 w-3/4 rounded-full" style={{ background: palette.line }} />
          <div className="h-1 w-1/2 rounded-full" style={{ background: palette.line }} />
          <div className="mt-auto h-1.5 w-1/3 rounded-full" style={{ background: palette.accent }} />
        </div>
        <div className="w-1/3 rounded-sm" style={{ background: palette.card }} />
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, hint, children, aside }) {
  return (
    <section className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm">
      <div className="px-6 py-5 border-b border-[#1C4A57]/10 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#CFE3E0] text-[#1C4A57] flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1C4A57]">{title}</h3>
            {hint && <p className="text-xs text-[#1C4A57]/60 mt-0.5">{hint}</p>}
          </div>
        </div>
        {aside}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function SettingsPanel({ profile, onPreferenceChange, onLogout }) {
  const { t, theme, language } = usePreferences();
  const [status, setStatus] = useState(null); // 'saved' | 'local'
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = async (key, value) => {
    const synced = await onPreferenceChange(key, value);
    setStatus(synced ? 'saved' : 'local');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), 2500);
  };

  const themeOptions = [
    { id: 'light', icon: Sun, label: t('settings.theme.light'), hint: t('settings.theme.lightHint') },
    { id: 'dark', icon: Moon, label: t('settings.theme.dark'), hint: t('settings.theme.darkHint') },
    { id: 'system', icon: Monitor, label: t('settings.theme.system'), hint: t('settings.theme.systemHint') },
  ];

  const statusBadge = status && (
    <span
      role="status"
      className="text-[11px] font-bold text-[#2E7D68] bg-[#E6F4F0] px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0"
    >
      <CheckCircle2 className="w-3.5 h-3.5" /> {status === 'saved' ? t('settings.saved') : t('settings.savedLocally')}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <SettingsCard icon={Palette} title={t('settings.appearance')} hint={t('settings.appearanceHint')} aside={statusBadge}>
        <div role="radiogroup" aria-label={t('settings.appearance')} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map(({ id, icon: Icon, label, hint }) => {
            const selected = theme === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => change('theme', id)}
                className={`text-left rounded-2xl border-2 p-3 transition-all ${
                  selected ? 'border-[#1C4A57] shadow-md' : 'border-[#1C4A57]/10 hover:border-[#1C4A57]/40'
                }`}
              >
                <div className="h-20 rounded-xl overflow-hidden border border-black/5 flex">
                  {id === 'system' ? (
                    <>
                      <div className="w-1/2 overflow-hidden"><ThemePreview palette={PREVIEW_PALETTES.light} /></div>
                      <div className="w-1/2 overflow-hidden"><ThemePreview palette={PREVIEW_PALETTES.dark} /></div>
                    </>
                  ) : (
                    <ThemePreview palette={PREVIEW_PALETTES[id]} />
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 mt-3">
                  <div>
                    <p className="text-sm font-bold text-[#1C4A57] flex items-center gap-1.5">
                      <Icon className="w-4 h-4" /> {label}
                    </p>
                    <p className="text-[11px] text-[#1C4A57]/60 mt-0.5">{hint}</p>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                      selected ? 'bg-[#1C4A57] border-[#1C4A57] text-white' : 'border-[#1C4A57]/25'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* Language */}
      <SettingsCard icon={Languages} title={t('settings.language')} hint={t('settings.languageHint')}>
        <div role="radiogroup" aria-label={t('settings.language')} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LANGUAGES.map((lang) => {
            const selected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={selected}
                lang={lang.code}
                onClick={() => change('language', lang.code)}
                className={`text-left rounded-xl border-2 px-4 py-3 flex items-center justify-between gap-3 transition-all ${
                  selected ? 'border-[#1C4A57] bg-[#CFE3E0]/40' : 'border-[#1C4A57]/10 hover:border-[#1C4A57]/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-[#FAF8F3] border border-[#1C4A57]/10 text-[#1C4A57] text-xs font-black flex items-center justify-center uppercase shrink-0">
                    {lang.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1C4A57] truncate">{lang.nativeName}</p>
                    <p className="text-[11px] text-[#1C4A57]/60 truncate">{lang.englishName}</p>
                  </div>
                </div>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    selected ? 'bg-[#1C4A57] border-[#1C4A57] text-white' : 'border-[#1C4A57]/25'
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* Account */}
      <SettingsCard icon={ShieldCheck} title={t('settings.account')} hint={t('settings.accountHint')}>
        <dl className="divide-y divide-gray-100">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <dt className="text-xs font-semibold text-[#1C4A57]/60 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {t('settings.email')}
            </dt>
            <dd className="text-sm font-bold text-[#1C4A57] truncate">{profile?.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-xs font-semibold text-[#1C4A57]/60 flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> {t('settings.signInMethod')}
            </dt>
            <dd className="text-sm font-bold text-[#1C4A57]">
              {profile?.auth_provider === 'google' ? t('settings.provider.google') : t('settings.provider.email')}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
            <p className="text-xs text-[#1C4A57]/60">{t('settings.signOutHint')}</p>
            <button
              type="button"
              onClick={onLogout}
              className="self-start sm:self-auto text-sm font-bold text-[#D95D39] border border-[#D95D39]/30 hover:bg-[#FDEAE5] px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {t('settings.signOut')}
            </button>
          </div>
        </dl>
      </SettingsCard>
    </div>
  );
}
