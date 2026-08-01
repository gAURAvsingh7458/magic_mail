import React, { useState } from 'react';
import { Mail, Menu, Clock, BarChart3, Settings, Plus, Search, Sparkles, RotateCcw, X } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  timeSavedMinutes: number;
  onOpenCompose: () => void;
  onOpenStats: () => void;
  onOpenPreferences: () => void;
  onBatchTriage: () => void;
  onRefresh?: () => void;
  isTriaging: boolean;
  currentUser?: { name: string; email: string; title: string; company: string } | null;
  userName?: string;
  isGmailConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  searchQuery,
  setSearchQuery,
  timeSavedMinutes,
  onOpenCompose,
  onOpenStats,
  onOpenPreferences,
  onBatchTriage,
  onRefresh,
  isTriaging,
  currentUser,
  userName = 'Gaurav Singh',
  isGmailConnected,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const displayName = currentUser?.name || userName || 'Gaurav Singh';

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const formatTimeSaved = (mins: number) => {
    const hrs = (mins / 60).toFixed(1);
    return `${hrs} hrs saved`;
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 text-slate-800 px-3 lg:px-6 py-2.5 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Sidebar Hamburger Button & Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
            title="Open Folders & Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={onToggleSidebar}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">Mail</h1>
                {isGmailConnected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live Gmail
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Sleek Search Bar & Single Refresh Icon Button */}
        <div className="flex-1 max-w-md mx-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails, sender, subject..."
              className="w-full pl-9 pr-8 py-1.5 sm:py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Single Refresh Icon Button */}
          <button
            onClick={handleRefreshClick}
            className={`p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition shrink-0 active:scale-95 ${
              isRefreshing ? 'animate-spin text-blue-600' : ''
            }`}
            title="Refresh Inbox Emails"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Time Saved Metric Pill */}
          <button
            onClick={onOpenStats}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="View Analytics"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{formatTimeSaved(timeSavedMinutes)}</span>
          </button>

          {/* New Email Compose */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl text-xs transition shadow-sm shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Compose</span>
          </button>

          {/* Settings Icon */}
          <button
            onClick={onOpenPreferences}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar - opens sidebar or preferences */}
          <div
            onClick={onToggleSidebar}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group"
            title="Click to open menu & user options"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs group-hover:ring-2 group-hover:ring-blue-300 transition">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden xl:inline text-xs font-bold text-slate-800">{displayName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
