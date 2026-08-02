/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Email, UserPreferences, AnalyticsData, ResponseTone } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { ComposeModal } from './components/ComposeModal';
import { StatsModal } from './components/StatsModal';
import { PreferencesModal } from './components/PreferencesModal';
import { AuthPage } from './components/AuthPage';
import { VoiceMailboxHub } from './components/VoiceMailboxHub';
import { playPcmAudio, fallbackWebSpeech } from './utils/audio';
import { DEFAULT_CONTACT_ALIASES } from './utils/contacts';
import { initAuth, getAccessToken, logoutGoogle } from './lib/firebaseAuth';
import { fetchLiveGmailMessages, sendGmailEmail, archiveGmailMessage } from './services/gmail';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('email_triage_authenticated') === 'true';
  });

  const [isGmailConnected, setIsGmailConnected] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    title: string;
    company: string;
  } | null>(() => {
    const saved = localStorage.getItem('email_triage_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    initAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setIsGmailConnected(true);
        if (!currentUser && user) {
          setCurrentUser({
            name: user.displayName || 'Gmail User',
            email: user.email || 'user@gmail.com',
            title: 'Executive User',
            company: 'Google Workspace',
          });
        }
      },
      () => {
        setIsGmailConnected(false);
      }
    );
  }, []);

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTriaged: 0,
    timeSavedMinutes: 0,
    highPriorityCount: 0,
    actionRequiredCount: 0,
    draftsSentCount: 0,
    averageResponseTimeMin: 0,
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('email_triage_preferences') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          userName: 'Gaurav Singh',
          userTitle: 'Head of Operations',
          userCompany: 'Apex Digital Inc.',
          defaultTone: 'executive' as ResponseTone,
          autoArchiveInfoOnly: false,
          vipDomains: ['apex.com', 'sequoia.com'],
          signature: 'Best regards,\nGaurav Singh | Head of Operations, Apex Digital',
          voiceSpeed: 1.0,
          contactAliases: DEFAULT_CONTACT_ALIASES,
          ...parsed,
        };
      } catch (e) {
        console.warn('Error reading saved preferences from localStorage:', e);
      }
    }
    return {
      userName: 'Gaurav Singh',
      userTitle: 'Head of Operations',
      userCompany: 'Apex Digital Inc.',
      defaultTone: 'executive',
      autoArchiveInfoOnly: false,
      vipDomains: ['apex.com', 'sequoia.com'],
      signature: 'Best regards,\nGaurav Singh | Head of Operations, Apex Digital',
      voiceSpeed: 1.0,
      contactAliases: DEFAULT_CONTACT_ALIASES,
    };
  });

  // Modal Visibility States
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Loading States
  const [isTriaging, setIsTriaging] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  const handleLoginSuccess = (
    userData: { name: string; email: string; title: string; company: string },
    isGoogleGmail?: boolean
  ) => {
    setIsAuthenticated(true);
    setCurrentUser(userData);
    if (isGoogleGmail) {
      setIsGmailConnected(true);
    }
    localStorage.setItem('email_triage_authenticated', 'true');
    localStorage.setItem('email_triage_user', JSON.stringify(userData));

    const updatedPrefs: UserPreferences = {
      ...preferences,
      userName: userData.name,
      userTitle: userData.title,
      userCompany: userData.company,
      signature: `Best regards,\n${userData.name} | ${userData.title}, ${userData.company}`,
    };
    setPreferences(updatedPrefs);
    handleSavePreferences(updatedPrefs);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsGmailConnected(false);
    setCurrentUser(null);
    logoutGoogle();
    localStorage.removeItem('email_triage_authenticated');
    localStorage.removeItem('email_triage_user');
  };

  // Initial Data Fetch
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated, isGmailConnected]);

  const loadInitialData = async () => {
    try {
      let loadedLive = false;
      const token = getAccessToken();
      if (token) {
        setIsGmailConnected(true);
        try {
          const liveGmailList = await fetchLiveGmailMessages(token, 15);
          if (liveGmailList && liveGmailList.length > 0) {
            setEmails(liveGmailList);
            setSelectedEmailId(liveGmailList[0].id);
            loadedLive = true;
          }
        } catch (gErr) {
          console.warn('Gmail API fetch failed, falling back to server store:', gErr);
        }
      }

      const [emailsRes, statsRes, prefsRes] = await Promise.all([
        fetch('/api/emails'),
        fetch('/api/stats'),
        fetch('/api/preferences'),
      ]);

      if (emailsRes.ok) {
        const emailData: Email[] = await emailsRes.json();
        // If live Gmail was not loaded, load server store
        if (!loadedLive) {
          setEmails(emailData);
          if (emailData.length > 0) {
            setSelectedEmailId((prev) => prev || emailData[0].id);
          }
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAnalytics(statsData);
      }

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setPreferences((prev) => {
          const merged = {
            ...prev,
            ...prefsData,
            contactAliases:
              prefsData.contactAliases && prefsData.contactAliases.length > 0
                ? prefsData.contactAliases
                : prev.contactAliases || DEFAULT_CONTACT_ALIASES,
          };
          try {
            localStorage.setItem('email_triage_preferences', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.error('Error loading app data:', err);
    }
  };

  // Filtered Emails with Search Query
  const displayedEmails = emails.filter((email) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(q) ||
      email.sender.toLowerCase().includes(q) ||
      email.senderEmail.toLowerCase().includes(q) ||
      email.summary.toLowerCase().includes(q) ||
      email.category.toLowerCase().includes(q) ||
      email.priority.toLowerCase().includes(q) ||
      email.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  // Handle email selection & mark read
  const handleSelectEmail = async (id: string) => {
    setSelectedEmailId(id);
    const target = emails.find((e) => e.id === id);
    if (target && !target.read) {
      setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
      try {
        await fetch(`/api/emails/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
      } catch (err) {
        console.warn('Backend update notice (read):', err);
      }
    }
  };

  // Toggle Starred
  const handleToggleStar = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = emails.find((e) => e.id === id);
    if (!target) return;

    const updatedStarred = !target.starred;
    setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, starred: updatedStarred } : item)));

    try {
      await fetch(`/api/emails/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: updatedStarred }),
      });
    } catch (err) {
      // Graceful fallback for offline/transient fetch warning
      console.warn('Backend update notice (starred):', err);
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = emails.find((e) => e.id === id);
    if (!target) return;

    const updatedArchived = !target.archived;
    setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, archived: updatedArchived } : item)));

    // If active item was archived, select next item
    if (selectedEmailId === id) {
      const remaining = emails.filter((item) => item.id !== id && !item.archived);
      if (remaining.length > 0) {
        setSelectedEmailId(remaining[0].id);
      } else {
        setSelectedEmailId(null);
      }
    }

    try {
      await fetch(`/api/emails/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: updatedArchived }),
      });
    } catch (err) {
      // Graceful fallback for offline/transient fetch warning
      console.warn('Backend update notice (archived):', err);
    }
  };

  // Re-triage single email
  const handleReTriage = async (id: string) => {
    if (!id) return;
    setIsTriaging(true);
    try {
      const targetEmail = emails.find((e) => e.id === id);
      const res = await fetch(`/api/emails/${encodeURIComponent(id)}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (res.ok) {
        const updated: Email = await res.json();
        setEmails((prev) => prev.map((item) => (item.id === id ? updated : item)));
      }
    } catch (err) {
      console.error('Re-triage error:', err);
    } finally {
      setIsTriaging(false);
    }
  };

  // Auto-Triage Batch on whole inbox
  const handleBatchTriage = async () => {
    setIsTriaging(true);
    try {
      for (const email of emails) {
        if (email && email.id && !email.archived) {
          try {
            const res = await fetch(`/api/emails/${encodeURIComponent(email.id)}/triage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            if (res.ok) {
              const updated: Email = await res.json();
              setEmails((prev) => prev.map((item) => (item.id === email.id ? updated : item)));
            }
          } catch (itemErr) {
            console.warn(`Triage item warning for ${email.id}:`, itemErr);
          }
        }
      }
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        setAnalytics(await statsRes.json());
      }
    } catch (err) {
      console.error('Batch triage error:', err);
    } finally {
      setIsTriaging(false);
    }
  };

  // Generate Reply Draft
  const handleGenerateReply = async (params: {
    quickReply?: string;
    customInstruction?: string;
    tone: ResponseTone;
    length: string;
  }) => {
    if (!selectedEmailId) return;
    setIsGeneratingReply(true);

    try {
      const targetEmail = emails.find((e) => e.id === selectedEmailId);
      const res = await fetch(`/api/emails/${encodeURIComponent(selectedEmailId)}/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, email: targetEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.draft) {
          setEmails((prev) =>
            prev.map((item) => (item.id === selectedEmailId ? { ...item, aiDraft: data.draft } : item))
          );
        }

        // Update stats
        setAnalytics((prev) => ({
          ...prev,
          draftsSentCount: prev.draftsSentCount + 1,
          timeSavedMinutes: prev.timeSavedMinutes + 4,
        }));
      }
    } catch (err) {
      console.error('Error generating reply:', err);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Demote email from High Priority
  const handleDemotePriority = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = emails.find((item) => item.id === id);
    if (!target) return;

    setEmails((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              priority: 'Medium',
              priorityScore: 50,
              demotedFromHighPriority: true,
            }
          : item
      )
    );

    try {
      await fetch(`/api/emails/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'Medium', priorityScore: 50, demotedFromHighPriority: true }),
      });
    } catch (err) {
      console.error('Failed to demote priority:', err);
    }
  };

  // Speech TTS Handler
  const handlePlayTts = async (text: string) => {
    if (!text) return;
    setIsPlayingTts(true);

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const res = await fetch('/api/emails/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Kore' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playPcmAudio(data.audioBase64);
        } else {
          await fallbackWebSpeech(text);
        }
      } else {
        await fallbackWebSpeech(text);
      }
    } catch (err) {
      console.warn('Gemini TTS fallback to browser speech:', err);
      await fallbackWebSpeech(text);
    } finally {
      setIsPlayingTts(false);
    }
  };

  // Submit custom email to triage
  const handleSubmitCustomEmail = async (data: {
    sender: string;
    senderEmail: string;
    recipient?: string;
    subject: string;
    body: string;
  }) => {
    setIsTriaging(true);
    try {
      const token = getAccessToken();
      const targetRecipient = data.recipient || data.senderEmail;
      if (token && targetRecipient) {
        try {
          await sendGmailEmail(token, targetRecipient, data.subject, data.body);
        } catch (gSendErr) {
          console.warn('Gmail API direct send error:', gSendErr);
        }
      }

      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, recipient: targetRecipient, isSent: true }),
      });

      if (res.ok) {
        const newEmail: Email = await res.json();
        setEmails((prev) => [newEmail, ...prev]);
        setSelectedEmailId(newEmail.id);
        setActiveTab(newEmail.folder === 'sent' ? 'sent' : 'inbox');

        setAnalytics((prev) => ({
          ...prev,
          totalTriaged: prev.totalTriaged + 1,
          timeSavedMinutes: prev.timeSavedMinutes + 3,
          draftsSentCount: prev.draftsSentCount + 1,
        }));
      }
    } catch (err) {
      console.error('Error submitting email:', err);
    } finally {
      setIsTriaging(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (updated: UserPreferences) => {
    setPreferences(updated);
    try {
      localStorage.setItem('email_triage_preferences', JSON.stringify(updated));
    } catch (e) {}

    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const saved = await res.json();
        setPreferences((prev) => {
          const merged = { ...prev, ...saved };
          try {
            localStorage.setItem('email_triage_preferences', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  // Handle sending reply from voice hub or UI
  const handleSendVoiceReply = async (emailId: string, replyText: string) => {
    try {
      const targetEmail = emails.find((e) => e.id === emailId);
      const token = getAccessToken();
      const recipientEmail = targetEmail?.senderEmail || 'recipient@example.com';
      const subject = targetEmail ? `Re: ${targetEmail.subject}` : 'Re: Email';

      if (token && recipientEmail) {
        try {
          await sendGmailEmail(token, recipientEmail, subject, replyText);
        } catch (gReplyErr) {
          console.warn('Gmail API direct reply error:', gReplyErr);
        }
      }

      await fetch(`/api/emails/${encodeURIComponent(emailId)}/send-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyText,
          senderName: preferences.userName,
          senderEmail: preferences.userEmail || `${preferences.userName.toLowerCase().replace(/\s+/g, '.')}@apexdigital.io`,
          recipientEmail,
        }),
      });

      setEmails((prev) =>
        prev.map((item) =>
          item.id === emailId
            ? {
                ...item,
                aiDraft: replyText,
                category: 'Needs Reply' as any,
                archived: true,
                read: true,
              }
            : item
        )
      );

      // Auto-advance to next unarchived email in active list
      const remaining = emails.filter((item) => item.id !== emailId && !item.archived);
      if (remaining.length > 0) {
        setSelectedEmailId(remaining[0].id);
      } else {
        setSelectedEmailId(null);
      }

      setAnalytics((prev) => ({
        ...prev,
        draftsSentCount: prev.draftsSentCount + 1,
        timeSavedMinutes: prev.timeSavedMinutes + 5,
      }));
    } catch (err) {
      console.error('Failed to send voice reply:', err);
    }
  };

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 font-sans text-slate-900 overflow-hidden antialiased">
      {/* Top Header Navigation */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        timeSavedMinutes={analytics.timeSavedMinutes}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onBatchTriage={handleBatchTriage}
        onRefresh={loadInitialData}
        isTriaging={isTriaging}
        currentUser={currentUser}
        userName={preferences.userName}
        isGmailConnected={isGmailConnected}
      />

      {/* Slide-out Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        emails={emails}
        timeSavedMinutes={analytics.timeSavedMinutes}
        currentUser={currentUser}
        userName={preferences.userName}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace split layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Column: Email List */}
        <div
          className={`w-full lg:w-5/12 xl:w-4/12 h-full ${
            selectedEmailId ? 'hidden lg:block' : 'block'
          }`}
        >
          <EmailList
            emails={displayedEmails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onDemotePriority={handleDemotePriority}
            onPlayTts={handlePlayTts}
            searchQuery={searchQuery}
          />
        </div>

        {/* Right Column: Email Triage & AI Reply Detail View */}
        <div
          className={`w-full lg:w-7/12 xl:w-8/12 h-full ${
            selectedEmailId ? 'block' : 'hidden lg:block'
          }`}
        >
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmailId(null)}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onDemotePriority={handleDemotePriority}
            onGenerateReply={handleGenerateReply}
            onSendReply={handleSendVoiceReply}
            onReTriage={handleReTriage}
            onPlayTts={handlePlayTts}
            isGeneratingReply={isGeneratingReply}
            isTriaging={isTriaging}
            isPlayingTts={isPlayingTts}
          />
        </div>
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSubmitEmail={handleSubmitCustomEmail}
        isLoading={isTriaging}
        userPreferences={preferences}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={analytics}
      />

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
      />

      {/* Main Mail Box Floating Voice Assistant */}
      <VoiceMailboxHub
        emails={emails}
        selectedEmail={selectedEmail}
        userPreferences={preferences}
        onSendEmail={handleSubmitCustomEmail}
        onSendReply={handleSendVoiceReply}
        onSelectTab={(tab) => setActiveTab(tab)}
        onPlayTts={handlePlayTts}
        onSearch={(query) => setSearchQuery(query)}
      />
    </div>
  );
}
