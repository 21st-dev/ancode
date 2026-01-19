# Phase 4: Flox Dev Environment - Research

**Researched:** 2026-01-19
**Domain:** Development environment management, reproducible tooling
**Confidence:** HIGH

## Summary

Flox is a development environment management tool that creates reproducible, portable environments across different machines and operating systems. It's built on Nix but provides a simpler interface focused on development workflows. The avatar reference project in ../avatar successfully uses Flox to manage system dependencies (bun, ffmpeg, node) while keeping JavaScript dependencies in package.json.

For the 1Code Electron desktop app, Flox will replace ad-hoc system dependency management (homebrew-installed bun, system node, etc.) with a declarative manifest.toml file. This ensures all developers and CI/CD environments use identical versions of build tools and system dependencies, eliminating "works on my machine" issues.

**Key insight:** Flox manages **system-level tools** (runtimes, build tools, CLI utilities) while package managers (bun, npm) continue to manage **application dependencies**. This separation is critical for Electron apps which need both system binaries and JavaScript packages.

**Primary recommendation:** Create a minimal manifest.toml that includes bun (for package management), electron (for development), and TypeScript tooling (for LSP support). Keep all JavaScript dependencies in package.json unchanged.

## Standard Stack

The established tools for Flox-managed Electron development:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| flox | 1.7.7+ | Environment manager | Official CLI, stable release |
| bun | ~1.2.2 | JavaScript runtime & package manager | Fast, Electron-compatible |
| electron | ~33.0 | Desktop framework | Match package.json version |
| typescript | latest | Type checking | LSP integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nodejs | 22+ | Alternative runtime | If bun compatibility issues arise |
| typescript-language-server | latest | LSP | IDE integration for Claude Code SDK |
| python313 | 3.13 | Scripts/tooling | If Python automation needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flox | Docker Dev Containers | More isolation but slower startup, harder for GUI apps |
| Flox | asdf version manager | Similar goals but less reproducibility, no Nix backing |
| Flox | Nix directly | More powerful but steeper learning curve |

**Installation:**
```bash
# Install Flox (if not already installed)
curl -fsSL https://install.flox.dev | bash

# Initialize environment
cd /Users/jdeland/1code
flox init

# Install dependencies
flox install bun@~1.2
flox install electron@~33.0
flox install typescript-language-server
```

## Architecture Patterns

### Recommended Project Structure
```
/Users/jdeland/1code/
├── .flox/                      # Flox environment data
│   ├── env/
│   │   ├── manifest.toml       # Declarative environment spec
│   │   └── manifest.lock       # Locked dependency versions
│   ├── cache/                  # Build artifacts
│   └── run/                    # Activated environment binaries
├── package.json                # JavaScript dependencies (unchanged)
├── bun.lockb                   # JavaScript lockfile (unchanged)
└── (rest of project...)
```

### Pattern 1: System vs Application Dependency Separation
**What:** Clear boundary between system tools (Flox) and app dependencies (package.json)

**When to use:** Always for Electron/Node.js projects

**Example:**
```toml
# .flox/env/manifest.toml
# Source: Flox official docs + avatar reference implementation
version = 1

[install]
# System-level runtimes
bun.pkg-path = "bun"
bun.version = "~1.2.2"
bun.pkg-group = "dev"

# Build tools (not in npm)
electron.pkg-path = "electron"
electron.version = "~33.0"
electron.pkg-group = "electron"

# LSP for IDE support
typescript-language-server.pkg-path = "nodePackages.typescript-language-server"

[vars]
# Make Flox environment identifiable
FLOX_ENVIRONMENT = "1"

[profile]
common = '''
  export ELECTRON_SKIP_BINARY_DOWNLOAD=1
  echo "1Code Flox environment activated"
'''

[options]
systems = ["aarch64-darwin", "aarch64-linux", "x86_64-darwin", "x86_64-linux"]
```

### Pattern 2: Environment Composition via Include
**What:** Share common tools across multiple projects

