"use client"

import { memo, useState, useEffect, useCallback, useRef } from "react"
import { ChevronUp, ChevronDown, CornerDownLeft } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { cn } from "../../../lib/utils"
import { AVAILABLE_TOOLS } from "../../../components/dialogs/settings-tabs/tool-selector"

export interface CreateAgentFormData {
  name: string
  scope: "project" | "global"
  tools: string[]
  model: "inherit" | "opus" | "sonnet" | "haiku"
  description: string
}

interface CreateAgentFormProps {
  onSubmit: (data: CreateAgentFormData) => void
  onCancel: () => void
  hasProjectPath?: boolean
}

type Step = "name" | "scope" | "tools" | "model" | "description"

const STEPS: Step[] = ["name", "scope", "tools", "model", "description"]

const MODEL_OPTIONS = [
  { label: "Inherit from parent", description: "Uses the same model as the main conversation" },
  { label: "Opus", description: "Most capable, best for complex tasks" },
  { label: "Sonnet", description: "Balanced capability and speed" },
  { label: "Haiku", description: "Fast and lightweight, lower cost" },
]

const SCOPE_OPTIONS = [
  { label: "Project", description: "Available only in this project (.claude/agents/)" },
  { label: "Global", description: "Available in all your projects (~/.claude/agents/)" },
]

