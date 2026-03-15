/**
 * Seed all static/dynamic translation keys for GoodLifeTask.
 * Run: DATABASE_URL=... npx tsx prisma/seed-translations.ts
 *
 * Namespaces:
 *   nav    – sidebar navigation labels
 *   page   – page titles and descriptions
 *   btn    – button labels
 *   form   – form labels, placeholders, hints
 *   badge  – status / plan badge text
 *   msg    – toast messages, errors, confirmations
 *   table  – table column headers
 *   common – misc shared strings
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type KeyDef = {
  key: string;
  namespace: 'nav' | 'page' | 'btn' | 'form' | 'badge' | 'msg' | 'table' | 'common';
  description: string;
  defaultValue: string;
  isStatic?: boolean;
};

const KEYS: KeyDef[] = [
  // ── NAV ────────────────────────────────────────────────────────────────────
  { key: 'nav.dashboard',        namespace: 'nav', description: 'Sidebar: Overview section',    defaultValue: 'Dashboard' },
  { key: 'nav.analytics',        namespace: 'nav', description: 'Sidebar: Overview section',    defaultValue: 'Analytics' },
  { key: 'nav.activity_logs',    namespace: 'nav', description: 'Sidebar: Overview section',    defaultValue: 'Activity Logs' },
  { key: 'nav.all_users',        namespace: 'nav', description: 'Sidebar: Users section',       defaultValue: 'All Users' },
  { key: 'nav.roles',            namespace: 'nav', description: 'Sidebar: Users section',       defaultValue: 'Roles & Permissions' },
  { key: 'nav.subscriptions',    namespace: 'nav', description: 'Sidebar: Users section',       defaultValue: 'Subscriptions' },
  { key: 'nav.categories',       namespace: 'nav', description: 'Sidebar: Application section', defaultValue: 'Categories' },
  { key: 'nav.themes',           namespace: 'nav', description: 'Sidebar: Application section', defaultValue: 'Themes & UI' },
  { key: 'nav.languages',        namespace: 'nav', description: 'Sidebar: Application section', defaultValue: 'Languages' },
  { key: 'nav.translations',     namespace: 'nav', description: 'Sidebar: Application section', defaultValue: 'Translations' },
  { key: 'nav.notifications',    namespace: 'nav', description: 'Sidebar: Application section', defaultValue: 'Notifications' },
  { key: 'nav.web_ads',          namespace: 'nav', description: 'Sidebar: Monetisation',        defaultValue: 'Web Ads' },
  { key: 'nav.mobile_ads',       namespace: 'nav', description: 'Sidebar: Monetisation',        defaultValue: 'Mobile Ads' },
  { key: 'nav.billing',          namespace: 'nav', description: 'Sidebar: Monetisation',        defaultValue: 'Billing & Revenue' },
  { key: 'nav.integrations',     namespace: 'nav', description: 'Sidebar: Integrations',        defaultValue: 'All Integrations' },
  { key: 'nav.voice',            namespace: 'nav', description: 'Sidebar: Integrations',        defaultValue: 'Voice Assistants' },
  { key: 'nav.calendar_sync',    namespace: 'nav', description: 'Sidebar: Integrations',        defaultValue: 'Calendar Sync' },
  { key: 'nav.email_clients',    namespace: 'nav', description: 'Sidebar: Integrations',        defaultValue: 'Email Clients' },
  { key: 'nav.api_keys',         namespace: 'nav', description: 'Sidebar: Integrations',        defaultValue: 'API Keys' },
  { key: 'nav.settings',         namespace: 'nav', description: 'Sidebar: System',              defaultValue: 'Settings' },
  { key: 'nav.security',         namespace: 'nav', description: 'Sidebar: System',              defaultValue: 'Security' },
  { key: 'nav.backup',           namespace: 'nav', description: 'Sidebar: System',              defaultValue: 'Backup & Restore' },

  // ── PAGE TITLES ───────────────────────────────────────────────────────────
  { key: 'page.dashboard.title',      namespace: 'page', description: 'Dashboard page heading',        defaultValue: 'Dashboard' },
  { key: 'page.dashboard.desc',       namespace: 'page', description: 'Dashboard page sub-heading',    defaultValue: 'Welcome back — here\'s what\'s happening on your platform today.' },
  { key: 'page.users.title',          namespace: 'page', description: 'User Management page heading',  defaultValue: 'User Management' },
  { key: 'page.users.desc',           namespace: 'page', description: 'User Management sub-heading',   defaultValue: 'Manage all registered users, subscription plans, and account status.' },
  { key: 'page.roles.title',          namespace: 'page', description: 'Roles page heading',            defaultValue: 'Roles & Permissions' },
  { key: 'page.roles.desc',           namespace: 'page', description: 'Roles page sub-heading',        defaultValue: 'Configure access levels and responsibilities for admin and user roles.' },
  { key: 'page.categories.title',     namespace: 'page', description: 'Categories page heading',       defaultValue: 'Categories' },
  { key: 'page.categories.desc',      namespace: 'page', description: 'Categories page sub-heading',   defaultValue: 'Manage reminder categories, icons, and color coding for the app.' },
  { key: 'page.themes.title',         namespace: 'page', description: 'Themes page heading',           defaultValue: 'Themes & UI' },
  { key: 'page.themes.desc',          namespace: 'page', description: 'Themes page sub-heading',       defaultValue: 'Manage visual themes, colour schemes, and interface preferences.' },
  { key: 'page.languages.title',      namespace: 'page', description: 'Languages page heading',        defaultValue: 'Languages' },
  { key: 'page.languages.desc',       namespace: 'page', description: 'Languages page sub-heading',    defaultValue: 'Browse all supported languages by country. Select a country to view its languages below.' },
  { key: 'page.translations.title',   namespace: 'page', description: 'Translations page heading',     defaultValue: 'Translations' },
  { key: 'page.translations.desc',    namespace: 'page', description: 'Translations page sub-heading', defaultValue: 'Manage and edit all app strings, menu labels, and content translations.' },
  { key: 'page.analytics.title',      namespace: 'page', description: 'Analytics page heading',        defaultValue: 'Analytics' },
  { key: 'page.analytics.desc',       namespace: 'page', description: 'Analytics page sub-heading',    defaultValue: 'Platform growth, user engagement, and retention metrics.' },
  { key: 'page.settings.title',       namespace: 'page', description: 'Settings page heading',         defaultValue: 'App Settings' },
  { key: 'page.settings.desc',        namespace: 'page', description: 'Settings page sub-heading',     defaultValue: 'Global platform configuration for GoodLifeTask across all platforms.' },
  { key: 'page.security.title',       namespace: 'page', description: 'Security page heading',         defaultValue: 'Security' },
  { key: 'page.security.desc',        namespace: 'page', description: 'Security page sub-heading',     defaultValue: 'Authentication providers, threat monitoring, and encryption configuration.' },
  { key: 'page.notifications.title',  namespace: 'page', description: 'Notifications page heading',    defaultValue: 'Push Notifications' },
  { key: 'page.notifications.desc',   namespace: 'page', description: 'Notifications page sub-heading',defaultValue: 'Configure delivery providers, templates, and broadcast settings.' },
  { key: 'page.billing.title',        namespace: 'page', description: 'Billing page heading',          defaultValue: 'Billing & Revenue' },
  { key: 'page.billing.desc',         namespace: 'page', description: 'Billing page sub-heading',      defaultValue: 'Stripe, RevenueCat, and financial reporting dashboard.' },
  { key: 'page.subs.title',           namespace: 'page', description: 'Subscriptions page heading',    defaultValue: 'Subscriptions' },
  { key: 'page.subs.desc',            namespace: 'page', description: 'Subscriptions page sub-heading',defaultValue: 'Manage plans, pricing tiers, and feature entitlements.' },
  { key: 'page.backup.title',         namespace: 'page', description: 'Backup page heading',           defaultValue: 'Backup & Restore' },
  { key: 'page.backup.desc',          namespace: 'page', description: 'Backup page sub-heading',       defaultValue: 'Database snapshots, data export, and disaster recovery configuration.' },
  { key: 'page.login.title',          namespace: 'page', description: 'Login page heading',            defaultValue: 'Admin Console' },
  { key: 'page.login.subtitle',       namespace: 'page', description: 'Login page sub-heading',        defaultValue: 'Sign in to your admin account' },

  // ── BUTTONS ───────────────────────────────────────────────────────────────
  { key: 'btn.save',           namespace: 'btn', description: 'Save button',                    defaultValue: 'Save' },
  { key: 'btn.save_changes',   namespace: 'btn', description: 'Save changes button',            defaultValue: 'Save Changes' },
  { key: 'btn.cancel',         namespace: 'btn', description: 'Cancel button',                  defaultValue: 'Cancel' },
  { key: 'btn.delete',         namespace: 'btn', description: 'Delete button',                  defaultValue: 'Delete' },
  { key: 'btn.edit',           namespace: 'btn', description: 'Edit button',                    defaultValue: 'Edit' },
  { key: 'btn.add',            namespace: 'btn', description: 'Add button',                     defaultValue: 'Add' },
  { key: 'btn.add_user',       namespace: 'btn', description: 'Add User button',                defaultValue: '+ Add User' },
  { key: 'btn.add_language',   namespace: 'btn', description: 'Add Language button',            defaultValue: '+ Add Language' },
  { key: 'btn.export',         namespace: 'btn', description: 'Export button',                  defaultValue: 'Export' },
  { key: 'btn.export_csv',     namespace: 'btn', description: 'Export CSV button',              defaultValue: '↓ Export CSV' },
  { key: 'btn.import',         namespace: 'btn', description: 'Import button',                  defaultValue: '↑ Import' },
  { key: 'btn.refresh',        namespace: 'btn', description: 'Refresh button',                 defaultValue: '↺ Refresh' },
  { key: 'btn.confirm',        namespace: 'btn', description: 'Confirm button',                 defaultValue: 'Confirm' },
  { key: 'btn.close',          namespace: 'btn', description: 'Close button',                   defaultValue: 'Close' },
  { key: 'btn.logout',         namespace: 'btn', description: 'Logout button',                  defaultValue: 'Logout' },
  { key: 'btn.login',          namespace: 'btn', description: 'Login button',                   defaultValue: 'Sign In' },
  { key: 'btn.reset_password', namespace: 'btn', description: 'Reset password button',          defaultValue: 'Reset Password' },
  { key: 'btn.send_broadcast', namespace: 'btn', description: 'Send broadcast button',          defaultValue: '📤 Send Broadcast' },
  { key: 'btn.connect',        namespace: 'btn', description: 'Connect integration button',     defaultValue: 'Connect' },
  { key: 'btn.disconnect',     namespace: 'btn', description: 'Disconnect integration button',  defaultValue: 'Disconnect' },
  { key: 'btn.configure',      namespace: 'btn', description: 'Configure button',               defaultValue: 'Configure' },
  { key: 'btn.view_all',       namespace: 'btn', description: 'View all link',                  defaultValue: 'View all →' },
  { key: 'btn.bulk_assign',    namespace: 'btn', description: 'Bulk assign role button',        defaultValue: 'Assign Role' },
  { key: 'btn.ban_user',       namespace: 'btn', description: 'Ban user button',                defaultValue: 'Ban User' },
  { key: 'btn.unban_user',     namespace: 'btn', description: 'Unban user button',              defaultValue: 'Unban User' },

  // ── FORM LABELS ───────────────────────────────────────────────────────────
  { key: 'form.name',              namespace: 'form', description: 'Name field label',              defaultValue: 'Name' },
  { key: 'form.email',             namespace: 'form', description: 'Email field label',             defaultValue: 'Email' },
  { key: 'form.password',          namespace: 'form', description: 'Password field label',          defaultValue: 'Password' },
  { key: 'form.confirm_password',  namespace: 'form', description: 'Confirm password field label',  defaultValue: 'Confirm Password' },
  { key: 'form.role',              namespace: 'form', description: 'Role field label',              defaultValue: 'Role' },
  { key: 'form.plan',              namespace: 'form', description: 'Plan field label',              defaultValue: 'Plan' },
  { key: 'form.status',            namespace: 'form', description: 'Status field label',            defaultValue: 'Status' },
  { key: 'form.language',          namespace: 'form', description: 'Language field label',          defaultValue: 'Language' },
  { key: 'form.country',           namespace: 'form', description: 'Country field label',           defaultValue: 'Country' },
  { key: 'form.timezone',          namespace: 'form', description: 'Timezone field label',          defaultValue: 'Timezone' },
  { key: 'form.search',            namespace: 'form', description: 'Search input placeholder',      defaultValue: 'Search...' },
  { key: 'form.search_users',      namespace: 'form', description: 'Search users placeholder',      defaultValue: 'Search users...' },
  { key: 'form.search_translations',namespace:'form', description: 'Search translations placeholder',defaultValue: 'Search keys or strings...' },
  { key: 'form.all_plans',         namespace: 'form', description: 'All plans filter option',       defaultValue: 'All Plans' },
  { key: 'form.all_status',        namespace: 'form', description: 'All status filter option',      defaultValue: 'All Status' },
  { key: 'form.all_namespaces',    namespace: 'form', description: 'All namespaces filter option',  defaultValue: 'All Categories' },
  { key: 'form.select_language',   namespace: 'form', description: 'Select language dropdown',      defaultValue: 'Select Language' },
  { key: 'form.translation_value', namespace: 'form', description: 'Translation value input label', defaultValue: 'Translation' },

  // ── STATUS BADGES ─────────────────────────────────────────────────────────
  { key: 'badge.active',       namespace: 'badge', description: 'Active status badge',       defaultValue: 'Active' },
  { key: 'badge.inactive',     namespace: 'badge', description: 'Inactive status badge',     defaultValue: 'Inactive' },
  { key: 'badge.pending',      namespace: 'badge', description: 'Pending status badge',      defaultValue: 'Pending' },
  { key: 'badge.suspended',    namespace: 'badge', description: 'Suspended status badge',    defaultValue: 'Suspended' },
  { key: 'badge.connected',    namespace: 'badge', description: 'Connected integration badge',  defaultValue: 'Connected' },
  { key: 'badge.available',    namespace: 'badge', description: 'Available integration badge',  defaultValue: 'Available' },
  { key: 'badge.coming_soon',  namespace: 'badge', description: 'Coming soon badge',         defaultValue: 'Coming Soon' },
  { key: 'badge.free',         namespace: 'badge', description: 'Free plan badge',           defaultValue: 'Free' },
  { key: 'badge.pro',          namespace: 'badge', description: 'Pro plan badge',            defaultValue: 'Pro' },
  { key: 'badge.team',         namespace: 'badge', description: 'Team plan badge',           defaultValue: 'Team' },
  { key: 'badge.family',       namespace: 'badge', description: 'Family plan badge',         defaultValue: 'Family' },
  { key: 'badge.translated',   namespace: 'badge', description: 'Translation translated badge', defaultValue: 'Translated' },
  { key: 'badge.missing',      namespace: 'badge', description: 'Translation missing badge',    defaultValue: 'Missing' },
  { key: 'badge.rtl',          namespace: 'badge', description: 'RTL language badge',        defaultValue: 'RTL' },

  // ── TABLE HEADERS ─────────────────────────────────────────────────────────
  { key: 'table.user',         namespace: 'table', description: 'User column header',        defaultValue: 'User' },
  { key: 'table.plan',         namespace: 'table', description: 'Plan column header',        defaultValue: 'Plan' },
  { key: 'table.role',         namespace: 'table', description: 'Role column header',        defaultValue: 'Role' },
  { key: 'table.status',       namespace: 'table', description: 'Status column header',      defaultValue: 'Status' },
  { key: 'table.joined',       namespace: 'table', description: 'Joined column header',      defaultValue: 'Joined' },
  { key: 'table.reminders',    namespace: 'table', description: 'Reminders column header',   defaultValue: 'Reminders' },
  { key: 'table.actions',      namespace: 'table', description: 'Actions column header',     defaultValue: 'Actions' },
  { key: 'table.key',          namespace: 'table', description: 'Translation key column',    defaultValue: 'Key' },
  { key: 'table.namespace',    namespace: 'table', description: 'Namespace column header',   defaultValue: 'Category' },
  { key: 'table.default',      namespace: 'table', description: 'Default value column',      defaultValue: 'English (Default)' },
  { key: 'table.translation',  namespace: 'table', description: 'Translation column header', defaultValue: 'Translation' },
  { key: 'table.last_updated', namespace: 'table', description: 'Last updated column',       defaultValue: 'Last Updated' },
  { key: 'table.size',         namespace: 'table', description: 'Size column header',        defaultValue: 'Size' },
  { key: 'table.type',         namespace: 'table', description: 'Type column header',        defaultValue: 'Type' },
  { key: 'table.location',     namespace: 'table', description: 'Location column header',    defaultValue: 'Location' },

  // ── MESSAGES ─────────────────────────────────────────────────────────────
  { key: 'msg.saved',              namespace: 'msg', description: 'Save success toast',           defaultValue: 'Changes saved successfully.' },
  { key: 'msg.deleted',            namespace: 'msg', description: 'Delete success toast',         defaultValue: 'Deleted successfully.' },
  { key: 'msg.error_generic',      namespace: 'msg', description: 'Generic error message',        defaultValue: 'Something went wrong. Please try again.' },
  { key: 'msg.loading',            namespace: 'msg', description: 'Loading state text',           defaultValue: 'Loading…' },
  { key: 'msg.no_results',         namespace: 'msg', description: 'Empty search results',         defaultValue: 'No results found.' },
  { key: 'msg.confirm_delete',     namespace: 'msg', description: 'Delete confirmation message',  defaultValue: 'Are you sure you want to delete this? This action cannot be undone.' },
  { key: 'msg.confirm_ban',        namespace: 'msg', description: 'Ban user confirmation',        defaultValue: 'Are you sure you want to suspend this user?' },
  { key: 'msg.user_created',       namespace: 'msg', description: 'User created success toast',   defaultValue: 'User created successfully.' },
  { key: 'msg.user_updated',       namespace: 'msg', description: 'User updated success toast',   defaultValue: 'User updated successfully.' },
  { key: 'msg.password_reset',     namespace: 'msg', description: 'Password reset success toast', defaultValue: 'Temporary password generated.' },
  { key: 'msg.translation_saved',  namespace: 'msg', description: 'Translation saved toast',      defaultValue: 'Translation saved.' },
  { key: 'msg.bulk_saved',         namespace: 'msg', description: 'Bulk translation saved toast', defaultValue: 'Translations saved.' },
  { key: 'msg.no_translation',     namespace: 'msg', description: 'Missing translation placeholder', defaultValue: 'No translation yet' },
  { key: 'msg.all_translated',     namespace: 'msg', description: 'All strings translated msg',   defaultValue: '✓ All strings are translated for this language.' },
  { key: 'msg.select_country',     namespace: 'msg', description: 'Select country prompt',        defaultValue: 'Select a country to view its languages' },

  // ── COMMON / MISC ─────────────────────────────────────────────────────────
  { key: 'common.app_name',        namespace: 'common', description: 'Application name',          defaultValue: 'GoodLifeTask' },
  { key: 'common.admin_console',   namespace: 'common', description: 'Admin console title',       defaultValue: 'Admin Console' },
  { key: 'common.all_systems',     namespace: 'common', description: 'System status indicator',   defaultValue: 'All Systems Operational' },
  { key: 'common.production',      namespace: 'common', description: 'Environment label',         defaultValue: 'Production' },
  { key: 'common.total_users',     namespace: 'common', description: 'Total users stat label',    defaultValue: 'Total Users' },
  { key: 'common.pro_subscribers', namespace: 'common', description: 'Pro subscribers stat label',defaultValue: 'Pro Subscribers' },
  { key: 'common.revenue_today',   namespace: 'common', description: 'Revenue today stat label',  defaultValue: 'Revenue Today' },
  { key: 'common.total_languages', namespace: 'common', description: 'Total languages stat',      defaultValue: 'Total Languages' },
  { key: 'common.countries',       namespace: 'common', description: 'Countries stat label',      defaultValue: 'Countries' },
  { key: 'common.translated',      namespace: 'common', description: 'Translated count label',    defaultValue: 'Translated' },
  { key: 'common.missing',         namespace: 'common', description: 'Missing count label',       defaultValue: 'Missing' },
  { key: 'common.coverage',        namespace: 'common', description: 'Coverage % label',          defaultValue: 'Coverage' },

  // ── WEB APP – reminder types (user-facing) ───────────────────────────────
  { key: 'reminder.type.call',     namespace: 'common', description: 'Reminder type: Call',       defaultValue: 'Call', isStatic: false },
  { key: 'reminder.type.task',     namespace: 'common', description: 'Reminder type: Task',       defaultValue: 'Task', isStatic: false },
  { key: 'reminder.type.email',    namespace: 'common', description: 'Reminder type: Email',      defaultValue: 'Email', isStatic: false },
  { key: 'reminder.type.location', namespace: 'common', description: 'Reminder type: Location',   defaultValue: 'Location', isStatic: false },
  { key: 'reminder.type.event',    namespace: 'common', description: 'Reminder type: Event',      defaultValue: 'Event', isStatic: false },

  // ── WEB APP – system list names ───────────────────────────────────────────
  { key: 'list.work',     namespace: 'common', description: 'System list name: Work',       defaultValue: 'Work',      isStatic: false },
  { key: 'list.personal', namespace: 'common', description: 'System list name: Personal',   defaultValue: 'Personal',  isStatic: false },
  { key: 'list.health',   namespace: 'common', description: 'System list name: Health',     defaultValue: 'Health',    isStatic: false },
  { key: 'list.finance',  namespace: 'common', description: 'System list name: Finance',    defaultValue: 'Finance',   isStatic: false },
  { key: 'list.family',   namespace: 'common', description: 'System list name: Family',     defaultValue: 'Family',    isStatic: false },
  { key: 'list.travel',   namespace: 'common', description: 'System list name: Travel',     defaultValue: 'Travel',    isStatic: false },
  { key: 'list.shopping', namespace: 'common', description: 'System list name: Shopping',   defaultValue: 'Shopping',  isStatic: false },
  { key: 'list.education',namespace: 'common', description: 'System list name: Education',  defaultValue: 'Education', isStatic: false },

  // ── WEB APP – plan names ──────────────────────────────────────────────────
  { key: 'plan.free.name',   namespace: 'common', description: 'Plan name: Free',   defaultValue: 'Free',   isStatic: false },
  { key: 'plan.pro.name',    namespace: 'common', description: 'Plan name: Pro',    defaultValue: 'Pro',    isStatic: false },
  { key: 'plan.team.name',   namespace: 'common', description: 'Plan name: Team',   defaultValue: 'Team',   isStatic: false },
  { key: 'plan.family.name', namespace: 'common', description: 'Plan name: Family', defaultValue: 'Family', isStatic: false },
  { key: 'plan.free.price',  namespace: 'common', description: 'Plan price: Free',  defaultValue: '$0',     isStatic: false },
  { key: 'plan.pro.price',   namespace: 'common', description: 'Plan price: Pro',   defaultValue: '$9.99/mo', isStatic: false },
  { key: 'plan.team.price',  namespace: 'common', description: 'Plan price: Team',  defaultValue: '$24.99/mo', isStatic: false },
  { key: 'plan.family.price',namespace: 'common', description: 'Plan price: Family',defaultValue: '$14.99/mo', isStatic: false },
];

async function main() {
  console.log(`🌱 Seeding ${KEYS.length} translation keys…`);
  let created = 0, skipped = 0;

  for (const k of KEYS) {
    const existing = await prisma.translationKey.findUnique({ where: { key: k.key } });
    if (existing) { skipped++; continue; }

    await prisma.translationKey.create({
      data: {
        key:          k.key,
        namespace:    k.namespace,
        description:  k.description,
        defaultValue: k.defaultValue,
        isStatic:     k.isStatic ?? true,
      },
    });
    created++;
  }

  console.log(`✅ Done — ${created} created, ${skipped} already existed`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
