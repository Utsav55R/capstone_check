import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Play,
  Send,
  RotateCcw,
  Lightbulb,
  Lock,
  Unlock,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  EyeOff,
  Target
} from 'lucide-react';
import { api } from '../services/api';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DIFF_STYLE = {
  Easy: { text: 'text-[#2E7D68]', bg: 'bg-[#E6F4F0]', bar: 'bg-[#2E7D68]' },
  Medium: { text: 'text-[#1C4A57]', bg: 'bg-[#CFE3E0]', bar: 'bg-[#1C4A57]' },
  Hard: { text: 'text-[#D95D39]', bg: 'bg-[#FDEAE5]', bar: 'bg-[#D95D39]' }
};

// Python drafts keep the original key so drafts saved before Java/C++ existed still load.
const DRAFT_KEY = (id, lang = 'python') => (lang === 'python' ? `sp_code_draft_${id}` : `sp_code_draft_${id}_${lang}`);
const LANG_KEY = 'sp_code_language';

// Used until the server sends its own list (which also says whether each compiler is installed)
const DEFAULT_LANGUAGES = [
  { id: 'python', label: 'Python 3', available: true },
  { id: 'java', label: 'Java', available: true },
  { id: 'cpp', label: 'C++', available: true }
];

function starterFor(problem, lang) {
  return problem.starter_codes?.[lang] || problem.starter_code;
}

function loadLanguage() {
  try {
    return localStorage.getItem(LANG_KEY) || 'python';
  } catch {
    return 'python';
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable */
  }
}

// Show values the way Python prints them: None, True, 'text', [1, 2]
function pyRepr(value, limit = 160) {
  const walk = (v) => {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'string') return `'${v}'`;
    if (Array.isArray(v)) return `[${v.map(walk).join(', ')}]`;
    if (typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `'${k}': ${walk(x)}`).join(', ')}}`;
    return String(v);
  };
  const text = walk(value);
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}

function formatInput(input) {
  return Object.entries(input).map(([k, v]) => `${k} = ${pyRepr(v)}`).join(', ');
}

function loadDraft(problem, lang) {
  try {
    return localStorage.getItem(DRAFT_KEY(problem.id, lang)) || starterFor(problem, lang);
  } catch {
    return starterFor(problem, lang);
  }
}

function saveDraft(id, lang, code) {
  try {
    localStorage.setItem(DRAFT_KEY(id, lang), code);
  } catch {
    /* storage unavailable: drafts just won't persist */
  }
}

function DifficultyBadge({ difficulty }) {
  const s = DIFF_STYLE[difficulty] || DIFF_STYLE.Medium;
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${s.bg} ${s.text}`}>{difficulty}</span>
  );
}

// ---------------- Code editor (textarea with line numbers, Tab and auto-indent) ----------------
function CodeEditor({ value, onChange, onRun, languageLabel }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = value.split('\n').length;

  const replaceSelection = (text, cursorOffset) => {
    const el = textareaRef.current;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + (cursorOffset ?? text.length);
    });
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      replaceSelection('    ');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = textareaRef.current;
      const before = value.slice(0, el.selectionStart);
      const currentLine = before.slice(before.lastIndexOf('\n') + 1);
      let indent = currentLine.match(/^\s*/)[0];
      const trimmed = currentLine.trimEnd();
      // Python blocks end with ':', Java/C++ blocks open with '{'
      if (trimmed.endsWith(':') || trimmed.endsWith('{')) indent += '    ';
      const after = value.slice(el.selectionEnd);
      if (trimmed.endsWith('{') && after.startsWith('}')) {
        // Enter between {} puts the closing brace on its own line
        const outer = currentLine.match(/^\s*/)[0];
        replaceSelection('\n' + indent + '\n' + outer, 1 + indent.length);
        return;
      }
      replaceSelection('\n' + indent);
    }
  };

  return (
    <div className="flex bg-[#143741] rounded-xl border border-white/15 overflow-hidden focus-within:ring-1 focus-within:ring-[#CFE3E0]">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none text-right text-[#CFE3E0]/40 font-mono text-xs leading-relaxed py-4 pl-3 pr-2 overflow-hidden"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={(e) => { if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop; }}
        rows={18}
        spellCheck="false"
        aria-label={`${languageLabel || 'Python 3'} code editor`}
        className="flex-1 bg-transparent text-[#EAE5D6] font-mono text-xs py-4 pr-4 pl-1 focus:outline-none resize-none leading-relaxed whitespace-pre overflow-auto"
      />
    </div>
  );
}

