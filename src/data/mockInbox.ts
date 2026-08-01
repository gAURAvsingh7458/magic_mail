import { Email, UserPreferences, AnalyticsData } from '../types';

export const INITIAL_PREFERENCES: UserPreferences = {
  userName: 'Gaurav Singh',
  userTitle: 'Head of Operations',
  userCompany: 'Apex Digital Inc.',
  defaultTone: 'executive',
  autoArchiveInfoOnly: false,
  vipDomains: ['apex.com', 'sequoia.com', 'stripe.com'],
  signature: 'Best regards,\nGaurav Singh | Head of Operations, Apex Digital',
  voiceSpeed: 1.0,
};

export const INITIAL_ANALYTICS: AnalyticsData = {
  totalTriaged: 48,
  timeSavedMinutes: 135, // ~2.25 hours saved
  highPriorityCount: 12,
  actionRequiredCount: 18,
  draftsSentCount: 29,
  averageResponseTimeMin: 4,
};

export const INITIAL_EMAILS: Email[] = [
  {
    id: 'email-1',
    sender: 'Elena Rostova',
    senderEmail: 'elena.r@sequoiacap.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    recipient: 'gaurav.singh@apexdigital.io',
    subject: 'URGENT: Series B Term Sheet Final Terms & Closing Timeline',
    body: `Hi Gaurav,

Our investment committee met this morning regarding the final closing conditions for Apex Digital's Series B round. 

We need your confirmation on two remaining clauses before 4:00 PM EST today:
1. The modified pro-rata participation rights in Clause 4.2.
2. Board seat allocation timing for Q4.

If these look good to you, our legal counsel is ready to release the final executable documents for signature. Please confirm if you can join a quick 10-minute sync at 2:30 PM EST or approve via return email.

Best,
Elena Rostova
Partner, Sequoia Capital`,
    timestamp: '10:14 AM',
    read: false,
    starred: true,
    archived: false,
    folder: 'inbox',
    priority: 'High',
    priorityScore: 98,
    category: 'Action Required',
    summary: 'Sequoia Partner requires urgent confirmation on two Series B term sheet clauses by 4:00 PM EST today to issue final closing documents.',
    keyPoints: [
      'Must confirm Clause 4.2 (pro-rata rights) & Q4 board seat timing',
      'Hard deadline today at 4:00 PM EST',
      'Option to approve via email reply or join 10-min sync at 2:30 PM EST'
    ],
    suggestedQuickReplies: [
      'Approve both clauses & proceed with signatures',
      'Confirm 2:30 PM EST sync to discuss details',
      'Request minor adjustment on Clause 4.2'
    ],
    aiDraft: `Hi Elena,

Thanks for the update. I have reviewed both points:
1. Clause 4.2 modified pro-rata rights are approved.
2. The Q4 board seat timing aligns with our executive board roadmap.

Please have legal forward the final executable documents. I look forward to finalizing the round.

Best regards,
Gaurav Singh`,
    sentiment: 'urgent',
    estimatedReadTime: '45 sec',
    tags: ['Series B', 'Legal', 'Investor', 'Urgent']
  },
  {
    id: 'email-2',
    sender: 'Marcus Chen',
    senderEmail: 'm.chen@apexdigital.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    recipient: 'gaurav.singh@apexdigital.io',
    subject: 'Production Infrastructure Alert: Database Connection Pool Spike',
    body: `Gaurav,

Our Cloud database connection pool hit 94% capacity at 09:45 AM due to a surge in API webhooks from the enterprise tier. 

Our DevOps team auto-scaled the database replicas, which stabilized latency, but we need to increase the default pool limit by 50% permanently to handle peak traffic safely.

This will increase monthly AWS infrastructure spend by roughly $320/month. Need your sign-off on the emergency infrastructure budget allocation so we can apply the terraform script.

Thanks,
Marcus Chen | Lead DevOps Engineer`,
    timestamp: '09:48 AM',
    read: false,
    starred: false,
    archived: false,
    folder: 'inbox',
    priority: 'High',
    priorityScore: 91,
    category: 'Action Required',
    summary: 'DevOps Lead requests budget sign-off ($320/mo) for permanent database pool expansion following a 94% capacity traffic spike.',
    keyPoints: [
      'Database connection pool spiked to 94% due to enterprise webhook traffic',
      'Temporary auto-scaling stabilized latency, but permanent fix requires $320/mo budget approval',
      'Requires quick sign-off to execute Terraform patch'
    ],
    suggestedQuickReplies: [
      'Approved: Proceed with Terraform deployment ($320/mo)',
      'Request brief cost breakdown before approving',
      'Approve provisionally for 30 days while analyzing webhooks'
    ],
    aiDraft: `Hi Marcus,

Emergency budget allocation of $320/month is approved. Please proceed with deploying the Terraform script to increase the pool limit and ensure infrastructure stability.

Let's review enterprise webhook load balancing during our Friday ops sync.

Best,
Gaurav`,
    sentiment: 'urgent',
    estimatedReadTime: '40 sec',
    tags: ['DevOps', 'Budget', 'Infrastructure', 'Alert']
  },
  {
    id: 'email-3',
    sender: 'Sarah Jenkins',
    senderEmail: 'sarah.j@acmecorp.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    recipient: 'gaurav.singh@apexdigital.io',
    subject: 'Acme Corp Annual SaaS Contract Renewal - Q3 Roadmap Questions',
    body: `Hi Gaurav,

Hope you are having a great week! 

Our annual enterprise subscription for Apex Digital is up for renewal next month (Sept 15). Overall, our team of 140 users is loving the platform.

Before signing the 2-year renewal agreement ($110k ARR), our VP of IT wanted to check on two product features:
1. Will custom SSO (SAML 2.0 / Okta) support roll out in Q3?
2. Can we add 20 additional seat licenses under our current tier discount?

Could we set up a 20-minute call this Thursday or Friday afternoon?

Warmly,
Sarah Jenkins
Director of Enterprise Procurement, Acme Corp`,
    timestamp: '08:30 AM',
    read: true,
    starred: true,
    archived: false,
    folder: 'inbox',
    priority: 'Medium',
    priorityScore: 82,
    category: 'Needs Reply',
    summary: 'Acme Corp procurement director asks about SSO roadmap and extra seats before renewing $110k annual enterprise contract next month.',
    keyPoints: [
      'Annual $110k contract up for renewal Sept 15',
      'Asks if SAML 2.0 / Okta SSO is launching in Q3',
      'Requests 20 additional seats at current tier discount',
      'Proposes 20-min call Thursday or Friday afternoon'
    ],
    suggestedQuickReplies: [
      'Confirm Q3 SSO delivery & offer call time Thursday at 2 PM',
      'Approve 20 seat discount & share renewal agreement',
      'Loop in Enterprise Account Executive to lead the call'
    ],
    aiDraft: `Hi Sarah,

Great to hear from you, and we're thrilled that your team of 140 is getting immense value from Apex Digital!

To answer your questions:
1. Yes, SAML 2.0 / Okta custom SSO is scheduled for our mid-Q3 release (late August).
2. We are happy to honor your current tier discount for the 20 additional seats.

I'm available for a 20-minute call this Thursday at 2:00 PM EST. Let know if that time works for you and I'll send over a calendar invite along with the updated contract draft.

Warm regards,
Gaurav Singh`,
    sentiment: 'positive',
    estimatedReadTime: '50 sec',
    tags: ['Sales', 'Renewal', 'Enterprise', '$110k ARR']
  },
  {
    id: 'email-4',
    sender: 'David Vance',
    senderEmail: 'd.vance@apexdigital.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    recipient: 'gaurav.singh@apexdigital.io',
    subject: 'Q3 Product Design Review & Feedback Summary',
    body: `Hey Gaurav,

Attached is the consolidated feedback deck from yesterday's product design review session with the design & engineering leads.

Key takeaways:
- Design system v2 components are 85% complete.
- Mobile accessibility compliance (WCAG 2.1 AA) achieved across all flow screens.
- User testing showed a 38% reduction in task completion time for the new navigation drawer.

No immediate action needed on your end, just sharing for awareness ahead of Monday's executive sync.

Cheers,
David Vance | VP of Product`,
    timestamp: 'Yesterday',
    read: true,
    starred: false,
    archived: false,
    folder: 'inbox',
    priority: 'Low',
    priorityScore: 35,
    category: 'FYI / Info',
    summary: 'VP of Product shares Q3 design review summary showing 38% faster navigation user testing results. No immediate action required.',
    keyPoints: [
      'Design system v2 is 85% ready',
      'WCAG 2.1 AA mobile compliance achieved',
      'User testing completion time improved by 38%',
      'Informational only ahead of Monday executive sync'
    ],
    suggestedQuickReplies: [
      'Thanks for the update, great progress!',
      'Acknowledged, see you Monday',
      'Looks fantastic, congratulations to the team'
    ],
    aiDraft: `Hi David,

Thanks for sharing! The 38% efficiency gain in user testing is impressive news. Kudos to the design and engineering team for achieving WCAG 2.1 AA compliance as well.

Looking forward to diving deeper during Monday's executive sync.

Best,
Gaurav`,
    sentiment: 'positive',
    estimatedReadTime: '30 sec',
    tags: ['Product', 'FYI', 'Design']
  },
  {
    id: 'email-5',
    sender: 'TechCrunch Events',
    senderEmail: 'events@techcrunch.com',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    recipient: 'gaurav.singh@apexdigital.io',
    subject: 'Early Bird Ticket Pricing Ending Soon: Disrupt 2026 Executive Summit',
    body: `Hello Executive,

Early bird ticket discounts for the upcoming TechCrunch Disrupt Executive Summit will expire in 48 hours. Connect with over 10,000 founders, VCs, and tech visionaries.

Click below to claim your 35% discount pass before prices increase on Friday midnight.`,
    timestamp: 'Jul 30',
    read: true,
    starred: false,
    archived: false,
    folder: 'spam',
    priority: 'Low',
    priorityScore: 5,
    category: 'Spam' as any,
    summary: 'Marketing promotional sale email. Automatically filtered into Spam folder.',
    keyPoints: [
      'Promotional ticket sale ending in 48 hours',
      '35% discount offer for conference'
    ],
    suggestedQuickReplies: [
      'Unsubscribe'
    ],
    aiDraft: `Promotional marketing email filtered into Spam.`,
    sentiment: 'neutral',
    estimatedReadTime: '15 sec',
    tags: ['Spam', 'Promotions']
  }
];
