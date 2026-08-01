import React, { useState, useEffect } from 'react';
import { X, Settings, User, Sliders, ShieldCheck, Save, Sparkles, Plus, Trash2, Users } from 'lucide-react';
import { UserPreferences, ResponseTone, ContactAlias } from '../types';
import { DEFAULT_CONTACT_ALIASES } from '../utils/contacts';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => Promise<void>;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
}) => {
  const [form, setForm] = useState<UserPreferences>({
    ...preferences,
    contactAliases: preferences.contactAliases || DEFAULT_CONTACT_ALIASES,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...preferences,
        contactAliases:
          preferences.contactAliases && preferences.contactAliases.length > 0
            ? preferences.contactAliases
            : DEFAULT_CONTACT_ALIASES,
      });
    }
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactEmail.trim()) return;
    const updated = [
      ...(form.contactAliases || []),
      { name: newContactName.trim(), email: newContactEmail.trim() },
    ];
    setForm({ ...form, contactAliases: updated });
    setNewContactName('');
    setNewContactEmail('');
  };

  const handleRemoveContact = (index: number) => {
    const updated = (form.contactAliases || []).filter((_, i) => i !== index);
    setForm({ ...form, contactAliases: updated });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSavePreferences(form);
    setIsSaving(false);
    onClose();
  };

  const tones: { id: ResponseTone; label: string }[] = [
    { id: 'executive', label: 'Executive (Authoritative & Clear)' },
    { id: 'concise', label: 'Concise (Under 3 sentences)' },
    { id: 'professional', label: 'Professional (Standard Business)' },
    { id: 'friendly', label: 'Friendly (Warm & Approachable)' },
    { id: 'direct', label: 'Direct (Action focused)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Personalization & Persona Settings</h2>
            <p className="text-xs text-slate-400">Customize how Gemini drafts and triages your executive emails</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Your Full Name</label>
              <input
                type="text"
                required
                value={form.userName}
                onChange={(e) => {
                  const newName = e.target.value;
                  setForm({
                    ...form,
                    userName: newName,
                    signature: `Best regards,\n${newName} | ${form.userTitle}, ${form.userCompany}`,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-950 text-xs text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={form.userTitle}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setForm({
                    ...form,
                    userTitle: newTitle,
                    signature: `Best regards,\n${form.userName} | ${newTitle}, ${form.userCompany}`,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-950 text-xs text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Company / Organization</label>
            <input
              type="text"
              required
              value={form.userCompany}
              onChange={(e) => {
                const newCompany = e.target.value;
                setForm({
                  ...form,
                  userCompany: newCompany,
                  signature: `Best regards,\n${form.userName} | ${form.userTitle}, ${newCompany}`,
                });
              }}
              className="w-full px-3 py-2 bg-slate-950 text-xs text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Default Response Tone</label>
            <select
              value={form.defaultTone}
              onChange={(e) => setForm({ ...form, defaultTone: e.target.value as ResponseTone })}
              className="w-full px-3 py-2 bg-slate-950 text-xs text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              {tones.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email Signature</label>
            <textarea
              rows={3}
              value={form.signature}
              onChange={(e) => setForm({ ...form, signature: e.target.value })}
              className="w-full p-3 bg-slate-950 text-xs text-slate-200 font-mono rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Contact Directory & Voice Email Shortcuts */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <label className="text-xs font-bold text-slate-200">
                  Contact Directory & Voice Email Shortcuts
                </label>
              </div>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Voice auto-matches names to emails
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              When you say or type names like "Boss", "Mom", or "Alex", the app will automatically populate their email address!
            </p>

            {/* List of existing contact aliases */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {(form.contactAliases || []).map((contact, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-300 px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 text-[11px]">
                      {contact.name}
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">{contact.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveContact(idx)}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                    title="Remove contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new contact shortcut input */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-800/80">
              <input
                type="text"
                placeholder="Alias Name (e.g. Boss)"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="sm:col-span-2 px-2.5 py-1.5 bg-slate-900 text-xs text-slate-200 rounded-lg border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="sm:col-span-2 px-2.5 py-1.5 bg-slate-900 text-xs text-slate-200 rounded-lg border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddContact}
                className="sm:col-span-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-2 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              VIP Senders & Domains (Comma separated)
            </label>
            <input
              type="text"
              value={form.vipDomains.join(', ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  vipDomains: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="e.g. sequoiacap.com, apex.com, stripe.com"
              className="w-full px-3 py-2 bg-slate-950 text-xs text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoArchive"
              checked={form.autoArchiveInfoOnly}
              onChange={(e) => setForm({ ...form, autoArchiveInfoOnly: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
            />
            <label htmlFor="autoArchive" className="text-xs text-slate-300 font-medium cursor-pointer">
              Auto-archive Low Priority newsletter/FYI emails after triage
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
