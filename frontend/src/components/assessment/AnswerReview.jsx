import React, { useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { DifficultyBadge, optionLetter } from './ui';

function AnswerLine({ label, question, optionIdx, tone }) {
  const color = tone === 'good' ? 'text-[#2E7D68]' : tone === 'bad' ? 'text-[#D95D39]' : 'text-[#1C4A57]/60';
  const answered = optionIdx !== null && optionIdx !== undefined && question.options?.[optionIdx] !== undefined;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2 text-sm">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#1C4A57]/55 sm:w-28 shrink-0 sm:pt-0.5">{label}</span>
      <span className={`font-semibold break-words min-w-0 ${color}`}>
        {answered ? (
          <>
            <span className="font-black">{optionLetter(optionIdx)}.</span> {question.options[optionIdx]}
          </>
        ) : (
          <span className="italic">Not answered</span>
        )}
      </span>
    </div>
  );
}

// Per-question review after a submission: the student's choice, the correct option and why.
export default function AnswerReview({ questions, results, showStep = true, title = 'Review your answers' }) {
  const [mistakesOnly, setMistakesOnly] = useState(false);

  const rows = useMemo(() => {
    const byId = new Map((results || []).map((r) => [String(r.id), r]));
    return questions
      .map((q, index) => ({ q, index, r: byId.get(String(q.id)) }))
      .filter((row) => row.r);
  }, [questions, results]);

  const mistakes = rows.filter((row) => !row.r.is_correct).length;
  const visible = mistakesOnly ? rows.filter((row) => !row.r.is_correct) : rows;

  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-[#1C4A57]">{title}</h3>
        {mistakes > 0 && mistakes < rows.length && (
          <button
            type="button"
            aria-pressed={mistakesOnly}
            onClick={() => setMistakesOnly((v) => !v)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
              mistakesOnly
                ? 'bg-[#1C4A57] text-[#F1EEE3] border-[#1C4A57]'
                : 'bg-white text-[#1C4A57] border-[#1C4A57]/20 hover:border-[#1C4A57]'
            }`}
          >
            {mistakesOnly ? `Showing ${mistakes} mistake${mistakes === 1 ? '' : 's'}` : `Show only mistakes (${mistakes})`}
          </button>
        )}
      </div>

      <ol className="space-y-3">
        {visible.map(({ q, index, r }) => {
          const correct = r.is_correct;
          return (
            <li
              key={q.id}
              className={`rounded-2xl border p-4 sm:p-5 ${
                correct ? 'bg-[#E6F4F0]/50 border-[#2E7D68]/25' : 'bg-[#FDEAE5]/60 border-[#D95D39]/25'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {correct ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D68] shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#D95D39] shrink-0" aria-hidden="true" />
                )}
                <span className={`text-xs font-black ${correct ? 'text-[#2E7D68]' : 'text-[#D95D39]'}`}>
                  Q{index + 1} · {correct ? 'Correct' : 'Incorrect'}
                </span>
                <DifficultyBadge difficulty={q.difficulty} />
                {showStep && q.step && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#CFE3E0] text-[#1C4A57] whitespace-nowrap">
                    Step {q.step}{q.step_title ? ` · ${q.step_title}` : ''}
                  </span>
                )}
                {q.topic && <span className="text-[11px] font-semibold text-[#1C4A57]/60">{q.topic}</span>}
              </div>

              <p className="text-sm font-bold text-[#1C4A57] leading-relaxed break-words whitespace-pre-line">{q.question}</p>

              <div className="mt-3 space-y-1.5">
                <AnswerLine label="Your answer" question={q} optionIdx={r.chosen} tone={correct ? 'good' : 'bad'} />
                {!correct && <AnswerLine label="Correct answer" question={q} optionIdx={r.correct_option} tone="good" />}
              </div>

              {r.explanation && (
                <p className="mt-3 text-xs text-[#1C4A57]/80 leading-relaxed bg-white rounded-xl border border-[#1C4A57]/10 p-3 flex gap-2">
                  <Lightbulb className="w-4 h-4 shrink-0 text-[#B86E00]" aria-hidden="true" />
                  <span className="min-w-0 break-words">{r.explanation}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
