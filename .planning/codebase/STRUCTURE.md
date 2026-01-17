# Codebase Structure

**Analysis Date:** 2025-01-17

## Directory Layout

```
21st-desktop/
├── apps/desktop/        # Main application (monorepo root for build)
│   ├── electron.vite.config.ts  # Electron build configuration
│   ├── package.json          # Dependencies and scripts
│   ├── tsconfig.json         # TypeScript configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── drizzle.config.ts    # Database ORM configuration
│   ├── .env.example          # Environment variable template
│   │
│   ├── scripts/              # Build and release scripts
│   │   ├── download-claude-binary.mjs
│   │   ├── generate-icon.mjs
│   │   ├── generate-update-manifest.mjs
│   │   └── sync-to-public.sh
│   │
│   ├── src/
│   │   ├── main/              # Electron main process
│   │   │   ├── index.ts       # App entry point, window lifecycle
│   │   │   ├── auth-manager.ts   # OAuth flow, token refresh
│   │   │   ├── auth-store.ts     # Encrypted credential storage
│   │   │   ├── windows/        # Window creation
│   │   │   │   └── main.ts     # Main window setup
│   │   │   ├── lib/
│   │   │   │   ├── db/          # Drizzle + SQLite database
│   │   │   │   │   ├── index.ts    # DB init, auto-migrate
│   │   │   │   │   ├── schema/    # Drizzle table definitions
│   │   │   │   │   └── utils.ts   # ID generation
│   │   │   │   ├── trpc/       # tRPC backend
│   │   │   │   │   └── routers/   # tRPC procedures
│   │   │   │   │       ├── chats.ts
│   │   │   │   │       ├── projects.ts
│   │   │   │   │       ├── claude.ts
│   │   │   │   │       └── index.ts
│   │   │   │   ├── git/        # Git operations wrapper
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── status.ts
│   │   │   │   │   ├── file-contents.ts
│   │   │   │   │   └── utils/
│   │   │   │   ├── claude/      # Claude SDK integration
│   │   │   │   │   ├── env.ts      # Claude binary management
│   │   │   │   │   └── index.ts
│   │   │   │   └── analytics.ts # PostHog analytics
│   │   │   └── db.ts           # Database singleton export
│   │   │
│   │   ├── preload/           # IPC bridge (context isolation)
│   │   │   └── index.ts       # Exposes tRPC + desktopApi
│   │   │
│   │   ├── renderer/          # React UI application
│   │   │   ├── index.tsx      # App root
│   │   │   ├── main.tsx       # React entry
│   │   │   ├── contexts/     # React providers
│   │   │   ├── features/      # Feature modules
│   │   │   │   ├── agents/     # Main chat interface
│   │   │   │   │   ├── main/     # active-chat, new-chat-form
│   │   │   │   │   ├── ui/       # Tool renderers, preview, diff
│   │   │   │   │   ├── commands/ # Slash commands
││   │   │   │   │   ├── atoms/    # Jotai atoms for agent state
│   │   │   │   │   └── stores/   # Zustand stores for sub-chats
│   │   │   │   ├── sidebar/   # Chat list, archive navigation
│   │   │   │   ├── sub-chats/ # Tab/sidebar sub-chat management
│   │   │   │   ├── terminal/  # Terminal UI with xterm.js
│   │   │   │   ├── changes/   # Git diff visualization
│   │   │   │   ├── layout/    # Main layout with resizable panels
│   │   │   │   └── ui/        # Radix UI wrappers (button, dialog, etc.)
│   │   │   ├── components/ui/  # More shared UI components
│   │   │   ├── lib/          # Utilities and stores
│   │   │   │   ├── atoms/    # Global Jotai atoms
│   │   │   │   ├── stores/   # Global Zustand stores
│   │   │   │   ├── trpc.ts    # tRPC client setup
│   │   │   │   └── mock-api.ts # DEPRECATED - being replaced
│   │   │   └── index.html    # HTML entry point
│   │   │
│   │   └── shared/           # Shared types between processes
│   │       └── changes-types.ts # Git change type definitions
│   │
│   ├── resources/           # Native assets (icons, backgrounds)
│   │   ├── icons/           # App icons
│   │   └── bin/             # Platform-specific binaries
│   │
│   └── release/             # Packaged application output
│
├── .claude/                 # Claude Code configuration (plugin resources)
├── CLAUDE.md                # Project documentation for Claude Code
└── bun.lockb               # Bun lockfile
```

## Directory Purposes

**apps/desktop/:** (Monorepo root location)
- Purpose: Desktop application source code
- Contains: All application code, configuration, resources
- Key files: `package.json`, `electron.vite.config.ts`, `.env.example`
- Subdirectories: `src/`, `scripts/`, `resources/`, `release/`

**src/main/:**
- Purpose: Electron main process - native APIs and business logic
- Contains: App lifecycle, window management, IPC handlers, database, tRPC routers
- Key files: `index.ts` (app entry), `auth-manager.ts`, `auth-store.ts`
- Subdirectories: `lib/` (utilities), `windows/` (window setup)

