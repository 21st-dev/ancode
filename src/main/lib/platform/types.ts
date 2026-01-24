/**
 * Platform abstraction layer types
 * Provides a unified interface for platform-specific operations
 */

export interface ShellConfig {
  /** Path to the default shell executable */
  executable: string
  /** Arguments to pass for login shell */
  loginArgs: string[]
  /** Arguments to pass for command execution */
  execArgs: (command: string) => string[]
}

export interface PathConfig {
  /** PATH environment variable separator */
  separator: string
  /** Common paths where tools are installed */
  commonPaths: string[]
  /** User-local bin directory */
  localBin: string
  /** Package manager paths (npm, cargo, etc.) */
  packageManagerPaths: string[]
}

export interface CliConfig {
  /** Path where CLI command should be installed */
  installPath: string
  /** CLI script filename */
  scriptName: string
  /** Whether admin/elevated privileges are required */
  requiresAdmin: boolean
}

export interface EnvironmentConfig {
  /** Home directory environment variable name */
  homeVar: string
  /** User name environment variable name */
  userVar: string
  /** Additional platform-specific env vars to set */
  additionalVars: Record<string, string>
}

/**
 * Platform Provider Interface
 * Implement this for each supported platform
 */
export interface PlatformProvider {
  /** Platform identifier */
  readonly platform: "win32" | "darwin" | "linux"

  /** Display name for the platform */
  readonly displayName: string

  /** Shell configuration */
  getShellConfig(): ShellConfig

  /** PATH configuration */
  getPathConfig(): PathConfig

  /** CLI installation configuration */
  getCliConfig(): CliConfig

  /** Environment configuration */
  getEnvironmentConfig(): EnvironmentConfig

  /**
   * Build extended PATH with all common tool locations
   * @param currentPath - Current PATH value
   * @returns Extended PATH string
   */
  buildExtendedPath(currentPath?: string): string

  /**
   * Get the default shell for this platform
   * @returns Path to default shell executable
   */
  getDefaultShell(): string

  /**
   * Detect user's preferred shell (async, may spawn processes)
   * @returns Promise resolving to shell path
   */
  detectShell(): Promise<string>

  /**
   * Detect system locale
   * @returns Promise resolving to locale string (e.g., "en_US.UTF-8")
   */
  detectLocale(): Promise<string>

  /**
   * Build environment variables for shell/process execution
   * @param baseEnv - Base environment to extend
   * @returns Environment object with platform-specific additions
   */
  buildEnvironment(baseEnv?: Record<string, string>): Record<string, string>

  /**
   * Install CLI command to system
   * @param sourcePath - Path to CLI script source
   * @returns Promise with success status and optional error
   */
  installCli(sourcePath: string): Promise<{ success: boolean; error?: string }>

  /**
   * Uninstall CLI command from system
   * @returns Promise with success status and optional error
   */
  uninstallCli(): Promise<{ success: boolean; error?: string }>

  /**
   * Check if CLI command is installed
   * @param sourcePath - Path to CLI script source (for symlink verification)
   * @returns Whether CLI is properly installed
   */
  isCliInstalled(sourcePath: string): boolean

  /**
   * Execute a command and get output
   * Used for shell detection, locale detection, etc.
   * @param command - Command to execute
   * @param args - Command arguments
   * @param options - Execution options
   * @returns Promise with stdout and stderr
   */
  execCommand(
    command: string,
    args: string[],
    options?: { timeout?: number; env?: Record<string, string> }
  ): Promise<{ stdout: string; stderr: string }>
}
