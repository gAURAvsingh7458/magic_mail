import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { INITIAL_EMAILS, INITIAL_PREFERENCES, INITIAL_ANALYTICS } from './src/data/mockInbox';
import { Email, UserPreferences, AnalyticsData, PriorityLevel, EmailCategory, SentimentType, ResponseTone } from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT && !isNaN(Number(process.env.PORT)) ? Number(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory database store
let emailsStore: Email[] = [...INITIAL_EMAILS];
let preferencesStore: UserPreferences = { ...INITIAL_PREFERENCES };
let analyticsStore: AnalyticsData = { ...INITIAL_ANALYTICS };

// Gemini AI Client Helper (Lazy initialized or checked per request)
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in process.env');
  }
  return new GoogleGenAI({
    apiKey: apiKey || 'dummy-key-for-fallback',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient Gemini generator with fallback models to avoid 429 Quota Exceeded failures
async function safeGenerateContent(
  ai: GoogleGenAI,
  options: {
    models?: string[];
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = options.models || [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash',
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      if (response) return response;
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        console.log(`[Gemini Rate Limit 429] Model "${model}" quota reached, trying fallback model...`);
      } else {
        console.warn(`[Gemini Fallback] Call failed with model "${model}":`, errMsg);
      }
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate Gemini models failed');
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!process.env.GEMINI_API_KEY });
});

// GET all emails
app.get('/api/emails', (req, res) => {
  res.json(emailsStore);
});

// GET single email
app.get('/api/emails/:id', (req, res) => {
  const email = emailsStore.find((e) => e.id === req.params.id);
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }
  res.json(email);
});

// PATCH email status (read, starred, archived, folder)
app.patch('/api/emails/:id', (req, res) => {
  const id = req.params.id;
  const index = emailsStore.findIndex((e) => e.id === id);
  if (index === -1) {
    if (req.body) {
      const newEmail = { id, ...req.body } as Email;
      emailsStore.unshift(newEmail);
      return res.json(newEmail);
    }
    return res.status(200).json({ id, ...req.body });
  }
  emailsStore[index] = { ...emailsStore[index], ...req.body };
  res.json(emailsStore[index]);
});

