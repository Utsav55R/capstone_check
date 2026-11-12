import React from 'react';
import { Check, FileText, Info, Target, Upload, X } from 'lucide-react';
import { Card, DIFFICULTY_ORDER, DIFFICULTY_STYLES, LevelBadge, formatDate } from './ui';

const LEVEL_RULES = [
  { level: 'Beginner', range: '0–2 skills' },
  { level: 'Intermediate', range: '3–4 skills' },
  { level: 'Advanced', range: '5+ skills' },
];

const REASONS = {
  missing_from_resume: { label: 'Missing from resume', style: 'bg-[#FDEAE5] text-[#D95D39]' },
  answered_wrong: { label: 'Answered wrong before', style: 'bg-[#FFF5E6] text-[#B86E00]' },
};

function SectionLabel({ children }) {
  return <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#1C4A57]/55">{children}</h3>;
}

function ResumeStatus({ resume, onOpenResume }) {
  if (resume?.has_resume) {
    const analysed = formatDate(resume.analyzed_at);
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/10">
        <div className="w-9 h-9 rounded-xl bg-[#CFE3E0] text-[#1C4A57] flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1C4A57] break-words">{resume.filename || 'Your resume'}</p>
          <p className="text-xs text-[#1C4A57]/60 mt-0.5">
            {analysed ? `Analysed ${analysed}` : 'Analysed'} · used to pick your question mix
          </p>
        </div>
        {onOpenResume && (
          <button
            type="button"
            onClick={onOpenResume}
            className="text-xs font-bold text-[#1C4A57]/70 hover:text-[#1C4A57] underline-offset-2 hover:underline shrink-0 py-1"
          >
            Update
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-[#FFF5E6] border border-[#B86E00]/20">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Info className="w-5 h-5 text-[#B86E00] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm font-semibold text-[#1C4A57] min-w-0">
          No resume analysed yet — you'll get the Intermediate mix.
        </p>
      </div>
      {onOpenResume && (
        <button
          type="button"
          onClick={onOpenResume}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] px-3 py-2 rounded-lg transition-colors shrink-0"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Analyse my resume
        </button>
      )}
    </div>
  );
}

function CoreSkills({ plan }) {
  const skills = plan.core_skills || [];
  const hasResume = !!plan.resume?.has_resume;
  if (!skills.length) {
    return (
      <p className="text-xs text-[#1C4A57]/60">Core-skill matching isn't available for this field yet.</p>
    );
  }
  const total = plan.total_core_skills ?? skills.length;
  const matched = plan.matched_count ?? skills.filter((s) => s.matched).length;

  return (
    <div className="space-y-2.5">
      <p className="text-sm text-[#1C4A57]">
        {hasResume ? (
          <>
            <span className="font-black text-lg tabular-nums">{matched}</span>
            <span className="font-semibold"> of {total} core skills found in your resume</span>
          </>
        ) : (
          <span className="font-semibold text-[#1C4A57]/70">
            Analyse your resume to see which of these {total} core skills you already have.
          </span>
        )}
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Core skills">
        {skills.map((skill) => {
          const style = !hasResume
            ? 'bg-[#FAF8F3] text-[#1C4A57]/70 border-[#1C4A57]/15'
            : skill.matched
              ? 'bg-[#E6F4F0] text-[#2E7D68] border-[#2E7D68]/25'
              : 'bg-[#FDEAE5] text-[#D95D39] border-[#D95D39]/25';
          return (
            <li
              key={skill.id || skill.name}
              title={skill.step ? `Roadmap step ${skill.step}` : undefined}
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${style}`}
            >
              {hasResume && (skill.matched
                ? <Check className="w-3.5 h-3.5" aria-hidden="true" />
                : <X className="w-3.5 h-3.5" aria-hidden="true" />)}
              {skill.name}
              {hasResume && <span className="sr-only">{skill.matched ? '(found)' : '(missing)'}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LevelRule({ level, hasResume }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={level} size="lg" />
        <span className="text-xs text-[#1C4A57]/60">
          {hasResume ? 'based on the core skills in your resume' : 'default until a resume is analysed'}
        </span>
      </div>
      <ol className="grid grid-cols-3 gap-1.5" aria-label="How the level is chosen">
        {LEVEL_RULES.map((rule) => {
          const active = rule.level === level;
          return (
            <li
              key={rule.level}
              aria-current={active ? 'true' : undefined}
              className={`rounded-xl px-2 py-2 text-center border ${
                active ? 'bg-white border-[#1C4A57] shadow-sm' : 'bg-[#FAF8F3] border-[#1C4A57]/10'
              }`}
            >
              <span className={`block text-[11px] font-semibold ${active ? 'text-[#1C4A57]/70' : 'text-[#1C4A57]/50'}`}>{rule.range}</span>
              <span className={`block text-xs font-black ${active ? 'text-[#1C4A57]' : 'text-[#1C4A57]/55'}`}>{rule.level}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function QuestionMix({ mix }) {
  const entries = DIFFICULTY_ORDER.map((d) => [d, Number(mix?.[d] || 0)]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return null;
  const summary = entries.map(([d, n]) => `${n} ${d}`).join(', ');
  return (
    <div className="space-y-2">
      <div className="flex h-9 rounded-xl overflow-hidden border border-[#1C4A57]/10" role="img" aria-label={`Question mix: ${summary}`}>
        {entries.filter(([, n]) => n > 0).map(([d, n], i) => (
          <div
            key={d}
            className={`flex items-center justify-center text-xs font-black min-w-[2rem] ${DIFFICULTY_STYLES[d]} ${i > 0 ? 'border-l border-white' : ''}`}
            style={{ flexGrow: n, flexBasis: 0 }}
          >
            {n}
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-[#1C4A57]/70 flex flex-wrap gap-x-3 gap-y-1" aria-hidden="true">
        {entries.map(([d, n], i) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-[#1C4A57]/30">·</span>}
            <span className={`w-2.5 h-2.5 rounded-sm ${DIFFICULTY_STYLES[d]} border border-[#1C4A57]/10`} />
            {d} {n}
          </span>
        ))}
      </p>
    </div>
  );
}

function FocusTopics({ topics }) {
  if (!topics?.length) {
    return (
      <p className="text-xs text-[#1C4A57]/60">
        No focus topics yet — questions are spread across all five roadmap steps.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {topics.map((t) => (
        <li key={t.step ?? t.title} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/10 space-y-1.5">
          <p className="text-sm font-bold text-[#1C4A57] break-words">
            {t.step ? <span className="text-[#1C4A57]/55">Step {t.step} · </span> : null}{t.title}
          </p>
          {t.skills?.length > 0 && (
            <p className="text-xs text-[#1C4A57]/65 break-words">{t.skills.join(', ')}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(t.reasons || []).map((reason) => {
              const r = REASONS[reason] || { label: reason.replace(/_/g, ' '), style: 'bg-[#CFE3E0] text-[#1C4A57]' };
              return (
                <span key={reason} className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${r.style}`}>
                  {r.label}
                </span>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AssessmentPlanCard({ plan, onOpenResume }) {
  const hasResume = !!plan.resume?.has_resume;
  const questionCount = plan.questions?.length || 0;
  return (
    <Card
      title="Your assessment plan"
      icon={Target}
      headingId="assessment-plan-heading"
      action={<span className="text-xs font-bold text-[#1C4A57]/60">{questionCount} questions · {plan.track}</span>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="space-y-5 min-w-0">
          <div className="space-y-2">
            <SectionLabel>Resume</SectionLabel>
            <ResumeStatus resume={plan.resume} onOpenResume={onOpenResume} />
          </div>
          <div className="space-y-2">
            <SectionLabel>Core skills</SectionLabel>
            <CoreSkills plan={plan} />
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          <div className="space-y-2">
            <SectionLabel>Your level</SectionLabel>
            <LevelRule level={plan.level} hasResume={hasResume} />
          </div>
          <div className="space-y-2">
            <SectionLabel>Question mix</SectionLabel>
            <QuestionMix mix={plan.mix} />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[#1C4A57]/10 space-y-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionLabel>Focus topics</SectionLabel>
          {plan.weak_topics?.length > 0 && (
            <span className="text-xs text-[#1C4A57]/60">These steps get extra questions.</span>
          )}
        </div>
        <FocusTopics topics={plan.weak_topics} />
      </div>
    </Card>
  );
}
