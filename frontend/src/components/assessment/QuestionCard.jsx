import React, { useRef } from 'react';
import { DifficultyBadge, optionLetter } from './ui';

// One multiple-choice question rendered as an accessible radio group.
// Used by the skill assessment and by the roadmap step gate quiz.
export default function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  disabled = false,
  showStep = true,
  highlight = false,
  idPrefix = 'q',
}) {
  const optionRefs = useRef([]);
  const questionId = `${idPrefix}-${question.id}-text`;
  const hasSelection = selected !== undefined && selected !== null;

  const choose = (idx) => {
    if (disabled) return;
    onSelect(question.id, idx);
  };

  // Arrow keys move (and select) within the group, as in a native radio group.
  const handleKeyDown = (e, idx) => {
    const count = question.options.length;
    let next = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (idx + 1) % count;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (idx - 1 + count) % count;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = count - 1;
    if (next === null) return;
    e.preventDefault();
    choose(next);
    optionRefs.current[next]?.focus();
  };

  return (
    <article
      id={`${idPrefix}-${question.id}`}
      className={`p-4 sm:p-5 rounded-2xl border transition-colors scroll-mt-24 ${
        highlight ? 'bg-[#FDEAE5]/60 border-[#D95D39]/40' : 'bg-[#FAF8F3] border-[#1C4A57]/10'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="bg-[#1C4A57] text-[#CFE3E0] text-[11px] font-black px-2 py-0.5 rounded-md whitespace-nowrap">
          Q{index + 1} of {total}
        </span>
        <DifficultyBadge difficulty={question.difficulty} />
        {showStep && question.step && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#CFE3E0] text-[#1C4A57] whitespace-nowrap">
            Step {question.step}{question.step_title ? ` · ${question.step_title}` : ''}
          </span>
        )}
        {question.topic && (
          <span className="text-[11px] font-semibold text-[#1C4A57]/60 min-w-0 break-words">{question.topic}</span>
        )}
      </div>

      <p id={questionId} className="text-sm sm:text-[15px] font-bold text-[#1C4A57] leading-relaxed break-words whitespace-pre-line">
        {question.question}
      </p>

      <div
        role="radiogroup"
        aria-labelledby={questionId}
        className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4"
      >
        {question.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const focusable = isSelected || (!hasSelection && idx === 0);
          return (
            <button
              key={idx}
              ref={(el) => { optionRefs.current[idx] = el; }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={focusable ? 0 : -1}
              disabled={disabled}
              onClick={() => choose(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`p-3 rounded-xl text-left text-sm transition-colors flex items-start gap-2.5 border disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-[#1C4A57] text-[#F1EEE3] border-[#1C4A57] font-semibold shadow-sm'
                  : 'bg-white text-[#1C4A57] border-[#1C4A57]/15 hover:border-[#1C4A57]/40 hover:bg-[#CFE3E0]/20'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 mt-px ${
                  isSelected ? 'border-[#CFE3E0] text-[#CFE3E0]' : 'border-[#1C4A57]/25 text-[#1C4A57]/70'
                }`}
              >
                {optionLetter(idx)}
              </span>
              <span className="flex-1 min-w-0 break-words">{opt}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
