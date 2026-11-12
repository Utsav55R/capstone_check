import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  RotateCcw, 
  History, 
  Award, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  Layers,
  MessageSquare,
  Bot
} from 'lucide-react';
import InterviewerAvatar from './InterviewerAvatar';
import InterviewReport from './InterviewReport';
import { api } from '../services/api';

export default function AdaptiveInterviewView({ 
  token, 
  targetRole, 
  onProfileUpdated 
}) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentStage, setCurrentStage] = useState(1);
  const [difficultyLevel, setDifficultyLevel] = useState('basic');
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Past History & Report state
  const [historyList, setHistoryList] = useState([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'report'

  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load active interview or start new session on mount / targetRole change
  useEffect(() => {
    startNewSession();
    fetchHistory();
  }, [targetRole]);

  const fetchHistory = async () => {
    try {
      const data = await api.getInterviewHistory(token);
      setHistoryList(data.history || []);
    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  const startNewSession = async () => {
    try {
      setLoading(true);
      setError('');
      setActiveReport(null);
      setViewMode('chat');
      const data = await api.startInterview(token, targetRole, 'technical');
      setSessionId(data.session_id);
      setMessages(data.messages || []);
      setCurrentStage(data.current_stage || 1);
      setDifficultyLevel(data.difficulty_level || 'basic');
      setIsCompleted(false);
    } catch (err) {
      setError('Could not initialize Saraswati interview session: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !sessionId || loading || isCompleted) return;

    const userText = inputText.trim();
    setInputText('');
    setError('');

    // Optimistic UI update
    const userMsg = {
      id: messages.length + 1,
      sender: 'candidate',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stage: currentStage
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await api.sendInterviewMessage(token, sessionId, userText);
      setMessages(data.messages || []);
      setCurrentStage(data.current_stage || 1);
      setDifficultyLevel(data.difficulty_level || 'basic');
      setIsCompleted(data.is_completed || false);
    } catch (err) {
      setError('Message delivery error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.finishInterview(token, sessionId);
      setActiveReport(data);
      setViewMode('report');
      setIsCompleted(true);
      if (onProfileUpdated) onProfileUpdated();
      fetchHistory();
    } catch (err) {
      setError('Could not generate final report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPastSession = async (pastSessionId) => {
    try {
      setLoading(true);
      setError('');
      setShowHistoryDrawer(false);
      const data = await api.getInterviewSession(token, pastSessionId);
      setActiveReport(data);
      setViewMode('report');
    } catch (err) {
      setError('Failed to load past session report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStageName = (stage) => {
    switch (stage) {
      case 1: return "Stage 1: Warm-up & Intro";
      case 2: return "Stage 2: Resume & Projects";
      case 3: return "Stage 3: Adaptive Technical Assessment";
      case 4: return "Stage 4: Interview Conclusion";
      default: return "Conversational Stage";
    }
  };

  // Render Report View if selected
  if (viewMode === 'report' && activeReport) {
    return (
      <InterviewReport 
        reportData={activeReport}
        onBackToChat={() => setViewMode('chat')}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-[#EAE5D6] rounded-2xl p-5 border border-[#1C4A57]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        
        {/* Recruiter Avatar Header */}
        <InterviewerAvatar 
          size={52}
          isTyping={loading}
          showDetails={true}
          statusText="Live AI Technical Recruiter"
        />

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="bg-white hover:bg-[#FAF8F3] text-[#1C4A57] border border-[#1C4A57]/20 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all shadow-xs"
          >
            <History className="w-4 h-4 text-[#1C4A57]" /> Past Sessions ({historyList.length})
          </button>

          <button
            onClick={startNewSession}
            disabled={loading}
            className="bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-[#CFE3E0]" /> Start New Interview Session
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FDEAE5] border border-[#D95D39]/30 text-[#D95D39] p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* Main Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Chat Window (100% Text-Based Chatbot Interface) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#1C4A57]/15 shadow-sm flex flex-col h-[640px] overflow-hidden">
          
          {/* Chat Header Bar */}
          <div className="bg-[#1C4A57] text-white px-6 py-3.5 flex items-center justify-between border-b border-[#143741]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#CFE3E0]" />
              <span className="font-extrabold text-sm tracking-tight">Saraswati Technical Recruiter Chat</span>
              <span className="bg-[#143741] text-[#CFE3E0] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                100% Text Mode
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#CFE3E0]">
              <Layers className="w-3.5 h-3.5" />
              <span className="font-semibold">{getStageName(currentStage)}</span>
            </div>
          </div>

          {/* Auto-scrolling Messages Container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FAF8F3]/60">
            {messages.map((msg, idx) => {
              const isSaraswati = msg.sender === 'saraswati';
              const evalData = msg.eval;

              return (
                <div 
                  key={idx}
                  className={`flex flex-col ${isSaraswati ? 'items-start' : 'items-end'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] font-bold text-[#1C4A57]/70">
                      {isSaraswati ? 'Saraswati (AI Recruiter)' : 'You (Candidate)'}
                    </span>
                    <span className="text-[9px] text-[#1C4A57]/50">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {/* Chat Bubble */}
                  <div 
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                      isSaraswati 
                        ? 'bg-white text-[#1C4A57] border border-[#1C4A57]/15 rounded-tl-xs' 
                        : 'bg-[#1C4A57] text-[#F1EEE3] rounded-tr-xs font-medium'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>

                  {/* Turn Evaluation Chip (for candidate messages) */}
                  {!isSaraswati && evalData && (
                    <div className="mt-1 bg-[#E6F4E6] border border-[#008000]/20 rounded-xl p-2.5 max-w-[85%] text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-[#008000]">
                        <span>Turn Diagnostic Score: {evalData.score}/10</span>
                        <span className="text-[9px] text-gray-500">Rubric Scored</span>
                      </div>
                      <p className="text-[10px] text-[#1C4A57]">{evalData.strengths}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator when Saraswati is generating */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#1C4A57]/70 bg-white p-3 rounded-2xl border border-[#1C4A57]/15 w-fit">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#1C4A57] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#1C4A57] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-[#1C4A57] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="font-semibold text-[11px]">Saraswati is generating response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Text Input & Send Controls */}
          <div className="p-4 bg-white border-t border-[#1C4A57]/10 space-y-2">
            {!isCompleted ? (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your response to Saraswati here..."
                  disabled={loading}
                  className="flex-1 bg-[#FAF8F3] border border-[#1C4A57]/20 rounded-xl px-4 py-3 text-xs text-[#1C4A57] focus:outline-none focus:ring-2 focus:ring-[#1C4A57]"
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            ) : (
              <div className="p-3 bg-[#E6F4E6] border border-[#008000]/30 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-[#008000]">
                  Interview Session Completed! View your executive report below.
                </span>
                <button
                  onClick={handleGenerateReport}
                  className="bg-[#2E7D68] hover:bg-[#236352] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> View Report & 7-Day Strategy
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right: Stateful Interview Progress & Context Panel */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Role & Stage Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#1C4A57]/15 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1C4A57]">
              Interview Session State
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-[#FAF8F3] p-3 rounded-xl border border-[#1C4A57]/10">
                <span className="font-semibold text-[#1C4A57]/70">Target Role:</span>
                <span className="font-bold text-[#1C4A57]">{targetRole}</span>
              </div>

              <div className="flex justify-between items-center bg-[#FAF8F3] p-3 rounded-xl border border-[#1C4A57]/10">
                <span className="font-semibold text-[#1C4A57]/70">Current Stage:</span>
                <span className="font-bold text-[#2E7D68]">{getStageName(currentStage)}</span>
              </div>

              <div className="flex justify-between items-center bg-[#FAF8F3] p-3 rounded-xl border border-[#1C4A57]/10">
                <span className="font-semibold text-[#1C4A57]/70">Difficulty Scaling:</span>
                <span className="font-black text-[#D95D39] capitalize">{difficultyLevel} Level</span>
              </div>
            </div>

            {/* Complete Analysis Button */}
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              <Award className="w-4 h-4 text-[#CFE3E0]" /> Generate Complete Analysis & Report
            </button>
          </div>

          {/* Past Sessions Drawer / List */}
          {showHistoryDrawer && (
            <div className="bg-white rounded-3xl p-6 border border-[#1C4A57]/15 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#1C4A57]/10 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#1C4A57] flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#1C4A57]" /> Saved Interview History
                </h4>
                <button 
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-xs text-[#1C4A57]/60 font-bold hover:underline"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {historyList.length > 0 ? (
                  historyList.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => handleLoadPastSession(session.id)}
                      className="p-3 bg-[#FAF8F3] border border-[#1C4A57]/10 rounded-xl hover:border-[#1C4A57] cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#1C4A57]">{session.target_role}</p>
                        <p className="text-[10px] text-[#1C4A57]/60">{session.date}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#2E7D68] block">{session.overall_score}%</span>
                        <span className="text-[9px] text-[#1C4A57]/70 font-semibold">{session.categorical_grade}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic py-2 text-center">No past interviews saved yet.</p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
