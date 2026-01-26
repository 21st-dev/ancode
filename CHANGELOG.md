# Changelog

All notable changes to the 1Code project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- React Error Boundaries for crash prevention
- Centralized logging utilities (`src/shared/logger.ts`, `src/main/lib/logger.ts`)
- Shared todo components to reduce code duplication
- Comprehensive project documentation
- VS Code debug configurations
- MCP server integration guides
- Quick start guide for developers

### Changed
- Removed debug code from production (`debug-wrapper.tsx`, `kbd.tsx`)
- Enhanced TODO comments with detailed context
- Refactored todo components to use shared utilities
- Started replacing console.log with logger utility

### Fixed
- Memory leak audit completed (none found - proper cleanup verified)
- Error handling improved with error boundaries

### Documentation
- Created `PROJECT_OVERVIEW.md` - Complete project overview
- Created `QUICK_START.md` - Developer onboarding guide
- Created `CODE_REVIEW.md` - Comprehensive code review
- Created `IMPROVEMENTS_COMPLETED.md` - Improvement tracking
- Created `MCP_SERVERS_ACCESS.md` - MCP server documentation
- Created `GITHUB_MCP_SETUP.md` - GitHub token setup guide
- Created `DOCUMENTATION_INDEX.md` - Documentation reference

## [0.0.31] - Current Version

### Features
- Git worktree isolation per chat session
- Background agent execution
- Diff previews and built-in git client
- Plan and Agent modes
- Integrated terminal
- Project management with Git remote detection

### Technical
- Electron 33.4.5
- React 19
- TypeScript 5.4.5
- Drizzle ORM with SQLite
- tRPC for type-safe IPC
- Tailwind CSS for styling

---

## Version History

- **0.0.31** - Current version with all features
- Previous versions: See git history

## Future Plans

See `CODE_REVIEW.md` for planned improvements:
- Comprehensive test coverage
- Pagination for chat history
- Performance monitoring
- i18n for internationalization
- Complete console.log replacement

---

**Note:** This changelog tracks significant changes. For detailed improvement history, see `IMPROVEMENTS_COMPLETED.md`.
