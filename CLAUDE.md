# GoodLifeTask — Claude Code Instructions

## FIRST THING ON EVERY SESSION
1. Read `SESSION.md` before doing anything else.
2. Run `git status` to see any uncommitted work.
3. **IMPORTANT — Admin dashboard:** All admin UI modules live in ONE large file: `apps/admin/app/dashboard/page.tsx`. Do NOT judge admin completeness by the file listing alone — always read the file or search it before concluding that pages are missing.

## GIT — COMMIT AFTER EVERY SIGNIFICANT CHANGE
- After completing any feature or meaningful change, immediately run: `git add -A && git commit -m "feat: <description>"`
- Do not wait until the end of the session. Commit frequently so work is never lost.
- Auto-save scheduled task runs every 30 min as a safety net, but manual commits after real work are preferred.

## Project
- **Product:** GoodLifeTask — cross-platform reminder & productivity app
- **Client:** GoodLifeTask | **Dev Team:** Antigravity
- **Brief:** `D:/APPDEV/GoodLifeTask_Development_Brief_Antigravity.docx`
- **Stack:** Turborepo + pnpm workspaces, TypeScript everywhere

## Apps & Services
| Package | Path | Port | Command |
|---|---|---|---|
| Web (Next.js 14) | `apps/web/` | 3000 | `pnpm web:dev` |
| Admin (Next.js 14) | `apps/admin/` | 3002 | `pnpm --filter @glt/admin dev` |
| API (Fastify) | `services/api/` | 3001 | `pnpm api:dev` |
| Workers (BullMQ) | `services/workers/` | — | `pnpm --filter @glt/workers dev` |
| Mobile (Expo) | `apps/mobile/` | — | `pnpm --filter @glt/mobile start` |

## Running the App
```bash
# All services (requires ports 3000, 3001, 3002 free)
pnpm dev

# Individual services
pnpm web:dev      # web only
pnpm api:dev      # api only
```

### Known Issue — pnpm bin resolution
With `node-linker=hoisted` + `shamefully-hoist=true`, workspace `.bin` scripts have broken relative paths (they point to workspace-local `node_modules/pkg` which doesn't exist — packages are hoisted to root). If `pnpm dev` fails with `Cannot find module ...node_modules/next/dist/bin/next`:
```bash
# Run Next.js directly via root node_modules
cd apps/web && node ../../node_modules/next/dist/bin/next dev -p 3000
cd apps/admin && node ../../node_modules/next/dist/bin/next dev -p 3002
# Run API directly
cd services/api && node ../../node_modules/tsx/dist/cli.mjs watch src/server.ts
```

## Key Business Rules
- Free plan: hard cap 20 reminders (enforced in `services/api/src/services/reminder.service.ts`)
- Plans: Free ($0) / Pro ($9.99/mo) / Team ($24.99/mo)
- JWT: 15-min access + 30-day refresh tokens
- Rate limit: 100 req/min per IP
- 5 reminder types: `call`, `task`, `email`, `location` (geofence), `event` (calendar-linked)

## Key Files
- Prisma schema: `services/api/prisma/schema.prisma`
- Auth service: `services/api/src/services/auth.service.ts`
- Reminder service: `services/api/src/services/reminder.service.ts`
- Notification worker: `services/workers/src/notification.worker.ts`
- Shared types: `packages/shared/src/`
- Theme tokens: `packages/shared/src/constants/themes.ts`

## END OF EVERY SESSION
Before the session ends or when switching tasks, update `SESSION.md` with:
- What was just completed
- Current state of any in-progress work (files edited, decisions made)
- Exact next steps to resume
