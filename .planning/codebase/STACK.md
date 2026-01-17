# Technology Stack

**Analysis Date:** 2025-01-17

## Languages

**Primary:**
- TypeScript 5.4.5 - All application code

**Secondary:**
- JavaScript - Build scripts, configuration files

## Runtime

**Environment:**
- Electron 33.4.5 - Desktop application framework
- Node.js 20.17.50+ - Electron runtime environment
- macOS, Windows, Linux - Cross-platform support

**Package Manager:**
- Bun - Primary package manager (evident from `bun.lockb`, `bun run` scripts)
- Lockfile: `bun.lockb` present

## Frameworks

**Core:**
- React 19.2.1 - UI framework for renderer process
- Electron Vite 3.0.0 - Build toolchain for Electron
- tRPC 11.7.1 - Type-safe RPC for main↔renderer communication

**Testing:**
- Not detected - No test framework configured yet

**Build/Dev:**
- Vite 6.3.4 - Frontend build tool
- TypeScript 5.4.5 - Type checking and compilation
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS - CSS processing with autoprefixer

## Key Dependencies

**Critical:**
- @anthropic-ai/claude-agent-sdk 0.2.5 - Claude AI integration
- better-sqlite3 11.8.1 - SQLite database
- drizzle-orm 0.45.1 - Database ORM
- trpc-electron 0.1.2 - Electron IPC bridge for tRPC
- electron-builder 25.1.8 - App packaging and distribution
- electron-updater 6.7.3 - Auto-updates

**State Management:**
- jotai 2.11.1 - Atomic state management
- zustand 5.0.3 - Persistent store (sub-chats, changes)
- @tanstack/react-query 5.90.10 - Server state management

**UI Components:**
- @radix-ui/* - Headless UI components (accordion, alert-dialog, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, popover, progress, select, slot, switch, tabs, tooltip, icons)
- lucide-react 0.468.0 - Icon library
- motion 11.15.0 - Animation library

**Terminal & Git:**
- xterm 5.3.0 - Terminal emulator
- @xterm/addon-* - Terminal addons (canvas, fit, search, serialize, web-links, webgl)
- node-pty 1.1.0 - Pseudo-terminal for process spawning
- simple-git 3.28.0 - Git operations
- @git-diff-view/react 0.0.35 - Git diff visualization
- @git-diff-view/shiki 0.0.36 - Syntax highlighting for diffs

**Utilities:**
- sonner 1.7.1 - Toast notifications
- posthog-js 1.239.1 - Analytics (renderer)
- posthog-node 5.20.0 - Analytics (main)
- @sentry/electron 7.5.0 - Error tracking
- zod 4.0.0 - Schema validation

## Configuration

**Environment:**
- `.env.example` template with optional variables
- Prefix-based environment variables:
  - `MAIN_VITE_*` - Main process (electron-vite)
  - `VITE_*` - Renderer process (Vite)
- Key optional vars: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, MAIN_VITE_SENTRY_DSN, MAIN_VITE_POSTHOG_KEY, VITE_POSTHOG_KEY

**Build:**
- `electron.vite.config.ts` - Electron build configuration
- `tsconfig.json` - TypeScript configuration (target: ES2022, jsx: react-jsx)
- `tailwind.config.js` - Tailwind CSS configuration
- `drizzle.config.ts` - Database schema configuration

## Platform Requirements

**Development:**
- Bun runtime
- Node.js 20+ (for Electron)
- Native module compilation (electron-rebuild for better-sqlite3, node-pty)

**Production:**
- Electron auto-updates via CDN (https://cdn.21st.dev/releases/desktop)
- macOS code signing (requires Apple Developer credentials)
- Multi-platform builds (DMG/ZIP for macOS, NSIS/portable for Windows, AppImage/DEB for Linux)

---
*Stack analysis: 2025-01-17*
*Update after major dependency changes*
