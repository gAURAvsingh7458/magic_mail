import { ContactAlias } from '../types';

export const DEFAULT_CONTACT_ALIASES: ContactAlias[] = [
  { name: 'Boss', email: 'alex.vance@apexdigital.io' },
  { name: 'Alex', email: 'alex.vance@apexdigital.io' },
  { name: 'Mom', email: 'mom@family.com' },
  { name: 'Sarah', email: 'sarah.jenkins@designco.com' },
  { name: 'John', email: 'john.doe@techcorp.com' },
];

/**
 * Resolves a spoken or typed contact name/alias to an email address.
 * Matches case-insensitively against contact names.
 */
export function resolveContactEmail(
  query: string,
  contacts: ContactAlias[] = DEFAULT_CONTACT_ALIASES
): string | null {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase();

  // If already a valid email, return as is
  if (q.includes('@')) {
    return query.trim();
  }

  // Exact match on contact name
  const exact = contacts.find((c) => c.name.toLowerCase() === q);
  if (exact) return exact.email;

  // Word match or partial match (e.g. "email Boss", "send to Mom")
  const words = q.split(/\s+/);
  for (const c of contacts) {
    const cName = c.name.toLowerCase();
    if (words.includes(cName) || q.includes(cName)) {
      return c.email;
    }
  }

  return null;
}
