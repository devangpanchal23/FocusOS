import React, { useState, useEffect } from 'react';
import { v3Api } from '../services/api';
import { DailyPlan, DailyPlanBlock, SmartGoal } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Trash2,
  Target,
  Award,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const PlannerPage: React.FC = () => {
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [goals, setGoals] = useState<SmartGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // New Block Form State
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTask, setNewBlockTask] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('14:00');
  const [newBlockEnd, setNewBlockEnd] = useState('15:30');
  const [newBlockCategory, setNewBlockCategory] = useState('Deep Work');

  // AI Goal Planner Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalPrompt, setGoalPrompt] = useState('');
  const [aiGoalPlan, setAiGoalPlan] = useState<any | null>(null);
  const [generatingGoal, setGeneratingGoal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [planRes, goalsRes] = await Promise.all([
        v3Api.getDailyPlan(),
        v3Api.getGoals(),
      ]);
      setDailyPlan(planRes.plan);
      setGoals(goalsRes.goals || []);
    } catch (err) {
      console.error('Error fetching planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBlock = async (blockId: string) => {
    try {
      const res = await v3Api.toggleBlock(blockId);
      setDailyPlan((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          blocks: prev.blocks.map((b) => (b.id === blockId ? res.block : b)),
        };
      });
    } catch (err) {
      console.error('Error toggling block:', err);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTask.trim()) return;

    try {
      const res = await v3Api.addBlock({
        startTime: newBlockStart,
        endTime: newBlockEnd,
        taskName: newBlockTask,
        category: newBlockCategory,
      });

      setDailyPlan((prev) => {
        if (!prev) return null;
        const updatedBlocks = [...prev.blocks, res.block].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
        return { ...prev, blocks: updatedBlocks };
      });

      setNewBlockTask('');
      setShowAddBlock(false);
    } catch (err) {
      console.error('Error adding block:', err);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await v3Api.deleteBlock(blockId);
      setDailyPlan((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          blocks: prev.blocks.filter((b) => b.id !== blockId),
        };
      });
    } catch (err) {
      console.error('Error deleting block:', err);
    }
  };

  const handleRegeneratePlan = async () => {
    try {
      setLoading(true);
      const res = await v3Api.generateDailyAiPlan();
      setDailyPlan(res.plan);
    } catch (err) {
      console.error('Error re-synthesizing daily plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiGoal = async () => {
    if (!goalPrompt.trim()) return;
    try {
      setGeneratingGoal(true);
      const res = await v3Api.generateGoalAiPlan(goalPrompt);
      setAiGoalPlan(res);
    } catch (err) {
      console.error('Error generating AI goal:', err);
    } finally {
      setGeneratingGoal(false);
    }
  };

  const handleSaveAiGoal = async () => {
    if (!aiGoalPlan) return;
    try {
      await v3Api.createGoal({
        title: aiGoalPlan.suggestedTitle,
        goalType: aiGoalPlan.goalType,
        targetValue: aiGoalPlan.targetValue,
        period: aiGoalPlan.period,
        milestones: JSON.stringify(aiGoalPlan.milestones),
      });
      setShowGoalModal(false);
      setAiGoalPlan(null);
      setGoalPrompt('');
      loadData();
    } catch (err) {
      console.error('Error saving goal:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Daily Planner & SMART Goals</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              V3 Adaptive Scheduler
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Intelligent daily time-blocking matched against telemetry peak focus windows and quantified SMART goals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegeneratePlan}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-synthesize with AI
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Goal Creator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Schedule Timeline (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Today's Dynamic Timetable</h3>
              </div>
              <button
                onClick={() => setShowAddBlock(!showAddBlock)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Block
              </button>
            </div>

            {dailyPlan?.summary && (
              <div className="mb-5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>{dailyPlan.summary}</span>
              </div>
            )}

            {/* Inline Add Block Form */}
            {showAddBlock && (
              <form onSubmit={handleAddBlock} className="p-4 mb-5 rounded-xl bg-slate-950/60 border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">New Schedule Block</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="time"
                    value={newBlockStart}
                    onChange={(e) => setNewBlockStart(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                  <input
                    type="time"
                    value={newBlockEnd}
                    onChange={(e) => setNewBlockEnd(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                  <select
                    value={newBlockCategory}
                    onChange={(e) => setNewBlockCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Deep Work">Deep Work</option>
                    <option value="Execution">Execution</option>
                    <option value="Planning">Planning</option>
                    <option value="Rest">Rest & Break</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Task or objective..."
                  value={newBlockTask}
                  onChange={(e) => setNewBlockTask(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBlock(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    Save Block
                  </button>
                </div>
              </form>
            )}

            {/* Blocks List */}
            <div className="space-y-3">
              {dailyPlan?.blocks.map((block) => {
                return (
                  <div
                    key={block.id}
                    className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                      block.isCompleted
                        ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleBlock(block.id)}
                        className="text-slate-400 hover:text-emerald-400 transition"
                      >
                        {block.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${block.isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                            {block.taskName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-white/5">
                            {block.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {block.startTime} – {block.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!block.isFixed && (
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="text-slate-600 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SMART Goals Panel (1 Col) */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Active SMART Goals</h3>
              </div>
              <span className="text-xs text-slate-500">{goals.length} tracked</span>
            </div>

            <div className="space-y-4">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white">{goal.title}</h4>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{goal.period} GOAL</span>
                    </div>
                    <span className={`text-xs font-extrabold ${goal.isAchieved ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {goal.progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.isAchieved ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                    />
                  </div>

                  {/* Sub-Milestones */}
                  {goal.parsedMilestones && goal.parsedMilestones.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Milestones:</span>
                      {goal.parsedMilestones.map((ms, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${ms.completed ? 'text-emerald-400' : 'text-slate-600'}`} />
                          <span className={ms.completed ? 'line-through text-slate-500' : ''}>{ms.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Goal Creator Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">AI SMART Goal Planner</h3>
              </div>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              State your objective in plain English (e.g. "I want to study 3 hours every day and stay off reels"). FocusOS will format structured thresholds and actionable milestones.
            </p>

            <textarea
              rows={3}
              value={goalPrompt}
              onChange={(e) => setGoalPrompt(e.target.value)}
              placeholder="e.g. Focus on coding for 4 hours daily without social media distraction..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <button
              onClick={handleGenerateAiGoal}
              disabled={generatingGoal || !goalPrompt.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              {generatingGoal ? 'Synthesizing Action Plan...' : 'Generate Structured Plan'}
            </button>

            {aiGoalPlan && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Suggested Target</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{aiGoalPlan.suggestedTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{aiGoalPlan.aiRationale}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Generated Milestones:</span>
                  {aiGoalPlan.milestones.map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveAiGoal}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  Activate & Track Goal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
