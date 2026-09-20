import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Bell, Clock, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { UserSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form
  const [theme, setTheme] = useState<'DARK' | 'LIGHT' | 'SYSTEM'>('DARK');
  const [defaultFocusMinutes, setDefaultFocusMinutes] = useState(25);
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState(5);
  const [weekStartDay, setWeekStartDay] = useState('MONDAY');
  const [reelsWarning, setReelsWarning] = useState(true);
  const [goalReached, setGoalReached] = useState(true);
  const [focusReminder, setFocusReminder] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.getSettings();
        setSettings(data);
        setTheme(data.theme);
        setDefaultFocusMinutes(data.defaultFocusMinutes);
        setDefaultBreakMinutes(data.defaultBreakMinutes);
        setWeekStartDay(data.weekStartDay);
        if (data.parsedNotifPrefs) {
          setReelsWarning(data.parsedNotifPrefs.reelsWarning ?? true);
          setGoalReached(data.parsedNotifPrefs.goalReached ?? true);
          setFocusReminder(data.parsedNotifPrefs.focusReminder ?? true);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({
        theme,
        defaultFocusMinutes,
        defaultBreakMinutes,
        weekStartDay,
        notificationPreferences: {
          reelsWarning,
          goalReached,
          focusReminder,
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-indigo-400" />
          Platform Preferences & Privacy
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize your Pomodoro timer defaults, notification thresholds, appearance, and local privacy parameters.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>Your preferences have been saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-white mb-1">Visual Theme</h3>
          <p className="text-xs text-slate-400 mb-4">Select your preferred user interface appearance.</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'DARK', label: 'Dark Mode (OLED)', icon: Moon },
              { key: 'LIGHT', label: 'Light Mode', icon: Sun },
              { key: 'SYSTEM', label: 'System Default', icon: Settings },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key as any)}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition ${
                  theme === key
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Focus Studio Defaults */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-white mb-1">Focus Studio Parameters</h3>
          <p className="text-xs text-slate-400 mb-4">Default timer durations when starting an ad-hoc session.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Focus Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={defaultFocusMinutes}
                onChange={(e) => setDefaultFocusMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Break Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={defaultBreakMinutes}
                onChange={(e) => setDefaultBreakMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-white mb-1">Notification Preferences</h3>
          <p className="text-xs text-slate-400 mb-4">Configure alerts delivered to your Notification Center drawer.</p>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-white">Short-Form Consumption Limit Warning</div>
                <div className="text-[11px] text-slate-400">Receive alert when Reels/Shorts time exceeds 45 minutes</div>
              </div>
              <input
                type="checkbox"
                checked={reelsWarning}
                onChange={(e) => setReelsWarning(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-white">Daily Target / Goal Reached</div>
                <div className="text-[11px] text-slate-400">Celebrate when you achieve your daily productive work target</div>
              </div>
              <input
                type="checkbox"
                checked={goalReached}
                onChange={(e) => setGoalReached(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-white">Pomodoro Completion & Streak Alerts</div>
                <div className="text-[11px] text-slate-400">Get notified when focus sessions finish and XP levels up</div>
              </div>
              <input
                type="checkbox"
                checked={focusReminder}
                onChange={(e) => setFocusReminder(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition active:scale-95"
          >
            {saving ? 'Saving Changes...' : 'Save All Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
