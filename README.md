# 1Code (Auto-Build Fork)

> **This is a community fork of [21st-dev/1code](https://github.com/21st-dev/1code) with automatic sync and build capabilities.**

Fork this repo to get **automatic builds** whenever the upstream merges new changes — no manual rebuilding required.

## Why This Fork?

The official 1Code repo requires you to manually build the app every time there's an update. This fork solves that:

| Feature | Official Repo | This Fork |
|---------|---------------|-----------|
| Auto-sync with upstream | ❌ | ✅ Every 30 min |
| Auto-build on changes | ❌ | ✅ GitHub Actions |
| Auto-update in app | ❌ CDN only | ✅ From your fork's releases |
| Manual builds needed | ✅ Every update | ❌ Never |

## Quick Start

### 1. Fork this repo

Click the **Fork** button above to create your own copy.

### 2. Enable GitHub Actions

In your fork:
1. Go to **Settings → Actions → General**
2. Select "Allow all actions and reusable workflows"
3. Under "Workflow permissions", select "Read and write permissions"
4. Click **Save**

### 3. Trigger the first build

1. Go to **Actions** tab
2. Click "Build and Release" workflow
3. Click **Run workflow** → **Run workflow**

Wait for the build to complete (~10-15 min). Your release will appear at:
```
https://github.com/YOUR_USERNAME/1code/releases
```

### 4. Install and configure

Download the DMG from your releases and install. Then configure the app to check your fork for updates:

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/1code.git
cd 1code
bun install

# Configure auto-updates from your fork
bun run setup:fork YOUR_USERNAME
```

Or manually create `~/Library/Application Support/1Code/update-config.json`:
```json
{
  "source": "github",
  "githubRepo": "YOUR_USERNAME/1code"
}
```

## How It Works

```
┌─────────────────────┐
│  21st-dev/1code     │ (upstream)
│  merges a PR        │
└──────────┬──────────┘
           │ every 30 min
           ▼
┌─────────────────────┐
│  Your fork          │ (auto-synced)
│  gets new commits   │
└──────────┬──────────┘
           │ triggers on push
           ▼
┌─────────────────────┐
│  GitHub Actions     │
│  builds the app     │
└──────────┬──────────┘
           │ creates release
           ▼
┌─────────────────────┐
│  Your local app     │
│  shows "Update"     │ (on window focus)
└─────────────────────┘
```

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `sync-fork.yml` | Every 30 min (cron) | Pulls upstream changes into your fork |
| `build-release.yml` | On push to main | Builds app and creates GitHub Release |

## Customization

### Change sync frequency

Edit `.github/workflows/sync-fork.yml`:

```yaml
schedule:
  - cron: "0 * * * *"    # Every hour
  - cron: "0 */6 * * *"  # Every 6 hours
  - cron: "0 0 * * *"    # Once daily
```

### Enable Windows/Linux builds

Edit `.github/workflows/build-release.yml`:

```yaml
build-windows:
  if: true  # Change from false

build-linux:
  if: true  # Change from false
```

### Revert to official updates

```bash
bun run setup:fork --cdn
```

## Notes

- **Unsigned builds**: These builds aren't code-signed. macOS will show a warning — right-click → Open to bypass.
- **Claude binary**: The build downloads Claude CLI automatically. If it fails, agent chat won't work but the app will still build.

---

## Original 1Code Features

[1Code.dev](https://1code.dev) — Best UI for Claude Code with local and remote agent execution.

By [21st.dev](https://21st.dev) team

> **Note:** Currently tested on macOS and Linux. Windows support is experimental.

### Run Claude agents the right way

Run agents locally, in worktrees, in background — without touching main branch.

![Worktree Demo](assets/worktree.gif)

- **Git Worktree Isolation** - Each chat session runs in its own isolated worktree
- **Background Execution** - Run agents in background while you continue working
- **Local-first** - All code stays on your machine, no cloud sync required
- **Branch Safety** - Never accidentally commit to main branch

### UI that finally respects your code

Cursor-like UI for Claude Code with diff previews, built-in git client, and the ability to see changes before they land.

![Cursor UI Demo](assets/cursor-ui.gif)

- **Diff Previews** - See exactly what changes Claude is making in real-time
- **Built-in Git Client** - Stage, commit, and manage branches without leaving the app
- **Change Tracking** - Visual diffs and PR management
- **Real-time Tool Execution** - See bash commands, file edits, and web searches as they happen

### Plan mode that actually helps you think

Claude asks clarifying questions, builds structured plans, and shows clean markdown preview — all before execution.

![Plan Mode Demo](assets/plan-mode.gif)

- **Clarifying Questions** - Claude asks what it needs to know before starting
- **Structured Plans** - See step-by-step breakdown of what will happen
- **Clean Markdown Preview** - Review plans in readable format
- **Review Before Execution** - Approve or modify the plan before Claude acts

### More Features

- **Plan & Agent Modes** - Read-only analysis or full code execution permissions
- **Project Management** - Link local folders with automatic Git remote detection
- **Integrated Terminal** - Full terminal access within the app

## Manual Build (if needed)

```bash
bun install
bun run claude:download
bun run build
bun run package:mac  # or package:win, package:linux
```

## Development

```bash
bun install
bun run claude:download  # First time only
bun run dev
```

## Community

- [Discord](https://discord.gg/8ektTZGnj4) for support and discussions
- [Original repo](https://github.com/21st-dev/1code) for upstream issues

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.
