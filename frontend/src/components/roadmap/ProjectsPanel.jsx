import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen, CheckCircle2, Circle, ExternalLink, FolderGit2, Github, Info, Lock, Pencil, RefreshCw, Send, Star,
} from 'lucide-react';
import { api } from '../../services/api';
import { DIFFICULTY_STYLES, PRIMARY_BUTTON, SECONDARY_BUTTON, formatDate } from '../assessment/ui';

const LEVEL_STYLES = {
  Basic: DIFFICULTY_STYLES.Easy,
  Intermediate: DIFFICULTY_STYLES.Intermediate,
  Advanced: DIFFICULTY_STYLES.Advanced,
};

// Same rule as the server: https://github.com/<owner>/<repo> (optional trailing slash).
const REPO_URL_RE = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/?$/;
const NOTES_MAX = 1000;

const INPUT =
  'w-full bg-[#FAF8F3] border rounded-xl px-3 py-2.5 text-sm text-[#1C4A57] font-medium placeholder:text-[#1C4A57]/40 focus:outline-none focus:ring-2 focus:ring-[#1C4A57] focus:border-transparent transition-shadow';

export function formatStars(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 100_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(v);
}

const normaliseRepo = (url) => (url || '').trim().toLowerCase().replace(/\/+$/, '').replace(/\.git$/, '');

