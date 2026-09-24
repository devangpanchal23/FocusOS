import React, { useState, useEffect, useRef } from 'react';
import { v3Api } from '../services/api';
import { AiChatMessage, CoachAssessment, CoachingProfile } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Zap,
  GraduationCap,
  Code,
  Shield,
  Heart,
  BookOpen,
  Compass,
  ArrowRight,
  Trash2,
  Activity,
  Layers,
  CheckCircle2,
  CalendarRange,
  MonitorSmartphone,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_PROMPTS = [
  'How much time did I spend on YouTube Shorts & Reels today?',
  'What were my top 3 distractions today?',
  'Compare this week to last week screen time',
  'When was my peak focus window yesterday?',
  'Generate a focus plan to study 3 hours without burnout',
];

const COACH_MODES = [
  { id: 'CODING', label: 'Software Engineer', icon: Code, color: 'text-sky-400', border: 'border-sky-500/30' },
  { id: 'STUDY', label: 'Academic & DSA', icon: GraduationCap, color: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'DEEP_WORK', label: 'Deep Work Flow', icon: Zap, color: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'EXAM_PREP', label: 'Exam Sprint', icon: BookOpen, color: 'text-purple-400', border: 'border-purple-500/30' },
  { id: 'WELLNESS', label: 'Digital Detox', icon: Heart, color: 'text-rose-400', border: 'border-rose-500/30' },
  { id: 'GENERAL', label: 'Productivity', icon: Compass, color: 'text-indigo-400', border: 'border-indigo-500/30' },
];

