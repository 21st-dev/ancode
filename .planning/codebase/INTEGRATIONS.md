# External Integrations

**Analysis Date:** 2025-01-17

## APIs & External Services

**Anthropic Claude:**
- SDK integration: `@anthropic-ai/claude-agent-sdk` 0.2.5
- Purpose: AI assistant for code assistance
- Implementation:
  - `src/main/lib/claude/env.ts` - Claude binary management
  - `src/main/lib/trpc/routers/claude.ts` - Claude API integration
- Dynamic import required (ESM module)

**21st.dev Backend:**
- Purpose: User authentication and CDN hosting
- `src/main/auth-manager.ts` - OAuth flow management
- `src/main/auth-store.ts` - Encrypted credential storage
- `package.json`: `"provider": "generic", "url": "https://cdn.21st.dev/releases/desktop"`

## Data Storage

**Databases:**
- **SQLite** - Local database via better-sqlite3
  - Connection: Direct file access `{userData}/data/agents.db`
  - Client: Drizzle ORM 0.45.1
  - Migrations: `drizzle-kit generate` (dev), auto-migrate on startup
  - Schema: `src/main/lib/db/schema/index.ts` (projects, chats, sub_chats tables)

**File Storage:**
- Local filesystem only
- No cloud storage integration

**Caching:**
- In-memory only (Jotai, Zustand)

## Authentication & Identity

**Auth Provider:**
- Custom OAuth implementation via 21st.dev
- Deep link authentication: `twentyfirst-agents://` protocol (dev), `twentyfirst-agents-dev://` (dev mode)
- Implementation: `src/main/auth-manager.ts`
- Token storage: Electron's `safeStorage` API (OS keychain encryption)
- Session management: JWT tokens with refresh flow

**OAuth Integrations:**
- None detected - uses custom provider

## Monitoring & Observability

**Error Tracking:**
- Sentry - Optional (configured via `MAIN_VITE_SENTRY_DSN`)
- Package: `@sentry/electron` 7.5.0

**Analytics:**
- PostHog - Optional (configured via `MAIN_VITE_POSTHOG_KEY`, `VITE_POSTHOG_KEY`)
- Packages: `posthog-node` 5.20.0 (main), `posthog-js` 1.239.1 (renderer)

**Logs:**
- stdout/stderr only (no external log aggregation)
- electron-log 5.4.3 for logging utilities

## CI/CD & Deployment

**Hosting:**
- Cloudflare R2 CDN - Auto-update payloads
- URL: `https://cdn.21st.dev/releases/desktop`
- Manifests: `latest-mac.yml`, `latest-mac-x64.yml`

**CI Pipeline:**
- No CI detected - Manual release process via `bun run release`
- Release script: `scripts/sync-to-public.sh` (syncs to public GitHub repo)

**Public Repository:**
- `21st-dev/1code` on GitHub
- Synced via `bun run sync:public` (excludes private files)

## Environment Configuration

**Development:**
- Required env vars: None (all optional)
- Secrets location: `.env.local` (gitignored), OS keychain for auth tokens
- Local development: `bun run dev`

**Staging:**
- Not applicable (single production deployment model)

**Production:**
- Secrets management: Environment variables at build time
- Failover/redundancy: CDN-based distribution

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Notable Absences

- No payment processing (Stripe, etc.)
- No cloud database (Supabase, Firebase)
- no third-party Git provider APIs (GitHub API, GitLab API) - uses local Git only
- No email service (SendGrid, etc.)
- No file storage services (S3, etc.)

---
*Integration audit: 2025-01-17*
*Update when adding/removing external services*