// POST new email (Simulated incoming or user-created email)
app.post('/api/emails', async (req, res) => {
  try {
    const { sender, senderEmail, subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    const isVoiceOrSent = req.body.isSent || sender.includes(preferencesStore.userName);
    const newEmail: Email = {
      id: `email-${Date.now()}`,
      sender: sender || preferencesStore.userName || 'Gaurav Singh',
      senderEmail: senderEmail || `${preferencesStore.userName.toLowerCase().replace(/\s+/g, '.')}@apexdigital.io`,
      recipient: req.body.recipient || senderEmail || `${preferencesStore.userName.toLowerCase().replace(/\s+/g, '.')}@apexdigital.io`,
      subject,
      body,
      timestamp: 'Just now',
      read: true,
      starred: false,
      archived: false,
      folder: isVoiceOrSent ? 'sent' : 'inbox',
      priority: 'Medium',
      priorityScore: 50,
      category: 'FYI / Info',
      summary: `Sent email regarding "${subject}"`,
      keyPoints: ['Sent via Executive Voice Assistant'],
      suggestedQuickReplies: ['Follow up later'],
      sentiment: 'positive',
      estimatedReadTime: '30 sec',
      tags: isVoiceOrSent ? ['Sent', 'Voice Assistant'] : ['Incoming'],
    };

    // Auto-triage with Gemini immediately
    try {
      const triagedData = await performAiTriage(newEmail, preferencesStore);
      Object.assign(newEmail, triagedData);
      newEmail.read = true; // Ensure sent emails remain read
    } catch (err) {
      console.error('Failed to auto-triage incoming email:', err);
    }

    emailsStore.unshift(newEmail);
    analyticsStore.totalTriaged += 1;
    analyticsStore.draftsSentCount += 1;
    analyticsStore.timeSavedMinutes += 4; // ~4 mins saved per voice email sent

    res.status(201).json(newEmail);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create email' });
  }
});

// POST /api/emails/:id/triage -> Explicit AI Triage on an existing email
app.post('/api/emails/:id/triage', async (req, res) => {
  try {
    let email = emailsStore.find((e) => e.id === req.params.id);
    if (!email && req.body.email) {
      email = req.body.email;
    }
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const triagedResult = await performAiTriage(email, preferencesStore);

    const index = emailsStore.findIndex((e) => e.id === req.params.id);
    if (index !== -1) {
      emailsStore[index] = {
        ...email,
        ...triagedResult,
        triagedAt: new Date().toISOString(),
      };
      return res.json(emailsStore[index]);
    }

    res.json({ ...email, ...triagedResult, triagedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Triage error:', error);
    res.status(500).json({ error: error.message || 'AI Triage failed' });
  }
});

// POST /api/emails/:id/generate-reply -> Generate AI reply draft
app.post('/api/emails/:id/generate-reply', async (req, res) => {
  try {
    let email = emailsStore.find((e) => e.id === req.params.id);
    if (!email && req.body.email) {
      email = req.body.email;
    }
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const {
      quickReply,
      customInstruction,
      tone = preferencesStore.defaultTone,
      length = 'medium',
    } = req.body;

    const aiDraft = await generateAiReplyDraft(
      email,
      preferencesStore,
      quickReply,
      customInstruction,
      tone,
      length
    );

    // Save draft back to email record if present in store
    const index = emailsStore.findIndex((e) => e.id === req.params.id);
    if (index !== -1) {
      emailsStore[index].aiDraft = aiDraft;
    }

    analyticsStore.draftsSentCount += 1;
    analyticsStore.timeSavedMinutes += 4; // ~4 mins saved per draft

    res.json({ draft: aiDraft });
  } catch (error: any) {
    console.error('Draft generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate draft' });
  }
});

// POST /api/emails/tts -> Text-To-Speech endpoint using gemini-3.1-flash-tts-preview
app.post('/api/emails/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Puck' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ audioBase64: null, text });
    }

    const ai = getGeminiClient();
    const response = await safeGenerateContent(ai, {
      models: ['gemini-3.1-flash-tts-preview'],
      contents: [{ parts: [{ text: `Read clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({ audioBase64: null, text });
    }

    res.json({ audioBase64: base64Audio });
  } catch (error: any) {
    console.log('Gemini TTS rate limit or unavailable, seamlessly falling back to browser Web Speech API');
    res.json({ audioBase64: null, text: req.body.text });
  }
});

// POST /api/emails/:id/send-reply -> Send reply and record in server store
app.post('/api/emails/:id/send-reply', async (req, res) => {
  try {
    const { replyText, recipientEmail } = req.body;
    const index = emailsStore.findIndex((e) => e.id === req.params.id);
    if (index !== -1) {
      emailsStore[index] = {
        ...emailsStore[index],
        aiDraft: replyText,
        category: 'Needs Reply' as any,
        archived: true, // Archived out of active inbox triage once sent
        read: true,
      };
    }
    analyticsStore.draftsSentCount += 1;
    analyticsStore.timeSavedMinutes += 5;

    res.json({ success: true, message: `Email reply successfully sent to ${recipientEmail || 'recipient'}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record sent reply' });
  }
});


// POST /api/emails/voice-action -> Parse spoken voice command into structured mailbox action
app.post('/api/emails/voice-action', async (req, res) => {
  const { transcript, activeEmailId } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: 'Voice transcript required' });
  }

  const activeEmail = emailsStore.find((e) => e.id === activeEmailId);

  // Fallback intent parser function
  const getFallbackVoiceAction = () => {
    const lower = transcript.toLowerCase();
    if (lower.includes('high priority') || lower.includes('read high') || lower.includes('urgent')) {
      return {
        action: 'READ_HIGH_PRIORITY',
        filterTab: 'high',
        feedbackText: 'Reading high priority emails aloud...',
      };
    }
    if (lower.includes('send') && activeEmail && activeEmail.aiDraft) {
      return {
        action: 'DRAFT_AND_SEND_REPLY',
        feedbackText: `Sending draft response to ${activeEmail.sender}...`,
        targetEmailId: activeEmail.id,
        recipient: activeEmail.senderEmail,
        subject: `Re: ${activeEmail.subject}`,
        replyText: activeEmail.aiDraft,
      };
    }
    if (lower.includes('send') || lower.includes('mail to') || lower.includes('write')) {
      return {
        action: 'SEND_NEW_EMAIL',
        feedbackText: `Drafting new email from voice input...`,
        recipient: 'recipient@example.com',
        subject: `Voice Note: ${transcript.slice(0, 30)}...`,
        body: transcript,
      };
    }
    if (lower.includes('read') || lower.includes('summarize')) {
      return {
        action: 'READ_EMAIL',
        feedbackText: activeEmail ? `Summary: ${activeEmail.summary}` : 'No email selected to read.',
        targetEmailId: activeEmail?.id,
      };
    }
    return {
      action: 'FILTER_INBOX',
      query: transcript,
      feedbackText: `Filtering inbox for "${transcript}"`,
    };
  };

  if (!process.env.GEMINI_API_KEY) {
    return res.json(getFallbackVoiceAction());
  }

  try {
    const ai = getGeminiClient();
    const contactDirectory = (preferencesStore.contactAliases || [])
      .map((c) => `${c.name}: <${c.email}>`)
      .join(', ');

    const prompt = `You are an executive voice assistant for an AI Mail Box app.
User spoken input: "${transcript}"
Current selected email: ${activeEmail ? `From ${activeEmail.sender} (<${activeEmail.senderEmail}>), Subject: "${activeEmail.subject}", Draft: "${activeEmail.aiDraft || 'None'}"` : 'None'}
User Saved Contact Directory (Map spoken alias names like Boss/Mom/Alex to these exact email addresses): [${contactDirectory}]

Determine the intended mailbox action and return structured JSON:
Actions possible:
- "SEND_NEW_EMAIL": User wants to compose/send a new email to someone. Extract "recipient" (use exact email address if alias matched, or name), "subject" line, and full "body" content.
- "DRAFT_AND_SEND_REPLY": User wants to reply to selected/named email. Return "recipient", "subject", and "replyText".
- "READ_HIGH_PRIORITY": User wants to read/listen to high priority or urgent emails.
- "READ_EMAIL": User wants to listen to current/selected email summary or details.
- "ARCHIVE_EMAIL": User wants to archive/delete current email.
- "FILTER_INBOX": User wants to filter/search inbox (e.g. "show action required", "show high priority"). Return filterTab ("inbox" | "high" | "action" | "needs_reply" | "fyi" | "starred" | "archive") or query.

JSON Schema required:
{
  "action": "SEND_NEW_EMAIL" | "DRAFT_AND_SEND_REPLY" | "READ_HIGH_PRIORITY" | "READ_EMAIL" | "ARCHIVE_EMAIL" | "FILTER_INBOX" | "UNKNOWN",
  "feedbackText": "Short clear spoken response confirming the action",
  "recipient": "extracted recipient email or alias name (e.g. 'alex.vance@apexdigital.io' or 'Boss')",
  "subject": "clean email subject line",
  "body": "full polished email body if composing new email",
  "replyText": "suggested reply text if drafting reply",
  "filterTab": "inbox | high | action | needs_reply | fyi | starred | archive"
}`;

    const response = await safeGenerateContent(ai, {
      models: ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'],
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.warn('Voice action Gemini call failed, using fallback parser:', error?.message || error);
    res.json(getFallbackVoiceAction());
  }
});

// POST /api/emails/voice-compose -> Convert raw voice speech into polished email draft
app.post('/api/emails/voice-compose', async (req, res) => {
  const { transcript, recipientName } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: 'Voice transcript required' });
  }

  const fallbackCompose = {
    subject: `Quick message re: ${transcript.slice(0, 30)}...`,
    body: `Hi ${recipientName || 'there'},\n\n${transcript}\n\nBest regards,\n${preferencesStore.userName}`,
  };

  if (!process.env.GEMINI_API_KEY) {
    return res.json(fallbackCompose);
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Convert the following raw spoken voice recording into a clean, highly professional, executive email.
RAW VOICE TRANSCRIPT: "${transcript}"
RECIPIENT HINT: "${recipientName || 'Unspecified'}"
USER SENDER: ${preferencesStore.userName} (${preferencesStore.userTitle} at ${preferencesStore.userCompany})

Return JSON:
{
  "recipientEmail": "guessed or extracted email address if spoken, else empty",
  "subject": "Concise, professional email subject line",
  "body": "Complete, polished professional email body with greeting, clear paragraphs, and signature"
}`;

    const response = await safeGenerateContent(ai, {
      models: ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'],
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.warn('Voice compose Gemini call failed, using fallback:', error?.message || error);
    res.json(fallbackCompose);
  }
});

// GET /api/preferences & PUT /api/preferences
app.get('/api/preferences', (req, res) => {
  res.json(preferencesStore);
});

app.put('/api/preferences', (req, res) => {
  preferencesStore = { ...preferencesStore, ...req.body };
  res.json(preferencesStore);
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json(analyticsStore);
});

// -------------------------------------------------------------
// HELPER FUNCTIONS FOR GEMINI AI
// -------------------------------------------------------------

async function performAiTriage(email: Email, prefs: UserPreferences) {
  const isSpamOrPromo = (subj: string, body: string, senderEmail: string) => {
    const text = `${subj} ${body} ${senderEmail}`.toLowerCase();
    const spamKeywords = [
      'sale ending soon', 'sale ends', 'limited time offer', 'discount', 'early bird',
      'special price', 'special offer', 'buy now', '35% off', '50% off', 'free trial',
      'promo code', 'promotional', 'clearance', 'unsubscribe', 'pricing ending',
      'rate ends', 'rates increase', 'save big', 'exclusive deal', 'claim your pass',
      'ticket pricing'
    ];
    return spamKeywords.some((kw) => text.includes(kw));
  };

  const fallbackTriage = () => {
    if (isSpamOrPromo(email.subject, email.body, email.senderEmail)) {
      return {
        priority: 'Low' as PriorityLevel,
        priorityScore: 5,
        category: 'Spam' as EmailCategory,
        folder: 'spam' as const,
        summary: `Promotional marketing email regarding "${email.subject}". Filtered into Spam.`,
        keyPoints: ['Sales promotion / marketing offer', 'Filtered out of High Priority & Inbox'],
        suggestedQuickReplies: ['Unsubscribe'],
        sentiment: 'neutral' as SentimentType,
        estimatedReadTime: '15 sec',
        tags: ['Spam', 'Promotions'],
      };
    }

    const isUrgent = email.subject.toUpperCase().includes('URGENT') || email.body.toUpperCase().includes('ASAP');
    return {
      priority: (isUrgent ? 'High' : 'Medium') as PriorityLevel,
      priorityScore: isUrgent ? 92 : 60,
      category: (isUrgent ? 'Action Required' : 'Needs Reply') as EmailCategory,
      folder: 'inbox' as const,
      summary: `Email regarding "${email.subject}". Requires review by ${prefs.userName}.`,
      keyPoints: ['Review email message body', 'Prepare appropriate response'],
      suggestedQuickReplies: ['Acknowledge receipt', 'Schedule follow up call', 'Approve proposal'],
      sentiment: 'neutral' as SentimentType,
      estimatedReadTime: '45 sec',
      tags: ['Triage'],
    };
  };

  if (isSpamOrPromo(email.subject, email.body, email.senderEmail)) {
    return fallbackTriage();
  }

  if (!process.env.GEMINI_API_KEY) {
    return fallbackTriage();
  }

  try {
    const ai = getGeminiClient();

    const prompt = `You are an elite executive AI email triage assistant for ${prefs.userName} (${prefs.userTitle} at ${prefs.userCompany}).
Analyze the following email and return a structured JSON response.

EMAIL SUBJECT: "${email.subject}"
SENDER: "${email.sender}" <${email.senderEmail}>
BODY:
"""
${email.body}
"""

Instructions for Triage:
1. "priority": Determine priority level ('High', 'Medium', 'Low'). High = urgent deadlines, investor/legal/board issues, customer outages, major deals ($50k+). Medium = routine team requests, project updates. Low = newsletters, marketing, FYIs.
2. "priorityScore": Integer from 0 to 100 representing urgency & business impact.
3. "category": Pick best from ('Action Required', 'Needs Reply', 'Meeting Request', 'FYI / Info', 'Low Priority').
4. "summary": Executive 1 to 2 sentence summary highlighting WHO wants WHAT and WHEN. Do NOT include phrases like "See the email below", "The email is...", "Here is a summary", or any markdown symbols (*, #, _, \`). Return clean, direct plain text.
5. "keyPoints": Array of 2 to 4 bullet points of essential facts or action items without markdown symbols.
6. "suggestedQuickReplies": Array of 3 short, contextually specific, one-tap reply phrases tailored directly to the email content (e.g. "Approve budget request", "Reschedule to Friday at 2 PM", "Request additional details").
7. "sentiment": Pick best from ('urgent', 'demanding', 'positive', 'neutral', 'frustrated').
8. "estimatedReadTime": e.g., "30 sec" or "1 min".
9. "tags": Array of 2 to 4 relevant keyword tags (e.g., ["Legal", "Series B", "Deadline"]).`;

    const response = await safeGenerateContent(ai, {
      models: ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.STRING, description: 'High, Medium, or Low' },
            priorityScore: { type: Type.INTEGER, description: '0 to 100' },
            category: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedQuickReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            sentiment: { type: Type.STRING },
            estimatedReadTime: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'priority',
            'priorityScore',
            'category',
            'summary',
            'keyPoints',
            'suggestedQuickReplies',
            'sentiment',
            'estimatedReadTime',
            'tags',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    let rawSummary = (parsed.summary || `Message regarding ${email.subject}`).trim();
    rawSummary = rawSummary
      .replace(/^(see the (actual )?email (below|here)|here is a summary|this email is about|the email states that|summary:)\s*/i, '')
      .replace(/[*#_~`]/g, '')
      .trim();

    const cleanKeyPoints = (parsed.keyPoints || []).map((kp: string) =>
      kp.replace(/[*#_~`]/g, '').replace(/^(see the email|actual email)\s*/i, '').trim()
    ).filter(Boolean);

    return {
      priority: (parsed.priority || 'Medium') as PriorityLevel,
      priorityScore: Number(parsed.priorityScore) || 50,
      category: (parsed.category || 'Needs Reply') as EmailCategory,
      summary: rawSummary,
      keyPoints: cleanKeyPoints.length > 0 ? cleanKeyPoints : [`Reviewed message regarding "${email.subject}"`],
      suggestedQuickReplies: parsed.suggestedQuickReplies || ['Acknowledge email'],
      sentiment: (parsed.sentiment || 'neutral') as SentimentType,
      estimatedReadTime: parsed.estimatedReadTime || '1 min',
      tags: parsed.tags || ['Inbound'],
    };
  } catch (err: any) {
    console.warn('AI Triage Gemini call failed, using fallback triage:', err?.message || err);
    return fallbackTriage();
  }
}

async function generateAiReplyDraft(
  email: Email,
  prefs: UserPreferences,
  quickReply?: string,
  customInstruction?: string,
  tone: ResponseTone = 'executive',
  length: string = 'medium'
): Promise<string> {
  const senderName = (email?.sender || '').trim().split(' ')[0] || 'there';
  const emailSubject = email?.subject || 'your message';
  const userSignature = prefs?.signature || '';
  const fallbackDraft = `Hi ${senderName},\n\nThank you for reaching out regarding "${emailSubject}". ${quickReply || 'I have received your message and will review it shortly.'}\n\n${userSignature}`;

  if (!process.env.GEMINI_API_KEY) {
    return fallbackDraft;
  }

  try {
    const ai = getGeminiClient();

    const prompt = `You are composing an email reply on behalf of ${prefs.userName}, ${prefs.userTitle} at ${prefs.userCompany}.

INCOMING EMAIL DETAILS:
- From: ${email.sender} <${email.senderEmail}>
- Subject: ${email.subject}
- Content: "${email.body}"

USER GOAL / QUICK REPLY INTENT: "${quickReply || 'Provide appropriate professional response'}"
ADDITIONAL USER INSTRUCTIONS: "${customInstruction || 'None'}"
DESIRED TONE: ${tone} (e.g. executive, concise, friendly, direct, professional)
DESIRED LENGTH: ${length}

REQUIREMENTS:
1. Write ONLY the email body response (do not include Subject line or metadata headers).
2. Write directly as ${prefs.userName}.
3. Match tone (${tone}). If concise, keep under 4 sentences.
4. MUST conclude with this exact user signature and sign-off name (${prefs.userName}). DO NOT use any other name (such as Alex Rivera or generic placeholders):\n${prefs.signature}`;

    const response = await safeGenerateContent(ai, {
      models: ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'],
      contents: prompt,
    });

    return response.text?.trim() || fallbackDraft;
  } catch (err: any) {
    console.warn('AI Reply Draft call failed, using fallback draft:', err?.message || err);
    return fallbackDraft;
  }
}

// -------------------------------------------------------------
// VITE / STATIC SERVING PIPELINE
// -------------------------------------------------------------

async function startServer() {
  try {
    const distPath = path.join(process.cwd(), 'dist');
    const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

    if (process.env.NODE_ENV === 'production' || hasDist) {
      console.log(`[Email Triage AI] Serving production build from ${distPath}`);
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.log('[Email Triage AI] Starting Vite dev middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Email Triage AI] Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Email Triage AI] Failed to start server:', err);
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error('[Email Triage AI] Unhandled error during server startup:', err);
  process.exit(1);
});