function ReferenceRepo({ repo }) {
  if (!repo) return null;
  return (
    <div className="rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/10 p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1C4A57]/55 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Reference repo
        </p>
      </div>
      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2 text-sm font-bold text-[#1C4A57] hover:underline underline-offset-2 break-all group"
      >
        <Github className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span className="min-w-0">{repo.full_name}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#1C4A57]/40 group-hover:text-[#1C4A57]" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#1C4A57]/65">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-[#B86E00]" aria-hidden="true" />
          <span className="tabular-nums">{formatStars(repo.stars)}</span>
          <span className="sr-only">stars</span>
        </span>
        {repo.last_commit && <span>Updated {formatDate(repo.last_commit)}</span>}
      </div>
      {repo.description && <p className="text-xs text-[#1C4A57]/80 leading-relaxed">{repo.description}</p>}
      {repo.why_reference && (
        <p className="text-xs text-[#1C4A57]/80 leading-relaxed">
          <span className="font-bold text-[#1C4A57]">What to study: </span>{repo.why_reference}
        </p>
      )}
      <p className="text-[11px] font-bold text-[#B86E00] bg-[#FFF5E6] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Reference only — build your own version
      </p>
    </div>
  );
}

function SubmissionForm({ project, token, field, onSaved, onCancel }) {
  const existing = project.submission;
  const [repoUrl, setRepoUrl] = useState(existing?.repo_url || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [fieldError, setFieldError] = useState('');
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const urlRef = useRef(null);

  const urlId = `project-url-${project.id}`;
  const notesId = `project-notes-${project.id}`;
  const hintId = `${urlId}-hint`;
  const errorId = `${urlId}-error`;

  const validate = (value) => {
    const v = value.trim();
    if (!v) return 'Paste the link to your GitHub repository.';
    if (!REPO_URL_RE.test(v)) return 'Use the form https://github.com/your-username/your-repo';
    if (project.reference_repo?.url && normaliseRepo(v) === normaliseRepo(project.reference_repo.url)) {
      return "That's the reference repo — submit the repository you built yourself.";
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const problem = validate(repoUrl);
    setFieldError(problem);
    setServerError('');
    if (problem) {
      urlRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const data = await api.submitProject(token, field, project.id, repoUrl.trim(), notes);
      onSaved(data);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const describedBy = [hintId, fieldError ? errorId : null].filter(Boolean).join(' ');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <label htmlFor={urlId} className="block text-xs font-bold text-[#1C4A57] mb-1.5">Your GitHub repo URL</label>
        <input
          ref={urlRef}
          id={urlId}
          type="url"
          inputMode="url"
          autoComplete="url"
          spellCheck="false"
          placeholder="https://github.com/your-username/your-repo"
          value={repoUrl}
          onChange={(e) => { setRepoUrl(e.target.value); if (fieldError) setFieldError(''); }}
          onBlur={() => repoUrl.trim() && setFieldError(validate(repoUrl))}
          aria-invalid={fieldError ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${INPUT} ${fieldError ? 'border-[#D95D39]' : 'border-[#1C4A57]/20'}`}
        />
        <p id={hintId} className="text-[11px] text-[#1C4A57]/60 mt-1">A public repository you built yourself. It counts as proof of skill.</p>
        {fieldError && (
          <p id={errorId} className="text-xs font-semibold text-[#D95D39] mt-1" role="alert">{fieldError}</p>
        )}
      </div>

      <div>
        <label htmlFor={notesId} className="flex items-center justify-between text-xs font-bold text-[#1C4A57] mb-1.5">
          <span>Notes <span className="font-semibold text-[#1C4A57]/55">(optional)</span></span>
          <span className="font-semibold text-[#1C4A57]/50 tabular-nums" aria-hidden="true">{notes.length}/{NOTES_MAX}</span>
        </label>
        <textarea
          id={notesId}
          rows={2}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you built, what you'd improve, a live demo link…"
          className={`${INPUT} border-[#1C4A57]/20 resize-y`}
        />
      </div>

      {serverError && (
        <p role="alert" className="text-xs font-semibold text-[#D95D39] bg-[#FDEAE5] border border-[#D95D39]/25 rounded-lg p-2.5">
          {serverError}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          aria-disabled={saving || undefined}
          className={`${PRIMARY_BUTTON} flex-1 ${saving ? 'opacity-70 cursor-wait' : ''}`}
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
          {saving ? 'Saving…' : existing ? 'Save new link' : 'Submit project'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>Cancel</button>
        )}
      </div>
    </form>
  );
}

function ProjectCard({ project, token, field, onProjectSaved }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const updateButtonRef = useRef(null);
  const focusUpdateButton = useRef(false);
  const locked = !project.unlocked;
  const submission = project.submission;
  const levelStyle = LEVEL_STYLES[project.level] || 'bg-[#CFE3E0] text-[#1C4A57]';

  useEffect(() => {
    if (focusUpdateButton.current && !editing) {
      focusUpdateButton.current = false;
      updateButtonRef.current?.focus();
    }
  }, [editing, submission]);

  const handleSaved = (data) => {
    const isFirst = !submission;
    onProjectSaved(data);
    setEditing(false);
    focusUpdateButton.current = true;
    const readiness = data?.updated_overall_readiness;
    setMessage(
      `${isFirst ? 'Project submitted' : 'Link updated'}.` +
        (readiness !== undefined && readiness !== null ? ` Placement readiness is now ${Math.round(readiness)}/100.` : '')
    );
  };

  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 ${
        locked ? 'bg-[#FAF8F3] border-[#1C4A57]/10' : 'bg-white border-[#1C4A57]/15 shadow-sm'
      }`}
      aria-labelledby={`project-title-${project.id}`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-[11px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${levelStyle}`}>{project.level}</span>
          {locked ? (
            <span className="text-[11px] font-bold text-[#1C4A57]/60 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Unlocks after Step {project.unlock_after_step}
            </span>
          ) : submission ? (
            <span className="text-[11px] font-bold text-[#2E7D68] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Submitted
            </span>
          ) : (
            <span className="text-[11px] font-bold text-[#1C4A57]/60">After Step {project.unlock_after_step}</span>
          )}
        </div>
        <h3 id={`project-title-${project.id}`} className={`text-base font-black leading-snug ${locked ? 'text-[#1C4A57]/70' : 'text-[#1C4A57]'}`}>
          {project.title}
        </h3>
        {project.summary && <p className="text-sm text-[#1C4A57]/75 leading-relaxed">{project.summary}</p>}
      </div>

      {project.skills?.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills practised">
          {project.skills.map((s) => (
            <li key={s} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#CFE3E0] text-[#1C4A57]">{s}</li>
          ))}
        </ul>
      )}

      {project.requirements?.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1C4A57]/55 mb-1.5">Requirements</h4>
          <ul className="space-y-1.5">
            {project.requirements.map((r) => (
              <li key={r} className="text-xs text-[#1C4A57]/80 flex items-start gap-2 leading-relaxed">
                <Circle className="w-3 h-3 mt-0.5 shrink-0 text-[#1C4A57]/40" aria-hidden="true" />
                <span className="min-w-0">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReferenceRepo repo={project.reference_repo} />

      <div className="mt-auto pt-4 border-t border-[#1C4A57]/10 space-y-3">
        {locked ? (
          <p className="text-xs font-semibold text-[#1C4A57]/65 flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
            Pass the Step {project.unlock_after_step} gate quiz to unlock submissions for this project.
          </p>
        ) : submission && !editing ? (
          <div className="rounded-xl bg-[#E6F4F0] border border-[#2E7D68]/25 p-3 space-y-2">
            <p className="text-sm font-black text-[#2E7D68]">Submitted ✓</p>
            <a
              href={submission.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#1C4A57] hover:underline underline-offset-2 break-all inline-flex items-start gap-1.5"
            >
              <FolderGit2 className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
              {submission.repo_url.replace(/^https:\/\/github\.com\//, 'github.com/')}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {submission.submitted_at && (
              <p className="text-[11px] text-[#1C4A57]/60">Submitted {formatDate(submission.submitted_at)}</p>
            )}
            {submission.notes && <p className="text-xs text-[#1C4A57]/75 break-words whitespace-pre-line">{submission.notes}</p>}
            <button
              ref={updateButtonRef}
              type="button"
              onClick={() => { setEditing(true); setMessage(''); }}
              className="text-xs font-bold text-[#1C4A57] inline-flex items-center gap-1.5 hover:underline underline-offset-2"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Update link
            </button>
          </div>
        ) : (
          <SubmissionForm
            key={submission?.repo_url || 'new'}
            project={project}
            token={token}
            field={field}
            onSaved={handleSaved}
            onCancel={submission ? () => { setEditing(false); focusUpdateButton.current = true; } : undefined}
          />
        )}
        <p role="status" aria-live="polite" className={message ? 'text-xs font-semibold text-[#2E7D68]' : 'sr-only'}>
          {message}
        </p>
      </div>
    </article>
  );
}

export default function ProjectsPanel({ projects, token, field, onProjectSaved }) {
  if (!projects?.length) return null;
  const submitted = projects.filter((p) => p.submission).length;
  return (
    <section className="space-y-4" aria-labelledby="roadmap-projects-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="roadmap-projects-heading" className="text-lg font-black text-[#1C4A57] tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#1C4A57]/70" aria-hidden="true" /> Portfolio projects
          </h2>
          <p className="text-sm text-[#1C4A57]/70 mt-0.5">
            Build each project yourself, then submit your repo link as proof of skill. The linked repos are references to learn from, not to copy.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#CFE3E0] text-[#1C4A57] tabular-nums">
          {submitted} of {projects.length} submitted
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} token={token} field={field} onProjectSaved={onProjectSaved} />
        ))}
      </div>
    </section>
  );
}
