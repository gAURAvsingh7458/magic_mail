import React from 'react';
import {
  Inbox,
  Flame,
  AlertCircle,
  MessageSquare,
  Info,
  Star,
  Send,
  ShieldAlert,
  Archive,
  Clock,
  Settings,
  LogOut,
  X,
  Mail,
  User,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Email } from '../types';
import { isWithinLast5Days } from '../utils/dateUtils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  emails: Email[];
  timeSavedMinutes: number;
  currentUser?: { name: string; email: string; title: string; company: string } | null;
  userName?: string;
  onOpenPreferences: () => void;
  onOpenStats: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  emails,
  timeSavedMinutes,
  currentUser,
  userName = 'Gaurav Singh',
  onOpenPreferences,
  onOpenStats,
  onLogout,
}) => {
  if (!isOpen) return null;

  const displayName = currentUser?.name || userName || 'Gaurav Singh';
  const displayCompany = currentUser?.company || 'Apex Digital Inc.';
  const displayEmail = currentUser?.email || 'gaurav@apexdigital.io';

  const isSpam = (e: Email) => e.folder === 'spam' || e.category === 'Spam';

  const unreadHighPriorityCount = emails.filter(
    (e) => e.priority === 'High' && !e.read && !e.archived && !isSpam(e) && !e.demotedFromHighPriority && isWithinLast5Days(e)
  ).length;

  const folderNavs = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Inbox,
      count: emails.filter((e) => !e.archived && !isSpam(e) && e.folder !== 'sent').length,
    },
    {
      id: 'high',
      label: 'High Priority',
      icon: Flame,
      count: unreadHighPriorityCount,
      color: 'text-red-600',
      badgeBg: 'bg-red-100 text-red-700 font-bold',
    },
    {
      id: 'action',
      label: 'Action Required',
      icon: AlertCircle,
      count: emails.filter((e) => e.category === 'Action Required' && !e.archived && !isSpam(e)).length,
      color: 'text-amber-600',
    },
    {
      id: 'needs_reply',
      label: 'Needs Reply',
      icon: MessageSquare,
      count: emails.filter((e) => e.category === 'Needs Reply' && !e.archived && !isSpam(e)).length,
      color: 'text-blue-600',
    },
    {
      id: 'fyi',
      label: 'FYI / Info',
      icon: Info,
      count: emails.filter((e) => (e.category === 'FYI / Info' || e.category === 'Low Priority') && !e.archived && !isSpam(e)).length,
    },
    {
      id: 'starred',
      label: 'Starred',
      icon: Star,
      count: emails.filter((e) => e.starred && !e.archived && !isSpam(e)).length,
      color: 'text-amber-500',
    },
    {
      id: 'sent',
      label: 'Sent',
      icon: Send,
      count: emails.filter((e) => e.folder === 'sent').length,
    },
    {
      id: 'spam',
      label: 'Spam / Sales',
      icon: ShieldAlert,
      count: emails.filter(isSpam).length,
      color: 'text-slate-500',
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      count: emails.filter((e) => e.archived).length,
    },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  const formatTimeSaved = (mins: number) => {
    const hrs = (mins / 60).toFixed(1);
    return `${hrs} hrs (${mins}m)`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <aside className="fixed top-0 left-0 bottom-0 w-80 bg-white text-slate-800 z-50 shadow-2xl border-r border-slate-200 flex flex-col justify-between animate-in slide-in-from-left duration-200">
        <div>
          {/* Top Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base tracking-tight">Mail</h2>
                <p className="text-[11px] text-slate-500 font-medium">{displayCompany}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              title="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-4 border-b border-slate-100 bg-blue-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onOpenPreferences();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition"
              title="Edit AI Persona & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Folders List */}
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Folders & Views
            </p>
            {folderNavs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color || 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : item.badgeBg || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          {/* Time Saved Widget */}
          <button
            onClick={() => {
              onOpenStats();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition hover:bg-emerald-100"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Time Saved</span>
            </div>
            <span className="font-bold">{formatTimeSaved(timeSavedMinutes)}</span>
          </button>

          {/* AI Persona Settings */}
          <button
            onClick={() => {
              onOpenPreferences();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-200/70 rounded-xl text-xs font-semibold transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>AI Triage & Persona Settings</span>
          </button>

          {/* Logout Button inside Sidebar */}
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition border border-red-200"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
