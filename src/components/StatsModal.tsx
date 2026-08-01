import React from 'react';
import { X, Clock, Zap, CheckCircle2, TrendingUp, Flame, BarChart2, Sparkles } from 'lucide-react';
import { AnalyticsData } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: AnalyticsData;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const hoursSaved = (stats.timeSavedMinutes / 60).toFixed(1);

  // Percentage calculations for visual charts
  const totalItems = Math.max(stats.totalTriaged, 1);
  const highPriorityPercent = Math.min(100, Math.round((stats.highPriorityCount / totalItems) * 100));
  const draftsSentPercent = Math.min(100, Math.round((stats.draftsSentCount / totalItems) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          title="Close Analytics"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Email Productivity & AI Velocity Analytics</h2>
            <p className="text-xs text-slate-500">Real-time stats on hours saved and triage efficiency</p>
          </div>
        </div>

        {/* Hero Time Saved Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 flex items-center justify-between mb-5 shadow-2xs">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Estimated Productivity Saved
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {hoursSaved} <span className="text-lg font-normal text-slate-600">Hours</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Saves ~3.5 minutes per triaged email draft automatically
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Visual Analytics Chart Bars */}
        <div className="mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-600" /> Executive Triage Breakdown Chart
          </h3>

          {/* Bar 1: Total Triaged */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Total Inbox Items Triaged</span>
              <span className="text-blue-600 font-bold">{stats.totalTriaged} Emails</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Bar 2: High Priority Proportion */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Urgent / High Priority Ratio</span>
              <span className="text-red-600 font-bold">{stats.highPriorityCount} Emails ({highPriorityPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(highPriorityPercent, 5)}%` }}
              />
            </div>
          </div>

          {/* Bar 3: AI Drafts Sent */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">AI Drafts Approved & Dispatched</span>
              <span className="text-emerald-600 font-bold">{stats.draftsSentCount} Sent ({draftsSentPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(draftsSentPercent, 5)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Triaged Emails</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{stats.totalTriaged}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Flame className="w-4 h-4 text-red-600" />
              <span>High Priority Items</span>
            </div>
            <div className="text-xl font-bold text-red-600">{stats.highPriorityCount}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>AI Replies Sent</span>
            </div>
            <div className="text-xl font-bold text-emerald-600">{stats.draftsSentCount}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Avg. Speed</span>
            </div>
            <div className="text-xl font-bold text-slate-900">&lt; 3 sec / mail</div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm active:scale-95"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
