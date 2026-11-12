import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, Flag, Map, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import StepStepper from './roadmap/StepStepper';
import StepPanel from './roadmap/StepPanel';
import StepQuizModal from './roadmap/StepQuizModal';
import ProjectsPanel from './roadmap/ProjectsPanel';
import { Card, EmptyState, ErrorBanner, ProgressBar, SECONDARY_BUTTON, SkeletonBlock } from './assessment/ui';

const PANEL_ID = 'roadmap-step-panel';

// Recompute a step's tick count after a local (optimistic) change.
function withTopic(roadmap, stepNumber, topicId, checked, serverCounts) {
  if (!roadmap) return roadmap;
  return {
    ...roadmap,
    steps: roadmap.steps.map((s) => {
      if (s.step !== stepNumber) return s;
      const topics = s.topics.map((t) => (t.id === topicId ? { ...t, checked } : t));
      return {
        ...s,
        topics,
        checked_count: serverCounts?.checked_count ?? topics.filter((t) => t.checked).length,
        total_topics: serverCounts?.total_topics ?? s.total_topics ?? topics.length,
      };
    }),
  };
}

function defaultStep(roadmap) {
  const steps = roadmap?.steps || [];
  if (!steps.length) return null;
  if (roadmap.current_step && steps.some((s) => s.step === roadmap.current_step)) return roadmap.current_step;
  return (steps.find((s) => s.status === 'in_progress') || steps[steps.length - 1]).step;
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your roadmap">
      <div className="rounded-2xl bg-[#1C4A57] p-6 space-y-3 animate-pulse">
        <div className="h-3 w-32 rounded bg-white/15" />
        <div className="h-7 w-72 max-w-full rounded bg-white/20" />
        <div className="h-2 w-full rounded bg-white/15" />
      </div>
      <div className="flex flex-col md:grid md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => <SkeletonBlock key={i} className="h-20 md:h-32 rounded-2xl" />)}
      </div>
      <div className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm p-6 space-y-4">
        <SkeletonBlock className="h-6 w-56" />
        <SkeletonBlock className="h-4 w-full max-w-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-7 space-y-2">
            {Array.from({ length: 6 }, (_, i) => <SkeletonBlock key={i} className="h-11 w-full rounded-xl" />)}
          </div>
          <SkeletonBlock className="lg:col-span-5 h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function RoadmapView({ token, targetRole, onOpenProblem, onProfileUpdated }) {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { message, status }
  const [selectedStep, setSelectedStep] = useState(null);
  const [quizStep, setQuizStep] = useState(null);
  const [pendingTopics, setPendingTopics] = useState(() => new Set());
  const [topicErrors, setTopicErrors] = useState({});
  const latestLoad = useRef(0);
  const panelHeadingRef = useRef(null);
  const focusPanelOnSelect = useRef(false);
  const pendingRef = useRef(new Set());
  const latestRecs = useRef(0);
  const recsTimer = useRef(null);

  const loadRoadmap = useCallback(async ({ silent = false } = {}) => {
    const loadId = ++latestLoad.current;
    latestRecs.current++; // a full load brings its own recommendations
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const data = await api.getRoadmap(token, targetRole);
      if (loadId !== latestLoad.current) return;
      setRoadmap(data);
      setLoadError(null);
      setSelectedStep((prev) => (silent && data.steps?.some((s) => s.step === prev) ? prev : defaultStep(data)));
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      if (!silent) {
        setRoadmap(null);
        setLoadError({ message: err.message, status: err.status });
      }
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [token, targetRole]);

  useEffect(() => {
    setQuizStep(null);
    setTopicErrors({});
    clearTimeout(recsTimer.current);
    loadRoadmap();
  }, [loadRoadmap]);

  useEffect(() => () => clearTimeout(recsTimer.current), []);

  // Ticks and project submissions change the server's "Recommended next steps". Re-read just that list
  // (debounced, so a burst of ticks costs one request) without replacing the rest of the local state.
  const refreshRecommendations = (field) => {
    clearTimeout(recsTimer.current);
    recsTimer.current = setTimeout(async () => {
      const id = ++latestRecs.current;
      try {
        const data = await api.getRoadmap(token, field);
        if (id !== latestRecs.current) return;
        setRoadmap((prev) => (prev?.field === data.field
          ? { ...prev, recommended_next_steps: data.recommended_next_steps || [] }
          : prev));
      } catch {
        // Keep the current list; the next full load refreshes it.
      }
    }, 600);
  };

  // After "Continue" in the quiz, move focus to the newly selected step's heading.
  useEffect(() => {
    if (focusPanelOnSelect.current) {
      focusPanelOnSelect.current = false;
      panelHeadingRef.current?.focus();
    }
  }, [selectedStep]);

  const setPending = (topicId, on) => {
    if (on) pendingRef.current.add(topicId);
    else pendingRef.current.delete(topicId);
    setPendingTopics(new Set(pendingRef.current));
  };

  const handleToggleTopic = async (step, topic, checked) => {
    if (step.status === 'locked' || pendingRef.current.has(topic.id) || !roadmap) return;
    const field = roadmap.field;
    setPending(topic.id, true);
    setTopicErrors((prev) => ({ ...prev, [topic.id]: undefined }));
    setRoadmap((prev) => withTopic(prev, step.step, topic.id, checked)); // optimistic
    try {
      const res = await api.setRoadmapTopic(token, field, topic.id, checked);
      setRoadmap((prev) => (prev?.field === field
        ? withTopic(prev, res.step ?? step.step, topic.id, res.checked ?? checked, res)
        : prev));
      refreshRecommendations(field);
    } catch (err) {
      setRoadmap((prev) => (prev?.field === field ? withTopic(prev, step.step, topic.id, !checked) : prev));
      setTopicErrors((prev) => ({ ...prev, [topic.id]: `Couldn't save: ${err.message}` }));
    } finally {
      setPending(topic.id, false);
    }
  };

  const handleQuizSubmitted = (response) => {
    if (response?.roadmap?.steps) {
      latestRecs.current++; // drop an older recommendations read; this roadmap is newer
      setRoadmap(response.roadmap);
    } else {
      loadRoadmap({ silent: true });
    }
  };

  const handleQuizContinue = (nextStep) => {
    setQuizStep(null);
    if (nextStep && roadmap?.steps?.some((s) => s.step === nextStep)) {
      focusPanelOnSelect.current = true;
      setSelectedStep(nextStep);
    }
  };

  const handleProjectSaved = (data) => {
    const saved = data?.project;
    if (saved?.id) {
      setRoadmap((prev) => prev && ({
        ...prev,
        projects: (prev.projects || []).map((p) => (p.id === saved.id ? { ...p, ...saved } : p)),
      }));
      if (roadmap?.field) refreshRecommendations(roadmap.field);
    } else {
      loadRoadmap({ silent: true });
    }
    onProfileUpdated?.();
  };

  const closeQuiz = useCallback(() => setQuizStep(null), []);

  const steps = roadmap?.steps || [];
  const totalSteps = roadmap?.total_steps || steps.length || 5;
  const completed = roadmap?.completed_steps ?? steps.filter((s) => s.status === 'completed').length;
  const allDone = steps.length > 0 && completed >= totalSteps;
  const current = roadmap?.current_step;
  const selected = steps.find((s) => s.step === selectedStep) || steps[0];
  const quizStepObj = quizStep ? steps.find((s) => s.step === quizStep) : null;
  const notAvailable = loadError?.status === 404;
  const fieldName = roadmap?.field || targetRole;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {loading && <RoadmapSkeleton />}

      {!loading && notAvailable && (
        <EmptyState
          icon={Compass}
          title="Roadmap for this field is coming soon"
          action={
            <button type="button" onClick={() => loadRoadmap()} className={SECONDARY_BUTTON}>
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Check again
            </button>
          }
        >
          <p>{loadError.message}</p>
          <p className="mt-2">
            The 5-step roadmaps for Full Stack Developer and AI / ML Engineer are ready now — switch your target role from the top bar to start one.
          </p>
        </EmptyState>
      )}

      {!loading && loadError && !notAvailable && (
        <ErrorBanner message={`Couldn't load your roadmap: ${loadError.message}`} onRetry={() => loadRoadmap()} />
      )}

      {!loading && roadmap && selected && (
        <>
          {/* Header banner */}
          <section className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#1C4A57] to-[#143741] text-[#F1EEE3] shadow-sm relative overflow-hidden" aria-labelledby="roadmap-heading">
            <div className="absolute -top-16 -right-10 w-56 h-56 bg-[#2E7D68]/40 rounded-full blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#CFE3E0]/80 flex items-center gap-1.5">
                  <Map className="w-3.5 h-3.5" aria-hidden="true" /> Learning roadmap
                </p>
                <h1 id="roadmap-heading" className="text-2xl sm:text-3xl font-black tracking-tight text-[#F1EEE3] mt-1 break-words">
                  {fieldName} Roadmap
                </h1>
                <p className="text-sm text-[#CFE3E0]/85 mt-1 max-w-2xl">
                  Tick off topics as you study, then pass each step's gate quiz to unlock the next one.
                </p>
              </div>
              <div className="md:w-72 shrink-0 space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-lg font-black text-[#F1EEE3]">
                    {allDone ? 'All steps done' : `Step ${current || selected.step} of ${totalSteps}`}
                  </span>
                  <span className="text-xs font-bold text-[#CFE3E0]/85 tabular-nums">{completed} / {totalSteps} completed</span>
                </div>
                <ProgressBar value={completed} max={totalSteps} tone="light" label={`${completed} of ${totalSteps} steps completed`} />
              </div>
            </div>
          </section>

          <StepStepper
            steps={steps}
            selectedStep={selected.step}
            currentStep={current}
            onSelect={setSelectedStep}
            panelId={PANEL_ID}
          />

          <StepPanel
            ref={panelHeadingRef}
            step={selected}
            totalSteps={totalSteps}
            panelId={PANEL_ID}
            questionsPerQuiz={roadmap.questions_per_quiz || 5}
            passMark={roadmap.pass_mark || 4}
            pendingTopics={pendingTopics}
            topicErrors={topicErrors}
            onToggleTopic={handleToggleTopic}
            onOpenQuiz={setQuizStep}
            onOpenProblem={onOpenProblem}
          />

          <ProjectsPanel
            projects={roadmap.projects}
            token={token}
            field={roadmap.field}
            onProjectSaved={handleProjectSaved}
          />

          {roadmap.recommended_next_steps?.length > 0 && (
            <Card title="Recommended next steps" icon={Sparkles}>
              <ol className="space-y-2">
                {roadmap.recommended_next_steps.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/10">
                    <span className="w-6 h-6 rounded-full bg-[#1C4A57] text-[#CFE3E0] flex items-center justify-center text-xs font-black shrink-0" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-[#1C4A57] mt-0.5 min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ol>
              {allDone && (
                <p className="mt-4 text-xs font-bold text-[#2E7D68] flex items-center gap-1.5">
                  <Flag className="w-4 h-4" aria-hidden="true" /> Roadmap complete — keep your projects polished for interviews.
                </p>
              )}
            </Card>
          )}

          {quizStepObj && (
            <StepQuizModal
              key={quizStepObj.step}
              token={token}
              field={roadmap.field}
              step={quizStepObj}
              totalSteps={totalSteps}
              passMark={roadmap.pass_mark || 4}
              onClose={closeQuiz}
              onSubmitted={handleQuizSubmitted}
              onContinue={handleQuizContinue}
            />
          )}
        </>
      )}
    </div>
  );
}
