/**
 * Shared constants for mini-tools
 * Path constants and default values for CCS and CCR
 */

// #NP - Mini-tools shared constants

import path from "path"
import os from "os"

// CCS paths
export const CCS_HOME_DIR = path.join(os.homedir(), ".ccs")
export const CCS_CONFIG_YAML = "config.yaml"
export const CCS_CONFIG_JSON = "config.json" // Legacy format
export const CCS_SETTINGS_DIR = "settings"

// CCR paths
export const CCR_HOME_DIR = path.join(os.homedir(), ".claude-code-router")
export const CCR_CONFIG_FILE = "config.json"
export const CCR_PRESETS_DIR = "presets"
export const CCR_LOGS_DIR = "logs"

// Default ports (for reference, not used in direct mode)
export const CCS_DEFAULT_PORT = 3100
export const CCR_DEFAULT_PORT = 3200

// Config version
export const CCS_CONFIG_VERSION = 7
export const CCR_CONFIG_VERSION = 2