export const CreateAgentForm = memo(function CreateAgentForm({
  onSubmit,
  onCancel,
  hasProjectPath = true,
}: CreateAgentFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>("name")
  const [name, setName] = useState("")
  const [scope, setScope] = useState<"project" | "global" | null>(null)
  const [selectedTools, setSelectedTools] = useState<string[]>(
    AVAILABLE_TOOLS.map((t) => t.id),
  )
  const [model, setModel] = useState<"inherit" | "opus" | "sonnet" | "haiku" | null>(null)
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const prevStepRef = useRef(currentStep)

  const currentStepIndex = STEPS.indexOf(currentStep)

  // Focus name input on mount
  useEffect(() => {
    if (currentStep === "name") {
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [currentStep])

  // Focus description input when reaching that step
  useEffect(() => {
    if (currentStep === "description") {
      setTimeout(() => descriptionInputRef.current?.focus(), 100)
    }
  }, [currentStep])

  // Animate on step change
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 50)
      prevStepRef.current = currentStep
      return () => clearTimeout(timer)
    }
  }, [currentStep])

  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(currentStep)
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1])
      setFocusedOptionIndex(0)
    }
  }, [currentStep])

  const goPrev = useCallback(() => {
    const idx = STEPS.indexOf(currentStep)
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1])
      setFocusedOptionIndex(0)
    }
  }, [currentStep])

  const canContinue = useCallback(() => {
    switch (currentStep) {
      case "name":
        return name.trim().length > 0
      case "scope":
        return scope !== null
      case "tools":
        return selectedTools.length > 0
      case "model":
        return model !== null
      case "description":
        return description.trim().length > 0
    }
  }, [currentStep, name, scope, selectedTools, model, description])

  const handleContinue = useCallback(() => {
    if (isSubmitting || !canContinue()) return

    if (currentStep === "description") {
      // Submit
      setIsSubmitting(true)
      onSubmit({
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        scope: scope!,
        tools: selectedTools,
        model: model!,
        description: description.trim(),
      })
    } else {
      goNext()
    }
  }, [isSubmitting, canContinue, currentStep, name, scope, selectedTools, model, description, onSubmit, goNext])

  const handleScopeSelect = useCallback((optionLabel: string) => {
    const val = optionLabel === "Project" ? "project" : "global"
    setScope(val)
    setTimeout(() => {
      setCurrentStep("tools")
      setFocusedOptionIndex(0)
    }, 150)
  }, [])

  const handleModelSelect = useCallback((optionLabel: string) => {
    const val = optionLabel === "Inherit from parent"
      ? "inherit"
      : (optionLabel.toLowerCase() as "opus" | "sonnet" | "haiku")
    setModel(val)
    setTimeout(() => {
      setCurrentStep("description")
      setFocusedOptionIndex(0)
    }, 150)
  }, [])

  const handleToolToggle = useCallback((toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId],
    )
  }, [])

  const handleSelectAllTools = useCallback(() => {
    setSelectedTools(AVAILABLE_TOOLS.map((t) => t.id))
  }, [])

  const handleClearTools = useCallback(() => {
    setSelectedTools([])
  }, [])

  // Keyboard navigation for option-based steps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return

      // Don't intercept when typing in input/textarea
      const activeEl = document.activeElement
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement
      ) {
        // Allow Enter in name input to advance
        if (e.key === "Enter" && currentStep === "name" && canContinue()) {
          e.preventDefault()
          goNext()
        }
        // Allow Ctrl/Cmd+Enter in description to submit
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && currentStep === "description" && canContinue()) {
          e.preventDefault()
          handleContinue()
        }
        return
      }

      if (currentStep === "scope") {
        const options = SCOPE_OPTIONS
        if (e.key === "ArrowDown" && focusedOptionIndex < options.length - 1) {
          e.preventDefault()
          setFocusedOptionIndex(focusedOptionIndex + 1)
        } else if (e.key === "ArrowUp" && focusedOptionIndex > 0) {
          e.preventDefault()
          setFocusedOptionIndex(focusedOptionIndex - 1)
        } else if (e.key === "Enter") {
          e.preventDefault()
          handleScopeSelect(options[focusedOptionIndex].label)
        } else if (e.key === "1" || e.key === "2") {
          e.preventDefault()
          const idx = parseInt(e.key, 10) - 1
          setFocusedOptionIndex(idx)
          handleScopeSelect(options[idx].label)
        }
      } else if (currentStep === "model") {
        const options = MODEL_OPTIONS
        if (e.key === "ArrowDown" && focusedOptionIndex < options.length - 1) {
          e.preventDefault()
          setFocusedOptionIndex(focusedOptionIndex + 1)
        } else if (e.key === "ArrowUp" && focusedOptionIndex > 0) {
          e.preventDefault()
          setFocusedOptionIndex(focusedOptionIndex - 1)
        } else if (e.key === "Enter") {
          e.preventDefault()
          handleModelSelect(options[focusedOptionIndex].label)
        } else if (e.key >= "1" && e.key <= "4") {
          e.preventDefault()
          const idx = parseInt(e.key, 10) - 1
          setFocusedOptionIndex(idx)
          handleModelSelect(options[idx].label)
        }
      } else if (currentStep === "tools" && e.key === "Enter") {
        e.preventDefault()
        if (canContinue()) goNext()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [currentStep, focusedOptionIndex, isSubmitting, canContinue, goNext, handleContinue, handleScopeSelect, handleModelSelect])

  const getStepLabel = () => {
    switch (currentStep) {
      case "name": return "Agent Name"
      case "scope": return "Scope"
      case "tools": return "Tools"
      case "model": return "Model"
      case "description": return "Description"
    }
  }

  const getStepQuestion = () => {
    switch (currentStep) {
      case "name": return "What should the agent be called?"
      case "scope": return "Where should this agent be available?"
      case "tools": return "Which tools should the agent have access to?"
      case "model": return "Which model should the agent use?"
      case "description": return "What should the agent do? Describe its purpose and behavior."
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "name":
        return (
          <div className="px-2">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. code-reviewer, test-runner, docs-writer"
              className="w-full bg-background rounded-md px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
              Use lowercase letters and hyphens. This becomes the filename.
            </p>
          </div>
        )

      case "scope":
        return (
          <div className="space-y-1">
            {SCOPE_OPTIONS.map((option, idx) => {
              const isSelected = scope === (option.label === "Project" ? "project" : "global")
              const isFocused = focusedOptionIndex === idx
              const isDisabled = option.label === "Project" && !hasProjectPath
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    if (isDisabled) return
                    handleScopeSelect(option.label)
                    setFocusedOptionIndex(idx)
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 text-[13px] text-foreground rounded-md text-left transition-colors outline-none",
                    isDisabled && "opacity-40 cursor-not-allowed",
                    !isDisabled && isFocused ? "bg-muted/70" : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium transition-colors mt-0.5",
                      isSelected
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )

      case "tools":
        return (
          <div className="px-2">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleSelectAllTools}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Select all
              </button>
              <span className="text-muted-foreground/50">·</span>
              <button
                type="button"
                onClick={handleClearTools}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {selectedTools.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-[180px] overflow-y-auto">
              {AVAILABLE_TOOLS.map((tool) => {
                const isSelected = selectedTools.includes(tool.id)
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolToggle(tool.id)}
                    className={cn(
                      "flex items-start gap-2 p-1.5 rounded-md text-left transition-colors",
                      isSelected
                        ? "bg-muted/70"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 rounded flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-foreground"
                          : "bg-muted",
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="h-2.5 w-2.5 text-background"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-foreground truncate">
                        {tool.name}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case "model":
        return (
          <div className="space-y-1">
            {MODEL_OPTIONS.map((option, idx) => {
              const modelVal = option.label === "Inherit from parent"
                ? "inherit"
                : (option.label.toLowerCase() as "opus" | "sonnet" | "haiku")
              const isSelected = model === modelVal
              const isFocused = focusedOptionIndex === idx
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    handleModelSelect(option.label)
                    setFocusedOptionIndex(idx)
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 text-[13px] text-foreground rounded-md text-left transition-colors outline-none",
                    isFocused ? "bg-muted/70" : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium transition-colors mt-0.5",
                      isSelected
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )

      case "description":
        return (
          <div className="px-2">
            <textarea
              ref={descriptionInputRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A code reviewer that checks for security vulnerabilities, performance issues, and suggests improvements..."
              rows={3}
              className="w-full bg-background rounded-md px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10 resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
              Claude will generate a detailed system prompt based on this description.
            </p>
          </div>
        )
    }
  }

  const isLastStep = currentStep === "description"

  return (
    <div className="border rounded-t-xl border-b-0 border-border bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-muted-foreground">
            {getStepLabel()}
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-[12px] text-muted-foreground">
            Create Agent
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed outline-none"
          >
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground px-1">
            {currentStepIndex + 1} / {STEPS.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentStepIndex === STEPS.length - 1 || !canContinue()}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed outline-none"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Current Step */}
      <div
        className={cn(
          "px-1 pb-2 transition-opacity duration-150 ease-out",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="text-[14px] font-[450] text-foreground mb-3 pt-1 px-2">
          <span className="text-muted-foreground">{currentStepIndex + 1}.</span> {getStepQuestion()}
        </div>

        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleContinue}
          disabled={isSubmitting || !canContinue()}
          className="h-6 text-xs px-3 rounded-md"
        >
          {isSubmitting ? (
            "Creating..."
          ) : (
            <>
              {isLastStep ? "Create Agent" : "Continue"}
              <CornerDownLeft className="w-3 h-3 ml-1 opacity-60" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
})
