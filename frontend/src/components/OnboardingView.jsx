import React from 'react';
import { Check, LogOut } from 'lucide-react';
import SmartPlacedLogo from './SmartPlacedLogo';
import ProfileForm from './profile/ProfileForm';
import { usePreferences } from '../context/PreferencesContext';
import { api } from '../services/api';

// Shown right after a first-time sign in: collects personal & academic details
// before the student enters the platform.
export default function OnboardingView({ token, profile, onComplete, onLogout }) {
  const { t } = usePreferences();

  const steps = [
    { label: t('onboarding.steps.account'), state: 'done' },
    { label: t('onboarding.steps.profile'), state: 'current' },
    { label: t('onboarding.steps.launch'), state: 'next' },
  ];

  const handleSubmit = async (details) => {
    const saved = await api.completeOnboarding(token, details);
    onComplete(saved);
  };

  return (
    <div className="min-h-screen bg-[#F1EEE3] font-sans">
      {/* Header */}
      <header className="bg-[#1C4A57] text-[#F1EEE3] border-b border-[#143741]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <SmartPlacedLogo size={36} variant="light" showText={true} showTagline={false} />
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline text-[#CFE3E0]/80">{t('onboarding.signedInAs', { email: profile?.email || '' })}</span>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-[#CFE3E0] hover:text-white hover:bg-white/10 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> {t('onboarding.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Progress steps */}
        <ol className="flex items-center gap-2 sm:gap-3 text-xs font-bold" aria-label={t('onboarding.progress')}>
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  step.state === 'done'
                    ? 'bg-[#2E7D68] text-white'
                    : step.state === 'current'
                    ? 'bg-[#1C4A57] text-[#F1EEE3] ring-4 ring-[#CFE3E0]'
                    : 'bg-white text-[#1C4A57]/50 border border-[#1C4A57]/20'
                }`}
                aria-current={step.state === 'current' ? 'step' : undefined}
              >
                {step.state === 'done' ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={`whitespace-nowrap ${step.state === 'next' ? 'text-[#1C4A57]/50' : 'text-[#1C4A57]'} hidden sm:inline`}>
                {step.label}
              </span>
              {i < steps.length - 1 && <span className="flex-1 h-px bg-[#1C4A57]/20 min-w-[16px]" />}
            </li>
          ))}
        </ol>

        <div className="bg-white rounded-3xl shadow-sm border border-[#1C4A57]/15 overflow-hidden">
          <div className="relative bg-gradient-to-r from-[#1C4A57] to-[#143741] px-6 sm:px-10 py-8 overflow-hidden">
            <div className="absolute -top-16 -right-10 w-56 h-56 bg-[#D95D39]/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 left-10 w-56 h-56 bg-[#CFE3E0]/15 rounded-full blur-3xl pointer-events-none" />
            <span className="relative inline-block bg-white/10 border border-white/15 text-[#CFE3E0] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider">
              {t('onboarding.badge')}
            </span>
            <h1 className="relative text-2xl sm:text-3xl font-black tracking-tight text-[#F1EEE3] mt-3">
              {t('onboarding.title')}
            </h1>
            <p className="relative text-sm text-[#CFE3E0]/85 mt-2 max-w-2xl leading-relaxed">
              {t('onboarding.subtitle')}
            </p>
          </div>

          <div className="px-6 sm:px-10 py-8">
            <ProfileForm
              initialValues={profile}
              onSubmit={handleSubmit}
              submitLabel={t('onboarding.submit')}
              submittingLabel={t('onboarding.submitting')}
            />
          </div>
        </div>

        <p className="text-center text-[11px] text-[#1C4A57]/55">{t('onboarding.privacy')}</p>
      </main>
    </div>
  );
}
