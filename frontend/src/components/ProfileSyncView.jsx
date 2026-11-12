import React, { useState } from 'react';
import { 
  UserCircle, 
  Github, 
  Linkedin, 
  Code, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  Save,
  Sliders
} from 'lucide-react';

export default function ProfileSyncView({ dashboardData, targetRole, embedded = false }) {
  const [leetcodeUrl, setLeetcodeUrl] = useState(dashboardData?.leetcode_stats?.url || 'https://leetcode.com/u/alexchen_ml');
  const [totalSolved, setTotalSolved] = useState(dashboardData?.leetcode_stats?.total_solved || 142);
  const [mediumSolved, setMediumSolved] = useState(dashboardData?.leetcode_stats?.medium_solved || 68);
  const [githubUrl, setGithubUrl] = useState(dashboardData?.portfolio_links?.github || 'https://github.com/alexchen-ml');
  const [linkedinUrl, setLinkedinUrl] = useState(dashboardData?.portfolio_links?.linkedin || 'https://linkedin.com/in/alexchen-ai');
  const [saved, setSaved] = useState(false);

  const [skills, setSkills] = useState(dashboardData?.self_assessed_skills || {
    "Python": "Advanced",
    "FastAPI": "Intermediate",
    "SQL": "Intermediate",
    "PyTorch": "Beginner",
    "Docker": "Beginner"
  });

  const handleSkillLevelChange = (skill, level) => {
    setSkills(prev => ({
      ...prev,
      [skill]: level
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={embedded ? 'space-y-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'}>
      
      {/* Header Banner */}
      <div className="bg-[#EAE5D6] rounded-xl p-5 border border-[#1C4A57]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1C4A57] tracking-tight">Student Profile & Signal Integrations</h1>
            <span className="bg-[#1C4A57] text-[#CFE3E0] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Signal 03
            </span>
          </div>
          <p className="text-sm text-[#1C4A57]/80 mt-1">
            External platform telemetry and validated self-assessed skill levels feeding the central <span className="font-bold">AI Gap Matrix</span>.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0"
        >
          <Save className="w-4 h-4 text-[#CFE3E0]" /> Save Profile Telemetry
        </button>
      </div>

      {saved && (
        <div className="bg-[#E6F4F0] border border-[#2E7D68]/30 text-[#2E7D68] p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Telemetry signals saved and synced with Central Gap Matrix!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: External Telemetry & Links */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-sm border border-[#1C4A57]/15 space-y-5">
          <div className="pb-3 border-b border-gray-100">
            <span className="text-xs uppercase tracking-wider text-[#1C4A57]/70 font-bold">EXTERNAL TELEMETRY</span>
            <h3 className="text-lg font-black text-[#1C4A57]">Coding & Portfolio Integrations</h3>
          </div>

          {/* LeetCode Integration Box */}
          <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#1C4A57]/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C4A57] flex items-center gap-1.5">
                <Code className="w-4 h-4 text-[#1C4A57]" /> LeetCode Telemetry
              </span>
              <span className="text-[10px] bg-[#CFE3E0] text-[#1C4A57] px-2 py-0.5 rounded font-bold">
                Synced
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-[#1C4A57]/70 font-semibold block">LeetCode Profile URL:</label>
              <input
                type="text"
                value={leetcodeUrl}
                onChange={(e) => setLeetcodeUrl(e.target.value)}
                className="w-full bg-white border border-[#1C4A57]/20 rounded-lg p-2 text-xs text-[#1C4A57] focus:outline-none focus:ring-1 focus:ring-[#1C4A57]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white rounded-lg border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Solved</span>
                <span className="text-xl font-black text-[#1C4A57]">{totalSolved}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Medium Problems</span>
                <span className="text-xl font-black text-[#2E7D68]">{mediumSolved}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-bold text-[#D95D39] block mb-1">
                Identified Topic Deficit:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dashboardData?.leetcode_stats?.weak_topics?.map((topic, idx) => (
                  <span key={idx} className="bg-[#FDEAE5] text-[#D95D39] text-[10px] font-bold px-2 py-0.5 rounded border border-[#F5C6BA]">
                    ✕ {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* GitHub & LinkedIn Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#1C4A57] flex items-center gap-1.5 mb-1">
                <Github className="w-4 h-4 text-[#1C4A57]" /> GitHub Portfolio URL:
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-lg p-2 text-xs text-[#1C4A57] focus:outline-none focus:ring-1 focus:ring-[#1C4A57]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C4A57] flex items-center gap-1.5 mb-1">
                <Linkedin className="w-4 h-4 text-[#1C4A57]" /> LinkedIn Profile URL:
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-lg p-2 text-xs text-[#1C4A57] focus:outline-none focus:ring-1 focus:ring-[#1C4A57]"
              />
            </div>
          </div>

        </div>

        {/* Right: Validated Self-Assessed Skills & Matrix Hub */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-sm border border-[#1C4A57]/15 space-y-5">
          <div className="pb-3 border-b border-gray-100">
            <span className="text-xs uppercase tracking-wider text-[#1C4A57]/70 font-bold">PROFICIENCY SELECTOR</span>
            <h3 className="text-lg font-black text-[#1C4A57]">Validated Self-Assessed Skills</h3>
          </div>

          <div className="space-y-3">
            {Object.entries(skills).map(([skill, level]) => (
              <div key={skill} className="p-3 bg-[#FAF8F3] rounded-xl border border-[#1C4A57]/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1C4A57] block">{skill}</span>
                  <span className={`text-[10px] font-semibold ${
                    level === 'Advanced' ? 'text-[#2E7D68]' : level === 'Intermediate' ? 'text-[#1C4A57]' : 'text-[#D95D39]'
                  }`}>
                    Current: {level}
                  </span>
                </div>

                <div className="flex gap-1">
                  {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleSkillLevelChange(skill, lvl)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                        level === lvl
                          ? 'bg-[#1C4A57] text-white shadow-xs'
                          : 'bg-white text-[#1C4A57] border border-gray-200 hover:bg-[#CFE3E0]/30'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Central Hub Formula Summary Card */}
          <div className="p-4 rounded-xl bg-[#CFE3E0]/50 border border-[#1C4A57]/20 space-y-2 text-xs text-[#1C4A57]">
            <span className="font-black uppercase tracking-wider block text-[11px]">
              AI Intelligence & Gap Matrix (Central Hub)
            </span>
            <p className="leading-relaxed">
              <strong>Merged Profile:</strong> Combined Resume + LeetCode telemetry + Self-assessed skills.
            </p>
            <p className="leading-relaxed">
              <strong>Comparison Formula:</strong> <code className="bg-white px-1.5 py-0.5 rounded font-bold font-mono">GAP = JD(Target Role) - Merged Profile</code>.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
