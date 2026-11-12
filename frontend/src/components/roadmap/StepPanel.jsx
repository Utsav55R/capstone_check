import React, { forwardRef } from 'react';
import {
  ArrowRight, CheckCircle2, Code2, ListChecks, Lock, RefreshCw, RotateCcw, ShieldCheck, Target, Trophy,
} from 'lucide-react';
import { DifficultyBadge, PRIMARY_BUTTON, ProgressBar, formatDate } from '../assessment/ui';
import { FocusBadge, STATUS_META } from './StepStepper';

const WEAK_REASON_TEXT = {
  missing_from_resume: 'missing from your resume',
  answered_wrong: 'answered wrong in an earlier assessment or quiz',
};

function Checklist({ step, pendingTopics, topicErrors, onToggleTopic }) {
  const locked = step.status === 'locked';
  const total = step.total_topics ?? step.topics?.length ?? 0;
  const checked = step.checked_count ?? (step.topics || []).filter((t) => t.checked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-[#1C4A57] flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#1C4A57]/70" aria-hidden="true" /> Study checklist
        </h3>
        <span className="text-xs font-bold text-[#1C4A57]/70 tabular-nums">{checked} / {total} topics</span>
      </div>
      <ProgressBar value={checked} max={total} label={`${checked} of ${total} topics ticked`} className="h-1.5" />

      {locked && (
        <p className="text-xs font-semibold text-[#1C4A57]/70 bg-[#FAF8F3] border border-[#1C4A57]/10 rounded-xl p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          Pass the Step {step.step - 1} quiz to unlock this checklist. You can still read the topics to plan ahead.
        </p>
      )}

      <ul className="space-y-2">
        {(step.topics || []).map((topic) => {
          const inputId = `topic-${topic.id}`;
          const errorId = `${inputId}-error`;
          const pending = pendingTopics.has(topic.id);
          const error = topicErrors[topic.id];
          return (
            <li key={topic.id}>
              <label
                htmlFor={inputId}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  locked
                    ? 'bg-[#FAF8F3] border-[#1C4A57]/10 cursor-not-allowed'
                    : topic.checked
                      ? 'bg-[#E6F4F0]/50 border-[#2E7D68]/25 cursor-pointer'
                      : 'bg-white border-[#1C4A57]/15 hover:border-[#1C4A57]/40 cursor-pointer'
                }`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={!!topic.checked}
                  disabled={locked}
                  aria-busy={pending || undefined}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(e) => onToggleTopic(step, topic, e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#2E7D68] cursor-pointer disabled:cursor-not-allowed"
                />
                <span className={`flex-1 min-w-0 text-sm break-words ${locked ? 'text-[#1C4A57]/60' : 'text-[#1C4A57] font-medium'}`}>
                  {topic.name}
                </span>
                {pending && (
                  <span className="shrink-0 mt-0.5 text-[#1C4A57]/50">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Saving</span>
                  </span>
                )}
              </label>
              {error && (
                <p id={errorId} role="alert" className="text-xs font-semibold text-[#D95D39] mt-1 ml-3">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#1C4A57]/10 p-2.5 min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#1C4A57]/55">{label}</dt>
      <dd className="text-sm font-black text-[#1C4A57] mt-0.5 tabular-nums break-words">{children}</dd>
    </div>
  );
}

function QuizCard({ step, questionsPerQuiz, passMark, onOpenQuiz }) {
  const quiz = step.quiz || {};
  const attempts = quiz.attempts || 0;
  const last = quiz.last_attempt;
  const locked = step.status === 'locked';
  const passPct = questionsPerQuiz ? Math.round((passMark / questionsPerQuiz) * 100) : 80;
  const allTicked = step.total_topics > 0 && step.checked_count >= step.total_topics;

  return (
    <div className="rounded-2xl border border-[#1C4A57]/15 bg-[#FAF8F3] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-[#1C4A57] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1C4A57]/70" aria-hidden="true" /> Step gate quiz
        </h3>
        {quiz.passed && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E6F4F0] text-[#2E7D68] flex items-center gap-1">
            <Trophy className="w-3 h-3" aria-hidden="true" /> Passed
          </span>
        )}
      </div>

      <ul className="space-y-1.5 text-xs font-semibold text-[#1C4A57]/80">
        <li className="flex items-center gap-2"><ListChecks className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {questionsPerQuiz} questions from this step's topics</li>
        <li className="flex items-center gap-2"><Target className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Pass with {passMark}/{questionsPerQuiz} ({passPct}%) to complete the step</li>
        <li className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Each retake uses different questions</li>
      </ul>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Attempts">{attempts}</Stat>
        <Stat label="Best">{attempts ? `${quiz.best_correct ?? 0}/${questionsPerQuiz}` : '—'}</Stat>
        <Stat label="Last">
          {last ? (
            <span className={last.passed ? 'text-[#2E7D68]' : 'text-[#D95D39]'}>{last.correct}/{last.total}</span>
          ) : '—'}
        </Stat>
      </dl>
      {last && (
        <p className="text-xs text-[#1C4A57]/65 -mt-1">
          Last attempt {last.passed ? 'passed' : 'not passed'}{last.submitted_at ? ` · ${formatDate(last.submitted_at)}` : ''}
        </p>
      )}

      {locked ? (
        <button type="button" disabled className={`${PRIMARY_BUTTON} w-full`}>
          <Lock className="w-4 h-4" aria-hidden="true" /> Complete Step {step.step - 1} to unlock
        </button>
      ) : (
        <button type="button" onClick={() => onOpenQuiz(step.step)} className={`${PRIMARY_BUTTON} w-full`}>
          {attempts ? <RotateCcw className="w-4 h-4" aria-hidden="true" /> : <ShieldCheck className="w-4 h-4" aria-hidden="true" />}
          {attempts ? 'Retake quiz' : 'Take quiz'}
        </button>
      )}

      {!locked && !quiz.passed && !allTicked && step.total_topics > 0 && (
        <p className="text-xs text-[#1C4A57]/65">
          Tip: you've ticked {step.checked_count} of {step.total_topics} topics. The quiz covers all of them.
        </p>
      )}
    </div>
  );
}

function PracticeList({ problems, onOpenProblem }) {
  if (!problems?.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-extrabold text-[#1C4A57] flex items-center gap-2">
        <Code2 className="w-4 h-4 text-[#1C4A57]/70" aria-hidden="true" /> Practice in Coding Practice
      </h3>
      <ul className="space-y-2">
        {problems.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpenProblem?.(p.id)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-white border border-[#1C4A57]/15 hover:border-[#1C4A57]/40 hover:bg-[#CFE3E0]/20 transition-colors group"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[#1C4A57] truncate">{p.title}</span>
                <span className="block text-[11px] font-semibold text-[#1C4A57]/60">{p.topic}</span>
              </span>
              <DifficultyBadge difficulty={p.difficulty} />
              <ArrowRight className="w-4 h-4 text-[#1C4A57]/40 group-hover:text-[#1C4A57] shrink-0" aria-hidden="true" />
              <span className="sr-only">Open in Coding Practice</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Details of the selected roadmap step: checklist, gate quiz card and linked coding problems.
const StepPanel = forwardRef(function StepPanel(
  { step, totalSteps, panelId, questionsPerQuiz, passMark, pendingTopics, topicErrors, onToggleTopic, onOpenQuiz, onOpenProblem },
  headingRef
) {
  const meta = STATUS_META[step.status] || STATUS_META.locked;
  return (
    <section
      role="tabpanel"
      id={panelId}
      aria-labelledby={`roadmap-step-tab-${step.step}`}
      className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm"
    >
      <header className="px-5 sm:px-6 py-5 border-b border-[#1C4A57]/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C4A57]/55">Step {step.step} of {totalSteps}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.pill}`}>{meta.label}</span>
          {step.is_weak && <FocusBadge />}
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl sm:text-2xl font-black text-[#1C4A57] tracking-tight mt-1.5 focus:outline-none">
          {step.title}
        </h2>
        {step.subtitle && <p className="text-sm font-semibold text-[#1C4A57]/70 mt-0.5">{step.subtitle}</p>}
        {step.description && <p className="text-sm text-[#1C4A57]/80 mt-2 leading-relaxed max-w-3xl">{step.description}</p>}
        {step.is_weak && step.weak_reasons?.length > 0 && (
          <p className="text-xs font-semibold text-[#D95D39] mt-2">
            Focus step: {step.weak_reasons.map((r) => WEAK_REASON_TEXT[r] || r.replace(/_/g, ' ')).join(' · ')}
          </p>
        )}
        {step.status === 'completed' && (
          <p className="text-xs font-bold text-[#2E7D68] mt-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Step completed — you passed the gate quiz.
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 p-5 sm:p-6 lg:border-r border-[#1C4A57]/10">
          <Checklist step={step} pendingTopics={pendingTopics} topicErrors={topicErrors} onToggleTopic={onToggleTopic} />
        </div>
        <div className="lg:col-span-5 p-5 sm:p-6 space-y-6 border-t lg:border-t-0 border-[#1C4A57]/10">
          <QuizCard step={step} questionsPerQuiz={questionsPerQuiz} passMark={passMark} onOpenQuiz={onOpenQuiz} />
          <PracticeList problems={step.coding_problems} onOpenProblem={onOpenProblem} />
        </div>
      </div>
    </section>
  );
});

export default StepPanel;
