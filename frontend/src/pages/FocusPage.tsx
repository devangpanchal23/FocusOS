import React, { useState, useEffect } from 'react';
import { FocusTimer } from '../components/focus/FocusTimer';
import { api } from '../services/api';
import { FocusProfile, FocusSession, FocusStats } from '../types';
import { Zap, Clock, ShieldCheck, AlertCircle, Plus, Sparkles, CheckCircle2, History } from 'lucide-react';

export const FocusPage: React.FC = () => {
  const [profiles, setProfiles] = useState<FocusProfile[]>([]);
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddProfileModal, setShowAddProfileModal] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileDuration, setNewProfileDuration] = useState<number>(30);
  const [newProfileBreak, setNewProfileBreak] = useState<number>(5);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pData, sData, sessData] = await Promise.all([
        api.getFocusProfiles(),
        api.getFocusStats(),
        api.getFocusSessions(10),
      ]);
      setProfiles(pData);
      setStats(sData);
      setSessions(sessData);
    } catch (err) {
      console.error('Error loading focus data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    try {
      await api.createFocusProfile({
        name: newProfileName,
        durationMinutes: newProfileDuration,
        breakMinutes: newProfileBreak,
      });
      setShowAddProfileModal(false);
      setNewProfileName('');
      loadData();
    } catch (err) {
      console.error('Error creating profile:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-amber-400 fill-amber-400/20" />
            Focus Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deep-work blocks, Pomodoro cycles, distraction auditing, and XP level progression.
          </p>
        </div>

        <button
          onClick={() => setShowAddProfileModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-medium text-xs transition"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>New Focus Profile</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Focus Time</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats ? Math.floor(stats.totalFocusMinutes / 60) : 0}h{' '}
            {stats ? stats.totalFocusMinutes % 60 : 0}m
          </div>
          <div className="text-xs text-slate-500 mt-1">Verified deep-work logged</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Clean Session Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {stats ? stats.cleanRatePercent : 100}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Sessions with 0 distractions</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sessions Finished</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats ? stats.completedSessionsCount : 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Completed Pomodoro intervals</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Distractions Checked</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {stats ? stats.distractionsLogged : 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Interruption events logged</div>
        </div>
      </div>

      {/* Main Focus Timer */}
      <FocusTimer profiles={profiles} onSessionFinished={loadData} />

      {/* Recent Sessions History Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" /> Recent Focus Sessions
          </h3>
          <span className="text-xs text-slate-500">Last 10 sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No focus sessions recorded yet. Start your first session above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/40 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Task / Goal</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Distractions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">
                      {sess.taskName}
                      {sess.profile && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                          {sess.profile.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sess.completedMinutes}m / {sess.durationMinutes}m
                    </td>
                    <td className="px-4 py-3">
                      {sess.distractionsCount === 0 ? (
                        <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Clean (0)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold text-xs">
                          {sess.distractionsCount} interrupted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          sess.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(sess.createdAt).toLocaleDateString()} at{' '}
                      {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Profile */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create New Focus Profile</h3>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LeetCode Sprint, Book Reading"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={newProfileDuration}
                    onChange={(e) => setNewProfileDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Break (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={newProfileBreak}
                    onChange={(e) => setNewProfileBreak(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