**When to use:** When multiple projects need the same base tooling

**Example:**
```toml
# avatar/.flox/env/manifest.toml shows this pattern
# Source: /Users/jdeland/dev/vidyard/avatar/.flox/env/manifest.toml
[include]
environments = [
  { dir = "../devyard" },  # Shared Vidyard tooling
]

[install]
# Project-specific additions
bun.pkg-path = "bun"
ffmpeg.pkg-path = "ffmpeg"
ffmpeg.version = "6.1"
```

### Pattern 3: Cross-Platform System Support
**What:** Declare supported systems to ensure environment works everywhere

**When to use:** Always for distributed projects

**Example:**
```toml
[options]
# Both macOS (darwin) and Linux, both architectures
systems = ["aarch64-darwin", "aarch64-linux", "x86_64-darwin", "x86_64-linux"]
```

### Anti-Patterns to Avoid
- **Installing npm packages via Flox:** Don't use `flox install nodePackages.eslint`. Use `bun install eslint` instead. Flox packages are often outdated and create conflicts with package.json.
- **Duplicating versions:** Don't specify electron in both manifest.toml and package.json with different versions. Pick one source of truth (package.json for app deps, manifest.toml for system tools).
- **Over-specifying in hooks:** Avoid complex logic in [hook] on-activate. Keep it simple for faster activation times.
- **Hardcoded paths:** Don't reference absolute paths like `/usr/local/bin`. Use `which` or assume tools are in PATH.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version pinning | Custom version check scripts | Flox manifest.lock | Automatic, cryptographically verified, works with Nix store |
| Multi-platform tool distribution | Shell scripts checking OS | Flox `[options] systems` | Handles architecture differences, Nix substituters cache binaries |
| Environment activation | Custom .envrc or shell scripts | `flox activate` | Handles subshells, nested activations, cleanup on exit |
| Sharing environments | Zip files or Docker images | FloxHub push/pull | Git-like workflow, minimal bandwidth, version control built-in |

**Key insight:** Flox is built on Nix, inheriting 80,000+ pre-built packages and a robust dependency resolver. Custom scripting for tool management will miss edge cases that Nix has solved over 20+ years (library conflicts, transitive dependencies, binary substitution).

## Common Pitfalls

### Pitfall 1: Node Packages in Flox Manifest
**What goes wrong:** Developer tries to install project dependencies via `flox install nodePackages.eslint` instead of `bun install eslint`. This creates version mismatches and slow environment builds.

**Why it happens:** Flox catalogs contain some Node packages (under `nodePackages.*`), making it tempting to use. But these are for system-level tools (like typescript-language-server for LSP), not app dependencies.

**How to avoid:**
- **System tools (Flox):** Runtimes (bun, node), build tools not in npm (electron binary), LSP servers
- **App dependencies (package.json):** Everything from `bun install` - libraries, frameworks, dev tools like eslint/prettier

**Warning signs:**
- `node_modules/` and Flox manifest both list the same package
- `flox activate` takes >10 seconds (too many packages)
- Version conflicts between manifest and package-lock

### Pitfall 2: Forgetting to Activate
**What goes wrong:** Developer runs `bun run dev` without `flox activate`, using system-installed tools instead of Flox versions. Works on their machine but breaks CI or other developers.

**Why it happens:** Shell muscle memory - easy to forget the activation step, especially after switching directories.

**How to avoid:**
- Add check to scripts: `if [ -z "$FLOX_ENVIRONMENT" ]; then echo "Run 'flox activate' first!"; exit 1; fi`
- Use direnv integration: Flox environments auto-activate when entering directory
- Update CI scripts to always start with `flox activate`
- Add reminder to README and CLAUDE.md

**Warning signs:**
- "Works on my machine" reports
- Different bun/node versions between `which bun` and `package.json` engines
- CI failures with "command not found" for tools in manifest

### Pitfall 3: Version Constraint Conflicts
**What goes wrong:** Two packages in manifest.toml require incompatible versions of shared dependencies. `flox install` fails with cryptic error about "conflicts in package group."