// ---------------- Result panel ----------------
function TestRow({ t }) {
  const icon = t.passed
    ? <CheckCircle2 className="w-4 h-4 text-[#2E7D68] shrink-0" />
    : t.verdict === 'Time Limit Exceeded'
      ? <Clock className="w-4 h-4 text-[#D95D39] shrink-0" />
      : <XCircle className="w-4 h-4 text-[#D95D39] shrink-0" />;

  return (
    <div className="bg-white/80 rounded-lg border border-black/5 p-3 text-xs space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-[#1C4A57]">
          {icon}
          {t.hidden ? `Hidden test ${t.index}` : `Example ${t.index}`}
          <span className={t.passed ? 'text-[#2E7D68]' : 'text-[#D95D39]'}>· {t.verdict}</span>
        </div>
        {t.ms !== undefined && <span className="text-[#1C4A57]/50 font-mono">{t.ms} ms</span>}
      </div>
      {!t.hidden && (
        <div className="font-mono text-[#1C4A57]/85 space-y-0.5 pl-6 break-all">
          <div><span className="text-[#1C4A57]/50">Input:</span> {formatInput(t.input)}</div>
          <div><span className="text-[#1C4A57]/50">Expected:</span> {pyRepr(t.expected)}</div>
          {t.output !== undefined && t.verdict !== 'Runtime Error' && (
            <div><span className="text-[#1C4A57]/50">Your output:</span> {pyRepr(t.output)}</div>
          )}
          {t.error && <div className="text-[#D95D39]">{t.error}</div>}
          {t.stdout && (
            <pre className="bg-[#FAF8F3] border border-[#1C4A57]/10 rounded p-2 mt-1 whitespace-pre-wrap">{t.stdout}</pre>
          )}
        </div>
      )}
      {t.hidden && t.error && <div className="font-mono text-[#D95D39] pl-6">{t.error}</div>}
    </div>
  );
}

function ResultPanel({ result, onShowSolution }) {
  const accepted = result.status === 'Accepted';
  const isSubmit = result.mode === 'submit';
  const title = !isSubmit && accepted ? 'Examples passed' : result.status;

  return (
    <div
      role="status"
      className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
        accepted ? 'bg-[#E6F4F0] border-[#2E7D68]/30' : 'bg-[#FDEAE5] border-[#D95D39]/30'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {accepted ? <CheckCircle2 className="w-5 h-5 text-[#2E7D68]" /> : <XCircle className="w-5 h-5 text-[#D95D39]" />}
          <span className={`text-base font-black ${accepted ? 'text-[#2E7D68]' : 'text-[#D95D39]'}`}>{title}</span>
        </div>
        {result.test_results?.length > 0 && (
          <span className="text-xs font-bold text-[#1C4A57] bg-white px-3 py-1 rounded-full">
            {result.passed_tests} / {result.total_tests} tests passed
          </span>
        )}
      </div>

      {/* Compile errors are shown in full in the code block below */}
      {!accepted && result.status !== 'Compile Error' && <p className="text-sm text-[#1C4A57]">{result.feedback}</p>}

      {!isSubmit && accepted && (
        <p className="text-sm text-[#1C4A57]">
          Your code works on the examples. Submit it to run the hidden tests as well.
        </p>
      )}

      {isSubmit && accepted && (
        <div className="text-sm text-[#1C4A57] space-y-1">
          {result.first_solve ? (
            <p>
              <span className="font-bold text-[#2E7D68]">+{result.dsa_gain} DSA readiness.</span>{' '}
              DSA is now {result.updated_dsa_readiness}% and your placement readiness is {result.updated_overall_readiness}/100.
            </p>
          ) : (
            <p>You had already solved this problem, so your score doesn't change. Try a new one to keep improving.</p>
          )}
          {result.topic_cleared && (
            <p className="font-bold text-[#2E7D68]">{result.topic_cleared} is no longer marked as a weak topic.</p>
          )}
          <button onClick={onShowSolution} className="text-xs font-bold underline text-[#1C4A57] hover:text-[#143741]">
            Compare with the reference solution
          </button>
        </div>
      )}

      {result.error && result.test_results?.length === 0 && (
        <pre className="text-xs font-mono text-[#D95D39] bg-white/80 p-3 rounded-lg border border-black/5 whitespace-pre-wrap">
          {result.error}
        </pre>
      )}

      {result.test_results?.length > 0 && (
        <div className="space-y-2">
          {result.test_results.map((t) => <TestRow key={t.index} t={t} />)}
        </div>
      )}
    </div>
  );
}

