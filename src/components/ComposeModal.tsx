import React, { useState } from 'react';
import { X, Sparkles, Mail, Send, AlertCircle, Mic, Loader2, Paperclip, FileText, Users } from 'lucide-react';
import { UserPreferences } from '../types';
import { stopAllAudio } from '../utils/audio';
import { DEFAULT_CONTACT_ALIASES, resolveContactEmail } from '../utils/contacts';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitEmail: (data: { sender: string; senderEmail: string; subject: string; body: string }) => Promise<void>;
  isLoading: boolean;
  userPreferences?: UserPreferences;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSubmitEmail,
  isLoading,
  userPreferences,
}) => {
  if (!isOpen) return null;

  const [sender, setSender] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);

  const handleVoiceDictate = () => {
    stopAllAudio(); // Stop TTS speech immediately when voice dictation is triggered
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not available in this browser.');
      return;
    }

    if (isDictating) {
      setIsDictating(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    setIsDictating(true);
    const initialBody = body;

    recognition.onresult = (event: any) => {
      stopAllAudio();
      let speechResult = '';
      for (let i = 0; i < event.results.length; i++) {
        speechResult += event.results[i][0].transcript;
      }
      setBody(initialBody ? `${initialBody}\n\n${speechResult}` : speechResult);
    };

    recognition.onerror = () => setIsDictating(false);
    recognition.onend = () => setIsDictating(false);

    try {
      recognition.start();
    } catch (e) {
      setIsDictating(false);
    }
  };

  const samplePresets = [
    {
      title: 'Urgent Outage Report',
      sender: 'Rachel Green',
      senderEmail: 'rachel@acme.com',
      subject: 'URGENT: Gateway 502 Error for Enterprise Customers',
      body: `Hi Alex,\n\nOur enterprise customer portal is throwing 502 Bad Gateway errors right now.\n\nNeed immediate triage and status update before 11 AM.\n\nThanks,\nRachel`,
    },
    {
      title: 'Quarterly Proposal',
      sender: 'Michael Scott',
      senderEmail: 'mscott@dundermifflin.vc',
      subject: 'Q2 Performance & Board Meeting Schedule Proposal',
      body: `Hey Alex,\n\nGreat job hitting the Q2 target! Our partners would like to set up the Q3 meeting for August 12 or 14.\n\nPlease confirm date.\n\nBest,\nMichael`,
    },
  ];

  const handleApplyPreset = (preset: (typeof samplePresets)[0]) => {
    setSender(preset.sender);
    setSenderEmail(preset.senderEmail);
    setSubject(preset.subject);
    setBody(preset.body);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    await onSubmitEmail({
      sender: sender.trim() || 'Incoming Sender',
      senderEmail: senderEmail.trim() || 'sender@example.com',
      subject: subject.trim(),
      body: body.trim(),
    });

    setSender('');
    setSenderEmail('');
    setSubject('');
    setBody('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600 font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Triage Custom Email</h2>
            <p className="text-xs text-slate-500">Paste or type an email to run Gemini AI triage</p>
          </div>
        </div>

        {/* Sample Presets */}
        <div className="mb-4 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Test Presets:
          </span>
          <div className="flex gap-2">
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 transition"
              >
                + {preset.title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Quick Contact Directory Shortcuts */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Quick Contact Shortcuts:
              </span>
              <span className="text-[10px] text-slate-400">
                Tap to auto-fill contact name & email
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(userPreferences?.contactAliases || DEFAULT_CONTACT_ALIASES).map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSender(c.name);
                    setSenderEmail(c.email);
                  }}
                  className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg shadow-sm transition flex items-center gap-1"
                >
                  <span className="font-bold text-blue-600">{c.name}:</span>
                  <span className="font-mono text-[10.5px]">{c.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Name</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="e.g. Rachel Green"
                className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Email</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="rachel@acme.com"
                className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. URGENT: Contract terms"
              className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                Email Content <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleVoiceDictate}
                disabled={isDictating || isPolishing}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                  isDictating
                    ? 'bg-red-100 text-red-700 border-red-300 animate-pulse'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {isPolishing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Polishing Voice...</span>
                  </>
                ) : isDictating ? (
                  <>
                    <Mic className="w-3 h-3 text-red-600 animate-ping" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3" />
                    <span>Voice Dictate</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type or dictate email content..."
              className="w-full p-3 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none font-sans leading-relaxed"
            />
          </div>

          {/* File Attachments Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                File Attachments (Optional)
              </span>
              <label className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition flex items-center gap-1 active:scale-95">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Files</span>
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
              <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-medium shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate max-w-[140px] font-semibold">{att.name}</span>
                    <span className="text-[10px] text-slate-400">({att.size})</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-0.5 hover:text-red-600 transition"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Triaging...' : 'Triage Email Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