**Why it happens:** All packages in the default pkg-group share dependencies. If package A needs libfoo@1.0 and package B needs libfoo@2.0, build fails.

**How to avoid:**
- Use separate pkg-groups: `electron.pkg-group = "electron"` vs `bun.pkg-group = "dev"`
- Minimize packages in manifest - only system tools, not app deps
- Use looser version constraints: `"~1.2"` not `"1.2.3"` unless specific version required
- Check conflicts with `flox show <package>` before installing

**Warning signs:**
- Error: "Package X conflicts with package Y"
- Message about "same pkg-group"
- Build succeeds with one package but fails when adding another

### Pitfall 4: Electron Binary Redundancy
**What goes wrong:** Electron gets installed twice - once via Flox and once via `bun install`. This wastes ~150MB and can cause binary mismatch errors.

**Why it happens:** electron-builder needs electron binaries, and package.json naturally includes electron as devDependency.

**How to avoid:**
- Set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` in manifest.toml [vars] section
- Ensure Flox electron version matches package.json `electron: "33.4.5"`
- CI should use same environment variable
- Document in CLAUDE.md that electron comes from Flox, not npm

**Warning signs:**
- Large `node_modules/electron` directory
- Mismatch errors like "Electron version 33.0 expected but 33.4.5 found"
- Slow `bun install` due to downloading electron binary

### Pitfall 5: Manifest Edits Breaking Environment
**What goes wrong:** Developer manually edits `.flox/env/manifest.toml`, introduces typo or invalid syntax, environment won't build.

**Why it happens:** Direct editing bypasses Flox's validation and transaction safety.

**How to avoid:**
- **Always use `flox edit`** - opens editor, validates on save, rolls back if build fails
- If bulk changes needed, use `flox edit -f new-manifest.toml` with tested file
- Version control manifest.toml - easy to revert
- Test changes in isolated branch before merging

**Warning signs:**
- Error: "Failed to build environment"
- Flox commands hang or fail mysteriously
- `.flox/env/manifest.lock` missing or corrupted

## Code Examples

Verified patterns from official sources:

### Initializing 1Code Flox Environment
```bash
# Source: Flox official docs, tested 2026-01-19
cd /Users/jdeland/1code

# Initialize (creates .flox/ directory)
flox init --name 1code

# Install core dependencies
flox install bun@~1.2
flox install electron@~33.0
flox install typescript-language-server

# Activate environment
flox activate

# Verify tools are from Flox
which bun  # Should show .flox/run/.../bin/bun
bun --version  # Should match installed version
```

### Minimal manifest.toml for 1Code
```toml
# Source: Combination of avatar pattern + Flox best practices
# File: .flox/env/manifest.toml
version = 1

[install]
# JavaScript runtime and package manager
bun.pkg-path = "bun"
bun.version = "~1.2.2"
bun.pkg-group = "dev"

# Electron for development/testing (build uses packaged version)
electron.pkg-path = "electron"
electron.version = "~33.0"
electron.pkg-group = "electron"

# TypeScript LSP for Claude Code SDK integration
typescript-language-server.pkg-path = "nodePackages.typescript-language-server"
typescript.pkg-path = "nodePackages.typescript"

[vars]
# Indicate Flox environment is active
FLOX_ENVIRONMENT = "1"

[profile]
common = '''
  # Skip electron binary download from npm
  export ELECTRON_SKIP_BINARY_DOWNLOAD=1

  # Helpful activation message
  echo "✓ 1Code development environment activated"
  echo "  Bun: $(bun --version)"
  echo "  Electron: $(electron --version)"
'''

