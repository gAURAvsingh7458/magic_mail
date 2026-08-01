import React from 'react';
import { Email, PriorityLevel, EmailCategory } from '../types';
import { Sparkles, Star, Archive, CheckCircle2, Flame, Volume2, ArrowDown, Inbox, Filter } from 'lucide-react';
import { isWithinLast5Days } from '../utils/dateUtils';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onToggleArchive: (id: string, e: React.MouseEvent) => void;
  onDemotePriority?: (id: string, e: React.MouseEvent) => void;
  onPlayTts?: (text: string) => Promise<void>;
  onToggleSidebar?: () => void;
  searchQuery?: string;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  activeTab,
  setActiveTab,
  onToggleStar,
  onToggleArchive,
  onDemotePriority,
  onPlayTts,
  searchQuery = '',
}) => {
  const isSpam = (e: Email) => e.folder === 'spam' || e.category === 'Spam';

  const queryLower = searchQuery.trim().toLowerCase();

  const filteredEmails = emails.filter((email) => {
    if (queryLower) {
      const matchSearch =
        email.sender.toLowerCase().includes(queryLower) ||
        (email.senderEmail && email.senderEmail.toLowerCase().includes(queryLower)) ||
        email.subject.toLowerCase().includes(queryLower) ||
        email.summary.toLowerCase().includes(queryLower) ||
        email.body.toLowerCase().includes(queryLower);
      if (!matchSearch) return false;
    }

    if (activeTab === 'high') {
      return email.priority === 'High' && !email.read && !email.archived && !isSpam(email) && !email.demotedFromHighPriority && isWithinLast5Days(email);
    }
    if (activeTab === 'action') return email.category === 'Action Required' && !email.archived && !isSpam(email);
    if (activeTab === 'needs_reply') return email.category === 'Needs Reply' && !email.archived && !isSpam(email);
    if (activeTab === 'fyi') return (email.category === 'FYI / Info' || email.category === 'Low Priority') && !email.archived && !isSpam(email);
    if (activeTab === 'starred') return email.starred && !email.archived && !isSpam(email);
    if (activeTab === 'sent') return email.folder === 'sent';
    if (activeTab === 'spam') return isSpam(email);
    if (activeTab === 'archive') return email.archived;
    return !email.archived && !isSpam(email) && email.folder !== 'sent';
  });

  const unreadHighPriorityEmails = emails.filter(
    (e) => e.priority === 'High' && !e.read && !e.archived && !isSpam(e) && !e.demotedFromHighPriority && isWithinLast5Days(e)
  );
  const highPriorityCount = unreadHighPriorityEmails.length;

  const handleReadHighPriorityAloud = () => {
    if (!onPlayTts) return;
    if (unreadHighPriorityEmails.length === 0) {
      onPlayTts('You currently have no unread high priority emails.');
      return;
    }
    const fullSpeech =
      `You have ${unreadHighPriorityEmails.length} unread High Priority emails. ` +
      unreadHighPriorityEmails.map((e, idx) => `Email ${idx + 1} from ${e.sender}. Subject: ${e.subject}. Summary: ${e.summary}`).join('. ');
    onPlayTts(fullSpeech);
  };

  const getPriorityBadge = (priority: PriorityLevel, score: number) => {
    if (priority === 'High') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">
          <Flame className="w-3 h-3 text-red-600" />
          HIGH {score}
        </span>
      );
    }
    if (priority === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
          MED {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
        LOW {score}
      </span>
    );
  };

  const getCategoryBadge = (category: EmailCategory) => {
    switch (category) {
      case 'Action Required':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Action Needed</span>;
      case 'Needs Reply':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Needs Reply</span>;
      case 'Meeting Request':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">Meeting</span>;
      case 'FYI / Info':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">FYI / Info</span>;
      default:
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Low Priority</span>;
    }
  };

  const getTabLabel = (id: string) => {
    switch (id) {
      case 'high': return 'High Priority';
      case 'action': return 'Action Required';
      case 'needs_reply': return 'Needs Reply';
      case 'fyi': return 'FYI / Info';
      case 'starred': return 'Starred';
      case 'sent': return 'Sent';
      case 'spam': return 'Spam / Sales';
      case 'archive': return 'Archive';
      default: return 'Inbox';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Current Folder Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-900 text-sm">{getTabLabel(activeTab)}</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
            {filteredEmails.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Sorted by AI Priority Score</p>
      </div>

      {/* High Priority Audio Reader Banner */}
      {activeTab === 'high' && highPriorityCount > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-900">Urgent Email Reader</p>
              <p className="text-[11px] text-red-700">{highPriorityCount} urgent items awaiting decision</p>
            </div>
          </div>
          <button
            onClick={handleReadHighPriorityAloud}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
            title="Read all high priority emails aloud"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Read Aloud
          </button>
        </div>
      )}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
        {filteredEmails.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300" />
            <div>
              <p className="text-sm font-semibold text-slate-800">All caught up here!</p>
              <p className="text-xs text-slate-500 mt-1">No emails in "{getTabLabel(activeTab)}".</p>
            </div>
            {activeTab !== 'inbox' && (
              <button
                onClick={() => setActiveTab('inbox')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Switch to Inbox
              </button>
            )}
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`group relative p-3.5 cursor-pointer transition duration-150 border-l-4 ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-blue-600 shadow-2xs'
                    : email.read
                    ? 'bg-white border-l-transparent hover:bg-slate-50'
                    : 'bg-slate-50/90 border-l-blue-500 hover:bg-slate-100 font-medium'
                }`}
              >
                {/* Header line: Avatar + Sender + Time + Priority */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {!email.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    <img
                      src={email.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(email.sender)}&background=2563eb&color=fff`}
                      alt={email.sender}
                      className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                    <span className={`text-xs truncate ${!email.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {email.sender}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getPriorityBadge(email.priority, email.priorityScore)}
                    <span className="text-[11px] text-slate-400 font-medium">{email.timestamp}</span>
                  </div>
                </div>

                {/* Subject Line */}
                <h3 className={`text-xs sm:text-sm line-clamp-1 mb-1 ${!email.read ? 'text-slate-900 font-bold' : 'text-slate-800 font-medium'}`}>
                  {email.subject}
                </h3>

                {/* AI Executive Summary Snippet */}
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed">{email.summary}</p>
                </div>

                {/* Category & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getCategoryBadge(email.category)}
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {email.estimatedReadTime} read
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                    {onDemotePriority && email.priority === 'High' && !email.demotedFromHighPriority && (
                      <button
                        onClick={(e) => onDemotePriority(email.id, e)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 transition"
                        title="Demote priority"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onPlayTts && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTts(`Email from ${email.sender}. Subject: ${email.subject}. Summary: ${email.summary}`);
                        }}
                        className="p-1 rounded hover:bg-blue-100 text-blue-600 transition"
                        title="Listen aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => onToggleStar(email.id, e)}
                      className={`p-1 rounded hover:bg-slate-200 transition ${
                        email.starred ? 'text-amber-500 fill-current' : 'text-slate-400'
                      }`}
                      title={email.starred ? 'Unstar' : 'Star'}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => onToggleArchive(email.id, e)}
                      className={`p-1 rounded hover:bg-slate-200 transition ${
                        email.archived ? 'text-blue-600' : 'text-slate-400'
                      }`}
                      title={email.archived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
