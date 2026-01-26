# 1Code Project Overview

**Last Updated:** January 26, 2026  
**Version:** 0.0.31  
**Repository:** [21st-dev/1code](https://github.com/21st-dev/1code)

## 🎯 Project Mission

1Code is a local-first Electron desktop application that provides the best UI for Claude Code with local and remote agent execution. It enables developers to work with AI agents in isolated git worktrees, see real-time tool execution, and manage code changes safely.

## ✨ Key Features

### Git Worktree Isolation
- Each chat session runs in its own isolated git worktree
- Never accidentally commit to main branch
- Background execution while you continue working
- Local-first - all code stays on your machine

### Cursor-like UI
- Diff previews showing exactly what Claude is changing
- Built-in git client for staging, committing, and branch management
- Real-time tool execution visualization
- Change tracking and PR management

### Plan & Agent Modes
- **Plan Mode:** Read-only analysis with structured plans
- **Agent Mode:** Full code execution permissions
- Clarifying questions before execution
- Clean markdown preview of plans

### Additional Features
- Project management with automatic Git remote detection
- Integrated terminal access
- Multiple sub-chats per project
- Archive and organization tools

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 33.4.5, electron-vite, electron-builder |
| UI Framework | React 19, TypeScript 5.4.5 |
| Styling | Tailwind CSS, Radix UI |
| State Management | Jotai (UI state), Zustand (persisted), React Query (server) |
| Backend | tRPC, Drizzle ORM, better-sqlite3 |
| AI Integration | @anthropic-ai/claude-agent-sdk |
| Package Manager | Bun |

### Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry, lifecycle
│   ├── auth-manager.ts      # OAuth flow
│   ├── auth-store.ts        # Encrypted storage
│   └── lib/
│       ├── db/              # Database (Drizzle + SQLite)
│       ├── trpc/routers/    # tRPC API endpoints
│       ├── git/             # Git operations & worktrees
│       ├── claude/          # Claude SDK integration
│       └── terminal/        # Terminal session management
│
├── preload/                 # IPC bridge (context isolation)
│   └── index.ts             # Exposes desktopApi + tRPC
│
└── renderer/                # React UI
    ├── App.tsx              # Root component
    ├── features/
    │   ├── agents/          # Main chat interface
    │   ├── sidebar/         # Chat list & navigation
    │   ├── layout/          # Resizable panels
    │   └── onboarding/      # Setup flows
    └── components/ui/       # Radix UI components
```

### Database Schema

```typescript
projects (id, name, path, gitRemoteUrl, ...)
  └── chats (id, name, projectId, worktreePath, branch, ...)
      └── sub_chats (id, name, chatId, sessionId, mode, messages, ...)
```

**Location:** `{userData}/data/agents.db` (SQLite)  
**Auto-migration:** Runs on app startup

## 🔐 Security & Privacy

- **Local-first:** All code stays on your machine
- **Encrypted storage:** OAuth tokens encrypted with Electron's safeStorage
- **Context isolation:** Preload script isolates Node.js APIs
- **Path validation:** Git operations validate paths before execution
- **Worktree isolation:** Each session isolated from main branch

## 🚀 Getting Started

### Development

```bash
# Install dependencies
bun install

# Download Claude binary (required!)
bun run claude:download

# Start dev server
bun run dev
```

### Building

```bash
# Build for current platform
bun run build
bun run package:mac    # macOS
bun run package:win    # Windows
bun run package:linux  # Linux
```

### Database

```bash
# Generate migrations
bun run db:generate

# Push schema (dev only)
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

## 📊 Recent Improvements (Jan 26, 2026)

### Code Quality
- ✅ Removed debug code from production
- ✅ Added React Error Boundaries
- ✅ Created centralized logging utilities
- ✅ Documented all TODOs with context
- ✅ Extracted shared components (reduced duplication)

### Reliability
- ✅ Error boundaries prevent app crashes
- ✅ Environment-aware logging (dev vs production)
- ✅ Memory leak audit (none found)
- ✅ Proper cleanup patterns verified

### Maintainability
- ✅ Shared todo components
- ✅ Consistent logging format
- ✅ Better code organization
- ✅ Comprehensive documentation

## 🔧 Development Workflow

### Adding Features

1. **Database Changes:**
   - Update schema in `src/main/lib/db/schema/index.ts`
   - Generate migration: `bun run db:generate`
   - Migration auto-runs on app start

2. **Backend (tRPC):**
   - Add router in `src/main/lib/trpc/routers/`
   - Export in `routers/index.ts`
   - Use logger from `src/main/lib/logger.ts`

3. **Frontend:**
   - Add components in `src/renderer/features/`
   - Use shared components from `features/agents/shared/`
   - Use logger from `src/shared/logger.ts`

### Testing

- Error boundaries catch renderer crashes
- Logging helps debug issues
- Use browser MCP for frontend testing

## 📝 Code Standards

### File Naming
- Components: PascalCase (`ActiveChat.tsx`)
- Utilities: camelCase (`useFileUpload.ts`)
- Stores: kebab-case (`sub-chat-store.ts`)
- Atoms: camelCase with `Atom` suffix

### State Management
- **Jotai:** UI state (selected chat, sidebar open)
- **Zustand:** Persisted state (sub-chat tabs, pinned)
- **React Query:** Server state via tRPC

### Error Handling
- Use Error Boundaries for component errors
- Use logger for consistent logging
- Handle errors gracefully in tRPC routers

## 🌐 MCP Server Integration

### Available MCP Servers

1. **user-github** - GitHub API (needs token configuration)
2. **user-supermemory** - Persistent memory/knowledge base ✅
3. **cursor-ide-browser** - Browser automation ✅
4. **cursor-browser-extension** - Browser extension ✅

See `MCP_SERVERS_ACCESS.md` for details.

## 📚 Documentation

- `README.md` - User-facing documentation
- `CLAUDE.md` - Developer guide for Claude Code
- `CODE_REVIEW.md` - Comprehensive code review
- `IMPROVEMENTS_COMPLETED.md` - Improvement tracking
- `MCP_SERVERS_ACCESS.md` - MCP server information
- `GITHUB_MCP_SETUP.md` - GitHub token setup guide

## 🐛 Known Issues & TODOs

### TODOs (Documented)
- Add endpoint for worktreePath without chat context
- Implement file opening from terminal
- Get repository URL for commit links
- Create branch dialog UI

### Future Enhancements
- Add comprehensive test coverage
- Implement pagination for chat history
- Add performance monitoring
- Consider i18n for internationalization

## 🤝 Contributing

See `CONTRIBUTING.md` for contribution guidelines.

## 📄 License

Apache License 2.0 - see `LICENSE` for details.

## 🔗 Links

- **Website:** [1code.dev](https://1code.dev)
- **GitHub:** [21st-dev/1code](https://github.com/21st-dev/1code)
- **Discord:** [Community](https://discord.gg/8ektTZGnj4)

---

**Maintained by:** [21st.dev](https://21st.dev) team
