# Session State

> This file is the source of truth for resuming work. Update it at the end of every session or whenever switching tasks.

## Last Updated
2026-03-15

## Current Status
**Idle — awaiting next task.**

## What Was Built (Initial Commit — 2026-03-14)

### Fully Working
- **Auth**: register, login, refresh, magic link, forgot/reset password, logout (JWT + HttpOnly cookie)
- **Reminders**: full CRUD, filter/paginate/sort, complete, snooze, duplicate, soft delete, recurrence scheduling, free-plan 20-cap enforcement
- **Reminder Lists**: CRUD, system list protection (Work/Personal/Health/Finance/Family/Travel/Shopping/Education)
- **Family Plans**: create family, invite by email (7-day token), accept invite, remove members, shared reminders
- **Team Plans**: workspaces, projects, member management (owner/admin/member), workspace tasks
- **Users**: get/update profile, change password, delete account, stats
- **Devices**: register/deregister push tokens (iOS/Android/Web)
- **Admin API**: login, dashboard stats, user list/create/update, bulk role, password reset, countries list
- **Countries/Languages**: 50+ countries, 100+ languages seeded
- **Web App**: login, register, dashboard (reminder list, stats, filter, create/snooze/delete)

### Stubbed / Not Yet Implemented
- **Email sending**: magic link, password reset, family/team invites all have TODO comments — no email provider integrated
- **Stripe billing**: checkout & portal return `null`, webhooks stored but not processed
- **Notifications**: BullMQ worker file exists, actual push/email/SMS delivery not implemented
- **Calendar sync**: endpoint exists, logic is placeholder
- **Mobile app**: minimal Expo shell only
- **Web pages that are empty**: calendar, lists, settings, family, team pages
- **Geofencing**: Location model exists, trigger logic missing
- **2FA/TOTP**: field in DB, no generation/validation endpoints
- **Real-time / WebSocket**: not implemented

### Known Bugs
- `lists.ts` soft-delete filter uses `deleted_at` (snake_case) but Prisma column is `deletedAt` — list queries likely broken
- Webhook endpoints have no signature validation (security risk)
- Admin password reset returns plaintext token in response

## Seed / Demo Accounts
| Email | Password | Plan |
|---|---|---|
| admin@goodlifetask.com | SuperAdmin123! | super_admin |
| free@demo.com | DemoUser123! | free |
| pro@demo.com | DemoUser123! | pro |

## Running Services
- Web: http://localhost:3000 (Next.js 14)
- Admin: http://localhost:3002 (Next.js 14)
- API: http://localhost:3001 (Fastify)
- Ports 3000, 3001, 3002 confirmed in use as of 2026-03-15

## Infrastructure
- DB: PostgreSQL via Prisma (Aurora in prod)
- Cache/Queue: Redis + BullMQ
- Docker Compose: `infrastructure/docker/docker-compose.yml`
- Terraform: `infrastructure/terraform/`
- CI: `.github/workflows/ci.yml`
- Deploy: `.github/workflows/deploy-prod.yml`

## Voice Input Feature (completed 2026-03-15)
- `apps/web/lib/voice-parser.ts` — NEW: pure NLP parser, converts transcript → `{ type, title, date, time, priority }`
- `apps/web/app/(app)/dashboard/page.tsx` — voice input added to `CreateReminderModal`
  - Mic button (🎤) in modal header, hidden on unsupported browsers
  - Three UI states: idle → listening (pulsing, live transcript) → confirm (parsed card + fill/retry)
  - `continuous = true` so mic waits for user to finish speaking
  - `getUserMedia` preflight to trigger browser permission prompt
  - Per-error-code toasts: `not-allowed`, `service-not-available`, `audio-capture`, `network`
- **Commits**: `115ece2`, `297e66d`, `ff0e90d`
- **Known limitation**: requires mic enabled in Windows → Privacy → Microphone AND allowed for localhost:3000 in Chrome

## Recently Edited Files
- `apps/web/lib/voice-parser.ts` — voice NLP parser (new file)
- `apps/web/app/(app)/dashboard/page.tsx` — voice input in CreateReminderModal
- `package.json` — added `"packageManager": "pnpm@9.15.9"` (needed by Turbo 2.x)
- `CLAUDE.md` — created project instructions

## Open Issues / Decisions Pending
1. **pnpm bin resolution bug**: workspace `.bin` scripts are broken due to `node-linker=hoisted`. Workaround documented in CLAUDE.md. Need team decision on fix strategy.
2. **Email provider**: need to pick and integrate (SendGrid, Resend, SES, etc.)
3. **Stripe keys**: integration stubbed, needs credentials + webhook secret
4. **lists.ts bug**: `deleted_at` vs `deletedAt` field name mismatch — fix needed
5. **Webhook signature validation**: Stripe & RevenueCat webhooks unsecured

## Next Steps (No active task — awaiting instructions)
