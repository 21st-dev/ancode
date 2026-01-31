import { GITHUB_TRIGGER_OPTIONS, LINEAR_TRIGGER_OPTIONS } from "./constants"

export function getTriggerLabel(triggerType: string, platform?: string): string {
  if (platform === "linear") {
    const trigger = LINEAR_TRIGGER_OPTIONS.find((t) => t.value === triggerType)
    return trigger?.label || triggerType
  }
  const trigger = GITHUB_TRIGGER_OPTIONS.find((t) => t.value === triggerType)
  return trigger?.label || triggerType
}

export function getAutomationDescription(
  triggers: Array<{ trigger_type: string; platform?: string }>
): string {
  if (triggers.length === 0) return "No triggers configured"
  const triggerDescriptions = triggers.map((t) => {
    const label = getTriggerLabel(t.trigger_type, t.platform)
    return label
  })
  if (triggerDescriptions.length === 1) {
    return `When ${triggerDescriptions[0]}, run Claude Code`
  }
  return `When ${triggerDescriptions.slice(0, 2).join(" or ")}, run Claude Code`
}
