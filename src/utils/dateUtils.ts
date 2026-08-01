import { Email } from '../types';

/**
 * Helper to check if an email is from the last 5 days
 */
export function isWithinLast5Days(email: Email): boolean {
  if (!email) return false;
  if (email.demotedFromHighPriority) return false;

  const ts = email.timestamp || '';
  const lower = ts.toLowerCase().trim();

  // Fresh / Today / Relative time strings
  if (
    lower === 'just now' ||
    lower.includes('today') ||
    lower.includes('yesterday') ||
    lower.includes('am') ||
    lower.includes('pm') ||
    lower.includes('min') ||
    lower.includes('hour') ||
    lower.includes('sec')
  ) {
    return true;
  }

  // Check "X days ago" string pattern
  const daysAgoMatch = lower.match(/(\d+)\s*day/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    return days <= 5;
  }

  // Check if timestamp is ISO string or standard parseable date
  const parsedTime = Date.parse(ts) || (email.triagedAt ? Date.parse(email.triagedAt) : NaN);
  if (!isNaN(parsedTime)) {
    const diffMs = Date.now() - parsedTime;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 5;
  }

  // Check month dates like "Jul 30" or "Aug 01" assuming current year
  const currentYear = new Date().getFullYear();
  const parsedMonthDate = Date.parse(`${ts}, ${currentYear}`);
  if (!isNaN(parsedMonthDate)) {
    const diffMs = Date.now() - parsedMonthDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 5;
  }

  // Default to true if created recently without parseable date
  return true;
}
