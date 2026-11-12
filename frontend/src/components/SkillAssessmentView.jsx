import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Compass, RefreshCw, Send } from 'lucide-react';
import { api } from '../services/api';
import AssessmentPlanCard from './assessment/AssessmentPlanCard';
import AssessmentResults from './assessment/AssessmentResults';
import QuestionCard from './assessment/QuestionCard';
import { Card, EmptyState, ErrorBanner, PRIMARY_BUTTON, ProgressBar, SECONDARY_BUTTON, SkeletonBlock } from './assessment/ui';

function PlanSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your assessment plan">
      <div className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm p-6 space-y-5">
        <SkeletonBlock className="h-4 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SkeletonBlock className="h-16 w-full" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }, (_, i) => <SkeletonBlock key={i} className="h-7 w-24" />)}
            </div>
          </div>
          <div className="space-y-3">
            <SkeletonBlock className="h-8 w-40" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-9 w-full" />
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm p-6 space-y-4">
          <SkeletonBlock className="h-4 w-56" />
          <SkeletonBlock className="h-5 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Array.from({ length: 4 }, (_, j) => <SkeletonBlock key={j} className="h-11 w-full" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SkillAssessmentView({ token, targetRole, onProfileUpdated, onOpenRoadmap, onOpenResume }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { message, status }
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmingPartial, setConfirmingPartial] = useState(false);
  const [result, setResult] = useState(null);
  const latestLoad = useRef(0);
  const topRef = useRef(null);
  const resultHeadingRef = useRef(null);
  const submitButtonRef = useRef(null);

  const loadPlan = useCallback(async () => {
    // Ignore responses from an earlier track if the role changed while loading
    const loadId = ++latestLoad.current;
    setLoading(true);
    setLoadError(null);
    setResult(null);
    setAnswers({});
    setSubmitting(false);
    setSubmitError('');
    setConfirmingPartial(false);
    try {
      const data = await api.getAssessmentPlan(token, targetRole);
      if (loadId !== latestLoad.current) return;
      setPlan(data);
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      setPlan(null);
      setLoadError({ message: err.message, status: err.status });
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [token, targetRole]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Move focus to the results heading once they render, so keyboard and screen-reader users land on them.
  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  const questions = plan?.questions || [];
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers]
  );
  const unanswered = questions.filter((q) => answers[q.id] === undefined);

  const handleSelect = (questionId, optionIdx) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setConfirmingPartial(false);
  };

  const submit = async () => {
    if (submitting || !plan) return;
    // A role change while submitting reloads the plan; the old track's result must not land on the new questions.
    const loadId = latestLoad.current;
    setConfirmingPartial(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = await api.submitAssessment(
        token, plan.track || targetRole, answers, questions.map((q) => q.id), plan.level, plan.attempt_id
      );
      if (loadId !== latestLoad.current) return;
      setResult(data);
      onProfileUpdated?.();
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      setSubmitError(`Submission failed: ${err.message}`);
      submitButtonRef.current?.focus();
    } finally {
      if (loadId === latestLoad.current) setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (!questions.length || submitting) return;
    if (unanswered.length > 0) {
      setConfirmingPartial(true);
      return;
    }
    submit();
  };

  const goToFirstUnanswered = () => {
    const first = unanswered[0];
    if (!first) return;
    setConfirmingPartial(false);
    const el = document.getElementById(`assess-${first.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.querySelector('[role="radio"]')?.focus({ preventScroll: true });
  };

  const notAvailable = loadError?.status === 404;

  return (
    <div ref={topRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 scroll-mt-20">
      {/* Header */}
      <div className="bg-[#EAE5D6] rounded-2xl p-5 border border-[#1C4A57]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-[#1C4A57] tracking-tight">Skill Assessment</h1>
            <span className="bg-[#1C4A57] text-[#CFE3E0] text-xs font-semibold px-2.5 py-0.5 rounded-full">Signal 02</span>
          </div>
          <p className="text-sm text-[#1C4A57]/80 mt-1 max-w-3xl">
            Ten questions for <span className="font-bold">{plan?.track || targetRole}</span>, picked from your resume. The mix always
            includes every level, so you can show advanced knowledge even if your resume is short.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#1C4A57] bg-[#CFE3E0] px-3 py-1.5 rounded-lg border border-[#1C4A57]/20 self-start md:self-auto whitespace-nowrap">
          <ClipboardCheck className="w-4 h-4" aria-hidden="true" /> Resume → Assessment → Roadmap
        </div>
      </div>

      {loading && <PlanSkeleton />}

      {!loading && notAvailable && (
        <EmptyState
          icon={Compass}
          title={`The ${targetRole} assessment is coming soon`}
          action={
            <button type="button" onClick={loadPlan} className={SECONDARY_BUTTON}>
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Check again
            </button>
          }
        >
          <p>{loadError.message}</p>
          <p className="mt-2">
            Full Stack Developer and AI / ML Engineer are available now — switch your target role from the top bar to try one.
          </p>
        </EmptyState>
      )}

      {!loading && loadError && !notAvailable && (
        <ErrorBanner message={`Couldn't load your assessment: ${loadError.message}`} onRetry={loadPlan} />
      )}

      {!loading && plan && result && (
        <AssessmentResults
          ref={resultHeadingRef}
          result={result}
          questions={questions}
          level={plan.level}
          track={plan.track || targetRole}
          onOpenRoadmap={onOpenRoadmap}
          onRetake={() => {
            loadPlan();
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {!loading && plan && !result && (
        <>
          <AssessmentPlanCard plan={plan} onOpenResume={onOpenResume} />

          {questions.length === 0 ? (
            <EmptyState icon={Compass} title="No questions available yet">
              The question bank for this field is still being written. Please check back soon.
            </EmptyState>
          ) : (
            <Card
              title="Questions"
              icon={CheckCircle2}
              headingId="assessment-questions-heading"
              action={
                <span className="text-xs font-bold text-[#1C4A57]/70 tabular-nums">
                  {answeredCount} / {questions.length} answered
                </span>
              }
            >
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    idPrefix="assess"
                    question={q}
                    index={i}
                    total={questions.length}
                    selected={answers[q.id]}
                    onSelect={handleSelect}
                    disabled={submitting}
                    highlight={confirmingPartial && answers[q.id] === undefined}
                  />
                ))}
              </div>

              {/* Sticky progress + submit bar */}
              <div className="sticky bottom-3 z-10 mt-6">
                <div className="bg-white rounded-2xl border border-[#1C4A57]/20 shadow-lg p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1C4A57] mb-1.5">
                        <span>{answeredCount} / {questions.length} answered</span>
                        <span className="text-[#1C4A57]/55 font-semibold">{plan.level} mix</span>
                      </div>
                      <ProgressBar value={answeredCount} max={questions.length} label="Questions answered" />
                    </div>
                    <button
                      ref={submitButtonRef}
                      type="button"
                      onClick={handleSubmitClick}
                      aria-disabled={submitting || undefined}
                      className={`${PRIMARY_BUTTON} sm:w-auto w-full ${submitting ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {submitting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Checking answers…</>
                      ) : (
                        <><Send className="w-4 h-4" aria-hidden="true" /> Submit assessment</>
                      )}
                    </button>
                  </div>

                  {confirmingPartial && (
                    <div role="alert" className="rounded-xl bg-[#FFF5E6] border border-[#B86E00]/25 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <p className="text-xs font-semibold text-[#1C4A57] flex items-start gap-2 flex-1">
                        <AlertTriangle className="w-4 h-4 text-[#B86E00] shrink-0" aria-hidden="true" />
                        {unanswered.length} question{unanswered.length === 1 ? ' is' : 's are'} unanswered and will be marked wrong. Submit anyway?
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={goToFirstUnanswered} className={`${SECONDARY_BUTTON} !text-xs !px-3 !py-2`}>
                          Review unanswered
                        </button>
                        <button type="button" onClick={submit} className={`${PRIMARY_BUTTON} !text-xs !px-3 !py-2`}>
                          Submit anyway
                        </button>
                      </div>
                    </div>
                  )}

                  {submitError && <ErrorBanner message={submitError} />}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
