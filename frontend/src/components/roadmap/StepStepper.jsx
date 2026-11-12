import React, { useRef } from 'react';
import { Check, Lock } from 'lucide-react';

export const STATUS_META = {
  completed: { label: 'Completed', pill: 'bg-[#E6F4F0] text-[#2E7D68]' },
  in_progress: { label: 'In progress', pill: 'bg-[#CFE3E0] text-[#1C4A57]' },
  locked: { label: 'Locked', pill: 'bg-[#1C4A57]/10 text-[#1C4A57]/60' },
};

export function StepStatusIcon({ status, number, size = 'md' }) {
  const box = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  if (status === 'completed') {
    return (
      <span className={`${box} rounded-full bg-[#2E7D68] text-white flex items-center justify-center shrink-0`} aria-hidden="true">
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className={`${box} rounded-full bg-white border-2 border-[#1C4A57] text-[#1C4A57] font-black flex items-center justify-center shrink-0`} aria-hidden="true">
        {number}
      </span>
    );
  }
  return (
    <span className={`${box} rounded-full bg-[#1C4A57]/10 text-[#1C4A57]/50 flex items-center justify-center shrink-0`} aria-hidden="true">
      <Lock className="w-4 h-4" />
    </span>
  );
}

export function FocusBadge() {
  return (
    <span
      className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[#FDEAE5] text-[#D95D39] whitespace-nowrap"
      title="Focus step: missing from your resume or answered wrong in an assessment or quiz"
    >
      Focus
    </span>
  );
}

// 5-step stepper. Horizontal on md+, vertical on mobile. Implemented as a tab list:
// arrow keys / Home / End move between steps, the selected step's details render in the tab panel.
export default function StepStepper({ steps, selectedStep, currentStep, onSelect, panelId }) {
  const tabRefs = useRef({});

  const handleKeyDown = (e, idx) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % steps.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + steps.length) % steps.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = steps.length - 1;
    if (next === null) return;
    e.preventDefault();
    const target = steps[next];
    onSelect(target.step);
    tabRefs.current[target.step]?.focus();
  };

  return (
    <div role="tablist" aria-label="Roadmap steps" className="flex flex-col md:grid md:grid-cols-5 gap-2 md:gap-3">
      {steps.map((s, idx) => {
        const selected = s.step === selectedStep;
        const meta = STATUS_META[s.status] || STATUS_META.locked;
        const prevCompleted = idx > 0 && steps[idx - 1].status === 'completed';
        return (
          <div key={s.step} role="presentation" className="relative">
            {idx > 0 && (
              <>
                {/* connectors: vertical on mobile, horizontal on md+ */}
                <span
                  aria-hidden="true"
                  className={`md:hidden absolute -top-2 left-[1.8rem] w-0.5 h-2 ${prevCompleted ? 'bg-[#2E7D68]' : 'bg-[#1C4A57]/15'}`}
                />
                <span
                  aria-hidden="true"
                  className={`hidden md:block absolute top-[2.15rem] -left-3 h-0.5 w-3 ${prevCompleted ? 'bg-[#2E7D68]' : 'bg-[#1C4A57]/15'}`}
                />
              </>
            )}
            <button
              ref={(el) => { tabRefs.current[s.step] = el; }}
              type="button"
              role="tab"
              id={`roadmap-step-tab-${s.step}`}
              aria-selected={selected}
              aria-controls={panelId}
              aria-current={s.step === currentStep ? 'step' : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(s.step)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`w-full h-full text-left rounded-2xl border p-3 md:p-4 flex md:flex-col items-center md:items-start gap-3 transition-colors ${
                selected
                  ? 'bg-white border-[#1C4A57] shadow-md'
                  : 'bg-[#FAF8F3] border-[#1C4A57]/10 hover:border-[#1C4A57]/40'
              }`}
            >
              <StepStatusIcon status={s.status} number={s.step} />
              <span className="min-w-0 flex-1 md:w-full">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#1C4A57]/55">Step {s.step}</span>
                  {s.is_weak && <FocusBadge />}
                </span>
                <span className={`block text-sm font-extrabold leading-snug break-words ${s.status === 'locked' ? 'text-[#1C4A57]/60' : 'text-[#1C4A57]'}`}>
                  {s.title}
                </span>
                <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.pill}`}>{meta.label}</span>
                  {s.total_topics > 0 && (
                    <span className="text-[11px] font-semibold text-[#1C4A57]/55 tabular-nums">
                      {s.checked_count}/{s.total_topics}
                      <span className="sr-only"> topics ticked</span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
