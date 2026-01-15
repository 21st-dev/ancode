import { execSync } from "node:child_process"
import os from "node:os"

export const FALLBACK_SHELL = os.platform() === "win32" ? "cmd.exe" : "/bin/sh"
export const SHELL_CRASH_THRESHOLD_MS = 1000

export function getDefaultShell(): string {
  const platform = os.platform()

  if (platform === "win32") {
    return process.env.COMSPEC || "powershell.exe"
  }

  // Use SHELL env var (most reliable on Unix)
  if (process.env.SHELL) {
    return process.env.SHELL
  }

  // Fallback: try to detect from /etc/passwd on macOS/Linux
  try {
    const uid = process.getuid?.()
    if (uid !== undefined) {
      const passwd = execSync(`getent passwd ${uid} 2>/dev/null || dscl . -read /Users/$(whoami) UserShell 2>/dev/null`, {
        encoding: "utf-8",
        timeout: 1000,
      })
      // getent format: user:x:uid:gid:name:home:shell
      // dscl format: UserShell: /bin/zsh
      const match = passwd.match(/UserShell:\s*(.+)/) || passwd.match(/:([^:]+)$/)
      if (match?.[1]) {
        return match[1].trim()
      }
    }
  } catch {
    // Ignore
  }

  return "/bin/zsh"
}

export function getLocale(baseEnv: Record<string, string>): string {
  if (baseEnv.LANG?.includes("UTF-8")) {
    return baseEnv.LANG
  }

  if (baseEnv.LC_ALL?.includes("UTF-8")) {
    return baseEnv.LC_ALL
  }

  try {
    const result = execSync("locale 2>/dev/null | grep LANG= | cut -d= -f2", {
      encoding: "utf-8",
      timeout: 1000,
    }).trim()
    if (result?.includes("UTF-8")) {
      return result
    }
  } catch {
    // Ignore - will use fallback
  }

  return "en_US.UTF-8"
}

