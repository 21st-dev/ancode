# Quick Start Guide

**For:** Developers new to the 1Code project  
**Last Updated:** January 26, 2026

## 🚀 Setup (5 minutes)

### Prerequisites
- **Bun** - Package manager (install from [bun.sh](https://bun.sh))
- **Python** - Required for Claude binary
- **Xcode Command Line Tools** (macOS) or equivalent build tools

### Installation

```bash
# Clone repository
git clone git@github.com:21st-dev/1code.git
cd 1code

# Install dependencies
bun install

# Download Claude binary (REQUIRED!)
bun run claude:download

# Start development server
bun run dev
```

The app will open automatically. If it doesn't, check the terminal for errors.

## 📁 Key Files to Know

### Entry Points
- `src/main/index.ts` - Electron main process entry
- `src/renderer/App.tsx` - React app root
- `src/preload/index.ts` - IPC bridge

### Configuration
- `electron.vite.config.ts` - Build configuration
- `drizzle.config.ts` - Database configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Important Directories
- `src/main/lib/db/schema/` - Database schema (source of truth)
- `src/main/lib/trpc/routers/` - API endpoints
- `src/renderer/features/` - React features/components
- `drizzle/` - Database migrations

## 🛠️ Common Tasks

### Run Development Server
```bash
bun run dev
```

### Build for Production
```bash
bun run build
```

### Database Operations
```bash
# Generate migration from schema changes
bun run db:generate

# Push schema directly (dev only)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Type Checking
```bash
bun run ts:check
```

## 🐛 Debugging

### Enable DevTools
- Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
- Or use menu: View → Toggle Developer Tools

### View Logs
- Main process: Terminal where you ran `bun run dev`
- Renderer process: DevTools Console

### Common Issues

**"Claude binary not found"**
```bash
bun run claude:download
```

**Database errors**
```bash
# Reset database (WARNING: deletes all data!)
rm ~/Library/Application\ Support/Agents\ Dev/data/agents.db
# Restart app - it will recreate
```

**Port already in use**
```bash
# Kill process on port 5173 (or change port in electron.vite.config.ts)
lsof -ti:5173 | xargs kill
```

## 📝 Development Workflow

### 1. Making Database Changes

```typescript
// 1. Edit schema
// src/main/lib/db/schema/index.ts
export const newTable = sqliteTable("new_table", {
  id: text("id").primaryKey(),
  // ...
})

// 2. Generate migration
bun run db:generate

// 3. Migration auto-runs on next app start
```

### 2. Adding API Endpoints

```typescript
// src/main/lib/trpc/routers/my-router.ts
import { router, publicProcedure } from "../index"
import { z } from "zod"
import { logger } from "../../logger"

export const myRouter = router({
  myEndpoint: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      logger.info("My endpoint called", input)
      return { message: `Hello ${input.name}` }
    }),
})

// Export in routers/index.ts
```

### 3. Adding UI Components

```typescript
// src/renderer/features/my-feature/my-component.tsx
import { logger } from "@/shared/logger"

export function MyComponent() {
  logger.debug("Component rendered")
  return <div>My Component</div>
}
```

## 🧪 Testing

### Manual Testing
- Use browser MCP for frontend testing
- Check error boundaries work
- Test git worktree operations

### Error Handling
- Errors in components → Error Boundary catches them
- Errors in tRPC → Check main process logs
- Use logger for debugging

## 📚 Learn More

- `CLAUDE.md` - Detailed developer guide
- `PROJECT_OVERVIEW.md` - Architecture overview
- `CODE_REVIEW.md` - Code quality review
- `README.md` - User documentation

## 🆘 Getting Help

1. Check `CLAUDE.md` for detailed guides
2. Review `CODE_REVIEW.md` for code patterns
3. Check GitHub issues: [21st-dev/1code/issues](https://github.com/21st-dev/1code/issues)
4. Join Discord: [Community](https://discord.gg/8ektTZGnj4)

---

**Happy coding!** 🚀