**src/preload/:**
- Purpose: Preload script - IPC bridge between main and renderer
- Contains: tRPC exposure, limited desktop API exposure
- Key files: `index.ts`
- Note: Single file - context isolation security boundary

**src/renderer/:**
- Purpose: Renderer process - React UI
- Contains: React application, features, components, state
- Key files: `App.tsx`, `main.tsx`, `index.html`
- Subdirectories: `features/`, `contexts/`, `lib/`, `components/`

**src/renderer/features/:**
- Purpose: Feature modules (vertical slice organization)
- Contains: `agents/` (chat), `sidebar/`, `terminal/`, `changes/`, `layout/`
- Organization: Each feature has `main/`, `ui/`, `atoms/`, `stores/` as needed

**src/main/lib/db/:**
- Purpose: Database layer using Drizzle ORM + SQLite
- Contains: Schema definitions, migrations, queries
- Key files: `index.ts` (DB init), `schema/index.ts` (all tables)

**src/main/lib/trpc/routers/:**
- Purpose: tRPC API endpoints for renderer
- Contains: Route handlers for chats, projects, Claude, agents
- Pattern: One router per domain, exports procedures

**scripts/:**
- Purpose: Build and release automation
- Contains: Claude binary download, icon generation, manifest generation, public repo sync
- Key files: `download-claude-binary.mjs`, `sync-to-public.sh`

**resources/:**
- Purpose: Native assets for packaging
- Contains: App icons, platform-specific binaries
- Note: Generated/build artifacts

## Key File Locations

**Entry Points:**
- `src/main/index.ts` - Main process entry, app lifecycle
- `src/preload/index.ts` - Preload script, IPC bridge
- `src/renderer/main.tsx` - React app mount
- `src/renderer/index.html` - HTML entry point

**Configuration:**
- `package.json` - Dependencies, scripts, metadata
- `electron.vite.config.ts` - Electron build config
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.js` - Tailwind CSS configuration
- `drizzle.config.ts` - Database schema config
- `.env.example` - Environment variable template

**Core Logic:**
- `src/main/lib/db/` - Database operations (Drizzle ORM)
- `src/main/lib/trpc/routers/` - API endpoints (tRPC)
- `src/main/auth-manager.ts` - OAuth authentication
- `src/main/auth-store.ts` - Token storage
- `src/main/lib/git/` - Git operations

**UI:**
- `src/renderer/features/agents/main/` - Active chat interface
- `src/renderer/features/sidebar/` - Chat list navigation
- `src/renderer/features/terminal/` - Terminal UI
- `src/renderer/components/ui/` - Reusable UI components

## Naming Conventions

**Files:**
- TypeScript: kebab-case with `.ts` extension (e.g., `auth-store.ts`, `claude-env.ts`)
- React: PascalCase with `.tsx` extension (e.g., `ActiveChat.tsx`, `AgentsSidebar.tsx`)
- Config: kebab-case with extension (e.g., `electron.vite.config.ts`, `tailwind.config.js`)
- Scripts: kebab-case with `.mjs` or `.sh` (e.g., `download-claude-binary.mjs`, `sync-to-public.sh`)

**Directories:**
- kebab-case for all directories (e.g., `features/`, `sub-chats/`, `file-contents/`)
- Plural names for collections (e.g., `atoms/`, `stores/`, `commands/`, `components/`, `utils/`, `hooks/`)

**Special Patterns:**
- `index.ts` - Directory exports / barrel files
- `main.ts` - Entry point files (main process, renderer)
- `*.test.ts` - Test files (not currently used)
- `*.spec.ts` - Spec files (not currently used)

## Where to Add New Code

**New Feature (UI + Business Logic):**
- Primary UI: `src/renderer/features/[feature-name]/main/`
- UI components: `src/renderer/features/[feature-name]/ui/`
- State: `src/renderer/features/[feature-name]/atoms/` or `stores/`
- API: `src/main/lib/trpc/routers/[feature].ts`

**New tRPC Procedure:**
- Router file: `src/main/lib/trpc/routers/[domain].ts`
- Export from: `src/main/lib/trpc/index.ts`

**New Database Table:**
- Schema: `src/main/lib/db/schema/[table].ts`
- Export from: `src/main/lib/db/schema/index.ts`

**New Shared Type:**
- Definition: `src/shared/[types].ts`
- Import where needed in main/renderer

**New UI Component:**
- Shared: `src/renderer/components/ui/[Component].tsx`
- Feature-specific: `src/renderer/features/[feature]/ui/[Component].tsx`

## Special Directories

**resources/:**
- Purpose: Native application assets (icons, binaries)
- Source: Generated (icons) or build artifacts (binaries)
- Committed: Yes (icons), No (binaries in .gitignore)

**release/:**
- Purpose: Packaged application output
- Source: Generated by electron-builder
- Committed: No (in .gitignore)

**.claude/:**
- Purpose: Claude Code plugin resources (if installed)
- Source: Installed from external source
- Committed: Depends (usually not committed)

---
*Structure analysis: 2025-01-17*
*Update when directory structure changes*
