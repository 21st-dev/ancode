import { GITHUB_TRIGGER_OPTIONS, LINEAR_TRIGGER_OPTIONS } from "./constants"

export type GitHubTriggerType = (typeof GITHUB_TRIGGER_OPTIONS)[number]["value"]
export type LinearTriggerType = (typeof LINEAR_TRIGGER_OPTIONS)[number]["value"]
export type TriggerType = GitHubTriggerType | LinearTriggerType
export type Platform = "github" | "linear"
export type ViewTab = "active" | "templates"

export interface TriggerFilter {
  field: string
  operator: string
  value: string
}

export interface TriggerConfig {
  id: string
  platform: Platform
  trigger_type: TriggerType
  filters: TriggerFilter[]
}

export interface AutomationTemplate {
  id: string
  name: string
  platform: Platform
  triggerType: TriggerType
  description: string
  instructions: string
}

export interface ClaudeModel {
  id: string
  name: string
}