export const AiAssistantPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ASSISTANT' | 'COACH'>('ASSISTANT');
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachingProfile | null>(null);
  const [assessment, setAssessment] = useState<CoachAssessment | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    try {
      const res = await v3Api.getHistory();
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const loadCoach = async () => {
    try {
      setLoadingCoach(true);
      const [pRes, aRes] = await Promise.all([
        v3Api.getProfile(),
        v3Api.getAssessment(),
      ]);
      setCoachProfile(pRes.profile);
      setAssessment(aRes);
    } catch (err) {
      console.error('Error fetching coach details:', err);
    } finally {
      setLoadingCoach(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadCoach();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || sending) return;

    // Optimistic user message
    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: 'default',
      role: 'USER',
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuery('');
    setSending(true);

    try {
      const res = await v3Api.sendMessage(query);
      const assistantMsg: AiChatMessage = {
        id: `asst-${Date.now()}`,
        sessionId: 'default',
        role: 'ASSISTANT',
        content: res.answer,
        metadata: JSON.stringify({
          evidence: res.evidence,
          actionRecommendation: res.actionRecommendation,
          metricsContext: res.metricsContext,
          // V5: grounding metadata — optional-chained since the exact shape may still evolve server-side.
          dateRangeConsidered: res?.dateRangeConsidered,
          devicesConsidered: res?.devicesConsidered,
          dataAvailable: res?.dataAvailable,
        }),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `err-${Date.now()}`,
        sessionId: 'default',
        role: 'ASSISTANT',
        content: `Error: ${err.message || 'Failed to process request.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Clear all conversation history?')) {
      try {
        await v3Api.clearHistory();
        setMessages([]);
      } catch (err) {
        console.error('Error clearing history:', err);
      }
    }
  };

  const handleModeChange = async (newMode: string) => {
    try {
      setLoadingCoach(true);
      const res = await v3Api.updateProfile({ mode: newMode });
      setCoachProfile(res.profile);
      const newAssessment = await v3Api.getAssessment();
      setAssessment(newAssessment);
    } catch (err) {
      console.error('Error updating coaching mode:', err);
    } finally {
      setLoadingCoach(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Focus Intelligence AI</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              V3 Grounded Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic natural-language Q&A and 24/7 personal coach backed by your verified screen-time telemetry.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ASSISTANT')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'ASSISTANT'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" /> Telemetry Assistant
          </button>
          <button
            onClick={() => setActiveTab('COACH')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'COACH'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> AI Persona Coach
          </button>
        </div>
      </div>

      {activeTab === 'ASSISTANT' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-3 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden h-[680px]">
            {/* Chat Topbar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">FocusOS Intelligence Co-Pilot</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Grounded in real OCR & app records
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-slate-500 hover:text-rose-400 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <Bot className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Ask Anything About Your Digital Habits</h4>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Unlike generic chat models, every response is computed directly from your verified screenshots, app categories, and focus logs.
                  </p>

                  <div className="w-full space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Try Asking:</span>
                    {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full text-left text-xs p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 text-slate-300 transition flex items-center justify-between group"
                      >
                        <span>{prompt}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'USER';
                  let parsedMeta: any = null;
                  try {
                    if (msg.metadata) parsedMeta = JSON.parse(msg.metadata);
                  } catch {}

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-4 h-4 text-indigo-300" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                        {/* Evidence & Action cards */}
                        {!isUser && parsedMeta && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                            {parsedMeta.evidence && parsedMeta.evidence.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Verified Evidence:</span>
                                <ul className="text-xs text-slate-300 space-y-0.5">
                                  {parsedMeta.evidence.map((ev: string, i: number) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-emerald-400 font-bold">•</span>
                                      <span>{ev}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {parsedMeta.actionRecommendation && (
                              <div className="pt-2">
                                <Link
                                  to={parsedMeta.actionRecommendation.route}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition"
                                >
                                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                  {parsedMeta.actionRecommendation.label}
                                </Link>
                              </div>
                            )}
                          </div>
                        )}

                        {/* V5: grounding metadata strip — date range, devices considered, data availability */}
                        {!isUser && parsedMeta && (parsedMeta.dateRangeConsidered || parsedMeta.devicesConsidered || parsedMeta.dataAvailable === false) && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-700/40 flex flex-wrap items-center gap-1.5">
                            {parsedMeta.dateRangeConsidered?.from && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono">
                                <CalendarRange className="w-3 h-3" />
                                {parsedMeta.dateRangeConsidered.from}
                                {parsedMeta.dateRangeConsidered.to ? ` → ${parsedMeta.dateRangeConsidered.to}` : ''}
                              </span>
                            )}
                            {Array.isArray(parsedMeta.devicesConsidered) && parsedMeta.devicesConsidered.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                                <MonitorSmartphone className="w-3 h-3" />
                                {parsedMeta.devicesConsidered.map((d: any) => d?.name || d?.id).filter(Boolean).join(', ')}
                              </span>
                            )}
                            {parsedMeta.dataAvailable === false && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                No grounding data
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span>Analyzing database telemetry & calculating statistics...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask e.g. 'How many reels did I watch today?' or 'Find my biggest distraction'..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={sending || !inputQuery.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Quick Telemetry Prompts Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Telemetry Inquiries
              </h4>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left text-xs p-3 rounded-xl bg-slate-800/50 hover:bg-indigo-950/40 hover:border-indigo-500/40 border border-white/5 text-slate-300 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                Deterministic Accuracy
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                FocusOS executes rigorous database queries across <code className="text-indigo-300">DailyMetrics</code>, <code className="text-indigo-300">UsageRecords</code>, and active sessions. No made-up stats or hallucinated timestamps.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* AI Persona Coach Tab */
        <div className="space-y-6">
          {/* Persona Selection Row */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Select AI Coaching Persona</h3>
                <p className="text-xs text-slate-400">
                  Customizes behavioral heuristics, tone of accountability, and target focus metrics.
                </p>
              </div>
              {coachProfile && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Current: {coachProfile.mode}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {COACH_MODES.map((mode) => {
                const isSelected = coachProfile?.mode === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    disabled={loadingCoach}
                    className={`p-4 rounded-xl text-left border transition flex flex-col items-start gap-2.5 ${
                      isSelected
                        ? `bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-500/10`
                        : 'bg-slate-950/40 border-white/5 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-slate-900 ${mode.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{mode.label}</p>
                      <p className="text-[10px] text-slate-400">Target: {mode.id === 'CODING' ? '4h' : '3h'}/day</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Assessment Card */}
          {assessment ? (
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                      Live Telemetry Assessment
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">{assessment.greeting}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Tone: {assessment.tone}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 text-slate-200 text-sm leading-relaxed">
                  <p className="font-semibold text-white mb-1">Coach Observation:</p>
                  <p>{assessment.currentAssessment}</p>
                </div>

                <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-sm">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                    <Zap className="w-4 h-4 text-indigo-400" /> Priority Directive:
                  </div>
                  <p className="text-slate-200">{assessment.priorityDirective}</p>
                </div>

                {/* Key Metrics Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Focus Completed</span>
                    <p className="text-lg font-black text-white mt-0.5">{assessment.keyStats.todayFocusCompleted}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Daily Target</span>
                    <p className="text-lg font-black text-white mt-0.5">{assessment.keyStats.targetFocusHours}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Short-form Status</span>
                    <p className={`text-lg font-black mt-0.5 ${assessment.keyStats.shortFormCurbed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {assessment.keyStats.shortFormCurbed ? 'Under Control' : 'Exceeded'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Discipline Streak</span>
                    <p className="text-lg font-black text-amber-400 mt-0.5">{assessment.keyStats.streakStatus}</p>
                  </div>
                </div>

                {/* Recommended Next Step */}
                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Next Action</span>
                    <h4 className="text-base font-bold text-white mt-0.5">{assessment.recommendedNextStep.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{assessment.recommendedNextStep.description}</p>
                  </div>
                  <Link
                    to={assessment.recommendedNextStep.route}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 whitespace-nowrap"
                  >
                    {assessment.recommendedNextStep.actionLabel} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Loading coaching assessment...</div>
          )}
        </div>
      )}
    </div>
  );
};
