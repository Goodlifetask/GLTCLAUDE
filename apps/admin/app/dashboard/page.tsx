'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '../../components/AdminSidebar';
import { adminApi, AdminStats, AdminUser, UserRole, CountryItem } from '../../lib/api';

// ── DATA ──
const USERS = [
  { n: 'Sarah Mitchell', e: 'sarah@gmail.com', p: 'Pro', c: '🇺🇸 US', r: 142, j: 'Jan 15', s: 'active', av: '#6366f1' },
  { n: 'James Kowalski', e: 'james.k@outlook.com', p: 'Free', c: '🇵🇱 PL', r: 28, j: 'Feb 3', s: 'active', av: '#f59e0b' },
  { n: 'Yuki Tanaka', e: 'yuki@yahoo.co.jp', p: 'Pro', c: '🇯🇵 JP', r: 204, j: 'Feb 10', s: 'active', av: '#8b5cf6' },
  { n: 'Omar Hassan', e: 'omar.h@company.ae', p: 'Free', c: '🇦🇪 AE', r: 15, j: 'Feb 18', s: 'pending', av: '#3b82f6' },
  { n: 'Elena Vasquez', e: 'evasquez@mail.mx', p: 'Pro', c: '🇲🇽 MX', r: 88, j: 'Feb 19', s: 'active', av: '#10b981' },
  { n: 'Tomasz Berg', e: 'tberg@email.de', p: 'Free', c: '🇩🇪 DE', r: 5, j: 'Feb 21', s: 'inactive', av: '#ef4444' },
  { n: 'Anya Sharma', e: 'anya.s@proton.me', p: 'Pro', c: '🇮🇳 IN', r: 310, j: 'Feb 22', s: 'active', av: '#f59e0b' },
  { n: 'Lucas Ferreira', e: 'lferreira@br.net', p: 'Free', c: '🇧🇷 BR', r: 47, j: 'Feb 25', s: 'active', av: '#6366f1' },
  { n: 'Chloé Dubois', e: 'cdubois@laposte.fr', p: 'Free', c: '🇫🇷 FR', r: 22, j: 'Feb 26', s: 'pending', av: '#8b5cf6' },
  { n: 'Erik Lindström', e: 'erik@mail.se', p: 'Pro', c: '🇸🇪 SE', r: 175, j: 'Feb 27', s: 'active', av: '#10b981' },
];

const LOGS = [
  { t: '09:41', ty: 'ok', m: 'Notification batch delivered successfully — 48,200 reminders sent' },
  { t: '09:38', ty: 'info', m: 'User #18420 connected Google Calendar — bidirectional sync enabled' },
  { t: '09:35', ty: 'info', m: 'Alexa Skill invoked — 142 voice reminders created this hour' },
  { t: '09:30', ty: 'ok', m: 'Scheduled backup completed — 4.2 GB archived to S3' },
  { t: '09:28', ty: 'warn', m: 'AdMob interstitial timeout for 3 Android users — retrying automatically' },
  { t: '09:25', ty: 'info', m: 'New Pro subscription — sarah.m@gmail.com · Stripe charge: $9.99' },
  { t: '09:20', ty: 'ok', m: 'FCM token refresh complete — 22,410 devices updated' },
  { t: '09:18', ty: 'err', m: 'Outlook OAuth token expired for 38 users — re-authentication required' },
  { t: '09:15', ty: 'info', m: 'Siri Shortcut donated by 28 new iOS users today' },
  { t: '09:12', ty: 'ok', m: 'Database replication lag: 4ms (healthy threshold: <50ms)' },
  { t: '09:10', ty: 'info', m: 'A/B test started — Notification copy variant B deployed to 5% of users' },
  { t: '09:07', ty: 'warn', m: 'BullMQ queue depth: 4,200 — auto-scaling workers triggered' },
  { t: '09:05', ty: 'ok', m: 'CDN cache invalidated — new theme assets deployed globally via Cloudflare' },
  { t: '09:01', ty: 'info', m: 'Google Assistant Actions heartbeat — all intents responding normally' },
  { t: '08:59', ty: 'ok', m: 'API rate limit healthy — P99 latency: 47ms · P50: 12ms' },
];

const THEMES = [
  { n: 'Light Professional', t: 'Light', c: ['#f8f9fb', '#6366f1', '#f59e0b'], a: true },
  { n: 'Dark Precision', t: 'Dark', c: ['#0f172a', '#6366f1', '#f59e0b'], a: false },
  { n: 'Ocean Blue', t: 'Light', c: ['#eff6ff', '#3b82f6', '#10b981'], a: false },
  { n: 'Emerald Green', t: 'Light', c: ['#f0fdf4', '#10b981', '#6366f1'], a: false },
  { n: 'Midnight', t: 'Dark', c: ['#030712', '#8b5cf6', '#f59e0b'], a: false },
  { n: 'Warm Amber', t: 'Light', c: ['#fffbeb', '#f59e0b', '#ef4444'], a: false },
];

const LANGS = [
  { f: '🇺🇸', n: 'English', code: 'en', p: 100 },
  { f: '🇪🇸', n: 'Spanish', code: 'es', p: 98 },
  { f: '🇩🇪', n: 'German', code: 'de', p: 97 },
  { f: '🇫🇷', n: 'French', code: 'fr', p: 96 },
  { f: '🇵🇹', n: 'Portuguese', code: 'pt', p: 95 },
  { f: '🇯🇵', n: 'Japanese', code: 'ja', p: 92 },
  { f: '🇨🇳', n: 'Chinese (Simplified)', code: 'zh', p: 90 },
  { f: '🇦🇪', n: 'Arabic (RTL)', code: 'ar', p: 88 },
  { f: '🇷🇺', n: 'Russian', code: 'ru', p: 94 },
  { f: '🇮🇳', n: 'Hindi', code: 'hi', p: 82 },
  { f: '🇮🇹', n: 'Italian', code: 'it', p: 96 },
  { f: '🇰🇷', n: 'Korean', code: 'ko', p: 89 },
];

const SYSCATS = [
  { n: 'Work', c: '#6366f1', i: '💼', cnt: 8420 },
  { n: 'Personal', c: '#f59e0b', i: '🏠', cnt: 12300 },
  { n: 'Health', c: '#10b981', i: '🏥', cnt: 5840 },
  { n: 'Finance', c: '#3b82f6', i: '💰', cnt: 3210 },
  { n: 'Family', c: '#8b5cf6', i: '👨‍👩‍👧', cnt: 4120 },
  { n: 'Travel', c: '#ef4444', i: '✈️', cnt: 1840 },
  { n: 'Shopping', c: '#f59e0b', i: '🛍', cnt: 6320 },
  { n: 'Education', c: '#6366f1', i: '📚', cnt: 2840 },
];

const CUSTCATS = [
  { n: 'Gym Routine', c: '#10b981', i: '💪', cnt: 420 },
  { n: 'Medication', c: '#ef4444', i: '💊', cnt: 180 },
  { n: 'Investments', c: '#f59e0b', i: '📈', cnt: 95 },
];

const INTEGS = {
  cal: [
    { n: 'Google Calendar', i: '📅', bg: '#f0f7ff', s: 'connected', u: '18,420', d: 'Two-way sync via Google Calendar API v3' },
    { n: 'Microsoft Outlook', i: '📘', bg: '#eff6ff', s: 'connected', u: '4,210', d: 'Full Microsoft Graph API calendar integration' },
    { n: 'Apple Calendar', i: '📆', bg: '#f8f9fb', s: 'connected', u: '6,830', d: 'iCloud Calendar — CalDAV sync for iOS and macOS' },
    { n: 'Notion', i: '⬛', bg: '#f8f9fb', s: 'available', u: '—', d: 'Sync tasks and reminders to Notion databases' },
  ],
  email: [
    { n: 'Gmail', i: '✉️', bg: '#fff5f5', s: 'connected', u: '12,440', d: 'Create reminders from starred or labelled emails' },
    { n: 'Outlook Mail', i: '📧', bg: '#eff6ff', s: 'connected', u: '3,810', d: 'Microsoft Graph API with Teams notification support' },
    { n: 'Apple Mail', i: '💌', bg: '#f8f9fb', s: 'available', u: '—', d: 'iOS extension to create reminders from any email' },
    { n: 'ProtonMail', i: '🔒', bg: '#f5f3ff', s: 'available', u: '—', d: 'End-to-end encrypted email reminder creation' },
  ],
  voice: [
    { n: 'Amazon Alexa', i: '🔵', bg: '#eff6ff', s: 'connected', u: '2,840', d: 'Alexa Skills Kit — GoodLifeTask Skill v2.1' },
    { n: 'Google Assistant', i: '🎙', bg: '#f0fdf4', s: 'connected', u: '4,120', d: 'Google Actions for voice reminder creation' },
    { n: 'Apple Siri', i: '🍎', bg: '#f8f9fb', s: 'connected', u: '5,630', d: 'SiriKit Intents integration (iOS 14+)' },
    { n: 'Microsoft Cortana', i: '🪟', bg: '#eff6ff', s: 'config', u: '—', d: 'Windows and Office 365 voice assistant' },
  ],
  other: [
    { n: 'Zapier', i: '⚡', bg: '#fff7ed', s: 'connected', u: '820', d: 'Connect to 5,000+ apps with no code required' },
    { n: 'IFTTT', i: '🔗', bg: '#f0fdf4', s: 'available', u: '—', d: 'If This Then That automation workflows' },
    { n: 'Slack', i: '💬', bg: '#fdf4ff', s: 'connected', u: '1,240', d: 'Send reminder notifications to Slack channels' },
    { n: 'Telegram Bot', i: '✈️', bg: '#eff6ff', s: 'available', u: '—', d: 'Receive reminders via your Telegram bot' },
  ],
};

const VOICES = [
  { n: 'Amazon Alexa', i: '🔵', bg: '#dbeafe', s: 'connected', cmd: '"Alexa, ask GoodLifeTask to remind me to call John at 3pm"', u: '2,840', sk: 'GoodLifeTask Skill v2.1' },
  { n: 'Google Assistant', i: '🎙', bg: '#dcfce7', s: 'connected', cmd: '"Hey Google, use GoodLifeTask to remind me about my meeting tomorrow"', u: '4,120', sk: 'GoodLifeTask Actions' },
  { n: 'Apple Siri', i: '🍎', bg: '#f1f5f9', s: 'connected', cmd: '"Hey Siri, remind me using GoodLifeTask to pick up groceries tonight"', u: '5,630', sk: 'SiriKit Intents (iOS 14+)' },
  { n: 'Microsoft Cortana', i: '🪟', bg: '#dbeafe', s: 'config', cmd: '"Hey Cortana, create a GoodLifeTask reminder for tomorrow at 9am"', u: '—', sk: 'Setup Required — see documentation' },
];

const WADZONES = [
  { l: 'Sidebar Right', sz: '300×250', s: 'active', r: '$420' },
  { l: 'Banner Top', sz: '728×90', s: 'active', r: '$310' },
  { l: 'Below Header', sz: '970×90', s: 'active', r: '$180' },
  { l: 'Between Items', sz: '300×600', s: 'paused', r: '—' },
  { l: 'Above Footer', sz: '728×90', s: 'active', r: '$95' },
  { l: 'Upgrade Prompt', sz: 'Full Width', s: 'active', r: '$235' },
];