// ---------------- Main view ----------------
// initialProblemId: optional problem to open on arrival (e.g. from a roadmap step);
// onInitialProblemConsumed lets the parent clear it once it has been applied.
export default function CodingPracticeView({ token, targetRole, onProfileUpdated, initialProblemId, onInitialProblemConsumed }) {
  const [problems, setProblems] = useState([]);
  const [progress, setProgress] = useState({ solved_ids: [], attempted_ids: [], weak_topics: [] });
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null); // 'run' | 'submit' | null
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hintsShown, setHintsShown] = useState(0);
  const [solution, setSolution] = useState(null); // { language, code }
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [language, setLanguage] = useState(loadLanguage);
  const requestedProblemId = useRef(initialProblemId || null);

  const selected = useMemo(() => problems.find((p) => p.id === selectedId) || null, [problems, selectedId]);
  const langInfo = languages.find((l) => l.id === language) || DEFAULT_LANGUAGES[0];
  const langAvailable = langInfo.available !== false;
  const solved = useMemo(() => new Set(progress.solved_ids), [progress]);
  const attempted = useMemo(() => new Set(progress.attempted_ids), [progress]);
  const weakTopics = useMemo(() => new Set(progress.weak_topics || []), [progress]);

  const refreshProgress = useCallback(async () => {
    try {
      setProgress(await api.getCodingProgress(token));
    } catch {
      /* progress is optional; the page still works without it */
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getCodingProblems();
        const list = data.problems || [];
        setProblems(list);
        let lang = language;
        if (Array.isArray(data.languages) && data.languages.length) {
          setLanguages(data.languages);
          const known = data.languages.find((l) => l.id === lang);
          if (!known || known.available === false) lang = 'python';
          setLanguage(lang);
        }
        const first = list.find((p) => p.id === requestedProblemId.current) || list[0];
        if (first) selectProblem(first, lang);
      } catch (err) {
        setError('Could not load problems. Check that the backend is running. (' + err.message + ')');
      }
      refreshProgress();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open a problem requested by the parent (e.g. "Practice in Coding Practice" on a roadmap step).
  useEffect(() => {
    if (!initialProblemId) return;
    requestedProblemId.current = initialProblemId;
    if (!problems.length) return; // applied by the initial load instead
    const target = problems.find((p) => p.id === initialProblemId);
    if (target) {
      setFilter('All');
      selectProblem(target);
    }
    onInitialProblemConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProblemId, problems]);

  function selectProblem(p, lang = language) {
    setSelectedId(p.id);
    setCode(loadDraft(p, lang));
    setResult(null);
    setError('');
    setHintsShown(0);
    setSolution(null);
  }

  // Each language keeps its own draft, so switching never loses code.
  const handleLanguageChange = (next) => {
    if (next === language || busy) return;
    setLanguage(next);
    saveLanguage(next);
    if (selected) setCode(loadDraft(selected, next));
    setResult(null);
    setError('');
    setSolution(null);
  };

  const handleCodeChange = (next) => {
    setCode(next);
    if (selected) saveDraft(selected.id, language, next);
  };

  const handleReset = () => {
    if (!selected) return;
    if (!window.confirm('Reset the editor to the starter code? Your current code will be lost.')) return;
    handleCodeChange(starterFor(selected, language));
    setResult(null);
  };

  const execute = async (mode) => {
    if (!selected || !code.trim() || busy || !langAvailable) return;
    setBusy(mode);
    setError('');
    try {
      const data = mode === 'run'
        ? await api.runCode(token, selected.id, code, language)
        : await api.submitCode(token, selected.id, code, language);
      setResult(data);
      if (mode === 'submit') {
        await refreshProgress();
        if (data.first_solve && onProfileUpdated) onProfileUpdated();
      }
    } catch (err) {
      setError(`${mode === 'run' ? 'Run' : 'Submit'} failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleShowSolution = async () => {
    try {
      const data = await api.getCodingSolution(token, selected.id, language);
      setSolution({ language: data.language || language, code: data.solution });
    } catch (err) {
      setError(err.message);
    }
  };

  const counts = useMemo(() => {
    const c = {};
    DIFFICULTIES.forEach((d) => {
      const inDiff = problems.filter((p) => p.difficulty === d);
      c[d] = { total: inDiff.length, solved: inDiff.filter((p) => solved.has(p.id)).length };
    });
    return c;
  }, [problems, solved]);

  const visible = filter === 'All' ? problems : problems.filter((p) => p.difficulty === filter);
  const totalSolved = problems.filter((p) => solved.has(p.id)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="bg-[#EAE5D6] rounded-xl p-5 border border-[#1C4A57]/15 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-black text-[#1C4A57] tracking-tight">Coding Practice</h1>
          <p className="text-sm text-[#1C4A57]/80 mt-1">
            Solve DSA problems in Python, Java or C++ for your <span className="font-bold">{targetRole}</span> preparation.
            Your first accepted solution to each problem raises your DSA score: Easy +3, Medium +6, Hard +10.
          </p>
          {weakTopics.size > 0 && (
            <p className="text-xs text-[#D95D39] font-semibold mt-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Your weak topics: {[...weakTopics].join(', ')}. Problems in these topics are marked below.
            </p>
          )}
        </div>

        <div className="bg-white/70 rounded-lg p-3 border border-[#1C4A57]/10 min-w-[240px] space-y-2">
          <div className="text-sm font-black text-[#1C4A57]">{totalSolved} of {problems.length} solved</div>
          {DIFFICULTIES.map((d) => (
            <div key={d} className="flex items-center gap-2 text-xs">
              <span className={`w-14 font-bold ${DIFF_STYLE[d].text}`}>{d}</span>
              <div className="flex-1 h-1.5 bg-[#1C4A57]/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${DIFF_STYLE[d].bar} transition-all duration-500`}
                  style={{ width: `${counts[d]?.total ? (counts[d].solved / counts[d].total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right text-[#1C4A57]/70 font-mono">{counts[d]?.solved ?? 0}/{counts[d]?.total ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-[#FDEAE5] border border-[#D95D39]/30 text-[#D95D39] p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: problem list + statement */}
        <div className="lg:col-span-5 space-y-4">

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#1C4A57]/15 space-y-3">
            <div role="tablist" aria-label="Filter by difficulty" className="flex gap-1 bg-[#FAF8F3] p-1 rounded-lg border border-[#1C4A57]/10">
              {['All', ...DIFFICULTIES].map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={filter === d}
                  onClick={() => setFilter(d)}
                  className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${
                    filter === d ? 'bg-[#1C4A57] text-white' : 'text-[#1C4A57] hover:bg-[#CFE3E0]/50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <ul className="space-y-1 max-h-[300px] overflow-y-auto pr-1 -mr-1">
              {visible.map((p) => {
                const isSel = p.id === selectedId;
                const isSolved = solved.has(p.id);
                const isAttempted = attempted.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => selectProblem(p)}
                      aria-current={isSel ? 'true' : undefined}
                      className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2.5 border transition-colors ${
                        isSel ? 'bg-[#1C4A57] border-[#1C4A57]' : 'bg-white border-transparent hover:bg-[#CFE3E0]/30'
                      }`}
                    >
                      {isSolved ? (
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSel ? 'text-[#CFE3E0]' : 'text-[#2E7D68]'}`} aria-label="Solved" />
                      ) : isAttempted ? (
                        <CircleDot className={`w-4 h-4 shrink-0 ${isSel ? 'text-[#CFE3E0]' : 'text-[#D95D39]'}`} aria-label="Attempted" />
                      ) : (
                        <Circle className={`w-4 h-4 shrink-0 ${isSel ? 'text-[#CFE3E0]/60' : 'text-[#1C4A57]/25'}`} aria-label="Not attempted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${isSel ? 'text-white' : 'text-[#1C4A57]'}`}>{p.title}</div>
                        <div className={`text-[11px] ${isSel ? 'text-[#CFE3E0]' : 'text-[#1C4A57]/60'}`}>
                          {p.topic}
                          {weakTopics.has(p.topic) && (
                            <span className={`ml-1.5 font-bold ${isSel ? 'text-[#FDEAE5]' : 'text-[#D95D39]'}`}>· weak topic</span>
                          )}
                        </div>
                      </div>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected && (
            <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#1C4A57]/15 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <DifficultyBadge difficulty={selected.difficulty} />
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#EAE5D6] text-[#1C4A57]">{selected.topic}</span>
                  <span className="text-[11px] text-[#1C4A57]/60">+{selected.points} DSA on first solve</span>
                </div>
                <h2 className="text-lg font-black text-[#1C4A57]">{selected.title}</h2>
              </div>

              <p className="text-sm text-[#1C4A57]/90 leading-relaxed whitespace-pre-line">{selected.description}</p>

              <div className="space-y-2">
                {selected.examples.map((ex, i) => (
                  <div key={i} className="bg-[#FAF8F3] rounded-lg border border-[#1C4A57]/10 p-3 text-xs font-mono text-[#1C4A57] space-y-0.5 break-all">
                    <div className="font-sans font-bold text-[11px] text-[#1C4A57]/60 mb-1">Example {i + 1}</div>
                    <div><span className="text-[#1C4A57]/50">Input:</span> {formatInput(ex.input)}</div>
                    <div><span className="text-[#1C4A57]/50">Output:</span> {pyRepr(ex.output)}</div>
                    {ex.explanation && <div className="font-sans text-[#1C4A57]/70 pt-1">{ex.explanation}</div>}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#1C4A57] mb-1">Constraints</h3>
                <ul className="text-xs text-[#1C4A57]/80 font-mono space-y-0.5">
                  {selected.constraints.map((c) => <li key={c}>• {c}</li>)}
                </ul>
              </div>

              <div className="border-t border-[#1C4A57]/10 pt-3 space-y-2">
                {selected.hints.slice(0, hintsShown).map((h, i) => (
                  <p key={i} className="text-xs text-[#1C4A57] bg-[#CFE3E0]/40 rounded-lg p-2.5 flex gap-2">
                    <Lightbulb className="w-4 h-4 shrink-0 text-[#1C4A57]" /> {h}
                  </p>
                ))}
                <div className="flex items-center gap-3 flex-wrap">
                  {hintsShown < selected.hints.length && (
                    <button
                      onClick={() => setHintsShown((n) => n + 1)}
                      className="text-xs font-bold text-[#1C4A57] flex items-center gap-1.5 hover:underline"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      Show hint {hintsShown + 1} of {selected.hints.length}
                    </button>
                  )}
                  {solved.has(selected.id) ? (
                    solution ? (
                      <button onClick={() => setSolution(null)} className="text-xs font-bold text-[#1C4A57] flex items-center gap-1.5 hover:underline">
                        <EyeOff className="w-3.5 h-3.5" /> Hide reference solution
                      </button>
                    ) : (
                      <button onClick={handleShowSolution} className="text-xs font-bold text-[#2E7D68] flex items-center gap-1.5 hover:underline">
                        <Unlock className="w-3.5 h-3.5" /> Show reference solution
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-[#1C4A57]/50 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Solve it to unlock the reference solution
                    </span>
                  )}
                </div>
                {solution && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[#1C4A57]/60">
                      Reference solution · {(languages.find((l) => l.id === solution.language) || {}).label || solution.language}
                    </div>
                    <pre className="bg-[#143741] text-[#EAE5D6] text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed">{solution.code}</pre>
                  </div>
                )}
              </div>
            </article>
          )}
        </div>

        {/* Right: editor + results */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1C4A57] rounded-2xl p-5 shadow-md border border-[#143741] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/15">
              <div className="flex items-center gap-2">
                <div role="radiogroup" aria-label="Programming language" className="flex gap-0.5 bg-white/10 p-0.5 rounded-lg">
                  {languages.map((l) => {
                    const active = l.id === language;
                    const unavailable = l.available === false;
                    return (
                      <button
                        key={l.id}
                        role="radio"
                        aria-checked={active}
                        onClick={() => handleLanguageChange(l.id)}
                        disabled={!!busy}
                        title={unavailable ? l.reason || `${l.label} is not installed on the server` : `Solve in ${l.label}`}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                          active ? 'bg-[#CFE3E0] text-[#143741]' : 'text-[#CFE3E0] hover:bg-white/10'
                        } ${unavailable ? 'opacity-50' : ''}`}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-[#CFE3E0]/50 hidden md:inline">Ctrl+Enter to run</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={!!busy}
                  title="Reset to starter code"
                  className="text-[#CFE3E0] hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button
                  onClick={() => execute('run')}
                  disabled={!!busy || !langAvailable}
                  className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy === 'run' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {busy === 'run' ? 'Running…' : 'Run examples'}
                </button>
                <button
                  onClick={() => execute('submit')}
                  disabled={!!busy || !langAvailable}
                  className="bg-[#2E7D68] hover:bg-[#236353] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy === 'submit' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {busy === 'submit' ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>

            {!langAvailable && (
              <p className="text-xs text-[#FDEAE5] bg-[#D95D39]/30 border border-[#D95D39]/40 rounded-lg p-2.5">
                {langInfo.label} can't run on this server: {langInfo.reason || 'the compiler is not installed'}. You can still write code here; it is saved as a draft.
              </p>
            )}

            <CodeEditor value={code} onChange={handleCodeChange} onRun={() => execute('run')} languageLabel={langInfo.label} />

            {selected && (
              <p className="text-[11px] text-[#CFE3E0]/70">
                Run checks the {selected.examples.length} examples. Submit checks all {selected.total_tests} tests, including hidden ones, and counts towards your score.
              </p>
            )}
          </div>

          {result && <ResultPanel result={result} onShowSolution={handleShowSolution} />}
        </div>
      </div>
    </div>
  );
}
