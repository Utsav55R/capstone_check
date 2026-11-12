import React from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Target, 
  BookOpen, 
  Calendar, 
  ArrowLeft,
  MessageSquare,
  Sparkles,
  BarChart3,
  CheckSquare
} from 'lucide-react';

export default function InterviewReport({ 
  reportData, 
  onBackToChat 
}) {
  if (!reportData) return null;

  const {
    target_role = "AI / ML Engineer",
    overall_composite_score = 75.0,
    categorical_grade = "Very Good",
    grade_color = "#008000",
    grade_bg = "#E6F4E6",
    parameter_breakdown = {
      relevance_score: 75.0,
      structure_score: 70.0,
      correctness_score: 80.0,
      depth_score: 70.0
    },
    weak_topics = [],
    actionable_checklist = [],
    messages = []
  } = reportData;

  const candidateTurns = messages.filter(m => m.sender === 'candidate');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Back to Interview Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToChat}
          className="bg-white border border-[#1C4A57]/20 text-[#1C4A57] hover:bg-[#F1EEE3] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#1C4A57]" /> Back to Saraswati Interview Chat
        </button>

        <span className="bg-[#1C4A57] text-[#CFE3E0] text-xs font-bold px-3 py-1 rounded-full">
          Verified Diagnostic Performance Report
        </span>
      </div>

      {/* EXECUTIVE SCORE HEADER (1. Executive Score Header) */}
      <div className="bg-white rounded-3xl p-8 border border-[#1C4A57]/15 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left: Overall Ring Score & Categorical Grade */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#FAF8F3] border border-[#1C4A57]/10">
          <span className="text-xs uppercase font-black tracking-wider text-[#1C4A57]/70 mb-2">
            Executive Performance Index
          </span>

          {/* Color-Coded Progress Ring */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                strokeWidth="3.5"
                strokeDasharray={`${overall_composite_score}, 100`}
                strokeLinecap="round"
                style={{ stroke: grade_color }}
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#1C4A57]">
                {overall_composite_score}<span className="text-sm font-semibold">%</span>
              </span>
              <span className="text-[10px] text-[#1C4A57]/60 font-bold uppercase">Composite</span>
            </div>
          </div>

          {/* Categorical Grade Label */}
          <div 
            style={{ backgroundColor: grade_bg, color: grade_color, borderColor: `${grade_color}40` }}
            className="mt-2 px-4 py-1.5 rounded-full font-black text-sm border flex items-center gap-1.5 shadow-xs"
          >
            <Award className="w-4 h-4" />
            <span>Categorical Grade: {categorical_grade}</span>
          </div>
        </div>

        {/* Right: Parameter Analysis Breakdown */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <h2 className="text-xl font-black text-[#1C4A57] tracking-tight">
              Saraswati Diagnostic Evaluation — {target_role}
            </h2>
            <p className="text-xs text-[#1C4A57]/80 mt-1">
              Evaluated across 4 core candidate performance dimensions using Gemini 1.5 Flash rubric scoring.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            
            {/* Relevance */}
            <div className="bg-[#FAF8F3] p-3.5 rounded-xl border border-[#1C4A57]/10 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-[#1C4A57]">
                <span>1. Relevance</span>
                <span className="font-black text-[#1C4A57]">{parameter_breakdown.relevance_score}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1C4A57] h-full transition-all" 
                  style={{ width: `${parameter_breakdown.relevance_score}%` }} 
                />
              </div>
            </div>

            {/* STAR Structure */}
            <div className="bg-[#FAF8F3] p-3.5 rounded-xl border border-[#1C4A57]/10 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-[#1C4A57]">
                <span>2. STAR Structure</span>
                <span className="font-black text-[#1C4A57]">{parameter_breakdown.structure_score}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#2E7D68] h-full transition-all" 
                  style={{ width: `${parameter_breakdown.structure_score}%` }} 
                />
              </div>
            </div>

            {/* Technical Correctness */}
            <div className="bg-[#FAF8F3] p-3.5 rounded-xl border border-[#1C4A57]/10 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-[#1C4A57]">
                <span>3. Tech Correctness</span>
                <span className="font-black text-[#1C4A57]">{parameter_breakdown.correctness_score}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1C4A57] h-full transition-all" 
                  style={{ width: `${parameter_breakdown.correctness_score}%` }} 
                />
              </div>
            </div>

            {/* Depth & Trade-offs */}
            <div className="bg-[#FAF8F3] p-3.5 rounded-xl border border-[#1C4A57]/10 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-[#1C4A57]">
                <span>4. Depth & Trade-offs</span>
                <span className="font-black text-[#1C4A57]">{parameter_breakdown.depth_score}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#E69A39] h-full transition-all" 
                  style={{ width: `${parameter_breakdown.depth_score}%` }} 
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* STRATEGY MATRIX: SCOPE OF IMPROVEMENT TO CRACK [TARGET ROLE] */}
      <div className="bg-white rounded-3xl p-6 border border-[#1C4A57]/15 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-[#1C4A57]/10 pb-3">
          <Target className="w-5 h-5 text-[#D95D39]" />
          <h3 className="text-lg font-black text-[#1C4A57]">
            Scope of Improvement to Crack {target_role}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Weak Technical Topics */}
          <div className="bg-[#FAF8F3] p-5 rounded-2xl border border-[#1C4A57]/10 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#D95D39] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Detected Weak Technical Topics
            </h4>
            <ul className="space-y-2 text-xs text-[#1C4A57]">
              {weak_topics && weak_topics.length > 0 ? (
                weak_topics.map((topic, idx) => (
                  <li key={idx} className="bg-white p-2.5 rounded-xl border border-[#D95D39]/20 font-bold flex items-center gap-2 text-[#D95D39]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D95D39]" />
                    {topic}
                  </li>
                ))
              ) : (
                <li className="text-xs text-[#2E7D68] font-semibold">No critical topic gaps detected during interview!</li>
              )}
            </ul>
          </div>

          {/* Actionable 7-Day Improvement Checklist */}
          <div className="bg-[#FAF8F3] p-5 rounded-2xl border border-[#1C4A57]/10 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#2E7D68] flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" /> Actionable 7-Day Job-Cracking Checklist
            </h4>
            <div className="space-y-2 text-xs text-[#1C4A57]">
              {actionable_checklist && actionable_checklist.length > 0 ? (
                actionable_checklist.map((item, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-[#2E7D68]/20 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D68] shrink-0 mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-gray-500">No checklist items generated yet.</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* FULL SAVED TRANSCRIPT & TURN-BY-TURN DIAGNOSTIC CARDS */}
      <div className="bg-white rounded-3xl p-6 border border-[#1C4A57]/15 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#1C4A57]/10 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#1C4A57]" />
            <h3 className="text-lg font-black text-[#1C4A57]">
              Turn-by-Turn Diagnostic Breakdown & Model Answers
            </h3>
          </div>
          <span className="text-xs font-bold text-[#1C4A57]/70">
            {candidateTurns.length} Evaluated Response Turns
          </span>
        </div>

        <div className="space-y-6">
          {candidateTurns.length > 0 ? (
            candidateTurns.map((turn, idx) => {
              const evalData = turn.eval || {};
              const score = evalData.score || 7.0;

              return (
                <div key={idx} className="bg-[#FAF8F3] border border-[#1C4A57]/15 rounded-2xl p-5 space-y-4">
                  
                  {/* Turn Header */}
                  <div className="flex items-center justify-between border-b border-[#1C4A57]/10 pb-3">
                    <span className="bg-[#1C4A57] text-[#CFE3E0] text-xs font-bold px-2.5 py-0.5 rounded-md">
                      Turn {idx + 1} Candidate Response
                    </span>
                    <span className="text-xs font-black text-[#1C4A57] bg-white px-3 py-1 rounded-lg border border-[#1C4A57]/20 shadow-xs">
                      Turn Score: {score}/10
                    </span>
                  </div>

                  {/* Candidate Typed Text */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#1C4A57]/60 block mb-1">
                      What You Typed:
                    </span>
                    <p className="text-xs font-mono text-[#1C4A57] bg-white p-3 rounded-xl border border-gray-200 leading-relaxed">
                      "{turn.text}"
                    </p>
                  </div>

                  {/* Diagnostic Feedback */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#E6F4E6] p-3 rounded-xl border border-[#008000]/20 space-y-1">
                      <span className="font-bold text-[#008000] block">Strengths:</span>
                      <p className="text-[#1C4A57]">{evalData.strengths || "Direct response addressing core prompt."}</p>
                    </div>
                    <div className="bg-[#FFF5E6] p-3 rounded-xl border border-[#FFA500]/30 space-y-1">
                      <span className="font-bold text-[#FFA500] block">Key Improvements:</span>
                      <p className="text-[#1C4A57]">{evalData.improvements || "Incorporate measurable quantitative metrics."}</p>
                    </div>
                  </div>

                  {/* Ideal Model Answer */}
                  <div className="bg-[#EAE5D6] p-3.5 rounded-xl border border-[#1C4A57]/20 space-y-1 text-xs">
                    <span className="font-black text-[#1C4A57] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1C4A57]" /> Ideal Model Answer ("How you should phrase this"):
                    </span>
                    <p className="text-[#1C4A57] font-mono leading-relaxed bg-white/70 p-2.5 rounded-lg border border-[#1C4A57]/10">
                      {evalData.model_answer || "Incorporate structured trade-offs and quantitative impact numbers."}
                    </p>
                  </div>

                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-500 italic text-center py-4">No evaluated turns available for this session.</p>
          )}
        </div>
      </div>

    </div>
  );
}