export function sanitizeEnv(
  env: NodeJS.ProcessEnv
): Record<string, string> | undefined {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      sanitized[key] = value
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

/**
 * Allowlist of environment variable names safe to pass to terminals.
 * Using an allowlist (vs denylist) ensures unknown vars (including secrets) are excluded by default.
 */
const ALLOWED_ENV_VARS = new Set([
  // Core shell environment
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TERM",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LC_MESSAGES",
  "LC_COLLATE",
  "LC_MONETARY",
  "LC_NUMERIC",
  "LC_TIME",
  "TZ",

  // Terminal/display
  "DISPLAY",
  "COLORTERM",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
  "COLUMNS",
  "LINES",

  // SSH (critical for git operations)
  "SSH_AUTH_SOCK",
  "SSH_AGENT_PID",

  // Proxy configuration
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
  "ALL_PROXY",
  "all_proxy",
  "FTP_PROXY",
  "ftp_proxy",

  // Language version managers
  "NVM_DIR",
  "NVM_BIN",
  "NVM_INC",
  "NVM_CD_FLAGS",
  "NVM_RC_VERSION",
  "PYENV_ROOT",
  "PYENV_SHELL",
  "PYENV_VERSION",
  "RBENV_ROOT",
  "RBENV_SHELL",
  "RBENV_VERSION",
  "GOPATH",
  "GOROOT",
  "GOBIN",
  "CARGO_HOME",
  "RUSTUP_HOME",
  "DENO_DIR",
  "DENO_INSTALL",
  "BUN_INSTALL",
  "PNPM_HOME",
  "VOLTA_HOME",
  "ASDF_DIR",
  "ASDF_DATA_DIR",
  "FNM_DIR",
  "FNM_MULTISHELL_PATH",
  "FNM_NODE_DIST_MIRROR",
  "SDKMAN_DIR",

  // Homebrew
  "HOMEBREW_PREFIX",
  "HOMEBREW_CELLAR",
  "HOMEBREW_REPOSITORY",

  // XDG directories
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_CACHE_HOME",
  "XDG_STATE_HOME",
  "XDG_RUNTIME_DIR",

  // Editor
  "EDITOR",
  "VISUAL",
  "PAGER",

  // macOS specific
  "__CF_USER_TEXT_ENCODING",
  "Apple_PubSub_Socket_Render",

  // Windows specific
  "COMSPEC",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "PATHEXT",

  // SSL/TLS configuration
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "NODE_EXTRA_CA_CERTS",
  "REQUESTS_CA_BUNDLE",

  // Git configuration (not credentials)
  "GIT_SSH_COMMAND",
  "GIT_AUTHOR_NAME",
  "GIT_AUTHOR_EMAIL",
  "GIT_COMMITTER_NAME",
  "GIT_COMMITTER_EMAIL",
  "GIT_EDITOR",
  "GIT_PAGER",

  // AWS configuration (profile selection, not credentials)
  "AWS_PROFILE",
  "AWS_DEFAULT_REGION",
  "AWS_REGION",
  "AWS_CONFIG_FILE",
  "AWS_SHARED_CREDENTIALS_FILE",

  // Docker configuration
  "DOCKER_HOST",
  "DOCKER_CONFIG",
  "DOCKER_CERT_PATH",
  "DOCKER_TLS_VERIFY",
  "COMPOSE_PROJECT_NAME",

  // Kubernetes configuration
  "KUBECONFIG",
  "KUBE_CONFIG_PATH",

  // Cloud CLI tools
  "CLOUDSDK_CONFIG",
  "AZURE_CONFIG_DIR",

  // SDK paths
  "JAVA_HOME",
  "ANDROID_HOME",
  "ANDROID_SDK_ROOT",
  "FLUTTER_ROOT",
  "DOTNET_ROOT",
])

/**
 * Prefixes for environment variables that are safe to pass through.
 */
const ALLOWED_PREFIXES = [
  "AGENTS_", // Our own metadata vars
  "LC_", // Locale settings
]

/**
 * Check if a key is in the allowlist, handling Windows case-insensitivity.
 */
function isAllowedVar(key: string, isWindows: boolean): boolean {
  if (isWindows) {
    return ALLOWED_ENV_VARS.has(key.toUpperCase())
  }
  return ALLOWED_ENV_VARS.has(key)
}

/**
 * Check if a key matches an allowed prefix.
 */
function hasAllowedPrefix(key: string, isWindows: boolean): boolean {
  const keyToCheck = isWindows ? key.toUpperCase() : key
  return ALLOWED_PREFIXES.some((prefix) => keyToCheck.startsWith(prefix))
}

/**
 * Build a safe environment by only including allowlisted variables.
 * This prevents app secrets and build-time config from leaking to terminals.
 */
export function buildSafeEnv(
  env: Record<string, string>,
  options?: { platform?: NodeJS.Platform }
): Record<string, string> {
  const platform = options?.platform ?? os.platform()
  const isWindows = platform === "win32"
  const safe: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    if (isAllowedVar(key, isWindows)) {
      safe[key] = value
      continue
    }

    if (hasAllowedPrefix(key, isWindows)) {
      safe[key] = value
    }
  }

  return safe
}

export function buildTerminalEnv(params: {
  shell: string
  paneId: string
  tabId?: string
  workspaceId?: string
  workspaceName?: string
  workspacePath?: string
  rootPath?: string
}): Record<string, string> {
  const {
    shell,
    paneId,
    tabId,
    workspaceId,
    workspaceName,
    workspacePath,
    rootPath,
  } = params

  // Get Electron's process.env and filter to only allowlisted safe vars
  const rawBaseEnv = sanitizeEnv(process.env) || {}
  const baseEnv = buildSafeEnv(rawBaseEnv)
  const locale = getLocale(rawBaseEnv)

  const env: Record<string, string> = {
    ...baseEnv,
    SHELL: shell,
    TERM: "xterm-256color",
    TERM_PROGRAM: "21st Agents",
    TERM_PROGRAM_VERSION: process.env.npm_package_version || "1.0.0",
    COLORTERM: "truecolor",
    LANG: locale,
    AGENTS_PANE_ID: paneId,
    AGENTS_TAB_ID: tabId || "",
    AGENTS_WORKSPACE_ID: workspaceId || "",
    AGENTS_WORKSPACE_NAME: workspaceName || "",
    AGENTS_WORKSPACE_PATH: workspacePath || "",
    AGENTS_ROOT_PATH: rootPath || "",
  }

  return env
}
