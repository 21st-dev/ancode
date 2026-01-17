# Architecture

**Analysis Date:** 2025-01-17

## Pattern Overview

**Overall:** Electron Desktop Application with Multi-Process Architecture

**Key Characteristics:**
- Three-process Electron architecture (Main, Preload, Renderer)
- tRPC-based IPC communication layer
- Local-first data storage with SQLite
- Real-time Claude AI integration via SDK
- Git worktree-based chat isolation (planned)

## Layers

**Main Process Layer:**
- Purpose: Application lifecycle, native APIs, business logic
- Contains: Database access, OAuth, Claude SDK, Git operations, tRPC routers
- Location: `src/main/`
- Depends on: Electron APIs, Node.js modules, native OS integrations
- Used by: Renderer via tRPC through Preload bridge

**Preload Layer:**
- Purpose: IPC bridge and context isolation (security boundary)
- Contains: tRPC exposure, limited desktop API exposure
- Location: `src/preload/index.ts`
- Depends on: Main process (tRPC), Electron APIs
- Used by: Renderer process

**Renderer Layer:**
- Purpose: React UI, user interactions
- Contains: Features (agents, sidebar, changes, terminal), UI components, state management
- Location: `src/renderer/`
- Depends on: tRPC client (via Preload), React ecosystem
- Used by: End user

**Shared Types:**
- Purpose: Type definitions shared between processes
- Location: `src/shared/`
- Contains: Git change types, common interfaces

## Data Flow

**User Action (e.g., Create Chat):**

1. User clicks action in Renderer (`src/renderer/`)
2. Component calls tRPC router mutation (e.g., `chats.create`)
3. Call goes through Preload bridge (`trpc-electron`)
4. Main process router handles request (`src/main/lib/trpc/routers/chats.ts`)
5. Router calls service layer or database (`src/main/lib/db/`)
6. Result returns through same path back to UI
7. React Query caches result and triggers re-render

**Claude AI Execution:**

1. User sends message via Agent UI
2. `src/main/lib/trpc/routers/claude.ts` streams response
3. Message content rendered in real-time to UI
4. Tool executions (bash, file ops) streamed as events

**State Management:**
- **Jotai** (`src/renderer/lib/atoms/`) - Ephemeral UI state (selected chat, sidebar open state)
- **Zustand** (`src/renderer/lib/stores/`) - Persistent state (sub-chats, pinned tabs)
- **React Query** - Server state cache (projects, chats, Claude responses)

## Key Abstractions

**tRPC Router:**
- Purpose: Type-safe API layer between Main and Renderer
- Examples: `src/main/lib/trpc/routers/chats.ts`, `projects.ts`, `claude.ts`
- Pattern: Define procedures in Main, call from Renderer with full type safety

**Database (Drizzle ORM):**
- Purpose: Data persistence layer
- Examples: `src/main/lib/db/schema/index.ts` (table definitions), `src/main/lib/db/index.ts` (init, queries)
- Pattern: Schema-first ORM with auto-migration on app startup

**Auth Manager:**
- Purpose: OAuth authentication flow
- Location: `src/main/auth-manager.ts`
- Pattern: Deep link protocol handler → token exchange → secure storage

**Git Operations:**
- Purpose: Git repository access for worktrees
- Location: `src/main/lib/git/`
- Pattern: simple-git wrapper with typed outputs

## Entry Points

**Main Process:**
- Location: `src/main/index.ts`
- Triggers: Electron app launch
- Responsibilities: App lifecycle, window creation, database init, protocol handler registration

**Preload:**
- Location: `src/preload/index.ts`
- Triggers: Renderer window creation
- Responsibilities: Expose tRPC to renderer, expose limited desktop API

**Renderer:**
- Location: `src/renderer/index.tsx`, `src/renderer/main.tsx`
- Triggers: Window load
- Responsibilities: React app mount, provider setup

**Electron Builder:**
- Location: `electron.vite.config.ts`, package.json build config
- Triggers: Build process
- Responsibilities: Code signing, notarization, packaging

## Error Handling

**Strategy:** Try-catch at service boundaries, propagate errors through tRPC

**Patterns:**
- tRPC procedures wrap errors in TRPCError
- Components use React Query error callbacks for user-facing messages
- Auth failures handled with re-auth prompts

## Cross-Cutting Concerns

**Logging:**
- electron-log for structured logging
- Console for development (not for production)

**Validation:**
- Zod schemas at tRPC input boundaries
- TypeScript strict mode throughout

**Authentication:**
- Auth state managed via tRPC context (`src/renderer/contexts/TRPCProvider.tsx`)
- Protected routes check auth state before allowing access

**Security:**
- Context isolation between Main and Renderer
- SafeStorage encryption for tokens
- Deep link protocol for OAuth (prevents token leakage via URL)

---
*Architecture analysis: 2025-01-17*
*Update when major patterns change*
