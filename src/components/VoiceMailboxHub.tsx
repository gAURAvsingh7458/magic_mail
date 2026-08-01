import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Send, X, Loader2, MessageSquareText, Edit3, User, CheckCircle, Trash2, Paperclip, FileText, Users } from 'lucide-react';
import { Email, UserPreferences } from '../types';
import { stopAllAudio } from '../utils/audio';
import { resolveContactEmail, DEFAULT_CONTACT_ALIASES } from '../utils/contacts';

interface VoiceMailboxHubProps {
  emails: Email[];
  selectedEmail: Email | null;
  userPreferences?: UserPreferences;
  onSendEmail: (emailData: { sender: string; senderEmail: string; recipient: string; subject: string; body: string }) => Promise<void>;
  onSendReply: (emailId: string, replyText: string) => Promise<void>;
  onSelectTab: (tab: string) => void;
  onPlayTts: (text: string) => Promise<void>;
  onSearch: (query: string) => void;
}

export const VoiceMailboxHub: React.FC<VoiceMailboxHubProps> = ({
  emails,
  selectedEmail,
  userPreferences,
  onSendEmail,
  onSendReply,
  onSelectTab,
  onPlayTts,
  onSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textCommand, setTextCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);

  // Staged draft action for user review & permission-based sending
  const [pendingAction, setPendingAction] = useState<{
    type: 'NEW_EMAIL' | 'REPLY';
    sender: string;
    senderEmail: string;
    recipient: string;
    subject: string;
    body: string;
    targetEmailId?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        stopAllAudio(); // Stop app speech immediately when user speech is received
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
        setTextCommand(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setFeedback('Microphone permission blocked. You can type commands in the expanding text box below!');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const getUserFirstName = () => {
    const fullName = userPreferences?.userName || 'Gaurav Singh';
    return fullName.trim().split(' ')[0] || 'Gaurav';
  };

  const getUserSenderEmail = () => {
    if (userPreferences?.userEmail && userPreferences.userEmail.includes('@')) {
      return userPreferences.userEmail;
    }
    const nameSlug = getUserFirstName().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${nameSlug}@apexdigital.io`;
  };

  const toggleListening = () => {
    const firstName = getUserFirstName();
    const greeting = `Hello ${firstName}! What task would you like me to help you with today?`;

    const wasOpen = isOpen;
    if (!wasOpen) {
      setIsOpen(true);
      setFeedback(greeting);
    }

    if (!recognitionRef.current) {
      setFeedback('Microphone recognition is unavailable in this browser. Please type your command in the expanding text area below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (textCommand.trim()) {
        handleProcessVoiceInput(textCommand);
      }
    } else {
      setTranscript('');
      setTextCommand('');
      setFeedback(greeting);

      // Play greeting speech ONLY ONCE when opening/activating
      onPlayTts(greeting);

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        console.error('Failed to start speech recognition:', e);
        setIsListening(false);
        setFeedback('Could not access microphone. Type your command below.');
      }
    }
  };

  const handleProcessVoiceInput = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    setIsProcessing(true);
    setFeedback('Analyzing voice command...');

    const defaultSenderName = userPreferences?.userName || 'Gaurav Singh';
    const defaultSenderEmail = getUserSenderEmail();

    try {
      const res = await fetch('/api/emails/voice-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: spokenText,
          activeEmailId: selectedEmail?.id || null,
        }),
      });

      if (!res.ok) throw new Error('Voice command parsing failed');
      const data = await res.json();

      const act = (data.action || '').toUpperCase();
      const isReplyAction = act.includes('REPLY');
      const isSendAction = act.includes('SEND') || act.includes('NEW') || act.includes('COMPOSE') || act.includes('MAIL');

      if (act === 'READ_HIGH_PRIORITY') {
        onSelectTab('high');
        const unreadHighPriority = emails.filter(
          (e) => e.priority === 'High' && !e.read && !e.archived && e.folder !== 'spam' && e.category !== 'Spam'
        );
        if (unreadHighPriority.length === 0) {
          const text = `You currently have no unread High Priority emails, ${getUserFirstName()}.`;
          setFeedback(text);
          onPlayTts(text);
        } else {
          const fullSpeech =
            `You have ${unreadHighPriority.length} unread High Priority emails. ` +
            unreadHighPriority.map((e, idx) => `Email ${idx + 1} from ${e.sender}. Subject: ${e.subject}. Summary: ${e.summary}`).join('. ');
          setFeedback(`Reading ${unreadHighPriority.length} unread High Priority emails aloud...`);
          onPlayTts(fullSpeech);
        }
      } else if (isReplyAction && selectedEmail) {
        let targetRecipient = data.recipient || selectedEmail.senderEmail || 'recipient@example.com';
        const contactAliases = userPreferences?.contactAliases || DEFAULT_CONTACT_ALIASES;
        const resolvedEmail = resolveContactEmail(targetRecipient, contactAliases) || resolveContactEmail(spokenText, contactAliases);
        if (resolvedEmail) {
          targetRecipient = resolvedEmail;
        }

        setPendingAction({
          type: 'REPLY',
          sender: defaultSenderName,
          senderEmail: defaultSenderEmail,
          recipient: targetRecipient,
          subject: data.subject || `Re: ${selectedEmail.subject}`,
          body: data.replyText || data.body || spokenText,
          targetEmailId: selectedEmail.id,
        });
        setFeedback(`Email reply prepared for ${targetRecipient}. Review details below and click "Send Email" when ready.`);
        onPlayTts(`I have prepared the reply for ${targetRecipient}. Please review and confirm to send.`);
      } else if (isSendAction || isReplyAction || data.recipient || data.subject || data.body || data.replyText) {
        let targetRecipient = data.recipient || 'recipient@example.com';
        const contactAliases = userPreferences?.contactAliases || DEFAULT_CONTACT_ALIASES;
        const resolvedEmail = resolveContactEmail(targetRecipient, contactAliases) || resolveContactEmail(spokenText, contactAliases);
        if (resolvedEmail) {
          targetRecipient = resolvedEmail;
        }

        setPendingAction({
          type: 'NEW_EMAIL',
          sender: defaultSenderName,
          senderEmail: defaultSenderEmail,
          recipient: targetRecipient,
          subject: data.subject || 'New Message',
          body: data.body || data.replyText || spokenText,
        });
        setFeedback(`Email draft prepared for ${targetRecipient}. Review and edit any address or body text below before sending.`);
        onPlayTts(`I have prepared the email for ${targetRecipient}. Please review and edit if needed before sending.`);
      } else if (act === 'READ_EMAIL' && selectedEmail) {
        const emailSpeech = `Email from ${selectedEmail.sender}. Subject: ${selectedEmail.subject}. Executive Summary: ${selectedEmail.summary}.`;
        setFeedback(`Reading email from ${selectedEmail.sender}...`);
        onPlayTts(emailSpeech);
      } else if (act === 'FILTER_INBOX') {
        if (data.feedbackText) {
          setFeedback(data.feedbackText);
          onPlayTts(data.feedbackText);
        }
        if (data.filterTab) onSelectTab(data.filterTab);
        if (data.query) onSearch(data.query);
      } else {
        if (data.feedbackText) {
          setFeedback(data.feedbackText);
          onPlayTts(data.feedbackText);
        } else {
          const fallbackText = `I heard: "${spokenText}". How would you like me to process this email task?`;
          setFeedback(fallbackText);
          onPlayTts(fallbackText);
        }
      }
    } catch (err) {
      console.error('Failed to parse voice command:', err);
      setFeedback('Error processing voice command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textCommand.trim()) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    handleProcessVoiceInput(textCommand);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    const actionToRun = pendingAction;

    setFeedback('Sending email with your permission...');

    try {
      if (actionToRun.type === 'REPLY' && actionToRun.targetEmailId) {
        await onSendReply(actionToRun.targetEmailId, actionToRun.body);
        setFeedback(`✓ Email Reply sent successfully to ${actionToRun.recipient}!`);
        onPlayTts(`Your email reply has been sent.`);
      } else {
        await onSendEmail({
          sender: actionToRun.sender,
          senderEmail: actionToRun.senderEmail,
          recipient: actionToRun.recipient,
          subject: actionToRun.subject,
          body: actionToRun.body,
        });
        setFeedback(`✓ Email sent successfully to ${actionToRun.recipient}!`);
        onPlayTts(`Your email has been sent successfully.`);
      }
      setPendingAction(null);
    } catch (err) {
      console.error('Failed to execute voice send:', err);
      setFeedback('Failed to send email. Please check internet connection and try again.');
    }
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
    setFeedback('Email send canceled.');
  };

  // Calculate dynamic rows for the expanding input textarea
  const lineCount = textCommand.split('\n').length;
  const charLength = textCommand.length;
  const estimatedRows = Math.min(6, Math.max(2, lineCount > 1 ? lineCount : Math.ceil(charLength / 38)));

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 max-w-md w-full px-2 sm:px-0 select-none">
      {/* Voice Assistant Expanded Panel */}
      {isOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl w-full text-xs text-slate-800 animate-in fade-in slide-in-from-bottom-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs leading-none">Voice & AI Mail Assistant</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Speaking with {getUserFirstName()}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Close Voice Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Assistant Greeting / Status Box */}
          <div className="bg-blue-50/80 border border-blue-200/80 p-3 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Voice Assistant Greeting:</span>
            </div>
            <p className="text-blue-950 font-medium leading-relaxed pl-5 text-[11.5px]">
              {feedback || `Hello ${getUserFirstName()}! What task would you like me to help you with today?`}
            </p>
          </div>

          {/* Live Listening Indicator */}
          {isListening && (
            <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center gap-2 text-red-700 font-semibold text-xs animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
              <span>Listening continuously... Speak your email instructions or dictation clearly.</span>
            </div>
          )}

          {isProcessing && (
            <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 text-slate-700 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span>Processing voice command with Gemini AI...</span>
            </div>
          )}

          {/* Quick Voice Shortcuts */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleProcessVoiceInput('Read unread high priority emails')}
              className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold border border-red-200 transition flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3 text-red-600" />
              Read Urgent Emails
            </button>
            <button
              onClick={() => handleProcessVoiceInput('Show action required emails')}
              className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 transition"
            >
              Action Required
            </button>
          </div>

          {/* Auto-Expanding Speech / Text Area */}
          <form onSubmit={handleManualCommandSubmit} className="space-y-2">
            <div className="relative">
              <textarea
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                placeholder={`Speak or type your mail request... e.g. "Send email to sarah@acme.com subject Project Review body Hi Sarah, let's meet tomorrow."`}
                rows={estimatedRows}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition resize-none leading-relaxed"
              />
              {textCommand && (
                <button
                  type="button"
                  onClick={() => setTextCommand('')}
                  className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                  title="Clear text"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white ring-2 ring-red-300 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                }`}
                title={isListening ? 'Stop mic listening' : 'Start mic dictation'}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 text-white" />
                    <span>Stop Speaking</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-blue-600" />
                    <span>Click Mic to Speak</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={!textCommand.trim() || isProcessing}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 active:scale-95"
                title="Process mail command"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Process</span>
              </button>
            </div>
          </form>

          {/* Interactive Email Draft Review & Edit Card */}
          {pendingAction && (
            <div className="bg-slate-50 border-2 border-blue-500/80 rounded-xl p-3 text-xs space-y-2.5 shadow-md animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  Review & Edit Email Before Sending
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  User Approval Required
                </span>
              </div>

              {/* Draft Review Form */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                {/* Recipient Address (Editable in case mic misheard address) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      To Recipient Email
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Quick Contacts:
                    </span>
                  </div>

                  {/* Contact Shortcuts row */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {(userPreferences?.contactAliases || DEFAULT_CONTACT_ALIASES).map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPendingAction({ ...pendingAction, recipient: c.email })}
                        className="text-[10.5px] font-semibold px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded transition"
                        title={`Set recipient to ${c.email}`}
                      >
                        {c.name} ({c.email.split('@')[0]})
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={pendingAction.recipient}
                    onChange={(e) => setPendingAction({ ...pendingAction, recipient: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject</label>
                  <input
                    type="text"
                    value={pendingAction.subject}
                    onChange={(e) => setPendingAction({ ...pendingAction, subject: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Message Body</label>
                  <textarea
                    value={pendingAction.body}
                    onChange={(e) => setPendingAction({ ...pendingAction, body: e.target.value })}
                    rows={4}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
                  />
                </div>

                {/* Optional File Attachments */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      Attachments
                    </label>
                    <label className="cursor-pointer text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition">
                      <Paperclip className="w-3 h-3" />
                      <span>Add File</span>
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

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] px-2 py-0.5 rounded-md font-medium"
                        >
                          <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[120px]">{att.name}</span>
                          <span className="text-[9.5px] text-slate-400">({att.size})</span>
                          <button
                            onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-0.5 hover:text-red-600 transition"
                            title="Remove attachment"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Explicit Permission Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={executePendingAction}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Send Email Now</span>
                </button>
                <button
                  onClick={cancelPendingAction}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Mic Trigger Button */}
      <button
        onClick={toggleListening}
        className={`flex items-center justify-center w-13 h-13 rounded-full shadow-2xl transition-all duration-200 active:scale-95 ${
          isListening
            ? 'bg-red-600 text-white ring-4 ring-red-300 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
        }`}
        title="Voice Assistant - Click to speak"
      >
        {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
};
