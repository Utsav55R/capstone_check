import React from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  TrendingUp, 
  Brain, 
  Sparkles, 
  Code, 
  FileText, 
  RefreshCw,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function DashboardHub({ 
  dashboardData, 
  setActiveTab, 
  onRefresh 
}) {
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-[#1C4A57]">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-semibold text-lg">Loading Student Dashboard & Placement Intelligence...</span>
        </div>
      </div>
    );
  }

  const {
    target_role = "AI / ML Engineer",
    overall_readiness = 68,
    readiness_tier = "Advanced",
    dimension_scores = {},
    role_competencies,
    priority_actions = [],
    diagnostics,
    leetcode_stats,
    quick_stats
  } = dashboardData;

  // Strict 6-Tier Grading Utility
  const getSkillGradeInfo = (score) => {
    const s = Math.round(score);
    if (s < 30) {
      return { 
        label: 'Very Poor', 
        color: '#8B0000', 
        bgStyle: { backgroundColor: '#8B0000' }, 
        pillStyle: { backgroundColor: '#8B0000', color: '#FFFFFF' } 
      };
    }
    if (s < 50) {
      return { 
        label: 'Poor', 
        color: '#FF4D4D', 
        bgStyle: { backgroundColor: '#FF4D4D' }, 
        pillStyle: { backgroundColor: '#FF4D4D', color: '#FFFFFF' } 
      };
    }
    if (s < 60) {
      return { 
        label: 'Moderate', 
        color: '#FFA500', 
        bgStyle: { backgroundColor: '#FFA500' }, 
        pillStyle: { backgroundColor: '#FFA500', color: '#1C4A57' } 
      };
    }
    if (s < 75) {
      return { 
        label: 'Good', 
        color: '#90EE90', 
        bgStyle: { backgroundColor: '#90EE90' }, 
        pillStyle: { backgroundColor: '#90EE90', color: '#1C4A57' } 
      };
    }
    if (s < 90) {
      return { 
        label: 'Very Good', 
        color: '#008000', 
        bgStyle: { backgroundColor: '#008000' }, 
        pillStyle: { backgroundColor: '#008000', color: '#FFFFFF' } 
      };
    }
    return { 
      label: 'Excellent', 
      color: '#00BFFF', 
      bgStyle: { backgroundColor: '#00BFFF' }, 
      pillStyle: { backgroundColor: '#00BFFF', color: '#1C4A57' } 
    };
  };

  // Role-Based Skill Filter Mapping (Client-side Fallback & Real-Time Filter)
  const roleSkillMap = {
    "AI / ML Engineer": [
      { key: 'python', label: 'Python', scoreKey: 'python' },
      { key: 'ml', label: 'Machine Learning', scoreKey: 'ml' },
      { key: 'deep_learning', label: 'Deep Learning', scoreKey: 'deep_learning' },
      { key: 'dsa', label: 'DSA / Algorithms', scoreKey: 'dsa' },
      { key: 'projects', label: 'ML Projects', scoreKey: 'projects' },
      { key: 'resume_quality', label: 'Resume Quality', scoreKey: 'resume_quality' },
      { key: 'interview_readiness', label: 'Interview Readiness', scoreKey: 'interview_readiness' },
      { key: 'sql', label: 'SQL & Data Storage', scoreKey: 'sql' },
      { key: 'comm_readiness', label: 'Communication Readiness', scoreKey: 'comm_readiness' },
    ],
    "Full Stack Developer": [
      { key: 'react_frontend', label: 'React & Frontend', scoreKey: 'python' },
      { key: 'node_fastapi', label: 'FastAPI / Node Backend', scoreKey: 'ml' },
      { key: 'sql_db', label: 'SQL & PostgreSQL', scoreKey: 'sql' },
      { key: 'dsa', label: 'DSA & Problem Solving', scoreKey: 'dsa' },
      { key: 'docker_devops', label: 'Docker & Web APIs', scoreKey: 'projects' },
      { key: 'resume_quality', label: 'Resume Quality', scoreKey: 'resume_quality' },
      { key: 'interview_readiness', label: 'Interview Readiness', scoreKey: 'interview_readiness' },
      { key: 'comm_readiness', label: 'Communication Readiness', scoreKey: 'comm_readiness' },
    ],
    "Cloud / DevOps Engineer": [
      { key: 'linux_bash', label: 'Linux & Shell Scripting', scoreKey: 'python' },
      { key: 'docker_k8s', label: 'Docker & Kubernetes', scoreKey: 'deep_learning' },
      { key: 'aws_cloud', label: 'AWS & Cloud Platforms', scoreKey: 'ml' },
      { key: 'terraform_iac', label: 'Terraform & IaC', scoreKey: 'dsa' },
      { key: 'cicd_git', label: 'CI/CD & Git Pipelines', scoreKey: 'sql' },
      { key: 'python_auto', label: 'Python Automation', scoreKey: 'projects' },
      { key: 'resume_quality', label: 'Resume Quality', scoreKey: 'resume_quality' },
      { key: 'interview_readiness', label: 'Interview Readiness', scoreKey: 'interview_readiness' },
      { key: 'comm_readiness', label: 'Communication Readiness', scoreKey: 'comm_readiness' },
    ],
    "Game Developer": [
      { key: 'cpp_csharp', label: 'C++ & C# Programming', scoreKey: 'python' },
      { key: 'unity_engine', label: 'Unity Engine', scoreKey: 'ml' },
      { key: 'unreal_engine', label: 'Unreal Engine', scoreKey: 'deep_learning' },
      { key: 'math_3d', label: '3D Mathematics & Vectors', scoreKey: 'dsa' },
      { key: 'physics_shaders', label: 'Physics Engine & Shaders', scoreKey: 'sql' },
      { key: 'opengl_directx', label: 'OpenGL / DirectX APIs', scoreKey: 'projects' },
      { key: 'resume_quality', label: 'Resume Quality', scoreKey: 'resume_quality' },
      { key: 'interview_readiness', label: 'Interview Readiness', scoreKey: 'interview_readiness' },
      { key: 'comm_readiness', label: 'Communication Readiness', scoreKey: 'comm_readiness' },
    ],
    "Data Engineer": [
      { key: 'python', label: 'Python Pipelines', scoreKey: 'python' },
      { key: 'sql_db', label: 'SQL & Relational DBs', scoreKey: 'sql' },
      { key: 'spark_kafka', label: 'Apache Spark & Kafka', scoreKey: 'ml' },
      { key: 'etl_pipelines', label: 'ETL & Data Warehousing', scoreKey: 'deep_learning' },
      { key: 'snowflake_bq', label: 'Snowflake & BigQuery', scoreKey: 'dsa' },
      { key: 'docker_airflow', label: 'Docker & Airflow', scoreKey: 'projects' },
      { key: 'resume_quality', label: 'Resume Quality', scoreKey: 'resume_quality' },
      { key: 'interview_readiness', label: 'Interview Readiness', scoreKey: 'interview_readiness' },
      { key: 'comm_readiness', label: 'Communication Readiness', scoreKey: 'comm_readiness' },
    ],
    "Data Analyst": [
      { key: 'sql', label: 'SQL Querying & JOINs', scoreKey: 'sql' },
      { key: 'excel', label: 'Advanced Excel & Pivot Tables', scoreKey: 'python' },
      { key: 'power_bi_tableau', label: 'Power BI & Tableau', scoreKey: 'deep_learning' },
      { key: 'python_pandas', label: 'Python & Pandas', scoreKey: 'ml' },
      { key: 'statistics_ab', "label": 'Statistics & A/B Testing', scoreKey: 'dsa' },
      { key: 'data_viz', label: 'Data Visualization & Dashboards', scoreKey: 'projects' },
      { key: 'resume_quality', label: 'Resume Quality', scoreKey: 'resume_quality' },
      { key: 'interview_readiness', label: 'Interview Readiness', scoreKey: 'interview_readiness' },
      { key: 'comm_readiness', label: 'Communication Readiness', scoreKey: 'comm_readiness' },
    ],
  };

  // Build active competency list for current target_role
  const activeSkillConfig = roleSkillMap[target_role] || roleSkillMap["AI / ML Engineer"];

  const activeCompetencies = activeSkillConfig.map(item => {
    const rawScore = dimension_scores[item.scoreKey] ?? 50;
    const gradeInfo = getSkillGradeInfo(rawScore);
    return {
      key: item.key,
      label: item.label,
      score: Math.round(rawScore),
      gradeInfo
    };
  });

  // Map priority action type to destination tab
  const getTabForAction = (actionType) => {
    switch (actionType) {
      case 'course': return 'assessment';
      case 'practice': return 'coding';
      case 'project': return 'roadmap';
      case 'resume': return 'resume';
      case 'interview': return 'interview';
      default: return 'roadmap';
    }
  };

  const overallGradeInfo = getSkillGradeInfo(overall_readiness);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Welcome Banner */}
      <div className="bg-[#EAE5D6] rounded-2xl p-5 border border-[#1C4A57]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1C4A57] tracking-tight">Student Placement Hub</h1>
            <span className="bg-[#1C4A57] text-[#CFE3E0] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {readiness_tier} Tier
            </span>
          </div>
          <p className="text-sm text-[#1C4A57]/80 mt-1">
            Role-filtered continuous career evaluation for <span className="font-bold underline text-[#1C4A57]">{target_role}</span>.
          </p>
        </div>

        {/* Closed Loop Status Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-[#CFE3E0] text-[#1C4A57] px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 border border-[#1C4A57]/20">
            <CheckCircle className="w-3.5 h-3.5 text-[#2E7D68]" /> Signals: Resume + LeetCode
          </span>
          <button 
            onClick={onRefresh}
            className="bg-[#1C4A57] text-[#F1EEE3] hover:bg-[#143741] px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-evaluate Loop
          </button>
        </div>
      </div>

      {/* CORE INNOVATION ROW: Target Role Gauge, Role-Filtered Skills & Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Target Role & Big Readiness Gauge */}
        <div className="lg:col-span-4 bg-[#1C4A57] text-white rounded-3xl p-7 flex flex-col justify-between shadow-md border border-[#143741]">
          <div>
            <div className="text-center pb-4 border-b border-white/15">
              <span className="text-xs uppercase tracking-widest text-[#CFE3E0] font-bold">TARGET ROLE</span>
              <h2 className="text-2xl font-black text-white mt-1 tracking-tight">{target_role}</h2>
            </div>

            {/* Circular Gauge / Score */}
            <div className="my-8 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#143741"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={overallGradeInfo.color}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - overall_readiness / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-6xl font-black tracking-tighter text-white">
                    {overall_readiness}
                  </span>
                  <span className="text-sm font-bold text-[#CFE3E0] tracking-wider">
                    / 100
                  </span>
                  <span className="text-xs text-[#EAE5D6] font-medium mt-0.5">
                    Placement Score
                  </span>
                </div>
              </div>

              {/* Categorical Grade Pill Badge */}
              <div 
                style={{ backgroundColor: overallGradeInfo.color }}
                className="mt-4 px-4 py-1 rounded-full text-xs font-black shadow-sm text-white flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" /> Grade: {overallGradeInfo.label}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/15 text-center">
            <p className="text-xs text-[#EAE5D6] font-semibold tracking-wide flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#CFE3E0]" />
              Assess → Improve → Reassess → Track Growth
            </p>
          </div>
        </div>

        {/* CENTER COLUMN: Competency Profile · Role-Filtered Domain Skills */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-7 shadow-sm border border-[#1C4A57]/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#1C4A57]/70 font-bold">ROLE-SPECIFIC DOMAINS</span>
                <h3 className="text-lg font-black text-[#1C4A57]">{target_role.toUpperCase()} COMPETENCIES</h3>
              </div>
              <span className="text-xs bg-[#EAE5D6] text-[#1C4A57] font-bold px-2 py-1 rounded flex items-center gap-1">
                <Layers className="w-3 h-3" /> Filtered View
              </span>
            </div>

            {/* Role-Filtered Progress Bars with 6-Tier Categorical Badges */}
            <div className="space-y-3.5">
              {activeCompetencies.map((dim) => {
                const { gradeInfo } = dim;
                return (
                  <div key={dim.key} className="group">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-[#1C4A57] font-bold">
                        {dim.label}
                      </span>

                      {/* Score Number + 6-Tier Categorical Badge */}
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#1C4A57] text-xs">
                          {dim.score}%
                        </span>
                        <span 
                          style={gradeInfo.pillStyle}
                          className="text-[10px] font-black px-2 py-0.2 rounded-full shadow-2xs uppercase tracking-wider"
                        >
                          [{gradeInfo.label}]
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with Color Hex Coding */}
                    <div className="w-full bg-[#EAE5D6]/70 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-700 shadow-2xs"
                        style={{ ...gradeInfo.bgStyle, width: `${Math.min(100, Math.max(5, dim.score))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#1C4A57]/70">
            <span>6-Tier Scale: Very Poor &lt;30 &bull; Poor &lt;50 &bull; Moderate &lt;60 &bull; Good &lt;75 &bull; Very Good &lt;90 &bull; Excellent &ge;90</span>
          </div>
        </div>

        {/* RIGHT COLUMN: AI-Generated Priority Actions */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-[#1C4A57]/15 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-gray-100 mb-3">
              <span className="text-[11px] uppercase tracking-wider text-[#1C4A57]/70 font-bold">AI INTELLIGENCE</span>
              <h3 className="text-base font-black text-[#1C4A57]">PRIORITY ACTIONS</h3>
            </div>

            {/* P1 to P5 Action Cards */}
            <div className="space-y-3">
              {priority_actions.map((action) => {
                const targetTab = getTabForAction(action.action_type);
                return (
                  <div 
                    key={action.priority}
                    onClick={() => setActiveTab(targetTab)}
                    className="p-2.5 rounded-xl bg-[#FAF8F3] hover:bg-[#CFE3E0]/40 border border-[#1C4A57]/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="bg-[#1C4A57] text-[#CFE3E0] text-[11px] font-black px-1.5 py-0.5 rounded shrink-0">
                        {action.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1C4A57] leading-tight group-hover:text-[#143741]">
                          {action.title}
                        </p>
                        <p className="text-[11px] text-[#1C4A57]/80 mt-1 line-clamp-2">
                          {action.recommended_action}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#1C4A57]/40 group-hover:text-[#1C4A57] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Philosophy Note */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 bg-[#EAE5D6]/40 p-2.5 rounded-xl text-[11px] text-[#1C4A57]/80 italic">
            "The score is a diagnosis, not a verdict — the explanation and the next action matter more than the number."
          </div>
        </div>
      </div>

      {/* DIAGNOSTIC EXPLANATION STRIP */}
      <div className="bg-[#CFE3E0]/50 rounded-2xl p-5 border border-[#1C4A57]/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-b md:border-b-0 md:border-r border-[#1C4A57]/15 pb-3 md:pb-0 md:pr-4">
            <span className="text-xs font-black uppercase tracking-wider text-[#1C4A57]">WHY IS IT LOW?</span>
            <p className="text-xs text-[#1C4A57]/90 mt-1 leading-relaxed">
              {diagnostics?.why_is_it_low || `Weakest competencies for ${target_role} are flagged in red/orange with targeted action plans.`}
            </p>
          </div>

          <div className="border-b md:border-b-0 md:border-r border-[#1C4A57]/15 pb-3 md:pb-0 md:pr-4">
            <span className="text-xs font-black uppercase tracking-wider text-[#1C4A57]">WHAT NEXT?</span>
            <p className="text-xs text-[#1C4A57]/90 mt-1 leading-relaxed">
              {diagnostics?.what_next || "A ranked action list, refreshed after every activity."}
            </p>
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#1C4A57]">ROLE-FILTERED VIEW</span>
            <p className="text-xs text-[#1C4A57]/90 mt-1 leading-relaxed">
              Displaying ONLY domain-relevant skills for {target_role}. Switch roles in top navbar to re-filter.
            </p>
          </div>
        </div>
      </div>

      {/* THE CLOSED FEEDBACK LOOP JOURNEY */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1C4A57]/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#1C4A57]/70 font-bold">INTELLIGENCE LOOP ARCHITECTURE</span>
            <h3 className="text-lg font-black text-[#1C4A57]">End-to-End Closed Feedback Cycle</h3>
          </div>
          <span className="text-xs text-[#1C4A57] bg-[#CFE3E0] px-2.5 py-1 rounded font-semibold">
            Interactive Continuous Evaluation Loop
          </span>
        </div>

        {/* 4 Flow Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Node 1 */}
          <div className="bg-[#FAF8F3] rounded-2xl p-4 border border-[#1C4A57]/15 hover:border-[#1C4A57] transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-[#1C4A57] text-[#CFE3E0] flex items-center justify-center text-xs font-black">1</span>
                <FileText className="w-4 h-4 text-[#1C4A57]" />
              </div>
              <h4 className="text-sm font-bold text-[#1C4A57]">Signal Ingestion</h4>
              <p className="text-xs text-[#1C4A57]/80 mt-1 leading-relaxed">
                Resume parsed via NLP/ESCO + LeetCode profile synced ({leetcode_stats?.total_solved || 142} solved).
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('resume')}
              className="mt-4 text-xs font-bold text-[#1C4A57] flex items-center gap-1 hover:underline"
            >
              Open Resume Analyser <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Node 2 */}
          <div className="bg-[#FAF8F3] rounded-2xl p-4 border border-[#1C4A57]/15 hover:border-[#1C4A57] transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-[#1C4A57] text-[#CFE3E0] flex items-center justify-center text-xs font-black">2</span>
                <Brain className="w-4 h-4 text-[#1C4A57]" />
              </div>
              <h4 className="text-sm font-bold text-[#1C4A57]">Skill Gap Engine</h4>
              <p className="text-xs text-[#1C4A57]/80 mt-1 leading-relaxed">
                Target role JD embedded. Gaps detected across role-filtered domains.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('assessment')}
              className="mt-4 text-xs font-bold text-[#1C4A57] flex items-center gap-1 hover:underline"
            >
              Take Skill Assessment <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Node 3 */}
          <div className="bg-[#FAF8F3] rounded-2xl p-4 border border-[#1C4A57]/15 hover:border-[#1C4A57] transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-[#1C4A57] text-[#CFE3E0] flex items-center justify-center text-xs font-black">3</span>
                <Code className="w-4 h-4 text-[#1C4A57]" />
              </div>
              <h4 className="text-sm font-bold text-[#1C4A57]">AI Recommendations</h4>
              <p className="text-xs text-[#1C4A57]/80 mt-1 leading-relaxed">
                Targeted Project & Coding challenges assigned for role gap mitigation.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('coding')}
              className="mt-4 text-xs font-bold text-[#1C4A57] flex items-center gap-1 hover:underline"
            >
              Solve Coding Challenge <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Node 4 */}
          <div className="bg-[#FAF8F3] rounded-2xl p-4 border border-[#1C4A57]/15 hover:border-[#1C4A57] transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-[#1C4A57] text-[#CFE3E0] flex items-center justify-center text-xs font-black">4</span>
                <TrendingUp className="w-4 h-4 text-[#1C4A57]" />
              </div>
              <h4 className="text-sm font-bold text-[#1C4A57]">Dynamic Re-evaluation</h4>
              <p className="text-xs text-[#1C4A57]/80 mt-1 leading-relaxed">
                Submission recomputes 9 dimensions; Readiness Score updates in real-time!
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('interview')}
              className="mt-4 text-xs font-bold text-[#1C4A57] flex items-center gap-1 hover:underline"
            >
              Practice Saraswati Mock <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
