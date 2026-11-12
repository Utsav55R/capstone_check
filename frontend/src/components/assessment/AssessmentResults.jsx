import React, { forwardRef } from 'react';
import { ArrowRight, BarChart3, Layers, RotateCcw, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import AnswerReview from './AnswerReview';
import { Card, LevelBadge, PRIMARY_BUTTON, ProgressBar, SECONDARY_BUTTON } from './ui';

function scoreTone(pct) {
  if (pct >= 70) return { text: 'text-[#2E7D68]', pill: 'bg-[#E6F4F0] text-[#2E7D68]' };
  if (pct >= 50) return { text: 'text-[#B86E00]', pill: 'bg-[#FFF5E6] text-[#B86E00]' };
  return { text: 'text-[#D95D39]', pill: 'bg-[#FDEAE5] text-[#D95D39]' };
}

function Actions({ onOpenRoadmap, onRetake }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {onOpenRoadmap && (
        <button type="button" onClick={onOpenRoadmap} className={PRIMARY_BUTTON}>
          Open my roadmap <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
      <button type="button" onClick={onRetake} className={SECONDARY_BUTTON}>
        <RotateCcw className="w-4 h-4" aria-hidden="true" /> Retake with new questions
      </button>
    </div>
  );
}

function TopicList({ title, icon: Icon, items, tone, empty }) {
  const color = tone === 'good' ? 'text-[#2E7D68]' : 'text-[#D95D39]';
  return (
    <div>
      <h4 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${color}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {title}
      </h4>
      {items?.length ? (
        <ul className="flex flex-wrap gap-1.5 mt-2">
          {items.map((t) => (
            <li
              key={t}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${tone === 'good' ? 'bg-[#E6F4F0] text-[#2E7D68]' : 'bg-[#FDEAE5] text-[#D95D39]'}`}
            >
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#1C4A57]/60 mt-2">{empty}</p>
      )}
    </div>
  );
}

const AssessmentResults = forwardRef(function AssessmentResults(
  { result, questions, level, track, onOpenRoadmap, onRetake },
  headingRef
) {
  const score = Math.round(Number(result.overall_score) || 0);
  const tone = scoreTone(score);
  const correct = result.correct_answers ?? (result.results || []).filter((r) => r.is_correct).length;
  const total = result.total_questions ?? questions.length;
  const steps = [...(result.step_breakdown || [])].sort((a, b) => a.step - b.step);
  const dimensions = Object.entries(result.dimension_scores || {}).filter(
    ([, v]) => v !== null && v !== undefined && !Number.isNaN(Number(v))
  );

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm p-5 sm:p-6" aria-labelledby="assessment-result-heading">
        <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#FAF8F3] border border-[#1C4A57]/10 flex flex-col items-center justify-center shrink-0">
              <span className={`text-3xl sm:text-4xl font-black tabular-nums ${tone.text}`}>{score}%</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#1C4A57]/55">Score</span>
            </div>
            <div className="min-w-0 md:hidden">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D68]">Assessment complete</p>
              <p className="text-sm font-black text-[#1C4A57]">{correct} of {total} correct</p>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <p className="hidden md:block text-[11px] font-bold uppercase tracking-wider text-[#2E7D68]">Assessment complete</p>
            <h2
              id="assessment-result-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl sm:text-2xl font-black text-[#1C4A57] tracking-tight focus:outline-none"
            >
              {correct} of {total} correct
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {result.proficiency_tier && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tone.pill}`}>{result.proficiency_tier}</span>
              )}
              {level && <LevelBadge level={level} />}
              {track && <span className="text-xs font-semibold text-[#1C4A57]/60">{track}</span>}
            </div>
            <p role="status" className="text-xs text-[#1C4A57]/70">
              You scored {score}% on the {level ? `${level.toLowerCase()} ` : ''}mix.
              {result.updated_overall_readiness !== undefined && result.updated_overall_readiness !== null && (
                <> Placement readiness is now <span className="font-bold text-[#1C4A57]">{Math.round(result.updated_overall_readiness)}/100</span>.</>
              )}
            </p>
          </div>

          <div className="md:self-center">
            <Actions onOpenRoadmap={onOpenRoadmap} onRetake={onRetake} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card title="Results by roadmap step" icon={Layers} className="lg:col-span-7">
          {steps.length ? (
            <ul className="space-y-4">
              {steps.map((s) => {
                const ratio = s.total ? s.correct / s.total : 0;
                return (
                  <li key={s.step}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <span className="text-sm font-bold text-[#1C4A57] min-w-0 break-words">
                        <span className="text-[#1C4A57]/55">Step {s.step} · </span>{s.title}
                      </span>
                      <span className="text-xs font-black text-[#1C4A57] tabular-nums shrink-0">
                        {s.correct} / {s.total}
                      </span>
                    </div>
                    <ProgressBar
                      value={s.correct}
                      max={s.total}
                      tone={ratio >= 0.5 ? 'sage' : 'coral'}
                      label={`Step ${s.step} ${s.title}: ${s.correct} of ${s.total} correct`}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-[#1C4A57]/60">No per-step breakdown for this attempt.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 pt-5 border-t border-[#1C4A57]/10">
            <TopicList title="Topics to revise" icon={TrendingDown} items={result.weak_topics} tone="bad" empty="None — nice work." />
            <TopicList title="Strong topics" icon={TrendingUp} items={result.strong_topics} tone="good" empty="Keep practising to build strengths." />
          </div>
        </Card>

        <Card title="Evaluation dimensions" icon={BarChart3} className="lg:col-span-5">
          {dimensions.length ? (
            <ul className="space-y-4">
              {dimensions.map(([dim, value]) => {
                const v = Math.round(Number(value));
                return (
                  <li key={dim}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <span className="text-sm font-semibold text-[#1C4A57] min-w-0 break-words">{dim}</span>
                      <span className={`text-xs font-black tabular-nums ${scoreTone(v).text}`}>{v}%</span>
                    </div>
                    <ProgressBar value={v} max={100} tone={v >= 50 ? 'sage' : 'coral'} label={`${dim}: ${v}%`} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-[#1C4A57]/60">Dimension scores aren't available for this attempt.</p>
          )}
          {result.priority_actions?.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[#1C4A57]/10">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C4A57]/55 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Priority actions
              </h4>
              <ul className="mt-2 space-y-1.5">
                {result.priority_actions.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-xs text-[#1C4A57]/80 leading-relaxed">
                    {typeof a === 'string' ? a : a.title || a.action || a.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card bodyClassName="p-5 sm:p-6">
        <AnswerReview questions={questions} results={result.results} />
        {!result.results?.length && (
          <p className="text-xs text-[#1C4A57]/60">A per-question review isn't available for this attempt.</p>
        )}
      </Card>

      <div className="flex justify-end">
        <Actions onOpenRoadmap={onOpenRoadmap} onRetake={onRetake} />
      </div>
    </div>
  );
});

export default AssessmentResults;