const ADMOBUNITS = [
  { ty: 'Banner', id: 'ca-app-pub-8420/1001', plt: 'Android + iOS', cpm: '$1.20', s: 'active' },
  { ty: 'Interstitial', id: 'ca-app-pub-8420/2001', plt: 'Android + iOS', cpm: '$4.80', s: 'active' },
  { ty: 'Rewarded Video', id: 'ca-app-pub-8420/3001', plt: 'Android + iOS', cpm: '$8.40', s: 'paused' },
  { ty: 'Native App Install', id: 'ca-app-pub-8420/4001', plt: 'Android', cpm: '$3.20', s: 'active' },
];

const APIKEYS = [
  { n: 'Mobile App — iOS', k: 'sk_live_GLT••••••ios', sc: 'read,write:reminders', cr: 'Jan 10', lu: '2 hrs ago', s: 'active' },
  { n: 'Mobile App — Android', k: 'sk_live_GLT••••••and', sc: 'read,write:reminders', cr: 'Jan 10', lu: '5 min ago', s: 'active' },
  { n: 'Google Calendar Webhook', k: 'sk_live_GLT••••••gcal', sc: 'webhooks:calendar', cr: 'Feb 1', lu: '10 min ago', s: 'active' },
  { n: 'Zapier Integration', k: 'sk_live_GLT••••••zap', sc: 'read:all', cr: 'Feb 14', lu: '3 days ago', s: 'active' },
  { n: 'Analytics Export', k: 'sk_live_GLT••••••exp', sc: 'read:analytics', cr: 'Feb 20', lu: 'Never', s: 'inactive' },
];

const BACKUPS = [
  { id: 'BK-20250227-0930', tm: 'Feb 27, 2025 · 09:30', sz: '4.2 GB', ty: 'Automatic', loc: 'AWS S3', s: 'success' },
  { id: 'BK-20250227-0330', tm: 'Feb 27, 2025 · 03:30', sz: '4.1 GB', ty: 'Automatic', loc: 'AWS S3', s: 'success' },
  { id: 'BK-20250226-1530', tm: 'Feb 26, 2025 · 15:30', sz: '4.0 GB', ty: 'Manual', loc: 'AWS S3', s: 'success' },
  { id: 'BK-20250225-0930', tm: 'Feb 25, 2025 · 09:30', sz: '3.9 GB', ty: 'Automatic', loc: 'AWS S3', s: 'success' },
];

const PLANS = [
  { n: 'Free', pr: '$0', u: '21,621', badge: '', f: ['20 active reminders', 'Call & Task types', 'Push notifications', 'Basic themes', 'Standard support'] },
  { n: 'Pro', pr: '$9.99', u: '2,840', badge: 'Most Popular', f: ['Unlimited reminders', 'All reminder types', 'Email reminders', 'Custom themes', 'All integrations', 'Priority support', 'Advanced analytics'] },
  { n: 'Family', pr: '$14.99', u: '128', badge: '', f: ['Everything in Pro', 'Up to 6 family members', 'Shared family reminders', 'Assign tasks to members', 'Family activity feed', 'Child-safe mode'] },
  { n: 'Team', pr: '$24.99', u: '370', badge: '', f: ['Everything in Pro', 'Up to 10 team members', 'Workspaces & projects', 'Task assignment & tracking', 'Team analytics dashboard', 'API access', 'Dedicated account manager'] },
];

const ROLES_DATA = ['Super Admin', 'Administrator', 'Moderator', 'Support Agent', 'Read-Only'];
const PERMS = ['User Management', 'Reminders', 'Categories', 'Themes', 'Languages', 'Ad Manager', 'Analytics', 'Settings', 'Billing', 'API Keys', 'Integrations'];

// User-facing roles with responsibilities and background task permissions
const USER_ROLES_DATA = [
  {
    key: 'user', label: 'User', icon: '👤', color: '#6b7280',
    responsibilities: [
      'Create & manage own reminders',
      'Access personal dashboard',
      'Configure notification preferences',
      'Use calendar & email integrations',
    ],
    bgTasks: [] as string[],
    permissions: { api: false, teamManage: false, batchOps: false, analytics: false, webhooks: false },
  },
  {
    key: 'moderator', label: 'Moderator', icon: '🛡️', color: '#8b5cf6',
    responsibilities: [
      'Review & action user-reported content',
      'Temporarily suspend abusive accounts',
      'Access the moderation queue dashboard',
      'Issue warnings & escalate to admin',
    ],
    bgTasks: ['Content review queue processing', 'Automated flagging rule execution'],
    permissions: { api: false, teamManage: false, batchOps: false, analytics: false, webhooks: false },
  },
  {
    key: 'support', label: 'Support', icon: '🎧', color: '#3b82f6',
    responsibilities: [
      'View user profiles & reminder data (read-only)',
      'Process password reset & refund requests',
      'Access activity & notification logs',
      'Escalate technical issues to engineering',
    ],
    bgTasks: ['Ticket auto-assignment & routing'],
    permissions: { api: false, teamManage: false, batchOps: false, analytics: false, webhooks: false },
  },
  {
    key: 'beta_tester', label: 'Beta Tester', icon: '🧪', color: '#10b981',
    responsibilities: [
      'Access unreleased features & previews',
      'Submit structured bug reports',
      'Participate in A/B test cohorts',
      'Early access to new reminder types',
    ],
    bgTasks: ['Feature flag evaluation on each session'],
    permissions: { api: false, teamManage: false, batchOps: false, analytics: false, webhooks: false },
  },
  {
    key: 'company', label: 'Company', icon: '🏢', color: '#f59e0b',
    responsibilities: [
      'Manage team workspaces & member provisioning',
      'Configure organisation-level reminder policies',
      'Access company-wide analytics & compliance reports',
      'Use API & webhooks for system integrations',
    ],
    bgTasks: [
      'Scheduled batch reminder delivery to all members',
      'Auto-assign reminders to employees by rule',
      'Nightly compliance & activity summary reports',
      'Webhook-driven reminder creation from external systems',
      'Auto-provisioning of new user accounts via SCIM/SSO',
    ],
    permissions: { api: true, teamManage: true, batchOps: true, analytics: true, webhooks: true },
  },
];

const CALP = [
  { n: 'Google Calendar', i: '📅', s: 'connected', u: '18,420', d: 'Bidirectional sync via Google Calendar API v3. Supports recurring events, location-based reminders, and attendee invitations.' },
  { n: 'Microsoft Outlook / Exchange', i: '📘', s: 'connected', u: '4,210', d: 'Full Microsoft Graph API. Syncs with Office 365, Exchange Server, and Outlook.com personal accounts.' },
  { n: 'Apple iCloud Calendar', i: '📆', s: 'connected', u: '6,830', d: 'CalDAV protocol for Apple Calendar on iOS and macOS. Requires iCloud Drive to be enabled on device.' },
  { n: 'CalDAV (Generic)', i: '📋', s: 'available', u: '—', d: 'Connect any CalDAV-compatible calendar server. Useful for enterprise and self-hosted deployments.' },
];

const EMAILP = [
  { n: 'Gmail', i: '✉️', s: 'connected', u: '12,440', sc: 'gmail.readonly, gmail.compose', d: 'Create reminders from starred emails, labels, or set follow-up reminders directly within Gmail.' },
  { n: 'Microsoft Outlook / Exchange', i: '📧', s: 'connected', u: '3,810', sc: 'Mail.Read, Mail.Send', d: 'Microsoft Graph integration — reminder creation from inbox with Microsoft Teams notification support.' },
  { n: 'Apple Mail', i: '💌', s: 'coming', u: '—', sc: 'MailKit', d: 'Native iOS Mail extension allowing users to create GoodLifeTask reminders from any email message.' },
];

const WEEKLY_DATA = [
  { lbl: 'Mon', sent: 75, done: 60 },
  { lbl: 'Tue', sent: 85, done: 72 },
  { lbl: 'Wed', sent: 60, done: 50 },
  { lbl: 'Thu', sent: 90, done: 80 },
  { lbl: 'Fri', sent: 70, done: 58 },
  { lbl: 'Sat', sent: 45, done: 38 },
  { lbl: 'Sun', sent: 55, done: 48 },
];

const RINGS = [
  { lbl: 'DAU / MAU', val: '74%', pct: 74, color: '#6366f1' },
  { lbl: 'Completion Rate', val: '68%', pct: 68, color: '#10b981' },
  { lbl: 'Notification CTR', val: '51%', pct: 51, color: '#f59e0b' },
  { lbl: 'Pro Conversion', val: '13%', pct: 13, color: '#3b82f6' },
];

const STATS_DASH = [
  { label: 'Total Users', value: '24,831', trend: '↑ 12% vs last month', up: true, icon: '👥', iconClass: 'ic-brand', sparks: [40, 55, 45, 60, 50, 70, 65, 80, 72, 90, 85, 95] },
  { label: 'Pro Subscribers', value: '3,210', trend: '↑ 8% vs last month', up: true, icon: '💎', iconClass: 'ic-amber', sparks: [30, 45, 35, 50, 60, 55, 70, 65, 80, 75, 85, 80] },
  { label: 'Reminders Sent Today', value: '1.2M', trend: '↑ 23% vs yesterday', up: true, icon: '🔔', iconClass: 'ic-green', sparks: [50, 60, 55, 70, 65, 80, 75, 90, 85, 95, 88, 100] },
  { label: 'Revenue Today', value: '$8,420', trend: '↑ 15% vs yesterday', up: true, icon: '💰', iconClass: 'ic-blue', sparks: [60, 55, 65, 70, 75, 68, 80, 85, 80, 90, 88, 95] },
];

// ── HELPER COMPONENTS ──
function LogPill({ ty }: { ty: string }) {
  const styles: Record<string, React.CSSProperties> = {
    ok:   { background: '#ecfdf5', color: '#10b981' },
    info: { background: '#eff6ff', color: '#3b82f6' },
    warn: { background: '#fffbeb', color: '#f59e0b' },
    err:  { background: '#fef2f2', color: '#ef4444' },
  };
  const labels: Record<string, string> = { ok: 'OK', info: 'INFO', warn: 'WARN', err: 'ERROR' };
  return (
    <span className="log-pill" style={styles[ty] || styles.info}>
      {labels[ty] || ty.toUpperCase()}
    </span>
  );
}

function RingCard({ lbl, val, pct, color }: { lbl: string; val: string; pct: number; color: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="ring-card">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg className="ring-svg" viewBox="0 0 56 56">
          <circle className="ring-track" cx="28" cy="28" r={r} />
          <circle
            className="ring-prog"
            cx="28" cy="28" r={r}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
      </div>
      <div className="ring-value">{val}</div>
      <div className="ring-label">{lbl}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === 'connected') return <span className="badge badge-green badge-dot"> Connected</span>;
  if (s === 'available') return <span className="badge badge-gray">Available</span>;
  if (s === 'config') return <span className="badge badge-amber">Setup Required</span>;
  if (s === 'coming') return <span className="badge badge-blue">Coming Soon</span>;
  return <span className="badge badge-gray">{s}</span>;
}

