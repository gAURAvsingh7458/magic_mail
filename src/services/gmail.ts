import { Email, PriorityLevel, EmailCategory, SentimentType } from '../types';

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

function decodeBase64Url(input: string): string {
  try {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    return 'Content could not be decoded.';
  }
}

function extractBody(part: GmailMessagePart): string {
  if (part.body && part.body.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
    const text = decodeBase64Url(part.body.data);
    return text.replace(/<[^>]*>?/gm, ''); // strip HTML tags for clean text
  }
  if (part.parts && part.parts.length) {
    for (const subPart of part.parts) {
      const result = extractBody(subPart);
      if (result) return result;
    }
  }
  return '';
}

export async function fetchLiveGmailMessages(accessToken: string, maxResults = 15): Promise<Email[]> {
  try {
    let listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listRes.ok) {
      listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    }

    if (!listRes.ok) {
      const err = await listRes.json();
      throw new Error(err.error?.message || 'Failed to list Gmail messages');
    }

    const listData = await listRes.json();
    if (!listData.messages || !Array.isArray(listData.messages) || listData.messages.length === 0) {
      return [];
    }

    const emailPromises = listData.messages.map(async (msgItem: { id: string }) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!msgRes.ok) return null;
        const msg = await msgRes.json();

        const headers: GmailHeader[] = msg.payload?.headers || [];
        const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject');
        const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from');
        const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date');

        let senderName = 'Unknown Sender';
        let senderEmail = 'unknown@domain.com';

        if (fromHeader && fromHeader.value) {
          const match = fromHeader.value.match(/(.*?)\s*<([^>]+)>/);
          if (match) {
            senderName = match[1].replace(/^"|"$/g, '').trim() || match[2];
            senderEmail = match[2];
          } else {
            senderName = fromHeader.value;
            senderEmail = fromHeader.value;
          }
        }

        let body = extractBody(msg.payload) || msg.snippet || 'No email body content available.';
        body = body.trim();

        const rawDate = dateHeader ? new Date(dateHeader.value) : new Date();
        const formattedTime = isNaN(rawDate.getTime())
          ? 'Just now'
          : rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const priority: PriorityLevel = msg.labelIds?.includes('IMPORTANT') ? 'High' : 'Medium';
        const category: EmailCategory = 'Action Required';

        const email: Email = {
          id: msg.id,
          sender: senderName,
          senderEmail: senderEmail,
          recipient: 'me',
          subject: subjectHeader?.value || '(No Subject)',
          body: body,
          timestamp: formattedTime,
          read: !msg.labelIds?.includes('UNREAD'),
          starred: msg.labelIds?.includes('STARRED') || false,
          archived: !msg.labelIds?.includes('INBOX'),
          folder: 'inbox',
          priority: priority,
          priorityScore: priority === 'High' ? 88 : 55,
          category: category,
          summary: msg.snippet || body.slice(0, 120) + '...',
          keyPoints: [
            `Received email from ${senderName}`,
            `Subject: ${subjectHeader?.value || 'No Subject'}`,
          ],
          suggestedQuickReplies: [
            'Thank you for the update, will review shortly.',
            'Acknowledged, let us schedule a time to discuss.',
            'Thanks! I have received this and will follow up.',
          ],
          aiDraft: `Hi ${senderName},\n\nThank you for reaching out regarding "${subjectHeader?.value || 'your email'}". I have received your message and will review it in detail shortly.\n\nBest regards`,
          sentiment: 'neutral',
          estimatedReadTime: `${Math.max(1, Math.ceil(body.split(' ').length / 180))} min`,
          tags: ['Live Gmail', 'Inbox'],
        };

        return email;
      } catch (e) {
        console.error('Error decoding message item:', e);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    return results.filter((e): e is Email => e !== null);
  } catch (err: any) {
    console.error('Error fetching live Gmail messages:', err);
    throw err;
  }
}

export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ];

  const emailRaw = emailLines.join('\r\n');
  const base64Encoded = btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Encoded,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'Failed to send Gmail message');
  }
}

export async function archiveGmailMessage(accessToken: string, messageId: string): Promise<void> {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      removeLabelIds: ['INBOX'],
    }),
  });
}
