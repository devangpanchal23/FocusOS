import React, { useState, useEffect } from 'react';
import { v3Api } from '../services/api';
import { AccountabilityCircle, CircleLeaderboardItem } from '../types';
import {
  Users,
  Trophy,
  Plus,
  KeyRound,
  ShieldCheck,
  Flame,
  Clock,
  Sparkles,
  Copy,
  Check,
  UserCheck,
  ArrowRight,
  LogOut,
} from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [circles, setCircles] = useState<AccountabilityCircle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<CircleLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadCircles = async () => {
    try {
      setLoading(true);
      const res = await v3Api.getCircles();
      setCircles(res.circles || []);
      if (res.circles && res.circles.length > 0 && !selectedCircleId) {
        setSelectedCircleId(res.circles[0].id);
      }
    } catch (err) {
      console.error('Error fetching circles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (circleId: string) => {
    try {
      const res = await v3Api.getLeaderboard(circleId);
      setLeaderboard(res.leaderboard || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  useEffect(() => {
    loadCircles();
  }, []);

  useEffect(() => {
    if (selectedCircleId) {
      loadLeaderboard(selectedCircleId);
    }
  }, [selectedCircleId]);

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;

    try {
      const res = await v3Api.createCircle({
        name: newCircleName,
        description: newCircleDesc,
      });
      setShowCreateModal(false);
      setNewCircleName('');
      setNewCircleDesc('');
      await loadCircles();
      setSelectedCircleId(res.circle.id);
    } catch (err) {
      console.error('Error creating circle:', err);
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const res = await v3Api.joinCircle(joinCode);
      setShowJoinModal(false);
      setJoinCode('');
      await loadCircles();
      setSelectedCircleId(res.circle.id);
    } catch (err: any) {
      alert(err.message || 'Failed to join circle');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Accountability Circles</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Zero-Knowledge Privacy
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Form high-focus study circles with peers. Compete on Attention Score and weekly focus hours without exposing private app names.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <KeyRound className="w-3.5 h-3.5" /> Join Circle
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" /> Create Circle
          </button>
        </div>
      </div>

      {/* Circle Selector Tabs */}
      {circles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {circles.map((circle) => {
            const isSelected = circle.id === selectedCircleId;
            return (
              <button
                key={circle.id}
                onClick={() => setSelectedCircleId(circle.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{circle.name}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-300">
                  {circle.memberCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedCircle ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Leaderboard (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" /> Circle Leaderboard
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ranked by Attention Score (60%) and Weekly Productive Hours (40%)
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Weekly Refresh
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Calculating circle telemetry...
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((item) => {
                    let rankBadge = (
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 font-black text-xs flex items-center justify-center">
                        #{item.rank}
                      </span>
                    );
                    if (item.rank === 1) {
                      rankBadge = (
                        <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center">
                          🥇
                        </span>
                      );
                    } else if (item.rank === 2) {
                      rankBadge = (
                        <span className="w-7 h-7 rounded-lg bg-slate-400/20 text-slate-300 border border-slate-400/40 font-black text-xs flex items-center justify-center">
                          🥈
                        </span>
                      );
                    } else if (item.rank === 3) {
                      rankBadge = (
                        <span className="w-7 h-7 rounded-lg bg-amber-700/20 text-amber-400 border border-amber-700/40 font-black text-xs flex items-center justify-center">
                          🥉
                        </span>
                      );
                    }

                    return (
                      <div
                        key={item.userId}
                        className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                          item.isCurrentUser
                            ? 'bg-indigo-950/40 border-indigo-500/40 shadow-md'
                            : 'bg-slate-800/40 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {rankBadge}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {item.name} {item.isCurrentUser && '(You)'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                                Lvl {item.level}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-400" />
                                {item.weeklyProductiveHours}h deep work
                              </span>
                              <span className="flex items-center gap-1 text-amber-400">
                                <Flame className="w-3 h-3" />
                                {item.streak}d streak
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {item.attentionScore}%
                          </span>
                          <span className="block text-[10px] text-slate-500 uppercase">Attention</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Circle Details & Invite Code (1 Col) */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Active Circle</span>
                <h3 className="text-lg font-black text-white mt-0.5">{selectedCircle.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedCircle.description}</p>
              </div>

              {/* Invite Code Box */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Circle Invite Code</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-black text-indigo-300">
                    {selectedCircle.inviteCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedCircle.inviteCode)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 text-xs"
                  >
                    {copiedCode === selectedCircle.inviteCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Privacy Shield Notice */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" /> Privacy Guarantee
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Circle members only view aggregate Attention Score, focus hours, and streak count. Private browsing history and app names are cryptographically sealed.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto space-y-4">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Join or Create Your First Circle</h3>
          <p className="text-xs text-slate-400">
            Accountability circles help boost daily focus by 40% through mutual peer motivation.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition"
            >
              Create a Circle
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
            >
              Join with Code
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCircle} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create Accountability Circle</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Circle Name</label>
              <input
                type="text"
                placeholder="e.g. Cambridge DSA Sprints"
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="Targeting 4 hours daily focus"
                value={newCircleDesc}
                onChange={(e) => setNewCircleDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Create Circle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleJoinCircle} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Join Accountability Circle</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Invite Code</label>
              <input
                type="text"
                placeholder="CIRCLE-XXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white uppercase font-mono"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
