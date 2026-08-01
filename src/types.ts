export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type EmailCategory = 'Action Required' | 'Needs Reply' | 'Meeting Request' | 'FYI / Info' | 'Low Priority' | 'Spam';
export type SentimentType = 'urgent' | 'demanding' | 'positive' | 'neutral' | 'frustrated';
export type ResponseTone = 'professional' | 'concise' | 'friendly' | 'direct' | 'executive';

export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  avatar?: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  snoozed?: boolean;
  folder: 'inbox' | 'sent' | 'archive' | 'trash' | 'spam';
  
  // AI Triage Fields
  priority: PriorityLevel;
  priorityScore: number; // 0 to 100
  category: EmailCategory;
  summary: string;
  keyPoints: string[];
  suggestedQuickReplies: string[];
  aiDraft?: string;
  sentiment: SentimentType;
  estimatedReadTime: string; // e.g. "45 sec"
  tags: string[];
  triagedAt?: string;
  demotedFromHighPriority?: boolean;
}

export interface ContactAlias {
  name: string;
  email: string;
}

export interface UserPreferences {
  userName: string;
  userEmail?: string;
  userTitle: string;
  userCompany: string;
  defaultTone: ResponseTone;
  autoArchiveInfoOnly: boolean;
  vipDomains: string[];
  contactAliases?: ContactAlias[];
  signature: string;
  voiceSpeed: number;
}

export interface TriageResult {
  priority: PriorityLevel;
  priorityScore: number;
  category: EmailCategory;
  summary: string;
  keyPoints: string[];
  suggestedQuickReplies: string[];
  sentiment: SentimentType;
  estimatedReadTime: string;
  tags: string[];
}

export interface AnalyticsData {
  totalTriaged: number;
  timeSavedMinutes: number;
  highPriorityCount: number;
  actionRequiredCount: number;
  draftsSentCount: number;
  averageResponseTimeMin: number;
}
