# 1Code

Best UI for Claude Code with local and remote agent execution.

By [21st.dev](https://21st.dev)

## Features

- **Plan & Agent Modes** - Read-only analysis or full code execution permissions
- **Project Management** - Link local folders with automatic Git remote detection
- **Real-time Tool Execution** - See bash commands, file edits, and web searches as they happen
- **Git Worktree Isolation** - Each chat session runs in its own isolated worktree
- **Integrated Terminal** - Full terminal access within the app
- **Change Tracking** - Visual diffs and PR management

## Installation

Download the latest release for your platform from the [Releases](https://github.com/21st-dev/1code/releases) page.

- **macOS**: `.dmg` (Intel & Apple Silicon)
- **Windows**: `.exe` installer or portable
- **Linux**: `.AppImage` or `.deb`

## Development

### Prerequisites

- [Bun](https://bun.sh) package manager
- Python (for native module building)
- Xcode Command Line Tools (macOS)

### Setup

```bash
cd apps/desktop
bun install
bun run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start with hot reload |
| `bun run build` | Compile TypeScript |
| `bun run package` | Package for current platform |
| `bun run package:mac` | Build macOS (DMG + ZIP) |
| `bun run package:win` | Build Windows |
| `bun run package:linux` | Build Linux |

## Feedback & Community

Join our [Discord](https://discord.gg/Qx4rFunqvY) for support and discussions.

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.
