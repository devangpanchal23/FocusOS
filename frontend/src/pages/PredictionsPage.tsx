import React, { useState, useEffect } from 'react';
import { v3Api } from '../services/api';
import { PredictionSummary, BehavioralRiskLog } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle,
  Activity,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';

export const PredictionsPage: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionSummary | null>(null);
  const [risks, setRisks] = useState<BehavioralRiskLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pData, rData] = await Promise.all([
        v3Api.getPredictions(),
        v3Api.getRisks(),
      ]);
      setPredictions(pData);
      setRisks(rData.risks || []);
    } catch (err) {
      console.error('Error fetching predictive analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissRisk = async (id: string) => {
    try {
      await v3Api.dismissRisk(id);
      setRisks((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error dismissing risk:', err);
    }
  };

  if (loading || !predictions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Computing telemetry projections & predictive risk models...</p>
        </div>
      </div>
    );
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'ELEVATED':
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MODERATE':
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Predictive Analytics & Risk Engine</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Early Warning System
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Machine learning regression models analyzing your current pace to forecast end-of-day screen time, short-form exposure, and vulnerable hours.
        </p>
      </div>

      {/* Projection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* End-of-Day Screen Time Projection */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">End-of-Day Projection</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {predictions.projectedScreenTimeFormatted}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Confidence Interval:</span>
            <span className="font-mono text-slate-200">
              {predictions.confidenceInterval.lowFormatted} – {predictions.confidenceInterval.highFormatted}
            </span>
          </div>
        </div>

        {/* Short-Form Relapse Risk */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Short-Form Risk Level</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-rose-400">
              {predictions.shortFormRiskPercent}%
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeColor(predictions.shortFormRiskLevel)}`}>
              {predictions.shortFormRiskLevel}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            Probability of compulsive scrolling binge before bedtime
          </div>
        </div>

        {/* Target Likelihood */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Target Achievement Likelihood</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {predictions.targetAchievementLikelihood}%
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            Odds of keeping total screen time under daily limit
          </div>
        </div>
      </div>

      {/* 12-Hour Vulnerability Forecast Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> 12-Hour Vulnerability Heatmap
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly risk probability of distraction lapses based on your historical behavior.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500" /> Normal Window
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" /> High-Risk Spike Window
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={predictions.hourlyVulnerabilityForecast}>
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${val}% Risk`, 'Vulnerability']}
              />
              <Bar dataKey="riskPercent" radius={[6, 6, 0, 0]}>
                {predictions.hourlyVulnerabilityForecast.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeakRisk ? '#f43f5e' : '#6366f1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Behavioral Risk Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Active Behavioral Risk Signals ({risks.length})
          </h3>
          <span className="text-xs text-slate-500">Autonomous pattern detector</span>
        </div>

        {risks.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <p className="font-semibold text-white">No active behavioral risks detected!</p>
            <p className="text-xs text-slate-500">Your current digital consumption is within mindful thresholds.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risks.map((risk) => (
              <div
                key={risk.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeColor(risk.severity)}`}>
                      {risk.severity}
                    </span>
                    <h4 className="text-sm font-bold text-white">{risk.title}</h4>
                  </div>
                  <button
                    onClick={() => handleDismissRisk(risk.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    Dismiss
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{risk.description}</p>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Verified Evidence</span>
                  <p className="text-xs font-mono text-slate-300">{risk.evidence}</p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <div className="text-xs text-indigo-300 flex items-center gap-1.5 font-medium">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{risk.actionRecommendation}</span>
                  </div>
                  <Link
                    to="/blocking"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition"
                  >
                    Configure <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
