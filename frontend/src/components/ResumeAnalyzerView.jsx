import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Tag,
  Zap,
  Briefcase,
  BadgeCheck,
  Brain,
  Code,
  Database,
  Cloud,
  Cpu,
  ArrowUpRight,
  ArrowRight,
  Check,
  ClipboardCheck,
  X
} from 'lucide-react';
import { api } from '../services/api';

// Bridges the resume analysis into the personalised skill assessment.
function CoreSkillMatchCard({ match, onStartAssessment }) {
  const matched = match.matched || [];
  const missing = match.missing || [];
  const total = match.total ?? matched.length + missing.length;
  const count = match.matched_count ?? matched.length;
  return (
    <div className="rounded-xl border border-[#1C4A57]/15 bg-[#FAF8F3] p-4 space-y-3">
      <p className="text-sm text-[#1C4A57] flex items-start gap-2">
        <ClipboardCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Core skills for <span className="font-bold">{match.field}</span>:{' '}
          <span className="font-black tabular-nums">{count} of {total}</span> found
          {match.level && <> → <span className="font-black">{match.level}</span> assessment</>}
        </span>
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Core skills">
        {matched.map((name) => (
          <li key={`m-${name}`} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E6F4F0] text-[#2E7D68] border border-[#2E7D68]/20">
            <Check className="w-3 h-3" aria-hidden="true" /> {name}<span className="sr-only"> (found)</span>
          </li>
        ))}
        {missing.map((name) => (
          <li key={`x-${name}`} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FDEAE5] text-[#D95D39] border border-[#D95D39]/20">
            <X className="w-3 h-3" aria-hidden="true" /> {name}<span className="sr-only"> (missing)</span>
          </li>
        ))}
      </ul>
      {onStartAssessment && (
        <button
          type="button"
          onClick={onStartAssessment}
          className="w-full sm:w-auto bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] text-xs font-bold px-4 py-2.5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
        >
          Take your personalised skill assessment <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function ResumeAnalyzerView({ 
  token, 
  targetRole, 
  onProfileUpdated,
  onStartAssessment,
}) {
  const [resumeText, setResumeText] = useState('');
  const [file, setFile] = useState(null);
  const [customJd, setCustomJd] = useState('');
  const [jdExpanded, setJdExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Re-run analysis automatically when targetRole changes if resumeText is present
  useEffect(() => {
    if (resumeText.trim() && result && !loading) {
      runAnalysis(resumeText, customJd);
    }
  }, [targetRole]);

  // Load sample resume for instant testing
  const handleLoadSample = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getSampleResume();
      setResumeText(data.sample_text);
      await runAnalysis(data.sample_text, customJd);
    } catch (err) {
      setError('Could not load sample resume: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (textToAnalyze, jdToUse) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.analyzeResumeText(token, textToAnalyze, targetRole, jdToUse);
      setResult(data);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!resumeText.trim()) {
      setError('Please paste your resume text or load the sample resume.');
      return;
    }
    await runAnalysis(resumeText, customJd);
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    try {
      setLoading(true);
      setError('');
      const data = await api.analyzeResumeFile(token, uploadedFile, customJd);
      setResult(data);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setError('File upload analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDomainIcon = (domainKey) => {
    switch(domainKey) {
      case 'ml_ai_analytics':
        return Brain;
      case 'fullstack_frontend':
        return Code;
      case 'data_engineering_databases':
        return Database;
      case 'cloud_devops':
        return Cloud;
      case 'dsa_core':
        return Cpu;
      default:
        return Sparkles;
    }
  };

  const getHealthBadgeColor = (score) => {
    if (score >= 75) return 'bg-[#2E7D68] text-white';
    if (score >= 45) return 'bg-[#D95D39]/80 text-white';
    return 'bg-[#D95D39] text-white';
  };

  const getHealthBarColor = (score) => {
    if (score >= 75) return 'bg-[#2E7D68]';
    if (score >= 45) return 'bg-[#E69A39]';
    return 'bg-[#D95D39]';
  };

  const domainDisplayList = [
    { key: 'ml_ai_analytics', title: 'Machine Learning & AI / Data Science' },
    { key: 'fullstack_frontend', title: 'Full Stack & Web Engineering' },
    { key: 'data_engineering_databases', title: 'Data Engineering, Databases & Analytics' },
    { key: 'cloud_devops', title: 'Cloud, DevOps & Systems' },
    { key: 'dsa_core', title: 'DSA, Problem Solving & Software Fundamentals' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-[#EAE5D6] rounded-xl p-5 border border-[#1C4A57]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1C4A57] tracking-tight">Resume Analyser (NLP Engine)</h1>
            <span className="bg-[#1C4A57] text-[#CFE3E0] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Signal 01
            </span>
          </div>
          <p className="text-sm text-[#1C4A57]/80 mt-1">
            Real-time multi-domain diagnostic engine evaluating skill coverage and generating bullet recommendations for{' '}
            <span className="font-bold underline text-[#1C4A57]">{targetRole}</span> across all 5 technical domains.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          disabled={loading}
          className="bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0"
        >
          <Zap className="w-4 h-4 text-[#CFE3E0]" /> Load Sample Resume (Alex Chen)
        </button>
      </div>

      {error && (
        <div className="bg-[#FDEAE5] border border-[#D95D39]/30 text-[#D95D39] p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* ── Custom JD Expandable Panel ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#1C4A57]/15 shadow-sm overflow-hidden">
        <button
          onClick={() => setJdExpanded(!jdExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#F1EEE3]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-[#1C4A57]" />
            <div>
              <p className="text-sm font-black text-[#1C4A57]">
                Custom Job Description{' '}
                <span className="text-[#1C4A57]/50 font-semibold">(Optional — For Real-Time Targeted JD Match)</span>
              </p>
              <p className="text-xs text-[#1C4A57]/60 mt-0.5">
                Paste the exact JD from LinkedIn / Naukri to generate real-time diagnostic feedback mapped to that specific posting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {customJd.trim() && (
              <span className="bg-[#2E7D68] text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Custom JD Active
              </span>
            )}
            <span className="text-[#1C4A57]/60 text-xs font-bold">
              {jdExpanded ? '▲ Collapse' : '▼ Expand'}
            </span>
          </div>
        </button>

        {jdExpanded && (
          <div className="px-6 pb-5 border-t border-[#1C4A57]/10 pt-4">
            <textarea
              rows={6}
              value={customJd}
              onChange={(e) => setCustomJd(e.target.value)}
              placeholder="Paste the complete job description here — e.g. 'We are hiring a Senior ML Engineer proficient in PyTorch, LLMs, MLflow, FastAPI...'"
              className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl p-3.5 text-xs text-[#1C4A57] font-mono focus:outline-none focus:ring-2 focus:ring-[#1C4A57] resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-[#1C4A57]/50">
                {customJd.trim()
                  ? `${customJd.trim().split(/\s+/).filter(Boolean).length} words — Multi-domain diagnostics will resolve target skills from this custom JD`
                  : 'When empty, the system uses benchmark domain requirements for your selected target role'}
              </span>
              {customJd.trim() && (
                <button
                  onClick={() => setCustomJd('')}
                  className="text-[11px] text-[#D95D39] font-bold hover:underline"
                >
                  Clear JD
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload & Input Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Input Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-[#1C4A57]/15 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-black text-[#1C4A57] mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1C4A57]" /> Paste or Upload Resume (PDF/DOCX)
            </h3>

            {/* File Drag-and-Drop Area */}
            <label className="border-2 border-dashed border-[#1C4A57]/20 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-[#1C4A57] hover:bg-[#CFE3E0]/20 transition-all text-center mb-4">
              <Upload className="w-8 h-8 text-[#1C4A57]/60 mb-2" />
              <span className="text-xs font-bold text-[#1C4A57]">Click to upload PDF or DOCX file</span>
              <span className="text-[11px] text-[#1C4A57]/60 mt-0.5">Supports PDF and Word documents</span>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              {file && (
                <span className="mt-2 text-xs bg-[#CFE3E0] text-[#1C4A57] font-semibold px-2 py-0.5 rounded">
                  Selected: {file.name}
                </span>
              )}
            </label>

            {/* Direct Text Area */}
            <label className="block text-xs font-bold text-[#1C4A57] mb-1">
              Or Paste Resume Text directly:
            </label>
            <textarea
              rows={12}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste raw resume text here with Education, Technical Skills, Projects, and Experience..."
              className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl p-3.5 text-xs text-[#1C4A57] font-mono focus:outline-none focus:ring-2 focus:ring-[#1C4A57] resize-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-[#1C4A57]/60">
              {resumeText ? `${resumeText.split(/\s+/).filter(Boolean).length} words` : 'Awaiting input'}
            </span>
            <button
              onClick={handleAnalyzeText}
              disabled={loading}
              className="bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing via NLP...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#CFE3E0]" /> Run NLP ATS Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Analysis Summary Cards */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-[#1C4A57]/15 flex flex-col justify-between">
          {result ? (
            <div className="space-y-6">

              {/* Custom JD Badge — shown when a custom JD was used */}
              {result.used_custom_jd && (
                <div className="flex items-center gap-2 bg-[#E6F4F0] border border-[#2E7D68]/30 rounded-xl px-4 py-2.5">
                  <BadgeCheck className="w-5 h-5 text-[#2E7D68] shrink-0" />
                  <div>
                    <p className="text-xs font-black text-[#2E7D68]">
                      High-Authenticity Mode — Custom JD Targeting Active
                    </p>
                    <p className="text-[11px] text-[#2E7D68]/80">
                      Multi-domain diagnostics & vector match computed against your pasted job description.
                    </p>
                  </div>
                </div>
              )}

              {/* Top Score Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Visual ATS Gauge */}
                <div className="bg-[#1C4A57] text-white p-4 rounded-xl text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] uppercase font-bold text-[#CFE3E0] tracking-wider">ATS Score</span>
                  <div className="text-3xl font-black text-[#EAE5D6] my-1">
                    {result.overall_ats_score || result.ats_score}<span className="text-sm font-semibold text-[#CFE3E0]">/100</span>
                  </div>
                  <span className="text-[10px] text-[#CFE3E0] bg-[#143741] px-2 py-0.5 rounded-full font-medium">
                    Visual Gauge
                  </span>
                </div>

                <div className="bg-[#FAF8F3] border border-[#1C4A57]/15 p-4 rounded-xl text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] uppercase font-bold text-[#1C4A57]/70 tracking-wider">Formatting</span>
                  <div className="text-2xl font-black text-[#1C4A57] my-1">
                    {result.formatting_score}%
                  </div>
                  <span className="text-[10px] text-[#2E7D68] font-semibold">Standard ATS Layout</span>
                </div>

                <div className="bg-[#FAF8F3] border border-[#1C4A57]/15 p-4 rounded-xl text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] uppercase font-bold text-[#1C4A57]/70 tracking-wider">
                    {result.used_custom_jd ? 'Custom JD Match' : 'Role Vector Match'}
                  </span>
                  <div className="text-2xl font-black text-[#1C4A57] my-1">
                    {result.vector_match_pct || 78}%
                  </div>
                  <span className="text-[10px] text-[#1C4A57]/80 font-semibold">Cosine Similarity</span>
                </div>
              </div>

              {result.core_skill_match && (
                <CoreSkillMatchCard match={result.core_skill_match} onStartAssessment={onStartAssessment} />
              )}

              {/* Identified Tech Stack Gaps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1C4A57] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#D95D39]" /> Identified Tech Stack Gaps
                  </h4>
                  <span className="text-[11px] text-[#D95D39] font-bold">Missing for {targetRole}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.tech_stack_gaps && result.tech_stack_gaps.length > 0 ? (
                    result.tech_stack_gaps.map((gap, idx) => (
                      <span key={idx} className="bg-[#FDEAE5] text-[#D95D39] border border-[#F5C6BA] text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                        ✕ {gap}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#2E7D68] font-semibold">No critical tech stack gaps detected!</span>
                  )}
                </div>
              </div>

              {/* Extracted Skills List */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#1C4A57] mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#1C4A57]" /> Extracted Skills via ESCO Taxonomy ({result.extracted_skills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#FAF8F3] rounded-xl border border-[#1C4A57]/10">
                  {result.extracted_skills?.map((skill, idx) => (
                    <span key={idx} className="bg-[#CFE3E0] text-[#1C4A57] text-[11px] font-semibold px-2 py-0.5 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Closed Loop Sync Status */}
              <div className="p-3 bg-[#E6F4F0] border border-[#2E7D68]/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D68]" />
                  <span className="text-xs font-bold text-[#2E7D68]">
                    Signals Synced into Career Profile & Placement Score!
                  </span>
                </div>
                <span className="text-xs font-black text-[#1C4A57] bg-white px-2 py-1 rounded shadow-xs">
                  Updated Score: {result.updated_overall_readiness}/100
                </span>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#1C4A57]/60">
              <FileText className="w-16 h-16 mb-4 text-[#1C4A57]/30" />
              <h4 className="text-base font-bold text-[#1C4A57]">Awaiting Resume Signal</h4>
              <p className="text-xs text-[#1C4A57]/70 mt-1 max-w-sm">
                Paste resume text or click "Load Sample Resume" above to run the NLP extraction engine and view multi-domain diagnostic feedback.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── REAL-TIME MULTI-DOMAIN DIAGNOSTIC FEEDBACK (5 Core Domains) ────── */}
      {result && result.domain_diagnostics && (
        <div className="bg-white rounded-2xl p-6 border border-[#1C4A57]/15 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C4A57]/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1C4A57]" />
                <h3 className="text-lg font-black text-[#1C4A57]">
                  5-Domain Technical Diagnostics & Role Alignment
                </h3>
              </div>
              <p className="text-xs text-[#1C4A57]/70 mt-1">
                Real-time evaluation across all 5 technical domains calibrated for{' '}
                <span className="font-bold underline text-[#1C4A57]">{targetRole}</span>
                {result.used_custom_jd ? ' (Targeted Custom JD Mode)' : ''}.
              </p>
            </div>
            <span className="bg-[#CFE3E0] text-[#1C4A57] text-xs font-bold px-3 py-1 rounded-full border border-[#1C4A57]/20 self-start sm:self-auto">
              Real-Time Role Mapping Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {domainDisplayList.map(({ key, title }) => {
              const diag = result.domain_diagnostics[key] || {
                domain_name: title,
                health_score: 0,
                strong_points: [],
                gaps: [],
                recommendation: 'Add relevant skills to improve domain alignment.'
              };
              const IconComp = getDomainIcon(key);
              const score = diag.health_score || 0;

              return (
                <div key={key} className="bg-[#FAF8F3] border border-[#1C4A57]/15 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                  <div>
                    {/* Card Header: Icon, Title & Health Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-[#1C4A57] text-[#CFE3E0]">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black text-[#1C4A57] leading-snug">
                          {diag.domain_name || title}
                        </h4>
                      </div>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${getHealthBadgeColor(score)}`}>
                        {score}%
                      </span>
                    </div>

                    {/* Progress Health Bar */}
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full transition-all duration-500 ${getHealthBarColor(score)}`} 
                        style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                      />
                    </div>

                    {/* Strong Points */}
                    <div className="space-y-1.5 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2E7D68] flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#2E7D68]" /> Strong Points ({diag.strong_points?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {diag.strong_points && diag.strong_points.length > 0 ? (
                          diag.strong_points.map((skill, idx) => (
                            <span key={idx} className="bg-[#E6F4F0] text-[#2E7D68] text-[10px] font-bold px-2 py-0.5 rounded border border-[#2E7D68]/20">
                              ✓ {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-500 italic">No domain skills matched yet</span>
                        )}
                      </div>
                    </div>

                    {/* Critical Gaps */}
                    <div className="space-y-1.5 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#D95D39] flex items-center gap-1">
                        <X className="w-3 h-3 text-[#D95D39]" /> Critical Gaps ({diag.gaps?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {diag.gaps && diag.gaps.length > 0 ? (
                          diag.gaps.map((skill, idx) => (
                            <span key={idx} className="bg-[#FDEAE5] text-[#D95D39] text-[10px] font-bold px-2 py-0.5 rounded border border-[#F5C6BA]">
                              ✕ {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#2E7D68] font-semibold">100% domain coverage!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actionable Bullet Recommendation Box */}
                  <div className="bg-white border border-[#1C4A57]/15 rounded-lg p-3 pt-2.5 text-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C4A57] flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-[#1C4A57]" /> Actionable Resume Bullet Recommendation:
                    </span>
                    <p className="text-[11px] text-[#1C4A57]/90 leading-relaxed font-mono bg-[#FAF8F3] p-2 rounded border border-gray-100">
                      "{diag.recommendation || diag.actionable_recommendation}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
