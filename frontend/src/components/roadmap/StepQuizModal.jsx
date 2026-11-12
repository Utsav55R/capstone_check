import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, PartyPopper, RefreshCw, RotateCcw, Send, ShieldCheck, Unlock, X, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import AnswerReview from '../assessment/AnswerReview';
import QuestionCard from '../assessment/QuestionCard';
import { ErrorBanner, PRIMARY_BUTTON, ProgressBar, SECONDARY_BUTTON, SkeletonBlock } from '../assessment/ui';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Gate quiz for one roadmap step. Every open (and every retake) starts a NEW attempt on the
// server, which picks questions this student hasn't seen recently for the step.
export default function StepQuizModal({ token, field, step, totalSteps, passMark: defaultPassMark, onClose, onSubmitted, onContinue }) {
  const [phase, setPhase] = useState('loading'); // loading | error | answering | submitting | result
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attemptNumber, setAttemptNumber] = useState((step.quiz?.attempts || 0) + 1);
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const resultHeadingRef = useRef(null);
  const startedRef = useRef(false);
  const latestStart = useRef(0);
  const backdropPressed = useRef(false);

  const titleId = `step-quiz-title-${step.step}`;
  const passMark = attempt?.pass_mark ?? defaultPassMark ?? 4;
  const questions = attempt?.questions || [];
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = questions.length > 0 && answered === questions.length;

  const startAttempt = useCallback(async () => {
    const id = ++latestStart.current;
    setPhase('loading');
    setError('');
    setAnswers({});
    setResult(null);
    scrollRef.current?.scrollTo?.({ top: 0 });
    try {
      const data = await api.startStepQuiz(token, field, step.step);
      if (id !== latestStart.current) return;
      setAttempt(data);
      setPhase('answering');
    } catch (err) {
      if (id !== latestStart.current) return;
      setError(err.message);
      setPhase('error');
    }
  }, [token, field, step.step]);

  useEffect(() => {
    if (startedRef.current) return; // guard against StrictMode double-invoking the effect
    startedRef.current = true;
    startAttempt();
  }, [startAttempt]);

  // Focus management: focus the dialog on open, restore focus to the opener on close, lock page scroll.
  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // If focus still escapes to the page behind (e.g. Tab back in from the browser UI), pull it back.
    const keepFocusInside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) dialogRef.current.focus();
    };
    document.addEventListener('focusin', keepFocusInside);
    return () => {
      document.removeEventListener('focusin', keepFocusInside);
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, []);

  const busy = phase === 'submitting';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  useEffect(() => {
    if (phase === 'result') {
      scrollRef.current?.scrollTo?.({ top: 0 });
      resultHeadingRef.current?.focus();
    }
  }, [phase]);

  // Keep Tab / Shift+Tab inside the dialog.
  const trapFocus = (e) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    // Only real tab stops: roving radio options that aren't the group's tab stop have tabIndex -1.
    const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null && n.tabIndex >= 0);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered || busy || !attempt) return;
    setPhase('submitting');
    setError('');
    try {
      const data = await api.submitStepQuiz(token, attempt.attempt_id, answers);
      setResult(data);
      setPhase('result');
      onSubmitted?.(data);
    } catch (err) {
      setError(err.message);
      setPhase('answering');
    }
  };

  // Retake / retry unmount the focused button, so park focus on the dialog while the new attempt loads.
  const restartAttempt = () => {
    dialogRef.current?.focus();
    startAttempt();
  };

  const handleRetake = () => {
    setAttemptNumber((n) => n + 1);
    restartAttempt();
  };

  // Close on a backdrop click only when the press also started on the backdrop. Pressing the overlay's
  // scrollbar fires mousedown on it but no click, and a text selection dragged out of the dialog
  // starts inside it.
  const handleBackdropMouseDown = (e) => {
    backdropPressed.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e) => {
    const pressed = backdropPressed.current;
    backdropPressed.current = false;
    // A stray backdrop click must not throw away answers in progress; Escape and the close button still work.
    if (pressed && e.target === e.currentTarget && !busy && !(phase === 'answering' && answered > 0)) onClose();
  };

  const nextStep = result
    ? result.next_step_unlocked || (result.passed && step.step < totalSteps ? step.step + 1 : null)
    : null;

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-[60] bg-[#0C2229]/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-[#1C4A57]/15 my-auto focus:outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl sm:rounded-t-3xl px-4 sm:px-7 py-4 border-b border-[#1C4A57]/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1C4A57]/55 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Step {step.step} gate quiz · Attempt {attemptNumber}
              </p>
              <h2 id={titleId} className="text-lg font-black text-[#1C4A57] break-words">{step.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close quiz"
              className="p-2 rounded-lg text-[#1C4A57]/60 hover:text-[#1C4A57] hover:bg-[#FAF8F3] transition-colors shrink-0 disabled:opacity-40"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          {(phase === 'answering' || phase === 'submitting') && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#1C4A57]">
                <span>{answered} / {questions.length} answered</span>
                <span className="text-[#1C4A57]/60 font-semibold">Pass mark {passMark}/{questions.length}</span>
              </div>
              <ProgressBar value={answered} max={questions.length} label="Quiz questions answered" className="h-1.5" />
            </div>
          )}
        </div>

        <div className="px-4 sm:px-7 py-5 sm:py-6 space-y-4">
          {phase === 'loading' && (
            <div className="space-y-4" aria-busy="true">
              <p className="text-sm font-semibold text-[#1C4A57]/70 flex items-center gap-2" role="status">
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Picking fresh questions for you…
              </p>
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="rounded-2xl bg-[#FAF8F3] border border-[#1C4A57]/10 p-5 space-y-3">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-5 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from({ length: 4 }, (_, j) => <SkeletonBlock key={j} className="h-10 w-full" />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-4">
              <ErrorBanner message={`Couldn't start the quiz: ${error}`} onRetry={restartAttempt} />
              <div className="flex justify-end">
                <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Close</button>
              </div>
            </div>
          )}

          {(phase === 'answering' || phase === 'submitting') && (
            <>
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  idPrefix={`quiz-${attempt.attempt_id}`}
                  question={q}
                  index={i}
                  total={questions.length}
                  selected={answers[q.id]}
                  onSelect={(qid, idx) => setAnswers((prev) => ({ ...prev, [qid]: idx }))}
                  disabled={busy}
                  showStep={false}
                />
              ))}
              {error && <ErrorBanner message={`Couldn't submit: ${error}`} />}
            </>
          )}

          {phase === 'result' && result && (
            <div className="space-y-5">
              <div
                role="status"
                aria-live="polite"
                className={`rounded-2xl border p-4 sm:p-5 ${
                  result.passed ? 'bg-[#E6F4F0] border-[#2E7D68]/30' : 'bg-[#FDEAE5] border-[#D95D39]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.passed ? (
                    <CheckCircle2 className="w-7 h-7 text-[#2E7D68] shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-7 h-7 text-[#D95D39] shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0 space-y-1">
                    <h3
                      ref={resultHeadingRef}
                      tabIndex={-1}
                      className={`text-lg font-black focus:outline-none ${result.passed ? 'text-[#2E7D68]' : 'text-[#D95D39]'}`}
                    >
                      {result.passed ? 'Passed' : 'Not passed yet'} — {result.correct} / {result.total} correct
                    </h3>
                    <p className="text-sm text-[#1C4A57]">
                      {result.passed
                        ? `Step ${step.step} is complete — you needed ${passMark} of ${result.total}.`
                        : `You need ${passMark} of ${result.total} to pass. Review the explanations below, then retake — you'll get different questions.`}
                    </p>
                    {result.next_step_unlocked && (
                      <p className="text-sm font-bold text-[#2E7D68] flex items-center gap-1.5">
                        <Unlock className="w-4 h-4" aria-hidden="true" /> Step {result.next_step_unlocked} unlocked
                      </p>
                    )}
                    {result.passed && step.step === totalSteps && (
                      <p className="text-sm font-bold text-[#2E7D68] flex items-center gap-1.5">
                        <PartyPopper className="w-4 h-4" aria-hidden="true" /> You've completed every step of this roadmap.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <AnswerReview questions={questions} results={result.results} showStep={false} />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(phase === 'answering' || phase === 'submitting' || phase === 'result') && (
          <div className="sticky bottom-0 bg-white rounded-b-2xl sm:rounded-b-3xl px-4 sm:px-7 py-4 border-t border-[#1C4A57]/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            {phase === 'result' ? (
              <>
                <button type="button" onClick={handleRetake} className={SECONDARY_BUTTON}>
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> Retake with new questions
                </button>
                <button type="button" onClick={() => onContinue(nextStep)} className={PRIMARY_BUTTON}>
                  {nextStep ? `Continue to Step ${nextStep}` : 'Continue'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[#1C4A57]/65">
                  {allAnswered ? 'All questions answered — ready to submit.' : `Answer all ${questions.length} questions to submit.`}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  aria-disabled={busy || undefined}
                  className={`${PRIMARY_BUTTON} ${busy ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {busy ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Checking…</>
                  ) : (
                    <><Send className="w-4 h-4" aria-hidden="true" /> Submit quiz</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
