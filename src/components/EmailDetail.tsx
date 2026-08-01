import React, { useState, useEffect } from 'react';
import { Email, ResponseTone } from '../types';
import { stopAllAudio } from '../utils/audio';
import {
  Sparkles,
  Volume2,
  Send,
  Copy,
  Check,
  RotateCcw,
  Star,
  Archive,
  ArrowLeft,
  Flame,
  Mic,
  MicOff,
  Wand2,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  FileText,
  MailCheck,
  ArrowDown,
  Paperclip,
  X,
} from 'lucide-react';

interface EmailDetailProps {
  email: Email | null;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDemotePriority?: (id: string) => void;
  onGenerateReply: (params: {
    quickReply?: string;
    customInstruction?: string;
    tone: ResponseTone;
    length: string;
  }) => Promise<void>;
  onSendReply?: (emailId: string, replyText: string) => Promise<void>;
  onReTriage: (id: string) => Promise<void>;
  onPlayTts: (text: string) => Promise<void>;
  isGeneratingReply: boolean;
  isTriaging: boolean;
  isPlayingTts: boolean;
}

interface EmailDetailContentProps extends Omit<EmailDetailProps, 'email'> {
  email: Email;
}

const EmailDetailContent: React.FC<EmailDetailContentProps> = ({
  email,
  onBack,
  onToggleStar,
  onToggleArchive,
  onDemotePriority,
  onGenerateReply,
  onSendReply,
  onReTriage,
  onPlayTts,
  isGeneratingReply,
  isTriaging,
  isPlayingTts,
}) => {
  const [selectedTone, setSelectedTone] = useState<ResponseTone>('executive');
  const [customInstruction, setCustomInstruction] = useState('');
  const [editedDraft, setEditedDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);

  useEffect(() => {
    // If an AI draft exists, use it. Otherwise, auto-suggest a contextual reply based on the main content!
    if (email.aiDraft) {
      setEditedDraft(email.aiDraft);
    } else {
      const senderFirstName = (email?.sender || '').trim().split(' ')[0] || 'there';
      const emailSubject = email?.subject || 'your message';
      const emailSummary = (email?.summary || 'your inquiry').toLowerCase();
      const autoReply = `Hi ${senderFirstName},\n\nThank you for reaching out regarding "${emailSubject}". I have reviewed your message regarding ${emailSummary}.\n\nEverything looks good on our end. Please let me know if you need any additional information.\n\nBest regards,`;
      setEditedDraft(autoReply);
    }
    setSentSuccess(false);
    setAttachments([]);
  }, [email.id, email.aiDraft, email.subject, email.sender, email.summary]);

  const handleQuickReplyClick = async (reply: string) => {
    const senderFirstName = (email?.sender || '').trim().split(' ')[0] || 'there';
    setEditedDraft(`Drafting response for: "${reply}"...\n\nHi ${senderFirstName},\n\nThank you for reaching out. ${reply}.\n\nBest regards,`);
    await onGenerateReply({
      quickReply: reply,
      customInstruction: customInstruction,
      tone: selectedTone,
      length: 'medium',
    });
  };

  const handleGenerateCustom = async () => {
    const senderFirstName = (email?.sender || '').trim().split(' ')[0] || 'there';
    setEditedDraft(`Generating AI response based on your instruction...\n\nHi ${senderFirstName},\n\nThank you for reaching out.`);
    await onGenerateReply({
      customInstruction: customInstruction,
      tone: selectedTone,
      length: 'medium',
    });
  };

  const handleCopyDraft = () => {
    if (!editedDraft) return;
    navigator.clipboard.writeText(editedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkSentAndArchive = async () => {
    if (!editedDraft) return;
    setSentSuccess(true);
    if (onSendReply) {
      await onSendReply(email.id, editedDraft);
    } else {
      onToggleArchive(email.id);
    }
    setTimeout(() => {
      setSentSuccess(false);
    }, 2500);
  };

  const handleToggleVoiceDictation = () => {
    stopAllAudio(); // Stop TTS speech immediately when user starts voice dictation
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your instruction.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    setIsRecording(true);

    const initialText = customInstruction;

    recognition.onresult = (event: any) => {
      stopAllAudio();
      let liveSpeech = '';
      for (let i = 0; i < event.results.length; i++) {
        liveSpeech += event.results[i][0].transcript;
      }
      setCustomInstruction(initialText ? `${initialText} ${liveSpeech}` : liveSpeech);
    };

    recognition.onerror = (err: any) => {
      console.warn('Dictation error:', err);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const tones: { id: ResponseTone; label: string; desc: string }[] = [
    { id: 'executive', label: 'Executive', desc: 'Authoritative & clear' },
    { id: 'concise', label: 'Concise', desc: '< 3 sentences' },
    { id: 'professional', label: 'Professional', desc: 'Standard business' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm & approachable' },
    { id: 'direct', label: 'Direct', desc: 'Action-focused' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto custom-scrollbar text-slate-800">
      {/* Detail Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Score: {email.priorityScore}/100
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">{email.estimatedReadTime} read</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReTriage(email.id)}
            disabled={isTriaging}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
            title="Re-run AI Triage"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-blue-600 ${isTriaging ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Re-Triage</span>
          </button>

          <button
            onClick={() => onToggleStar(email.id)}
            className={`p-2 rounded-lg border transition ${
              email.starred
                ? 'text-amber-500 border-amber-300 bg-amber-50'
                : 'text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Star className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={() => onToggleArchive(email.id)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            title={email.archived ? 'Unarchive' : 'Archive'}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Email Header Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{email.subject}</h1>
            <div className="flex items-center gap-2">
              {email.priority === 'High' && !email.demotedFromHighPriority && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-red-100 text-red-700 border border-red-200">
                  <Flame className="w-3.5 h-3.5 text-red-600" /> HIGH PRIORITY
                  {onDemotePriority && (
                    <button
                      onClick={() => onDemotePriority(email.id)}
                      className="ml-1 p-0.5 hover:bg-red-200 rounded transition text-red-800"
                      title="Demote priority"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              )}
              <span className="text-xs capitalize font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {email.sentiment} sentiment
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src={email.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(email.sender)}&background=2563eb&color=fff`}
                alt={email.sender}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
              <div>
                <p className="font-bold text-slate-900">{email.sender}</p>
                <p className="text-slate-500">{email.senderEmail}</p>
              </div>
            </div>
            <p className="text-slate-500 font-medium">{email.timestamp}</p>
          </div>
        </div>

        {/* AI EXECUTIVE SUMMARY BOX */}
        <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                AI Executive Summary
              </h2>
            </div>

            <button
              onClick={() => onPlayTts(`${email.summary}. Key points: ${email.keyPoints.join('. ')}`)}
              disabled={isPlayingTts}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 transition disabled:opacity-50 shadow-2xs"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingTts ? 'animate-pulse text-blue-600' : ''}`} />
              <span>{isPlayingTts ? 'Speaking...' : 'Listen Summary'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-blue-100">
            {email.summary}
          </p>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-blue-600" /> Key Action Items:
            </h3>
            <ul className="space-y-1 text-xs text-slate-700">
              {email.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ONE-TAP QUICK REPLIES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-blue-600" /> Quick Replies
            </h3>
            <span className="text-[11px] text-slate-400">Click to draft instantly</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {email.suggestedQuickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickReplyClick(reply)}
                disabled={isGeneratingReply}
                className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition shadow-2xs active:scale-95 disabled:opacity-50 text-left"
              >
                ⚡ {reply}
              </button>
            ))}
          </div>
        </div>

        {/* ORIGINAL EMAIL BODY */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" /> Original Email Text
            </span>
            {showOriginal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showOriginal && (
            <div className="p-4 sm:p-5 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed border-t border-slate-100 bg-slate-50/50">
              {email.body}
            </div>
          )}
        </div>

        {/* AI DRAFT WORKSPACE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> AI Draft Reply Workspace
            </h2>

            {/* Tone Selector */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTone(t.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                    selectedTone === t.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Custom instructions (e.g. 'Confirm Tuesday meeting at 2pm')..."
                className="w-full pl-3 pr-24 py-2.5 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleToggleVoiceDictation}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title="Voice dictation prompt"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening...' : 'Dictate'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateCustom}
                disabled={isGeneratingReply}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingReply ? 'animate-spin' : ''}`} />
                <span>{isGeneratingReply ? 'Generating AI Response...' : 'Generate Response'}</span>
              </button>
            </div>
          </div>

          {/* Draft Textarea */}
          <div className="space-y-3">
            <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
              <textarea
                value={editedDraft}
                onChange={(e) => setEditedDraft(e.target.value)}
                rows={5}
                placeholder="AI response draft will appear here..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-sans leading-relaxed resize-y"
              />

              {sentSuccess && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur rounded-xl flex flex-col items-center justify-center text-center p-4">
                  <MailCheck className="w-10 h-10 text-emerald-600 mb-2 animate-bounce" />
                  <h4 className="text-sm font-bold text-slate-900">Reply Sent & Archived!</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Email moved to sent archive.</p>
                </div>
              )}
            </div>

            {/* Optional File Attachments Badge Section */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2.5 bg-slate-100/80 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 self-center">
                  <Paperclip className="w-3 h-3 text-slate-400" /> Attached Files:
                </span>
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-medium shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate max-w-[150px] font-semibold">{att.name}</span>
                    <span className="text-[10px] text-slate-400">({att.size})</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-0.5 hover:text-red-600 hover:bg-slate-100 rounded transition"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDraft}
                  disabled={!editedDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition disabled:opacity-40"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
                </button>

                <button
                  onClick={() => onPlayTts(editedDraft)}
                  disabled={!editedDraft || isPlayingTts}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition disabled:opacity-40"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Listen Draft</span>
                </button>

                {/* Add File Attachment Button */}
                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition active:scale-95">
                  <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                  <span>Attach File</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files).map((f) => ({
                          name: f.name,
                          size: `${(f.size / 1024).toFixed(1)} KB`,
                        }));
                        setAttachments((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>
              </div>

              <button
                onClick={handleMarkSentAndArchive}
                disabled={!editedDraft || sentSuccess}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send & Archive</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmailDetail: React.FC<EmailDetailProps> = (props) => {
  if (!props.email) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mb-4 text-blue-600">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Select an Email</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Pick an incoming message from the list to view summaries and generated responses.
        </p>
      </div>
    );
  }

  return <EmailDetailContent {...props} email={props.email} />;
};