function IntegCard({ item }: { item: typeof INTEGS.cal[0] }) {
  return (
    <div className={`integ-card${item.s === 'connected' ? ' connected' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="integ-logo" style={{ background: item.bg }}>{item.i}</div>
        <div>
          <div className="integ-name">{item.n}</div>
          {item.u !== '—' && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.u} users</div>}
        </div>
      </div>
      <div className="integ-desc">{item.d}</div>
      <div className="integ-footer">
        <StatusBadge s={item.s} />
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
          {item.s === 'connected' ? 'Manage' : 'Configure'}
        </button>
      </div>
    </div>
  );
}

// ── PAGE COMPONENTS ──
function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [realStats, setRealStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    adminApi.admin.stats()
      .then(s => setRealStats(s))
      .catch(() => { /* fall back to mock values */ });
    adminApi.admin.users({ page: 1, limit: 5 })
      .then(r => setRecentUsers(r.data))
      .catch(() => { /* fall back to mock */ });
  }, [lastRefreshed]);

  const statsDisplay = [
    {
      label: 'Total Users',
      value: realStats ? realStats.totalUsers.toLocaleString() : STATS_DASH[0].value,
      trend: realStats ? `+${realStats.newUsersToday} today` : STATS_DASH[0].trend,
      up: true, icon: STATS_DASH[0].icon, iconClass: STATS_DASH[0].iconClass, sparks: STATS_DASH[0].sparks,
    },
    {
      label: 'Pro Subscribers',
      value: realStats ? realStats.proUsers.toLocaleString() : STATS_DASH[1].value,
      trend: realStats ? `${realStats.activeSubscriptions.toLocaleString()} active subs` : STATS_DASH[1].trend,
      up: true, icon: STATS_DASH[1].icon, iconClass: STATS_DASH[1].iconClass, sparks: STATS_DASH[1].sparks,
    },
    {
      label: 'Reminders Sent Today',
      value: realStats ? realStats.remindersCompletedToday.toLocaleString() : STATS_DASH[2].value,
      trend: realStats ? `${realStats.totalReminders.toLocaleString()} total reminders` : STATS_DASH[2].trend,
      up: true, icon: STATS_DASH[2].icon, iconClass: STATS_DASH[2].iconClass, sparks: STATS_DASH[2].sparks,
    },
    STATS_DASH[3],
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-desc">Welcome back, Super Admin — here&apos;s what&apos;s happening on your platform today.</div>
        </div>
        <div className="page-actions">
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button className="btn btn-secondary">↓ Export</button>
          <button className="btn btn-primary" onClick={() => setLastRefreshed(new Date())}>↺ Refresh</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statsDisplay.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="sc-header">
              <div className="sc-label">{s.label}</div>
              <div className={`sc-icon-wrap ${s.iconClass}`}>{s.icon}</div>
            </div>
            <div className="sc-value">{s.value}</div>
            <div className={`sc-trend ${s.up ? 'trend-up' : 'trend-dn'}`}>{s.trend}</div>
            <div className="sc-sparkline">
              {s.sparks.map((h, j) => (
                <div key={j} className={`spark-bar${j === s.sparks.length - 1 ? ' active' : ''}`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ring metrics */}
      <div className="ring-grid">
        {RINGS.map((r, i) => <RingCard key={i} {...r} />)}
      </div>

      {/* Charts + Recent Signups */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><span className="card-icon">📊</span> Weekly Activity</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />Sent
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />Completed
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {WEEKLY_DATA.map((d, i) => (
                <div key={i} className="bar-col">
                  <div className="bar-wrap">
                    <div className="bar-seg" style={{ height: `${d.sent}%`, background: 'var(--brand)', opacity: 0.7 }} />
                    <div className="bar-seg" style={{ height: `${d.done}%`, background: 'var(--success)', opacity: 0.7 }} />
                  </div>
                  <div className="bar-lbl">{d.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><span className="card-icon">👥</span> Recent Signups</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('users')}>View all →</button>
          </div>
          <div className="card-body-flush">
            <table>
              <thead><tr><th>User</th><th>Plan</th><th>Status</th></tr></thead>
              <tbody>
                {(recentUsers ?? USERS.slice(0, 5).map((u, i) => ({
                  id: u.e, name: u.n, email: u.e, plan: u.p.toLowerCase(), createdAt: u.j, reminderCount: u.r, status: u.s as 'active' | 'inactive'
                }))).map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{u.name[0]?.toUpperCase()}</div>
                        <div>
                          <div className="cell-primary">{u.name}</div>
                          <div className="cell-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.plan === 'pro' ? 'badge-brand' : u.plan === 'family' ? 'badge-amber' : u.plan === 'team' ? 'badge-green' : 'badge-gray'}`}>{u.plan}</span>
                    </td>
                    <td>
                      <span className={`badge badge-dot ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}> {u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Activity Log */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title"><span className="card-icon">📋</span> Live System Activity</div>
          <span className="badge badge-green badge-dot"> Live</span>
        </div>
        <div className="card-body" style={{ maxHeight: 220, overflowY: 'auto', paddingTop: 0, paddingBottom: 0 }}>
          {LOGS.slice(0, 8).map((log, i) => (
            <div key={i} className="log-row">
              <span className="log-time">{log.t}</span>
              <LogPill ty={log.ty} />
              <span className="log-msg">{log.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = ['#6366f1', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'];

const ROLE_OPTIONS: {
  value: UserRole;
  label: string;
  icon: string;
  color: string;
  responsibilities: string[];
  bgTasks?: string[];
}[] = [
  {
    value: 'user',
    label: 'User',
    icon: '👤',
    color: '#6b7280',
    responsibilities: [
      'Create & manage own reminders',
      'Access personal dashboard',
      'Configure notification preferences',
      'Use calendar integrations',
    ],
  },
  {
    value: 'read_only',
    label: 'Read-Only',
    icon: '👁️',
    color: '#94a3b8',
    responsibilities: [
      'View own reminders (no edits)',
      'Read-only access to shared calendars',
      'Cannot modify account settings',
      'Restricted to viewing assigned content',
    ],
  },
  {
    value: 'support_agent',
    label: 'Support Agent',
    icon: '🎧',
    color: '#3b82f6',
    responsibilities: [
      'View user profiles & reminder data',
      'Reset user passwords (assisted)',
      'Process refund & plan change requests',
      'Read-only access to activity logs',
    ],
  },
  {
    value: 'moderator',
    label: 'Moderator',
    icon: '🛡️',
    color: '#8b5cf6',
    responsibilities: [
      'Review & manage user-reported content',
      'Suspend abusive accounts (temporary)',
      'Access moderation queue',
      'Issue warnings to users',
    ],
  },
  {
    value: 'administrator',
    label: 'Administrator',
    icon: '⚙️',
    color: '#f59e0b',
    responsibilities: [
      'Manage users, plans & subscriptions',
      'Configure platform settings & integrations',
      'Access full analytics & activity logs',
      'Create & manage admin accounts',
    ],
    bgTasks: [
      'Scheduled system maintenance tasks',
      'Automated user report generation',
      'Nightly compliance & audit reports',
      'API key provisioning & rotation',
    ],
  },
  {
    value: 'super_admin',
    label: 'Super Admin',
    icon: '👑',
    color: '#dc2626',
    responsibilities: [
      'Full platform access & configuration',
      'Manage all users, roles & permissions',
      'Access all admin panel features',
      'Override any user or system setting',
    ],
    bgTasks: [
      'Platform-wide audit log access',
      'Emergency account recovery',
      'System-level configuration changes',
      'Cross-tenant data access',
    ],
  },
];

function roleBadgeClass(role: UserRole) {
  if (role === 'super_admin')   return 'badge-red';
  if (role === 'administrator') return 'badge-amber';
  if (role === 'moderator')     return 'badge-brand';
  if (role === 'support_agent') return 'badge-blue';
  if (role === 'read_only')     return 'badge-gray';
  return 'badge-gray';
}

function UsersPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [realUsers, setRealUsers] = useState<AdminUser[] | null>(null);
  const [userTotal, setUserTotal] = useState<number | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState<'free' | 'pro' | 'team' | 'family'>('free');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  // password reset
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult]   = useState<{ email: string; tempPassword: string } | null>(null);
  // add user
  const [addUserOpen, setAddUserOpen]   = useState(false);
  const [addName, setAddName]           = useState('');
  const [addEmail, setAddEmail]         = useState('');
  const [addPassword, setAddPassword]   = useState('');
  const [addPlan, setAddPlan]           = useState<'free' | 'pro' | 'team' | 'family'>('free');
  const [addRole, setAddRole]           = useState<UserRole>('user');
  const [addSaving, setAddSaving]       = useState(false);
  const [addError, setAddError]         = useState('');
  // bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  function loadUsers() {
    setUsersLoading(true);
    adminApi.admin.users({ page: 1, limit: 100 })
      .then(res => { setRealUsers(res.data); setUserTotal(res.total); })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  function openEdit(u: AdminUser) {
    setEditingUser(u);
    setEditPlan(u.plan as 'free' | 'pro' | 'team' | 'family');
    setEditRole((u.role ?? 'user') as UserRole);
    setEditError('');
    setResetResult(null);
  }

  async function saveEdit() {
    if (!editingUser) return;
    setEditSaving(true);
    setEditError('');
    try {
      await adminApi.admin.updateUser(editingUser.id, { plan: editPlan, role: editRole });
      setEditingUser(null);
      loadUsers();
    } catch {
      setEditError('Failed to update user. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }

  async function resetUserPassword(u: AdminUser) {
    setResetLoading(true);
    try {
      const res = await adminApi.admin.resetUserPassword(u.id);
      setResetResult({ email: res.data.email, tempPassword: res.data.tempPassword });
    } catch {
      setEditError('Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  async function submitAddUser() {
    if (!addName.trim() || !addEmail.trim() || !addPassword) return;
    setAddSaving(true);
    setAddError('');
    try {
      await adminApi.admin.createUser({
        name: addName.trim(), email: addEmail.trim(),
        password: addPassword, plan: addPlan, role: addRole,
      });
      setAddUserOpen(false);
      setAddName(''); setAddEmail(''); setAddPassword('');
      setAddPlan('free'); setAddRole('user');
      loadUsers();
    } catch (err: any) {
      const msg = err?.message ?? '';
      setAddError(msg.includes('409') || msg.toLowerCase().includes('conflict')
        ? 'Email is already registered.'
        : 'Failed to create user. Please try again.');
    } finally {
      setAddSaving(false);
    }
  }

  async function toggleBan(u: AdminUser) {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      await adminApi.admin.updateUser(u.id, { status: newStatus });
      loadUsers();
    } catch {}
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    if (ids.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  }

  async function bulkAssignRole(role: UserRole) {
    if (selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      await adminApi.admin.bulkAssignRole(Array.from(selectedIds), role);
      setSelectedIds(new Set());
      setBulkRoleOpen(false);
      loadUsers();
    } catch {} finally {
      setBulkAssigning(false);
    }
  }

  const displayUsers = realUsers ?? USERS.map(u => ({
    id: u.e,
    name: u.n,
    email: u.e,
    plan: u.p,
    role: 'user' as UserRole,
    createdAt: u.j,
    reminderCount: u.r,
    status: u.s as 'active' | 'inactive',
  }));

  const filtered = displayUsers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchPlan = planFilter === 'All Plans' || u.plan.toLowerCase() === planFilter.toLowerCase();
    const matchStatus = statusFilter === 'All Status' || u.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchPlan && matchStatus;
  });

  const filteredIds = filtered.map(u => u.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  const totalCount = userTotal ?? 24831;
  const proCount = realUsers ? realUsers.filter(u => u.plan === 'pro').length : 3210;
  const freeCount = realUsers ? realUsers.filter(u => u.plan === 'free').length : 21621;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-desc">Manage all registered users, subscription plans, and account status.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">↓ Export CSV</button>
          <button className="btn btn-primary" onClick={() => { setAddUserOpen(true); setAddError(''); }}>+ Add User</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Total Users</div><div className="sc-icon-wrap ic-brand">👥</div></div><div className="sc-value">{totalCount.toLocaleString()}</div><div className="sc-trend trend-up">+{realUsers ? realUsers.length : 312} loaded</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Pro Users</div><div className="sc-icon-wrap ic-amber">💎</div></div><div className="sc-value">{proCount.toLocaleString()}</div><div className="sc-trend trend-up">↑ 8% MoM</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Free Users</div><div className="sc-icon-wrap ic-green">✅</div></div><div className="sc-value">{freeCount.toLocaleString()}</div><div className="sc-trend trend-neu">Stable</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Suspended</div><div className="sc-icon-wrap ic-red">🚫</div></div><div className="sc-value">{realUsers ? realUsers.filter(u => u.status === 'inactive').length : 14}</div><div className="sc-trend trend-dn">↑ 2 this week</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Users</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ width: 200, padding: '6px 10px' }}
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              style={{ width: 110, padding: '6px 10px' }}
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
            >
              <option>All Plans</option><option>Free</option><option>Pro</option><option>Team</option>
            </select>
            <select
              className="form-select"
              style={{ width: 120, padding: '6px 10px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option>All Status</option><option>Active</option><option>Inactive</option><option>Pending</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            background: 'rgba(99,102,241,0.07)', borderBottom: '1px solid rgba(99,102,241,0.2)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-dark)' }}>
              {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setBulkRoleOpen(v => !v)}
                disabled={bulkAssigning}
              >
                🛡️ Assign Role ▾
              </button>
              {bulkRoleOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
                  background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
                }}>
                  {ROLE_OPTIONS.map(r => (
                    <div
                      key={r.value}
                      onClick={() => bulkAssignRole(r.value)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', fontSize: 13, display: 'flex',
                        alignItems: 'center', gap: 8, color: 'var(--text-secondary)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{r.icon}</span>
                      <span style={{ fontWeight: 500 }}>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedIds(new Set()); setBulkRoleOpen(false); }}>
              ✕ Clear
            </button>
          </div>
        )}

        <div className="card-body-flush table-wrap">
          {usersLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading users…</div>
          ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    style={{ accentColor: 'var(--brand)' }}
                    checked={allSelected}
                    onChange={() => toggleSelectAll(filteredIds)}
                  />
                </th>
                <th>User</th><th>Email</th><th>Plan</th><th>Role</th><th>Reminders</th><th>Joined</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No users match your filters.</td></tr>
              ) : filtered.map((u, i) => {
                const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const planLabel = u.plan.charAt(0).toUpperCase() + u.plan.slice(1);
                const userRole = (u.role ?? 'user') as UserRole;
                const roleInfo = ROLE_OPTIONS.find(r => r.value === userRole) ?? ROLE_OPTIONS[0];
                const joinDate = u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : u.createdAt;
                const isSelected = selectedIds.has(u.id);
                return (
                  <tr key={u.id} style={{ background: isSelected ? 'rgba(99,102,241,0.04)' : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        style={{ accentColor: 'var(--brand)' }}
                        checked={isSelected}
                        onChange={() => toggleSelect(u.id)}
                      />
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ background: avatarColor }}>{u.name[0]}</div>
                        <div className="cell-primary">{u.name}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className={`badge ${u.plan === 'pro' ? 'badge-brand' : u.plan === 'family' ? 'badge-amber' : u.plan === 'team' ? 'badge-green' : 'badge-gray'}`}>{planLabel}</span>
                        {u.familyGroupName && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }} title={u.familyGroupName}>
                            👨‍👩‍👧‍👦 {u.familyGroupName}
                          </span>
                        )}
                        {u.teamWorkspaceName && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }} title={u.teamWorkspaceName}>
                            👥 {u.teamWorkspaceName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadgeClass(userRole)}`} style={{ gap: 4 }}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    </td>
                    <td>{u.reminderCount.toLocaleString()}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{joinDate}</td>
                    <td><span className={`badge badge-dot ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}> {u.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(u)}>Edit</button>
                        <button
                          className={u.status === 'active' ? 'btn btn-danger btn-xs' : 'btn btn-secondary btn-xs'}
                          onClick={() => toggleBan(u)}
                        >{u.status === 'active' ? 'Ban' : 'Unban'}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {filtered.length} of {displayUsers.length} users (total: {totalCount.toLocaleString()})</span>
          <div className="pagination">
            <button className="page-btn">‹</button>
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn">3</button>
            <button className="page-btn">›</button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={e => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div style={{
            background: 'var(--bg-white)', borderRadius: 12, padding: '28px 28px 24px',
            width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
          }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Edit User</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{editingUser.name} · {editingUser.email}</div>

            {/* Current info */}
            <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Plan</span>
                <span className={`badge ${editingUser.plan === 'pro' ? 'badge-brand' : editingUser.plan === 'family' ? 'badge-amber' : editingUser.plan === 'team' ? 'badge-green' : 'badge-gray'}`}>
                  {editingUser.plan.charAt(0).toUpperCase() + editingUser.plan.slice(1)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: editingUser.persona ? 6 : 0 }}>
                <span style={{ color: 'var(--text-muted)' }}>Reminders</span>
                <span style={{ fontWeight: 600 }}>{editingUser.reminderCount}</span>
              </div>
              {editingUser.familyGroupName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Family Group</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>👨‍👩‍👧‍👦 {editingUser.familyGroupName}</span>
                    {editingUser.familyRole && (
                      <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 10, fontWeight: 600, textTransform: 'capitalize' }}>
                        {editingUser.familyRole}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {!editingUser.familyGroupName && editingUser.plan === 'family' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Family Group</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not joined any family yet</span>
                </div>
              )}
              {editingUser.teamWorkspaceName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Team Workspace</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>👥 {editingUser.teamWorkspaceName}</span>
                    {editingUser.teamRole && (
                      <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 10, fontWeight: 600, textTransform: 'capitalize' }}>
                        {editingUser.teamRole}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {!editingUser.teamWorkspaceName && editingUser.plan === 'team' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Team Workspace</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not joined any workspace yet</span>
                </div>
              )}
              {editingUser.persona && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: editingUser.occupation ? 6 : 0 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Persona</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{editingUser.persona}</span>
                </div>
              )}
              {editingUser.occupation && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Occupation</span>
                  <span style={{ fontWeight: 600 }}>{editingUser.occupation}</span>
                </div>
              )}
            </div>

            {/* Plan selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Change Subscription Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['free', 'pro', 'family', 'team'] as const).map(p => (
                  <div
                    key={p}
                    onClick={() => setEditPlan(p)}
                    style={{
                      padding: '10px 8px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                      border: `2px solid ${editPlan === p ? 'var(--brand)' : 'var(--border)'}`,
                      background: editPlan === p ? 'rgba(99,102,241,0.07)' : 'var(--bg-white)',
                      transition: 'all 0.12s'
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{p === 'free' ? '🆓' : p === 'pro' ? '💎' : p === 'family' ? '👨‍👩‍👧‍👦' : '👥'}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: editPlan === p ? 'var(--brand)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{p}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p === 'free' ? '$0/mo' : p === 'pro' ? '$9.99/mo' : p === 'family' ? '$14.99/mo' : '$24.99/mo'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Assign Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 6 }}>
                {ROLE_OPTIONS.map(r => {
                  const isActive = editRole === r.value;
                  return (
                    <div
                      key={r.value}
                      onClick={() => setEditRole(r.value)}
                      style={{
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${isActive ? r.color : 'var(--border)'}`,
                        background: isActive ? `${r.color}0f` : 'var(--bg-white)',
                        transition: 'all 0.12s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isActive ? 8 : 0 }}>
                        <span style={{ fontSize: 18 }}>{r.icon}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? r.color : 'var(--text-secondary)' }}>{r.label}</span>
                          {r.value === 'super_admin' && (
                            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 10 }}>HIGHEST</span>
                          )}
                        </div>
                        {isActive && <span style={{ fontSize: 14, color: r.color }}>✓</span>}
                      </div>
                      {isActive && (
                        <div style={{ paddingLeft: 28 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responsibilities</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {r.responsibilities.map((res, idx) => (
                              <li key={idx} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', gap: 6 }}>
                                <span style={{ color: r.color }}>•</span>{res}
                              </li>
                            ))}
                          </ul>
                          {r.bgTasks && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Background Tasks</div>
                              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                {r.bgTasks.map((t, idx) => (
                                  <li key={idx} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', gap: 6 }}>
                                    <span style={{ color: '#f59e0b' }}>▸</span>{t}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {editError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
                {editError}
              </div>
            )}

            {/* Temp password result */}
            {resetResult && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
                padding: '12px 14px', marginBottom: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                  ✅ Temporary password generated
                </div>
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>
                  Share this with <strong>{resetResult.email}</strong> — it will not be shown again.
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
                  background: '#dcfce7', borderRadius: 6, padding: '8px 12px'
                }}>
                  <code style={{ fontSize: 14, fontWeight: 700, color: '#15803d', letterSpacing: '0.05em', flex: 1 }}>
                    {resetResult.tempPassword}
                  </code>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => { navigator.clipboard.writeText(resetResult.tempPassword); }}
                  >Copy</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
                onClick={() => { setResetResult(null); resetUserPassword(editingUser!); }}
                disabled={resetLoading || editSaving}
              >
                {resetLoading ? '🔄 Resetting…' : '🔑 Reset Password'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setEditingUser(null); setResetResult(null); }} disabled={editSaving}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addUserOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={e => { if (e.target === e.currentTarget) setAddUserOpen(false); }}>
          <div style={{
            background: 'var(--bg-white)', borderRadius: 12, padding: '28px 28px 24px',
            width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
          }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Add New User</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Create a new user account manually.</div>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
              <input
                className="form-input"
                placeholder="John Doe"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min. 8 chars)</span></label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={addPassword}
                onChange={e => setAddPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {/* Plan */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Subscription Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['free', 'pro', 'family', 'team'] as const).map(p => (
                  <div
                    key={p}
                    onClick={() => setAddPlan(p)}
                    style={{
                      padding: '10px 8px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                      border: `2px solid ${addPlan === p ? 'var(--brand)' : 'var(--border)'}`,
                      background: addPlan === p ? 'rgba(99,102,241,0.07)' : 'var(--bg-white)',
                      transition: 'all 0.12s'
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{p === 'free' ? '🆓' : p === 'pro' ? '💎' : p === 'family' ? '👨‍👩‍👧‍👦' : '👥'}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: addPlan === p ? 'var(--brand)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Role</label>
              <select
                className="form-select"
                value={addRole}
                onChange={e => setAddRole(e.target.value as UserRole)}
                style={{ width: '100%' }}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>

            {addError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
                {addError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setAddUserOpen(false)} disabled={addSaving}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={submitAddUser}
                disabled={addSaving || !addName.trim() || !addEmail.trim() || addPassword.length < 8}
              >
                {addSaving ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RolesPage() {
  const [tab, setTab] = useState<'admin' | 'user'>('user');
  const [selectedAdminRole, setSelectedAdminRole] = useState(0);
  const [selectedUserRole, setSelectedUserRole] = useState(0);
  const permMatrix: Record<string, boolean[]> = {
    'Super Admin': PERMS.map(() => true),
    'Administrator': PERMS.map((_, i) => i !== 9),
    'Moderator': [true, true, true, false, false, false, true, false, false, false, false],
    'Support Agent': [true, false, false, false, false, false, false, false, false, false, false],
    'Read-Only': PERMS.map(() => false),
  };

  const activeUserRole = USER_ROLES_DATA[selectedUserRole];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Roles & Permissions</div>
          <div className="page-desc">Configure access levels and responsibilities for admin and user roles.</div>
        </div>
        <button className="btn btn-primary">+ New Role</button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-muted)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {(['user', 'admin'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ borderRadius: 6 }}
          >
            {t === 'user' ? '👥 User Roles' : '🔐 Admin Roles'}
          </button>
        ))}
      </div>

      {tab === 'user' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 16 }}>
          {/* User role list */}
          <div className="card">
            <div className="card-header"><div className="card-title">User Roles</div></div>
            <div className="card-body" style={{ padding: 8 }}>
              {USER_ROLES_DATA.map((r, i) => (
                <div key={i} onClick={() => setSelectedUserRole(i)} style={{
                  padding: '9px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                  background: selectedUserRole === i ? `${r.color}14` : 'transparent',
                  border: `1px solid ${selectedUserRole === i ? r.color + '40' : 'transparent'}`,
                  transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selectedUserRole === i ? r.color : 'var(--text-secondary)' }}>{r.label}</div>
                    {r.key === 'company' && (
                      <div style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>ENTERPRISE</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role detail panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header card */}
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40, width: 60, height: 60, borderRadius: 12, background: `${activeUserRole.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeUserRole.icon}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: activeUserRole.color, fontFamily: 'Manrope, sans-serif' }}>{activeUserRole.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Role key: <code style={{ background: 'var(--bg-muted)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{activeUserRole.key}</code>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {Object.entries(activeUserRole.permissions).map(([k, v]) => (
                    <div key={k} style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: v ? `${activeUserRole.color}18` : 'var(--bg-muted)',
                      color: v ? activeUserRole.color : 'var(--text-muted)',
                      border: `1px solid ${v ? activeUserRole.color + '40' : 'var(--border)'}`,
                    }}>
                      {v ? '✓' : '✕'} {k === 'api' ? 'API' : k === 'teamManage' ? 'Team Mgmt' : k === 'batchOps' ? 'Batch Ops' : k === 'analytics' ? 'Analytics' : 'Webhooks'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: activeUserRole.bgTasks.length > 0 ? '1fr 1fr' : '1fr', gap: 14 }}>
              {/* Responsibilities */}
              <div className="card">
                <div className="card-header"><div className="card-title">📋 Responsibilities</div></div>
                <div className="card-body">
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {activeUserRole.responsibilities.map((r, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < activeUserRole.responsibilities.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <span style={{ color: activeUserRole.color, fontSize: 16, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Background Tasks */}
              {activeUserRole.bgTasks.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">⚙️ Background Tasks</div>
                    <span className="badge badge-amber">Automated</span>
                  </div>
                  <div className="card-body">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      These tasks run automatically on behalf of this role without direct user interaction.
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {activeUserRole.bgTasks.map((t, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < activeUserRole.bgTasks.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                          <span style={{ color: '#f59e0b', fontSize: 14 }}>▸</span>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Admin Roles</div></div>
            <div className="card-body" style={{ padding: 8 }}>
              {ROLES_DATA.map((r, i) => (
                <div key={i} onClick={() => setSelectedAdminRole(i)} style={{
                  padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: selectedAdminRole === i ? 'rgba(99,102,241,0.08)' : 'transparent',
                  color: selectedAdminRole === i ? 'var(--brand-dark)' : 'var(--text-secondary)',
                  marginBottom: 2, transition: 'all 0.12s'
                }}>{r}</div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Permission Matrix — {ROLES_DATA[selectedAdminRole]}</div>
              <button className="btn btn-primary btn-sm">Save Changes</button>
            </div>
            <div className="card-body-flush">
              <table className="perm-table">
                <thead><tr><th>Module</th><th>View</th><th>Create</th><th>Edit</th><th>Delete</th><th>Export</th></tr></thead>
                <tbody>
                  {PERMS.map((perm, i) => {
                    const allowed = permMatrix[ROLES_DATA[selectedAdminRole]][i];
                    return (
                      <tr key={i}>
                        <td>{perm}</td>
                        {[allowed, allowed && i < 5, allowed && i < 5, allowed && i < 3, allowed && i < 4].map((v, j) => (
                          <td key={j}>
                            <div className={`perm-check ${v ? 'perm-yes' : 'perm-no'}`}>{v ? '✓' : '✕'}</div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesPage({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [custCats, setCustCats] = useState(CUSTCATS.map(c => ({ ...c })));
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  function handleAddCategory() {
    const name = newName.trim();
    if (!name) { showToast('Please enter a category name.', 'error'); return; }
    const emoji = newEmoji.trim() || '📁';
    setCustCats(prev => [...prev, { n: name, c: newColor, i: emoji, cnt: 0 }]);
    setNewName('');
    setNewEmoji('');
    setNewColor('#6366f1');
    showToast(`Category "${name}" added successfully.`);
  }

  function handleDeleteCat(i: number) {
    const name = custCats[i].n;
    setCustCats(prev => prev.filter((_, idx) => idx !== i));
    showToast(`Category "${name}" deleted.`);
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Categories</div><div className="page-desc">Manage reminder categories, icons, and color coding for the app.</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div className="section-label">System Categories</div>
          <div className="cat-list">
            {SYSCATS.map((c, i) => (
              <div key={i} className="cat-item">
                <div className="cat-swatch" style={{ background: c.c }} />
                <span className="cat-emoji">{c.i}</span>
                <span className="cat-name">{c.n}</span>
                <span className="cat-count">{c.cnt.toLocaleString()} users</span>
                <div className="cat-actions">
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-label">Custom Categories</div>
          <div className="cat-list">
            {custCats.map((c, i) => (
              <div key={i} className="cat-item">
                <div className="cat-swatch" style={{ background: c.c }} />
                <span className="cat-emoji">{c.i}</span>
                <span className="cat-name">{c.n}</span>
                <span className="cat-count">{c.cnt.toLocaleString()} users</span>
                <div className="cat-actions">
                  <button className="btn btn-ghost btn-xs">Edit</button>
                  <button className="btn btn-danger btn-xs" onClick={() => handleDeleteCat(i)}>Del</button>
                </div>
              </div>
            ))}
          </div>
          {/* Add new category form */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-header"><div className="card-title">New Custom Category</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Hobbies"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  />
                </div>
                <div className="form-group" style={{ margin: 0, width: 80 }}>
                  <label className="form-label">Emoji</label>
                  <input
                    className="form-input"
                    placeholder="🎯"
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    maxLength={4}
                  />
                </div>
                <div className="form-group" style={{ margin: 0, width: 70 }}>
                  <label className="form-label">Color</label>
                  <input
                    className="form-input"
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    style={{ padding: 4, height: 38 }}
                  />
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginBottom: 1 }} onClick={handleAddCategory}>
                  + Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemesPage() {
  const [activeTheme, setActiveTheme] = useState(0);
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Themes & UI</div><div className="page-desc">Manage visual themes, colour schemes, and interface preferences.</div></div>
        <div className="page-actions">
          <button className="btn btn-secondary">✏ Builder</button>
          <button className="btn btn-primary">Publish Theme</button>
        </div>
      </div>
      <div className="alert alert-info">
        <span className="alert-icon">ℹ</span>
        <span><strong>Active theme:</strong> Dark Precision — deployed to all 24,831 users. Changes publish instantly across all platforms.</span>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Available Themes</div>
          <span className="badge badge-brand">6 themes</span>
        </div>
        <div className="card-body">
          <div className="theme-grid">
            {THEMES.map((t, i) => (
              <div key={i} className={`theme-card${i === activeTheme ? ' active' : ''}`} onClick={() => setActiveTheme(i)}>
                <div className="theme-preview" style={{ background: t.c[0] }}>
                  <div style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 6, borderRadius: 3, background: t.c[1] }} />
                  <div style={{ position: 'absolute', top: 20, left: 8, width: 40, height: 4, borderRadius: 2, background: t.c[2], opacity: 0.7 }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, height: 20, borderRadius: 4, background: t.c[1], opacity: 0.15 }} />
                  {i === activeTheme && <div className="theme-check">✓</div>}
                </div>
                <div className="theme-info">
                  <div className="theme-name">{t.n}</div>
                  <div className="theme-type">{t.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Customisation Settings</div></div>
        <div className="card-body">
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Primary Accent Colour</label><input className="form-input" type="color" defaultValue="#6366f1" style={{ padding: 4, height: 38 }} /></div>
            <div className="form-group"><label className="form-label">Application Font</label><select className="form-select"><option>Inter</option><option>Manrope</option><option>DM Sans</option><option>Nunito</option></select></div>
            <div className="form-group"><label className="form-label">Border Radius Style</label><select className="form-select"><option>Rounded (8px)</option><option>Sharp (4px)</option><option>Pill (16px)</option></select></div>
            <div className="form-group"><label className="form-label">Default Mode</label><select className="form-select"><option>Light</option><option>Dark</option><option>System Default</option></select></div>
          </div>
          <div className="divider" />
          <ToggleItem title="Allow User Theme Overrides" desc="Let users choose from available themes" defaultOn />
          <ToggleItem title="Custom Accent Colors for Pro Users" desc="Pro subscribers can set personal accent colors" defaultOn />
          <ToggleItem title="Seasonal Themes" desc="Automatically apply holiday themes by calendar date" defaultOn={false} />
          <div style={{ marginTop: 16 }}><button className="btn btn-primary">Save Settings</button></div>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({ title, desc, defaultOn }: { title: string; desc?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <div className="toggle-item">
      <div className="toggle-info">
        <div className="toggle-title">{title}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <div className={`toggle-switch${on ? ' on' : ''}`} onClick={() => setOn(!on)} />
    </div>
  );
}

function getFlagEmoji(code: string): string {
  if (!code || code.length < 2) return '🌐';
  const chars = [...code.toUpperCase().slice(0, 2)].map(
    (c) => 0x1f1e6 - 0x41 + c.charCodeAt(0)
  );
  return String.fromCodePoint(...chars);
}

function LanguagePage() {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.admin.countries()
      .then(res => {
        if (cancelled) return;
        setCountries(res.data);
        if (res.data.length > 0) setSelectedCountry(res.data[0].id);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activeCountry = countries.find(r => r.id === selectedCountry);
  const totalLangs = countries.reduce((sum, r) => sum + r.languages.length, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Languages</div>
          <div className="page-desc">Browse all supported languages by country. Select a country to view its languages below.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">↑ Import</button>
          <button className="btn btn-primary">+ Add Language</button>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric-card"><div className="metric-val">{loading ? '…' : totalLangs}</div><div className="metric-lbl">Total Languages</div></div>
        <div className="metric-card"><div className="metric-val">{loading ? '…' : countries.length}</div><div className="metric-lbl">Countries</div></div>
        <div className="metric-card"><div className="metric-val">97%</div><div className="metric-lbl">Avg Translation Coverage</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Country selector */}
        <div className="card">
          <div className="card-header"><div className="card-title">Countries</div></div>
          <div className="card-body" style={{ padding: 6 }}>
            {loading ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : countries.map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedCountry(r.id)}
                style={{
                  padding: '9px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                  background: selectedCountry === r.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: `1px solid ${selectedCountry === r.id ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                  transition: 'all 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{getFlagEmoji(r.code)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: selectedCountry === r.id ? 'var(--brand-dark)' : 'var(--text-secondary)' }}>{r.name}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '1px 7px',
                  background: selectedCountry === r.id ? 'rgba(99,102,241,0.15)' : 'var(--bg-muted)',
                  color: selectedCountry === r.id ? 'var(--brand)' : 'var(--text-muted)',
                }}>{r.languages.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Languages for selected country */}
        <div>
          {activeCountry ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  {getFlagEmoji(activeCountry.code)} {activeCountry.name} Languages
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeCountry.languages.length} languages</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {activeCountry.languages.map(lang => (
                    <div key={lang.id} style={{
                      padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: lang.isActive ? 'var(--bg-white)' : 'var(--bg-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lang.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6 }}>
                          <span style={{ background: 'var(--bg-muted)', padding: '0 5px', borderRadius: 4, fontFamily: 'monospace' }}>{lang.code.toUpperCase()}</span>
                          {lang.isRtl && <span style={{ background: '#fef3c7', color: '#b45309', padding: '0 5px', borderRadius: 4, fontWeight: 700 }}>RTL</span>}
                        </div>
                      </div>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: lang.isActive ? '#10b981' : '#d1d5db', flexShrink: 0,
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>
                Select a country to view its languages
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-header"><div className="card-title">Language Settings</div></div>
            <div className="card-body">
              <ToggleItem title="Auto-detect Browser Language" desc="Set app language based on user's browser locale automatically" defaultOn />
              <ToggleItem title="RTL Layout Support" desc="Enable right-to-left layout for Arabic, Hebrew, Farsi, and Urdu" defaultOn />
              <ToggleItem title="Community Translations (Crowdin)" desc="Allow community contributors to improve translations" defaultOn={false} />
              <ToggleItem title="AI Translation Fallback" desc="Automatically fill missing translation strings using AI" defaultOn />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifsPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Push Notifications</div><div className="page-desc">Configure delivery providers, templates, and broadcast settings.</div></div>
        <button className="btn btn-primary">📤 Send Broadcast</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Sent Today</div><div className="sc-icon-wrap ic-brand">📤</div></div><div className="sc-value">1.2M</div><div className="sc-trend trend-up">On track</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Delivery Rate</div><div className="sc-icon-wrap ic-green">✅</div></div><div className="sc-value">98.3%</div><div className="sc-trend trend-up">↑ 2% WoW</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Click-through Rate</div><div className="sc-icon-wrap ic-amber">👆</div></div><div className="sc-value">51%</div><div className="sc-trend trend-neu">Stable</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Opt-out Rate</div><div className="sc-icon-wrap ic-red">🚫</div></div><div className="sc-value">0.7%</div><div className="sc-trend trend-dn">↑ 0.1% MoM</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">FCM — Android</div>
            <span className="badge badge-green badge-dot"> Connected</span>
          </div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Server Key</label><input className="form-input" type="password" defaultValue="AAAA••••••••••••" /></div>
            <div className="form-group"><label className="form-label">Firebase Project ID</label><input className="form-input" defaultValue="goodlifetask-prod" /></div>
            <ToggleItem title="Rich Notifications" desc="Images and action buttons on Android" defaultOn />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Send Test Notification</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">APNs — iOS</div>
            <span className="badge badge-green badge-dot"> Connected</span>
          </div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">APNs Key ID</label><input className="form-input" defaultValue="GLT8X9K2PL" /></div>
            <div className="form-group"><label className="form-label">Apple Team ID</label><input className="form-input" defaultValue="GOODLIFETASK.COM" /></div>
            <ToggleItem title="Critical Alerts" desc="Bypass Do Not Disturb for urgent reminders" defaultOn={false} />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Send Test Notification</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebAdsPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Web Ad Manager</div><div className="page-desc">Manage display ads, Google AdSense integration, and placement zones.</div></div>
        <div className="page-actions">
          <button className="btn btn-secondary">↓ Report</button>
          <button className="btn btn-primary">+ New Ad Unit</button>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Impressions Today</div><div className="sc-icon-wrap ic-brand">👁</div></div><div className="sc-value">2.4M</div><div className="sc-trend trend-up">↑ 18%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Click-through Rate</div><div className="sc-icon-wrap ic-blue">👆</div></div><div className="sc-value">4.2%</div><div className="sc-trend trend-up">↑ 0.3%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Ad Revenue Today</div><div className="sc-icon-wrap ic-green">💵</div></div><div className="sc-value">$1,240</div><div className="sc-trend trend-up">↑ 12%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Ad-Free (Pro)</div><div className="sc-icon-wrap ic-amber">⭐</div></div><div className="sc-value">3,210</div><div className="sc-trend trend-neu">No ads shown</div></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Ad Placement Zones</div>
          <span className="badge badge-green">6 active</span>
        </div>
        <div className="card-body">
          <div className="ad-grid">
            {WADZONES.map((z, i) => (
              <div key={i} className="ad-slot">
                <div className="ad-slot-label">{z.l}</div>
                <div className="ad-slot-size">{z.sz}</div>
                <div className="ad-slot-revenue">{z.r}</div>
                <span className={`badge ${z.s === 'active' ? 'badge-green' : 'badge-amber'}`} style={{ marginTop: 8 }}>{z.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Google AdSense</div>
            <span className="badge badge-green badge-dot"> Connected</span>
          </div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Publisher ID</label><input className="form-input" defaultValue="ca-pub-8420000000001234" /></div>
            <div className="form-group"><label className="form-label">Ad Type</label><select className="form-select"><option>Display Ads</option><option>In-Feed Ads</option><option>In-Article Ads</option></select></div>
            <ToggleItem title="Auto Ads" desc="Let Google optimise ad placement automatically" defaultOn />
            <ToggleItem title="Hide Ads for Pro Users" desc="Paid subscribers see no advertisements" defaultOn />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Save Configuration</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Direct Ad Campaign</div></div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Campaign Name</label><input className="form-input" placeholder="Summer 2025 Campaign" /></div>
            <div className="form-group"><label className="form-label">Advertiser URL</label><input className="form-input" placeholder="https://advertiser.com" /></div>
            <div className="form-group"><label className="form-label">Placement Zone</label><select className="form-select"><option>Sidebar Right</option><option>Banner Top</option><option>Interstitial</option></select></div>
            <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" /></div>
            <button className="btn btn-primary">Create Campaign</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileAdsPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Mobile Ad Manager</div><div className="page-desc">AdMob — manage banner, interstitial, rewarded, and native ad units for iOS and Android.</div></div>
        <button className="btn btn-primary">+ New Ad Unit</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 20, alignItems: 'start' }}>
        <div>
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
            <div className="stat-card"><div className="sc-header"><div className="sc-label">Mobile Impressions</div><div className="sc-icon-wrap ic-brand">📱</div></div><div className="sc-value">890K</div><div className="sc-trend trend-up">↑ 22%</div></div>
            <div className="stat-card"><div className="sc-header"><div className="sc-label">Mobile Revenue</div><div className="sc-icon-wrap ic-green">💵</div></div><div className="sc-value">$620</div><div className="sc-trend trend-up">↑ 18%</div></div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Google AdMob Configuration</div>
              <span className="badge badge-green badge-dot"> Connected</span>
            </div>
            <div className="card-body">
              <div className="form-grid-2">
                <div className="form-group"><label className="form-label">App ID — Android</label><input className="form-input" defaultValue="ca-app-pub-8420•••~1001" /></div>
                <div className="form-group"><label className="form-label">App ID — iOS</label><input className="form-input" defaultValue="ca-app-pub-8420•••~2001" /></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Ad Format Performance</div></div>
            <div className="card-body-flush table-wrap">
              <table>
                <thead><tr><th>Format</th><th>Ad Unit ID</th><th>Platform</th><th>eCPM</th><th>Status</th></tr></thead>
                <tbody>
                  {ADMOBUNITS.map((u, i) => (
                    <tr key={i}>
                      <td className="cell-primary">{u.ty}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{u.id}</td>
                      <td>{u.plt}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{u.cpm}</td>
                      <td><span className={`badge badge-dot ${u.s === 'active' ? 'badge-green' : 'badge-amber'}`}> {u.s}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Preview</div>
          <div className="phone-frame">
            <div className="phone-screen">
              <div className="phone-statusbar"><span>9:41 AM</span><span>🔋</span></div>
              <div className="phone-content">
                <div className="phone-header">GoodLifeTask</div>
                <div className="phone-item">📞 Call dentist · 09:00</div>
                <div className="phone-item">✅ Team standup · 09:30</div>
                <div className="phone-ad">📢 Sponsored — Tap to explore</div>
                <div className="phone-item">📧 Send proposal · 11:00</div>
                <div className="phone-banner">▬▬ Banner Ad 320×50 ▬▬</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ad Formats</div>
            <ToggleItem title="Banner Ads" defaultOn />
            <ToggleItem title="Interstitials" defaultOn />
            <ToggleItem title="Rewarded Video" defaultOn={false} />
            <ToggleItem title="Native Ads" defaultOn />
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Integrations</div><div className="page-desc">Connect GoodLifeTask with third-party applications, services, and platforms.</div></div>
        <button className="btn btn-secondary">📚 API Docs</button>
      </div>
      <div className="alert alert-success">
        <span className="alert-icon">✅</span>
        <span><strong>8 integrations active</strong> — 3 available to configure · Last sync: 2 minutes ago</span>
      </div>
      {[
        { label: 'Calendar & Productivity', items: INTEGS.cal },
        { label: 'Email Clients', items: INTEGS.email },
        { label: 'Voice Assistants', items: INTEGS.voice },
        { label: 'Automation & Productivity', items: INTEGS.other },
      ].map((group, i) => (
        <div key={i} className="section-group">
          <div className="section-label">{group.label}</div>
          <div className="integ-grid">
            {group.items.map((item, j) => <IntegCard key={j} item={item} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function VoicePage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Voice Assistants</div><div className="page-desc">Configure Alexa, Siri, Google Assistant, and Cortana integrations.</div></div>
      </div>
      <div className="voice-grid">
        {VOICES.map((v, i) => (
          <div key={i} className="voice-card">
            <div className="voice-header">
              <div className="voice-logo" style={{ background: v.bg }}>{v.i}</div>
              <div>
                <div className="voice-name">{v.n}</div>
                <div className="voice-sub">{v.sk}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}><StatusBadge s={v.s} /></div>
            </div>
            <div className="voice-cmd">{v.cmd}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.u !== '—' ? `${v.u} active users` : 'Not configured'}</div>
            <div className="voice-actions">
              <button className="btn btn-secondary btn-sm">{v.s === 'connected' ? 'Configure' : 'Set Up'}</button>
              {v.s === 'connected' && <button className="btn btn-ghost btn-sm">Test</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Universal Voice Settings</div></div>
        <div className="card-body">
          <ToggleItem title="Voice Reminder Creation" desc="Allow users to create reminders through voice commands on all connected assistants" defaultOn />
          <ToggleItem title="Read Back Reminders" desc="Voice assistants can read upcoming reminders aloud on request" defaultOn />
          <ToggleItem title="Natural Language Processing" desc='"Remind me to call John tomorrow at 9am" is automatically parsed and scheduled' defaultOn />
          <ToggleItem title="Voice Snooze" desc='Users can say "Snooze 10 minutes" when a reminder fires' defaultOn={false} />
        </div>
      </div>
    </div>
  );
}

function CalSyncPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Calendar Sync</div><div className="page-desc">Bidirectional sync with Google Calendar, Microsoft Outlook, Apple iCloud, and CalDAV.</div></div>
        <button className="btn btn-primary">⟳ Sync All</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Users with Sync</div><div className="sc-icon-wrap ic-brand">🔄</div></div><div className="sc-value">18,420</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Events Synced Today</div><div className="sc-icon-wrap ic-blue">📅</div></div><div className="sc-value">450K</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Sync Success Rate</div><div className="sc-icon-wrap ic-green">✅</div></div><div className="sc-value">99.2%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Sync Conflicts</div><div className="sc-icon-wrap ic-red">⚠</div></div><div className="sc-value">38</div></div>
      </div>
      {CALP.map((p, i) => (
        <div key={i} className="card">
          <div className="card-header">
            <div className="card-title">{p.i} {p.n}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {p.u !== '—' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.u} users</span>}
              <StatusBadge s={p.s} />
            </div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{p.d}</p>
            <button className="btn btn-secondary btn-sm">{p.s === 'connected' ? 'Manage' : 'Configure'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailIntPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Email Client Integrations</div><div className="page-desc">Gmail, Outlook, and Apple Mail — create reminders directly from your inbox.</div></div>
      </div>
      {EMAILP.map((p, i) => (
        <div key={i} className="card">
          <div className="card-header">
            <div className="card-title">{p.i} {p.n}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {p.u !== '—' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.u} users</span>}
              <StatusBadge s={p.s} />
            </div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{p.d}</p>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scopes: {p.sc}</span>
          </div>
        </div>
      ))}
      <div className="card">
        <div className="card-header"><div className="card-title">Transactional Email Provider</div></div>
        <div className="card-body">
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Provider</label><select className="form-select"><option>Resend</option><option>SendGrid</option><option>Mailgun</option><option>AWS SES</option></select></div>
            <div className="form-group"><label className="form-label">API Key</label><input className="form-input" type="password" defaultValue="re_••••••••••••••••" /></div>
            <div className="form-group"><label className="form-label">From Email Address</label><input className="form-input" defaultValue="reminders@goodlifetask.com" /></div>
            <div className="form-group"><label className="form-label">From Display Name</label><input className="form-input" defaultValue="GoodLifeTask" /></div>
          </div>
          <button className="btn btn-primary">Save & Send Test</button>
        </div>
      </div>
    </div>
  );
}

function ApiKeysPage({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [keys, setKeys] = useState(APIKEYS.map(k => ({ ...k })));
  const [showGenForm, setShowGenForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('read,write:reminders');

  function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk_live_GLT';
    for (let i = 0; i < 16; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  function handleGenerateKey() {
    const name = newKeyName.trim();
    if (!name) { showToast('Please enter a name for the API key.', 'error'); return; }
    const now = new Date();
    const created = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullKey = generateRandomKey();
    const maskedKey = fullKey.substring(0, 15) + '••••••••';
    setKeys(prev => [{
      n: name,
      k: maskedKey,
      sc: newKeyScope,
      cr: created,
      lu: 'Never',
      s: 'active',
    }, ...prev]);
    setNewKeyName('');
    setNewKeyScope('read,write:reminders');
    setShowGenForm(false);
    showToast(`API key "${name}" generated. Key: ${fullKey}`);
  }

  function handleRevoke(i: number) {
    const name = keys[i].n;
    setKeys(prev => prev.filter((_, idx) => idx !== i));
    showToast(`API key "${name}" revoked.`);
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">API Keys</div><div className="page-desc">Manage third-party API credentials, OAuth tokens, and webhook secrets.</div></div>
        <button className="btn btn-primary" onClick={() => setShowGenForm(v => !v)}>
          {showGenForm ? '✕ Cancel' : '+ Generate Key'}
        </button>
      </div>

      {showGenForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Generate New API Key</div></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                <label className="form-label">Key Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Webhook Integration"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                <label className="form-label">Scope</label>
                <select
                  className="form-select"
                  value={newKeyScope}
                  onChange={e => setNewKeyScope(e.target.value)}
                >
                  <option value="read,write:reminders">read, write:reminders</option>
                  <option value="read:all">read:all</option>
                  <option value="webhooks:calendar">webhooks:calendar</option>
                  <option value="read:analytics">read:analytics</option>
                  <option value="admin:full">admin:full</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ marginBottom: 1 }} onClick={handleGenerateKey}>
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title">Active API Keys</div></div>
        <div className="card-body-flush table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Key</th><th>Scope</th><th>Created</th><th>Last Used</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {keys.map((k, i) => (
                <tr key={i}>
                  <td className="cell-primary">{k.n}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{k.k}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.sc}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.cr}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.lu}</td>
                  <td><span className={`badge badge-dot ${k.s === 'active' ? 'badge-green' : 'badge-gray'}`}> {k.s}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs">Rotate</button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleRevoke(i)}>Revoke</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const SETTINGS_DEFAULTS = {
  appName: 'GoodLifeTask',
  supportEmail: 'support@goodlifetask.com',
  timezone: 'UTC',
  appStoreUrl: '',
  playStoreUrl: '',
  maxFree: '20',
  maxPro: '9999',
  sessionTimeout: '60',
  rateLimit: '100',
  iosMin: '2.9.0',
  androidMin: '2.9.0',
  forceUpdateFrom: '2.8.0',
  analyticsProvider: 'Mixpanel',
};

function SettingsPage({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [settings, setSettings] = useState<Record<string, string>>(SETTINGS_DEFAULTS);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_settings');
      if (saved) setSettings({ ...SETTINGS_DEFAULTS, ...JSON.parse(saved) });
    } catch { /* ignore */ }
  }, []);

  function set(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    try {
      localStorage.setItem('admin_settings', JSON.stringify(settings));
      showToast('Settings saved successfully.');
    } catch {
      showToast('Failed to save settings.', 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">App Settings</div><div className="page-desc">Global platform configuration for GoodLifeTask across all platforms.</div></div>
        <button className="btn btn-primary" onClick={handleSave}>Save All Changes</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">General</div></div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Application Name</label><input className="form-input" value={settings.appName} onChange={e => set('appName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Support Email</label><input className="form-input" value={settings.supportEmail} onChange={e => set('supportEmail', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Default Timezone</label>
              <select className="form-select" value={settings.timezone} onChange={e => set('timezone', e.target.value)}>
                <option>UTC</option><option>America/New_York</option><option>Europe/London</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">App Store URL</label><input className="form-input" placeholder="https://apps.apple.com/app/..." value={settings.appStoreUrl} onChange={e => set('appStoreUrl', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Google Play URL</label><input className="form-input" placeholder="https://play.google.com/store/apps/..." value={settings.playStoreUrl} onChange={e => set('playStoreUrl', e.target.value)} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Usage Limits & Security</div></div>
          <div className="card-body">
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Max Reminders — Free</label><input className="form-input" type="number" value={settings.maxFree} onChange={e => set('maxFree', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Max Reminders — Pro</label><input className="form-input" type="number" value={settings.maxPro} onChange={e => set('maxPro', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Session Timeout <span className="form-sublabel">(mins)</span></label><input className="form-input" type="number" value={settings.sessionTimeout} onChange={e => set('sessionTimeout', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Rate Limit <span className="form-sublabel">(req/min)</span></label><input className="form-input" type="number" value={settings.rateLimit} onChange={e => set('rateLimit', e.target.value)} /></div>
            </div>
            <div className="divider" />
            <ToggleItem title="Require 2FA for Admin Accounts" defaultOn />
            <ToggleItem title="Maintenance Mode" desc="Take the platform offline for maintenance" defaultOn={false} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Mobile App Configuration</div></div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">iOS Minimum Version</label><input className="form-input" value={settings.iosMin} onChange={e => set('iosMin', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Android Minimum Version</label><input className="form-input" value={settings.androidMin} onChange={e => set('androidMin', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Force Update From Version</label><input className="form-input" value={settings.forceUpdateFrom} onChange={e => set('forceUpdateFrom', e.target.value)} /></div>
            <div className="divider" />
            <ToggleItem title="In-App Rating Prompt" defaultOn />
            <ToggleItem title="Beta Features (Test Users)" defaultOn />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Analytics & Privacy</div></div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Analytics Provider</label>
              <select className="form-select" value={settings.analyticsProvider} onChange={e => set('analyticsProvider', e.target.value)}>
                <option>Mixpanel</option><option>Amplitude</option><option>Firebase Analytics</option><option>PostHog (self-hosted)</option>
              </select>
            </div>
            <div className="divider" />
            <ToggleItem title="GDPR Cookie Consent Banner" defaultOn />
            <ToggleItem title="Anonymise User Analytics" defaultOn={false} />
            <ToggleItem title="Error Reporting (Sentry)" defaultOn />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Security</div><div className="page-desc">Authentication providers, threat monitoring, and encryption configuration.</div></div>
      </div>
      <div className="alert alert-success">
        <span className="alert-icon">🔒</span>
        <span><strong>No active threats detected</strong> — Last security scan completed 2 minutes ago. All systems secure.</span>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Auth Success Rate</div><div className="sc-icon-wrap ic-green">🛡</div></div><div className="sc-value">99.9%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Failed Login Attempts</div><div className="sc-icon-wrap ic-red">🚨</div></div><div className="sc-value">14</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Data Encryption</div><div className="sc-icon-wrap ic-brand">🔐</div></div><div className="sc-value">AES-256</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Transport Security</div><div className="sc-icon-wrap ic-blue">🔗</div></div><div className="sc-value">TLS 1.3</div></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Authentication Providers</div></div>
        <div className="card-body">
          <ToggleItem title="Google OAuth 2.0" desc="Sign in with Google — supports Google Workspace accounts" defaultOn />
          <ToggleItem title="Apple Sign In" desc="Required for iOS App Store compliance (iOS 13+)" defaultOn />
          <ToggleItem title="Microsoft Account" desc="Office 365 and personal Microsoft accounts" defaultOn />
          <ToggleItem title="Magic Link (Passwordless)" desc="Send one-time login link via email" defaultOn />
          <ToggleItem title="Biometric Authentication" desc="Face ID, Touch ID, and fingerprint unlock on mobile" defaultOn />
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const ANALYTICS_DATA = [
    { lbl: 'Jan', v: 45 }, { lbl: 'Feb', v: 60 }, { lbl: 'Mar', v: 55 },
    { lbl: 'Apr', v: 70 }, { lbl: 'May', v: 80 }, { lbl: 'Jun', v: 75 },
    { lbl: 'Jul', v: 90 }, { lbl: 'Aug', v: 85 }, { lbl: 'Sep', v: 95 },
    { lbl: 'Oct', v: 88 }, { lbl: 'Nov', v: 100 }, { lbl: 'Dec', v: 92 },
  ];
  const COUNTRIES = [
    { c: '🇺🇸 United States', p: 38 }, { c: '🇬🇧 United Kingdom', p: 14 },
    { c: '🇩🇪 Germany', p: 9 }, { c: '🇫🇷 France', p: 7 },
    { c: '🇯🇵 Japan', p: 6 }, { c: '🇧🇷 Brazil', p: 5 },
  ];
  const DEVICES = [
    { d: '📱 iOS', p: 42 }, { d: '🤖 Android', p: 38 },
    { d: '🖥 Desktop Web', p: 15 }, { d: '📟 Other', p: 5 },
  ];
  const FEATURES = [
    { f: '🔔 Push Notifications', p: 94 }, { f: '📅 Calendar Sync', p: 74 },
    { f: '🔄 Recurring Reminders', p: 68 }, { f: '🎙 Voice Reminders', p: 41 },
    { f: '📧 Email Reminders', p: 35 },
  ];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Analytics</div><div className="page-desc">Platform growth, user engagement, and retention metrics.</div></div>
        <select className="form-select" style={{ width: 140 }}><option>Last 7 days</option><option>Last 30 days</option><option>This Year</option></select>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">New Users</div><div className="sc-icon-wrap ic-brand">📈</div></div><div className="sc-value">8,420</div><div className="sc-trend trend-up">↑ 12% vs last week</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">7-Day Retention</div><div className="sc-icon-wrap ic-green">🔄</div></div><div className="sc-value">72%</div><div className="sc-trend trend-up">↑ 4%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Avg Session Duration</div><div className="sc-icon-wrap ic-amber">⏱</div></div><div className="sc-value">8.4m</div><div className="sc-trend trend-up">↑ 2 min</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Mobile Share</div><div className="sc-icon-wrap ic-blue">📱</div></div><div className="sc-value">68%</div><div className="sc-trend trend-neu">Stable</div></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">User Growth</div></div>
        <div className="card-body">
          <div className="bar-chart">
            {ANALYTICS_DATA.map((d, i) => (
              <div key={i} className="bar-col">
                <div className="bar-wrap">
                  <div className="bar-seg" style={{ height: `${d.v}%`, background: 'var(--brand)', opacity: 0.7 }} />
                </div>
                <div className="bar-lbl">{d.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Top Countries</div></div>
          <div className="card-body">
            {COUNTRIES.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{c.c}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 32, textAlign: 'right' }}>{c.p}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Devices</div></div>
          <div className="card-body">
            {DEVICES.map((d, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.d}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.p}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-muted)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${d.p}%`, background: 'var(--brand)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Popular Features</div></div>
          <div className="card-body">
            {FEATURES.map((f, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{f.f}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.p}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-muted)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${f.p}%`, background: 'var(--success)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Activity Logs</div><div className="page-desc">Real-time system event log and complete audit trail.</div></div>
        <button className="btn btn-secondary">↓ Export</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="form-input" placeholder="Filter log messages..." style={{ width: 240 }} />
        <select className="form-select" style={{ width: 120 }}><option>All Types</option><option>INFO</option><option>WARN</option><option>ERROR</option><option>OK</option></select>
        <select className="form-select" style={{ width: 130 }}><option>Last Hour</option><option>Last 24 hours</option><option>Last 7 days</option></select>
      </div>
      <div className="card">
        <div className="card-body" style={{ maxHeight: 560, overflowY: 'auto', paddingTop: 0, paddingBottom: 0 }}>
          {LOGS.map((log, i) => (
            <div key={i} className="log-row">
              <span className="log-time">{log.t}</span>
              <LogPill ty={log.ty} />
              <span className="log-msg">{log.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminApi.admin.stats().then(setStats).catch(() => {});
  }, []);

  const planCounts: Record<string, number> = {
    free:   stats?.freeUsers ?? 0,
    pro:    stats?.proUsers ?? 0,
    family: 0,
    team:   stats ? Math.max(0, stats.totalUsers - stats.freeUsers - stats.proUsers) : 0,
  };

  const planKeys = ['free', 'pro', 'family', 'team'];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Subscriptions</div><div className="page-desc">Manage plans, pricing tiers, and feature entitlements.</div></div>
      </div>

      {/* Live counts */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Total Users</div><div className="sc-icon-wrap ic-brand">👥</div></div><div className="sc-value">{stats ? stats.totalUsers.toLocaleString() : '—'}</div><div className="sc-trend trend-up">All plans</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Free</div><div className="sc-icon-wrap ic-gray">🆓</div></div><div className="sc-value">{stats ? stats.freeUsers.toLocaleString() : '—'}</div><div className="sc-trend trend-neu">$0 / mo</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Pro</div><div className="sc-icon-wrap ic-amber">💎</div></div><div className="sc-value">{stats ? stats.proUsers.toLocaleString() : '—'}</div><div className="sc-trend trend-up">$9.99 / mo</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Family</div><div className="sc-icon-wrap ic-amber">👨‍👩‍👧‍👦</div></div><div className="sc-value">{stats ? planCounts.family.toLocaleString() : '—'}</div><div className="sc-trend trend-neu">$14.99 / mo</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Team</div><div className="sc-icon-wrap ic-green">👥</div></div><div className="sc-value">{stats ? planCounts.team.toLocaleString() : '—'}</div><div className="sc-trend trend-neu">$24.99 / mo</div></div>
      </div>

      <div className="plan-grid">
        {PLANS.map((p, i) => (
          <div key={i} className={`plan-card${p.badge === 'Most Popular' ? ' featured' : ''}`}>
            {p.badge && <div className="plan-badge">{p.badge}</div>}
            <div className="plan-name">{p.n}</div>
            <div className="plan-price">{p.pr}<span> / month</span></div>
            <div className="plan-users">
              {stats
                ? `${planCounts[planKeys[i]] ?? 0} users on this plan`
                : `${p.u} users on this plan`}
            </div>
            {p.f.map((f, j) => (
              <div key={j} className="plan-feature"><span className="plan-check">✓</span>{f}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupPage({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [backups, setBackups] = useState(BACKUPS.map(b => ({ ...b })));
  const [creating, setCreating] = useState(false);

  function handleCreateBackup() {
    setCreating(true);
    setTimeout(() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
      const id = `BK-${dateStr}-${timeStr}`;
      const tm = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setBackups(prev => [{ id, tm, sz: '4.3 GB', ty: 'Manual', loc: 'AWS S3', s: 'success' }, ...prev]);
      setCreating(false);
      showToast('Backup created successfully.');
    }, 2000);
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Backup & Restore</div><div className="page-desc">Database snapshots, data export, and disaster recovery configuration.</div></div>
        <button className="btn btn-primary" onClick={handleCreateBackup} disabled={creating}>
          {creating ? '⏳ Creating…' : 'Create Backup Now'}
        </button>
      </div>
      <div className="alert alert-success">
        <span className="alert-icon">✅</span>
        <span><strong>Last backup: 2 hours ago</strong> — 4.2 GB · Stored in AWS S3 (us-east-1 + eu-west-1) · Status: Healthy</span>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Backup History</div></div>
        <div className="card-body-flush table-wrap">
          <table>
            <thead><tr><th>Backup ID</th><th>Timestamp</th><th>Size</th><th>Type</th><th>Storage</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{b.id}</td>
                  <td style={{ fontSize: 12 }}>{b.tm}</td>
                  <td style={{ fontWeight: 600 }}>{b.sz}</td>
                  <td><span className={`badge ${b.ty === 'Manual' ? 'badge-brand' : 'badge-gray'}`}>{b.ty}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.loc}</td>
                  <td><span className="badge badge-green badge-dot"> {b.s}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs">Download</button>
                      <button className="btn btn-secondary btn-xs">Restore</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BillingPage() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Billing & Revenue</div><div className="page-desc">Stripe, RevenueCat, and financial reporting dashboard.</div></div>
        <button className="btn btn-secondary">↓ Report</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Monthly Recurring Revenue</div><div className="sc-icon-wrap ic-green">💰</div></div><div className="sc-value">$24.8K</div><div className="sc-trend trend-up">↑ 18% MoM</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Annual Revenue YTD</div><div className="sc-icon-wrap ic-brand">📈</div></div><div className="sc-value">$182K</div><div className="sc-trend trend-up">On track</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Renewal Rate</div><div className="sc-icon-wrap ic-blue">🔁</div></div><div className="sc-value">94%</div><div className="sc-trend trend-up">↑ 2%</div></div>
        <div className="stat-card"><div className="sc-header"><div className="sc-label">Churn Rate</div><div className="sc-icon-wrap ic-red">📉</div></div><div className="sc-value">2.1%</div><div className="sc-trend trend-dn">↑ 0.2%</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Stripe — Web Payments</div>
            <span className="badge badge-green badge-dot"> Connected</span>
          </div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Publishable Key</label><input className="form-input" defaultValue="pk_live_GLT••••••••••••••••" /></div>
            <div className="form-group"><label className="form-label">Secret Key</label><input className="form-input" type="password" defaultValue="sk_live_GLT••••••••••••••••" /></div>
            <ToggleItem title="Webhook Active" desc="Receive payment events in real-time" defaultOn />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Save Configuration</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">RevenueCat — Mobile IAP</div>
            <span className="badge badge-green badge-dot"> Connected</span>
          </div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Public SDK Key</label><input className="form-input" defaultValue="appl_GLT••••••••••••" /></div>
            <div className="form-group"><label className="form-label">User ID Method</label><select className="form-select"><option>Email Address</option><option>UUID</option><option>Custom</option></select></div>
            <ToggleItem title="Restore Purchases" desc="Allow users to restore previous purchases" defaultOn />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Save Configuration</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PAGE LABELS FOR BREADCRUMB ──
const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', analytics: 'Analytics', logs: 'Activity Logs',
  users: 'User Management', roles: 'Roles & Permissions', subs: 'Subscriptions',
  categories: 'Categories', themes: 'Themes & UI', language: 'Languages', notifs: 'Push Notifications',
  webads: 'Web Ad Manager', mobileads: 'Mobile Ads', billing: 'Billing & Revenue',
  integrations: 'Integrations', voice: 'Voice Assistants', calsync: 'Calendar Sync',
  emailint: 'Email Clients', apikeys: 'API Keys',
  settings: 'App Settings', security: 'Security', backup: 'Backup & Restore',
};

// ── MAIN COMPONENT ──
export default function AdminDashboard() {
  const router = useRouter();
  const [activePage, setActivePage] = useState('dashboard');
  const [authChecked, setAuthChecked] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  function handleLogout() {
    localStorage.removeItem('admin_token');
    router.replace('/login');
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':    return <DashboardPage onNavigate={setActivePage} />;
      case 'users':        return <UsersPage />;
      case 'roles':        return <RolesPage />;
      case 'categories':   return <CategoriesPage showToast={showToast} />;
      case 'themes':       return <ThemesPage />;
      case 'language':     return <LanguagePage />;
      case 'notifs':       return <NotifsPage />;
      case 'webads':       return <WebAdsPage />;
      case 'mobileads':    return <MobileAdsPage />;
      case 'integrations': return <IntegrationsPage />;
      case 'voice':        return <VoicePage />;
      case 'calsync':      return <CalSyncPage />;
      case 'emailint':     return <EmailIntPage />;
      case 'apikeys':      return <ApiKeysPage showToast={showToast} />;
      case 'settings':     return <SettingsPage showToast={showToast} />;
      case 'security':     return <SecurityPage />;
      case 'analytics':    return <AnalyticsPage />;
      case 'logs':         return <LogsPage />;
      case 'subs':         return <SubsPage />;
      case 'backup':       return <BackupPage showToast={showToast} />;
      case 'billing':      return <BillingPage />;
      default: return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Coming Soon</div>
          <div style={{ fontSize: 13 }}>This page is under construction.</div>
        </div>
      );
    }
  };

  return (
    <div className="layout">
      <AdminSidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span>GoodLifeTask</span>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-cur">{PAGE_LABELS[activePage] || activePage}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-search">
              <span className="ts-icon">⌕</span>
              <input type="text" placeholder="Search users, settings..." />
              <span className="ts-kbd">⌘K</span>
            </div>
            <div className="status-badge">
              <div className="status-pip" />
              All Systems Operational
            </div>
            <div className="divider-v" />
            <div className="icon-btn">
              🔔<div className="notif-pip" />
            </div>
            <div className="icon-btn">📊</div>
            <div className="divider-v" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              style={{ fontSize: 12, color: 'var(--text-muted)', gap: 5 }}
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: 28, flex: 1 }}>
          {renderPage()}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 'var(--r-lg)',
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 400,
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