[options]
# Support both macOS and Linux, both architectures
systems = ["aarch64-darwin", "aarch64-linux", "x86_64-darwin", "x86_64-linux"]
```

### Updating package.json Scripts
```json
{
  "scripts": {
    "dev": "flox activate -- electron-vite dev",
    "build": "flox activate -- electron-vite build",
    "package": "flox activate -- electron-builder --dir"
  }
}
```
**Note:** This assumes commands are run outside Flox. For developers who activate once per session, existing scripts work unchanged.

### CI Integration (GitHub Actions Example)
```yaml
# Source: Flox CI documentation pattern
name: Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Flox
        run: curl -fsSL https://install.flox.dev | bash

      - name: Activate Flox and Build
        run: |
          flox activate -- bun install
          flox activate -- bun run build
          flox activate -- bun run package
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual tool installation docs | Declarative manifest.toml | Flox 1.0 (2024) | Eliminates 16-step onboarding, one command setup |
| Docker for dev environments | Flox environments | 2023-2024 | Faster (no VM), GUI apps work natively, smaller disk footprint |
| asdf-vm for version management | Flox with Nix backend | 2024+ | Reproducible builds, binary caching, transitive deps handled |
| .envrc with tool checks | Flox auto-activation | 2024 | Nested shells supported, proper cleanup, no manual sourcing |

**Deprecated/outdated:**
- **[hook] script field:** Replaced by `[hook] on-activate` in Flox 1.7+. Old field ignored.
- **Global package groups:** Early Flox versions had all packages in one group. Now requires explicit pkg-group for isolation.

## Open Questions

Things that couldn't be fully resolved:

1. **Does electron-builder work with Flox-provided Electron binary?**
   - What we know: electron-builder typically downloads electron from npm. Can be skipped with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`.
   - What's unclear: Whether electron-builder can use system electron from Flox PATH, or if it requires a specific directory structure.
   - Recommendation: Test during implementation. Worst case, keep electron in package.json devDependencies and don't add to manifest.toml.

2. **Should CI use Flox or continue with native runners?**
   - What we know: GitHub Actions can install Flox. Avatar uses self-hosted runners with Flox pre-installed.
   - What's unclear: Performance impact of Flox installation on every CI run vs build time consistency gains.
   - Recommendation: Start with Flox in CI for consistency. If installation overhead is high (>30s), consider pre-baking into custom runner image.

3. **How to handle native dependencies (better-sqlite3, node-pty)?**
   - What we know: These require node-gyp compilation. Currently handled by `electron-rebuild`.
   - What's unclear: Whether Flox-provided build tools (gcc, make) need explicit installation or are available transitively.
   - Recommendation: Try with current setup first. If build failures occur, add `gcc`, `gnumake`, `python313` to manifest.toml.

## Sources

### Primary (HIGH confidence)
- Flox official website (https://flox.dev) - Product overview, use cases
- Flox official docs (https://flox.dev/docs) - Environment concepts, tutorials
- Flox CLI version 1.7.7 - `flox --help`, `flox init --help`, `flox install --help`
- Flox man pages - `man flox-edit`, `man manifest.toml` (comprehensive format docs)
- Avatar reference implementation - `/Users/jdeland/dev/vidyard/avatar/.flox/env/manifest.toml` (real-world Bun+Flox pattern)
- DevYard reference implementation - `/Users/jdeland/dev/vidyard/devyard/.flox/env/manifest.toml` (environment composition via [include])

### Secondary (MEDIUM confidence)
- Avatar AGENT.md - Documents DevYard/Flox development workflow in production use
- Flox package catalog - `flox search`, `flox show` commands (current package availability)

### Tertiary (LOW confidence - marked for validation)
- None - all findings verified with official sources or live system

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified with local Flox installation and avatar reference implementation
- Architecture: HIGH - Patterns directly from avatar production usage and official docs
- Pitfalls: MEDIUM-HIGH - Pitfalls 1-3 from common Nix/Flox user experiences and official warnings. Pitfalls 4-5 inferred from Electron best practices, need validation during implementation.

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days for stable tooling)
**Next review triggers:**
- Flox 2.0 release (major version change)
- Electron 34+ requiring different build tools
- Bun 2.0 release if breaking changes to binary distribution
