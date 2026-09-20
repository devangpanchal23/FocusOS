import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { api } from '../services/api';
import { RoutineSchedule } from '../types';

export const RoutinesPage: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Productivity');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:30');
  const [isStrict, setIsStrict] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);

  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getRoutines();
      setRoutines(data);
    } catch (err) {
      console.error('Failed to load routines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // refresh active status every min
    return () => clearInterval(interval);
  }, []);

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;

    try {
      await api.createRoutine({
        title: title.trim(),
        category,
        startTime,
        endTime,
        daysOfWeek: selectedDays,
        isStrict,
      });
      setShowAddModal(false);
      setTitle('');
      loadData();
    } catch (err) {
      console.error('Failed to create routine:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routine?')) return;
    try {
      await api.deleteRoutine(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete routine:', err);
    }
  };

  const handleToggle = async (routine: RoutineSchedule) => {
    try {
      await api.updateRoutine(routine.id, { isEnabled: !routine.isEnabled });
      loadData();
    } catch (err) {
      console.error('Failed to toggle routine:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-emerald-400 fill-emerald-400/20" />
            Routines & Calendar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Predictable daily & weekly rhythm for deep work sprints, social restriction, and recovery.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Routine</span>
        </button>
      </div>

      {/* Routine Cards Timeline */}
      <div className="space-y-4">
        {routines.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No recurring routines established yet. Click "New Routine" above to structure your day.
          </div>
        ) : (
          routines.map((routine) => (
            <div
              key={routine.id}
              className={`p-6 rounded-2xl border transition relative ${
                routine.isCurrentlyActive
                  ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl border shrink-0 ${
                      routine.isCurrentlyActive
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Clock className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {routine.category}
                      </span>
                      {routine.isStrict && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Strict Mode
                        </span>
                      )}
                      {routine.isCurrentlyActive && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-md shadow-emerald-500/30">
                          ● ACTIVE RIGHT NOW
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white">{routine.title}</h3>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="font-mono text-emerald-400 font-semibold text-sm">
                        {routine.startTime} — {routine.endTime}
                      </span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {DAYS.map((d) => {
                          const active = routine.parsedDays?.includes(d);
                          return (
                            <span
                              key={d}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                active
                                  ? 'bg-slate-800 text-white border border-slate-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {d[0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => handleToggle(routine)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      routine.isEnabled
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-800/40 text-slate-500'
                    }`}
                  >
                    {routine.isEnabled ? 'Enabled' : 'Paused'}
                  </button>

                  <button
                    onClick={() => handleDelete(routine.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
                    title="Delete routine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Routine */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Establish Routine Schedule</h3>
            <form onSubmit={handleCreateRoutine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Routine Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Work Morning Sprint, Wind Down"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Productivity">Productivity & Deep Work</option>
                  <option value="Study">Study & DSA Prep</option>
                  <option value="Wellbeing">Wellbeing & Restrict Reels</option>
                  <option value="Sleep">Sleep & Bedtime Wind Down</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Days of the Week</label>
                <div className="flex gap-1.5 justify-between">
                  {DAYS.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {day.slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="strict"
                  checked={isStrict}
                  onChange={(e) => setIsStrict(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="strict" className="text-xs text-slate-300 font-medium">
                  Strict Mode (Immediately lock distractor apps during this block)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-500/25"
                >
                  Save Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
