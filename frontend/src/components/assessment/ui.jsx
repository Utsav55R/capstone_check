import React from 'react';
import { AlertTriangle, RefreshCw, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';

// Shared building blocks for the Resume -> Skill Assessment -> Roadmap loop.
// Only palette classes remapped by styles/dark-theme.css are used, so every piece
// works in light and dark mode.

export const DIFFICULTY_STYLES = {
  Easy: 'bg-[#E6F4F0] text-[#2E7D68]',
  Intermediate: 'bg-[#FFF5E6] text-[#B86E00]',
  Advanced: 'bg-[#FDEAE5] text-[#D95D39]',
};

export const DIFFICULTY_ORDER = ['Easy', 'Intermediate', 'Advanced'];

// Coding Practice problems use Easy / Medium / Hard.
const CODING_DIFFICULTY_STYLES = {
  Easy: DIFFICULTY_STYLES.Easy,
  Medium: DIFFICULTY_STYLES.Intermediate,
  Hard: DIFFICULTY_STYLES.Advanced,
};

export function DifficultyBadge({ difficulty, className = '' }) {
  if (!difficulty) return null;
  const style = DIFFICULTY_STYLES[difficulty] || CODING_DIFFICULTY_STYLES[difficulty] || 'bg-[#CFE3E0] text-[#1C4A57]';
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${style} ${className}`}>
      {difficulty}
    </span>
  );
}

const LEVEL_ICONS = { Beginner: SignalLow, Intermediate: SignalMedium, Advanced: SignalHigh };

export function LevelBadge({ level, size = 'md' }) {
  if (!level) return null;
  const Icon = LEVEL_ICONS[level] || SignalMedium;
  const sizing = size === 'lg' ? 'text-sm px-3 py-1.5 gap-2' : 'text-xs px-2.5 py-1 gap-1.5';
  return (
    <span className={`inline-flex items-center font-bold rounded-full bg-[#CFE3E0] text-[#1C4A57] whitespace-nowrap ${sizing}`}>
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" /> {level}
    </span>
  );
}

export function Card({ title, icon: Icon, eyebrow, action, children, className = '', bodyClassName = 'p-5 sm:p-6', headingId }) {
  return (
    <section
      className={`bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm ${className}`}
      aria-labelledby={headingId}
    >
      {(title || action) && (
        <div className="px-5 sm:px-6 py-4 border-b border-[#1C4A57]/10 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1C4A57]/55">{eyebrow}</p>
            )}
            <h2 id={headingId} className="text-sm font-extrabold text-[#1C4A57] flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4 text-[#1C4A57]/70 shrink-0" aria-hidden="true" />} {title}
            </h2>
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ProgressBar({ value, max, label, tone = 'sage', className = 'h-2' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill = tone === 'coral' ? 'bg-[#D95D39]' : tone === 'light' ? 'bg-[#A9CCC8]' : 'bg-[#2E7D68]';
  const track = tone === 'light' ? 'bg-white/15' : 'bg-[#1C4A57]/10';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`rounded-full overflow-hidden ${track} ${className}`}
    >
      <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ErrorBanner({ message, onRetry, retryLabel = 'Try again' }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-[#FDEAE5] border border-[#D95D39]/30 text-[#D95D39] p-4 rounded-xl text-sm font-semibold flex flex-wrap items-center gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0 break-words">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-bold bg-white border border-[#D95D39]/30 text-[#D95D39] px-3 py-1.5 rounded-lg hover:bg-[#FDEAE5] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> {retryLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm px-6 py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#FAF8F3] border border-[#1C4A57]/10 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6 text-[#1C4A57]/60" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-black text-[#1C4A57] mt-4">{title}</h2>
      <div className="text-sm text-[#1C4A57]/70 mt-2 max-w-md mx-auto leading-relaxed">{children}</div>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className = '' }) {
  return <div className={`bg-[#1C4A57]/10 rounded-lg animate-pulse ${className}`} aria-hidden="true" />;
}

export const optionLetter = (idx) => String.fromCharCode(65 + idx);

// Backend timestamps are naive UTC ("2026-10-06T09:30:00"); plain dates are "YYYY-MM-DD".
export function parseServerDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = parseServerDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 bg-white border border-[#1C4A57]/20 hover:border-[#1C4A57] text-[#1C4A57] text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
