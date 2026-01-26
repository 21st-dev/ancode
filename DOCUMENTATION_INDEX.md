# Documentation Index

**Last Updated:** January 26, 2026  
**Purpose:** Quick reference guide to all project documentation

## 📚 Documentation by Category

### 🚀 Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide for new developers
- **[README.md](./README.md)** - User-facing documentation and features
- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive developer guide for Claude Code

### 🏗️ Architecture & Overview
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Complete project overview, architecture, tech stack
- **[CODE_REVIEW.md](./CODE_REVIEW.md)** - Comprehensive code review with findings and recommendations
- **[AGENTS.md](./AGENTS.md)** - OpenSpec instructions and project guidelines

### 🔧 Development & Setup
- **[CLAUDE.md](./CLAUDE.md)** - Development commands, architecture, patterns
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[.vscode/settings.json](./.vscode/settings.json)** - VS Code workspace settings
- **[.vscode/tasks.json](./.vscode/tasks.json)** - VS Code tasks (dev, build, db, etc.)
- **[.vscode/launch.json](./.vscode/launch.json)** - Debug configurations

### 📊 Improvements & Changes
- **[IMPROVEMENTS_COMPLETED.md](./IMPROVEMENTS_COMPLETED.md)** - Summary of completed improvements
- **[IMPROVEMENTS_DETAILED.md](./IMPROVEMENTS_DETAILED.md)** - Detailed explanations of improvements
- **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Final summary of all improvements
- **[CODE_REVIEW.md](./CODE_REVIEW.md)** - Code review findings and recommendations

### 🔌 MCP Servers & Integrations
- **[MCP_SERVERS_ACCESS.md](./MCP_SERVERS_ACCESS.md)** - Overview of available MCP servers
- **[GITHUB_MCP_SETUP.md](./GITHUB_MCP_SETUP.md)** - GitHub token configuration guide
- **[MCP_TASKS_COMPLETED.md](./MCP_TASKS_COMPLETED.md)** - MCP integration task summary

### 🐛 Debugging & Troubleshooting
- **[DEBUG_REACT_ERROR.sh](./DEBUG_REACT_ERROR.sh)** - React error debugging script
- **[FIX_REACT_OBJECT_ERROR.md](./FIX_REACT_OBJECT_ERROR.md)** - React object error fix documentation
- **[REACT_OBJECT_ERROR_FIX.md](./REACT_OBJECT_ERROR_FIX.md)** - React error fix details
- **[DEBUG-WDYR.md](./src/renderer/DEBUG-WDYR.md)** - Why Did You Render debugging guide

### 📈 Performance & Optimization
- **[PERFORMANCE_IMPROVEMENTS_2026-01-26.md](./PERFORMANCE_IMPROVEMENTS_2026-01-26.md)** - Performance improvements
- **[PERFORMANCE_FIXES_COMPLETED.md](./PERFORMANCE_FIXES_COMPLETED.md)** - Performance fixes summary

### 📝 Project Management
- **[ACTIVE_CHAT_DECOMPOSITION_PROGRESS.md](./ACTIVE_CHAT_DECOMPOSITION_PROGRESS.md)** - Feature development progress

## 🎯 Quick Reference

### For New Developers
1. Start with **[QUICK_START.md](./QUICK_START.md)**
2. Read **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** for architecture
3. Reference **[CLAUDE.md](./CLAUDE.md)** for detailed guides

### For Code Review
1. Check **[CODE_REVIEW.md](./CODE_REVIEW.md)** for code quality standards
2. Review **[IMPROVEMENTS_COMPLETED.md](./IMPROVEMENTS_COMPLETED.md)** for recent changes
3. See **[IMPROVEMENTS_DETAILED.md](./IMPROVEMENTS_DETAILED.md)** for detailed explanations

### For MCP Integration
1. Read **[MCP_SERVERS_ACCESS.md](./MCP_SERVERS_ACCESS.md)** for overview
2. Follow **[GITHUB_MCP_SETUP.md](./GITHUB_MCP_SETUP.md)** for GitHub setup
3. Check **[MCP_TASKS_COMPLETED.md](./MCP_TASKS_COMPLETED.md)** for examples

### For Troubleshooting
1. Check **[QUICK_START.md](./QUICK_START.md)** Common Issues section
2. Review **[CLAUDE.md](./CLAUDE.md)** Debugging section
3. See debug scripts in root directory

## 📁 File Structure

```
1code/
├── Documentation (Root)
│   ├── README.md                    # User docs
│   ├── QUICK_START.md               # Developer onboarding
│   ├── PROJECT_OVERVIEW.md          # Architecture overview
│   ├── CODE_REVIEW.md               # Code review
│   ├── IMPROVEMENTS_*.md            # Improvement tracking
│   ├── MCP_*.md                     # MCP server docs
│   └── DOCUMENTATION_INDEX.md        # This file
│
├── Development
│   ├── CLAUDE.md                    # Developer guide
│   ├── CONTRIBUTING.md              # Contribution guide
│   └── AGENTS.md                    # OpenSpec guide
│
├── Configuration
│   ├── .vscode/                     # VS Code configs
│   ├── package.json                 # Dependencies
│   ├── tsconfig.json                # TypeScript config
│   └── drizzle.config.ts            # Database config
│
└── Source Code
    └── src/                         # Application code
```

## 🔍 Finding Information

### By Topic

**Architecture:** `PROJECT_OVERVIEW.md`, `CLAUDE.md`  
**Code Quality:** `CODE_REVIEW.md`, `IMPROVEMENTS_COMPLETED.md`  
**Setup:** `QUICK_START.md`, `CLAUDE.md`  
**MCP Servers:** `MCP_SERVERS_ACCESS.md`, `GITHUB_MCP_SETUP.md`  
**Debugging:** `QUICK_START.md`, `CLAUDE.md`, debug scripts  
**Performance:** `PERFORMANCE_IMPROVEMENTS_*.md`  
**Recent Changes:** `IMPROVEMENTS_COMPLETED.md`, `FINAL_SUMMARY.md`

### By Audience

**New Developers:** `QUICK_START.md` → `PROJECT_OVERVIEW.md` → `CLAUDE.md`  
**Contributors:** `CONTRIBUTING.md` → `CODE_REVIEW.md` → `CLAUDE.md`  
**Users:** `README.md`  
**Maintainers:** `CODE_REVIEW.md` → `IMPROVEMENTS_*.md` → `CLAUDE.md`

## 📝 Documentation Standards

- **Markdown format** for all documentation
- **Clear headings** with emoji indicators
- **Code examples** with syntax highlighting
- **Links** between related documents
- **Last updated** dates for tracking

## 🔄 Keeping Documentation Updated

When making changes:
1. Update relevant documentation files
2. Update "Last Updated" dates
3. Add entries to `IMPROVEMENTS_COMPLETED.md` if significant
4. Update this index if adding new docs

---

**Need help?** Check the relevant documentation above or see `CLAUDE.md` for detailed guides.
