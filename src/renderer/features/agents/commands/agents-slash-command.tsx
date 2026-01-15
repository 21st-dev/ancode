"use client"

import { cn } from "../../../lib/utils"
import { api } from "../../../lib/mock-api"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react"
import {
  IconSpinner,
  IconChatBubble,
  PlanIcon,
  AgentIcon,
} from "../../../components/ui/icons"
import {
  MessageSquareCode,
  FileText,
  ShieldCheck,
  Eye,
  Plug,
  Apple,
  Brain,
  Globe,
  Terminal,
  GitBranch,
  Package,
  Wrench,
  Server,
  Monitor,
  Gamepad2,
  FolderGit,
  Diff,
  GitCommit,
  GitPullRequest,
} from "lucide-react"
import type { SlashCommandOption, SlashTriggerPayload } from "./types"
import {
  filterBuiltinCommands,
  filterAllCommands,
  CATEGORY_CONFIG,
  ALL_SLASH_COMMANDS,
} from "./builtin-commands"

// Get icon component for a slash command
function getCommandIcon(commandName: string) {
  switch (commandName) {
    // Builtin commands
    case "clear":
      return IconChatBubble
    case "plan":
      return PlanIcon
    case "agent":
      return AgentIcon
    case "review":
      return Eye
    case "pr-comments":
      return MessageSquareCode
    case "release-notes":
      return FileText
    case "security-review":
      return ShieldCheck
    // MCP commands
    case "mcp":
      return Plug
    case "sosumi":
      return Apple
    case "memory":
      return Brain
    case "browser":
      return Globe
    // CLI commands
    case "bash":
      return Terminal
    case "git":
      return GitBranch
    case "npm":
      return Package
    case "xcode":
      return Wrench
    // SSH commands
    case "tower":
      return Server
    case "office":
      return Monitor
    case "deck":
      return Gamepad2
    // Repo commands
    case "status":
      return FolderGit
    case "diff":
      return Diff
    case "commit":
      return GitCommit
    case "pr":
      return GitPullRequest
    default:
      return IconChatBubble
  }
}

interface AgentsSlashCommandProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (command: SlashCommandOption) => void
  searchText: string
  position: { top: number; left: number }
  teamId?: string
  repository?: string
  isPlanMode?: boolean
  disabledCommands?: string[]
  /** Hide legacy repository-fetched commands, show only native commands */
  showNativeOnly?: boolean
}

// Memoized to prevent re-renders when parent re-renders
export const AgentsSlashCommand = memo(function AgentsSlashCommand({
  isOpen,
  onClose,
  onSelect,
  searchText,
  position,
  teamId,
  repository,
  isPlanMode,
  disabledCommands,
  showNativeOnly = true, // Default to native commands only
}: AgentsSlashCommandProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const placementRef = useRef<"above" | "below" | null>(null)
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText)

  // Debounce search text (300ms to match file mention)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // Fetch repository commands (disabled when showNativeOnly is true)
  const { data: repoCommands = [], isLoading } =
    api.github.getSlashCommands.useQuery(
      {
        teamId: teamId!,
        repository: repository!,
      },
      {
        enabled: isOpen && !!teamId && !!repository && !showNativeOnly,
        staleTime: 30_000, // Cache for 30 seconds
        refetchOnWindowFocus: false,
      },
    )

  // State for loading command content
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  // tRPC utils for fetching command content
  const utils = api.useUtils()

  // Handle command selection - fetch content for repository commands
  const handleSelect = useCallback(
    async (option: SlashCommandOption) => {
      // For builtin commands, call onSelect directly
      if (option.category === "builtin") {
        onSelect(option)
        return
      }

      // For repository commands, fetch the prompt content first
      if (option.path && teamId) {
        setIsLoadingContent(true)
        try {
          const result = await utils.github.getSlashCommandContent.fetch({
            teamId,
            repository: option.repository || repository!,
            path: option.path,
          })

          // Call onSelect with the fetched prompt
          onSelect({
            ...option,
            prompt: result.content,
          })
        } catch (error) {
          console.error("Failed to fetch slash command content:", error)
          // Still close the dropdown even on error
          onClose()
        } finally {
          setIsLoadingContent(false)
        }
      } else {
        // Fallback - just call onSelect without prompt
        onSelect(option)
      }
    },
    [onSelect, onClose, teamId, repository, utils],
  )

  // Combine all commands and repository commands, filtered by search
  const options: SlashCommandOption[] = useMemo(() => {
    let allFiltered = filterAllCommands(debouncedSearchText)

    // Hide /plan when already in Plan mode, hide /agent when already in Agent mode
    if (isPlanMode !== undefined) {
      allFiltered = allFiltered.filter((cmd) => {
        if (isPlanMode && cmd.name === "plan") return false
        if (!isPlanMode && cmd.name === "agent") return false
        return true
      })
    }

    // Filter out disabled commands
    if (disabledCommands && disabledCommands.length > 0) {
      allFiltered = allFiltered.filter(
        (cmd) => !disabledCommands.includes(cmd.name),
      )
    }

    // Filter repo commands by search
    let repoFiltered = repoCommands
    if (debouncedSearchText) {
      const query = debouncedSearchText.toLowerCase()
      repoFiltered = repoCommands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(query) ||
          cmd.command.toLowerCase().includes(query),
      )
    }

    // Return all commands first, then repository commands from repo
    return [...allFiltered, ...repoFiltered]
  }, [debouncedSearchText, repoCommands, isPlanMode, disabledCommands])

  // Track previous values for smarter selection reset
  const prevIsOpenRef = useRef(isOpen)
  const prevSearchRef = useRef(debouncedSearchText)

  // CONSOLIDATED: Single useLayoutEffect for selection management
  useLayoutEffect(() => {
    const didJustOpen = isOpen && !prevIsOpenRef.current
    const didSearchChange = debouncedSearchText !== prevSearchRef.current

    // Reset to 0 when opening or search changes
    if (didJustOpen || didSearchChange) {
      setSelectedIndex(0)
    }
    // Clamp to valid range if options shrunk
    else if (options.length > 0 && selectedIndex >= options.length) {
      setSelectedIndex(Math.max(0, options.length - 1))
    }

    // Update refs
    prevIsOpenRef.current = isOpen
    prevSearchRef.current = debouncedSearchText
  }, [isOpen, debouncedSearchText, options.length, selectedIndex])

  // Reset placement when closed
  useEffect(() => {
    if (!isOpen) {
      placementRef.current = null
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          // Guard against modulo by zero when no options
          if (options.length > 0) {
            setSelectedIndex((prev) => (prev + 1) % options.length)
          }
          break
        case "ArrowUp":
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          // Guard against modulo by zero when no options
          if (options.length > 0) {
            setSelectedIndex(
              (prev) => (prev - 1 + options.length) % options.length,
            )
          }
          break
        case "Enter":
          if (e.shiftKey) return
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          if (options[selectedIndex]) {
            handleSelect(options[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          onClose()
          break
        case "Tab":
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          if (options[selectedIndex]) {
            handleSelect(options[selectedIndex])
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [isOpen, options, selectedIndex, handleSelect, onClose])

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return

    if (selectedIndex === 0) {
      dropdownRef.current.scrollTo({ top: 0, behavior: "auto" })
      return
    }

    const elements = dropdownRef.current.querySelectorAll("[data-option-index]")
    const selectedElement = elements[selectedIndex] as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex, isOpen])

  // Click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Calculate dropdown dimensions (matching file mention style)
  const dropdownWidth = 320
  const itemHeight = 28  // h-7 = 28px to match file mention
  const headerHeight = 24

  // Count commands by category for height calculation
  const categoryCounts = {
    builtin: options.filter((o) => o.category === "builtin").length,
    mcp: options.filter((o) => o.category === "mcp").length,
    cli: options.filter((o) => o.category === "cli").length,
    ssh: options.filter((o) => o.category === "ssh").length,
    repos: options.filter((o) => o.category === "repos").length,
    repository: options.filter((o) => o.category === "repository").length,
  }

  const headersCount = Object.values(categoryCounts).filter((c) => c > 0).length
  const requestedHeight = Math.min(
    options.length * itemHeight + headersCount * headerHeight + 8,
    280,  // Increased to accommodate more sections
  )
  const gap = 8

  // Decide placement like Radix Popover (auto-flip top/bottom)
  const safeMargin = 10
  const caretOffsetBelow = 20
  const availableBelow =
    window.innerHeight - (position.top + caretOffsetBelow) - safeMargin
  const availableAbove = position.top - safeMargin

  // Compute desired placement, but lock it for the duration of the open state
  if (placementRef.current === null) {
    const condition1 =
      availableAbove >= requestedHeight && availableBelow < requestedHeight
    const condition2 =
      availableAbove > availableBelow && availableAbove >= requestedHeight
    const shouldPlaceAbove = condition1 || condition2
    placementRef.current = shouldPlaceAbove ? "above" : "below"
  }
  const placeAbove = placementRef.current === "above"

  // Compute final top based on placement
  let finalTop = placeAbove
    ? position.top - gap
    : position.top + gap + caretOffsetBelow

  // Slight left bias to better align with '/'
  const leftOffset = -4
  let finalLeft = position.left + leftOffset

  // Adjust horizontal overflow
  if (finalLeft + dropdownWidth > window.innerWidth - safeMargin) {
    finalLeft = window.innerWidth - dropdownWidth - safeMargin
  }
  if (finalLeft < safeMargin) {
    finalLeft = safeMargin
  }

  // Compute actual maxHeight based on available space on the chosen side
  const computedMaxHeight = Math.max(
    80,
    Math.min(
      requestedHeight,
      placeAbove ? availableAbove - gap : availableBelow - gap,
    ),
  )
  const transformY = placeAbove ? "translateY(-100%)" : "translateY(0)"

  // Split options into categories in display order
  const categoryOrder: SlashCommandOption["category"][] = [
    "builtin",
    "mcp",
    "cli",
    "ssh",
    "repos",
    "repository",
  ]

  const optionsByCategory = categoryOrder.reduce(
    (acc, category) => {
      acc[category] = options.filter((o) => o.category === category)
      return acc
    },
    {} as Record<SlashCommandOption["category"], SlashCommandOption[]>,
  )

  // Calculate global index for each item
  let globalIndex = 0

  // Helper to render a command item
  const renderCommandItem = (option: SlashCommandOption, isFirst: boolean) => {
    const currentIndex = globalIndex++
    const isSelected = selectedIndex === currentIndex
    const CommandIcon = getCommandIcon(option.name)
    return (
      <div
        key={option.id}
        data-option-index={currentIndex}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleSelect(option)
        }}
        onMouseEnter={() => setSelectedIndex(currentIndex)}
        className={cn(
          "group inline-flex w-[calc(100%-8px)] mx-1 items-center whitespace-nowrap outline-none",
          "h-7 px-1.5 justify-start text-xs rounded-md",
          "transition-colors cursor-pointer select-none gap-1.5",
          isSelected
            ? "dark:bg-neutral-800 bg-accent text-foreground"
            : "text-muted-foreground dark:hover:bg-neutral-800 hover:bg-accent hover:text-foreground",
        )}
      >
        <CommandIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="flex items-center gap-1 w-full min-w-0">
          <span className="shrink-0 whitespace-nowrap font-medium">
            {option.command}
          </span>
          <span className="text-muted-foreground flex-1 min-w-0 ml-2 overflow-hidden text-[10px] truncate">
            {option.description}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-[99999] overflow-hidden rounded-[10px] border border-border bg-popover py-1 text-xs text-popover-foreground shadow-lg dark"
      style={{
        top: finalTop,
        left: finalLeft,
        width: `${dropdownWidth}px`,
        maxHeight: `${computedMaxHeight}px`,
        overflowY: "auto",
        transform: transformY,
      }}
    >
      {/* Render all category sections */}
      {categoryOrder.map((category, categoryIdx) => {
        const categoryOptions = optionsByCategory[category]
        if (categoryOptions.length === 0) return null

        const config = CATEGORY_CONFIG[category]
        const isFirstSection = categoryIdx === 0 ||
          categoryOrder.slice(0, categoryIdx).every(c => optionsByCategory[c].length === 0)

        return (
          <div key={category}>
            <div className={cn(
              "px-2.5 py-1.5 mx-1 text-xs font-medium text-muted-foreground",
              !isFirstSection && "mt-1"
            )}>
              {config.label}
            </div>
            {categoryOptions.map((option, idx) =>
              renderCommandItem(option, idx === 0)
            )}
          </div>
        )
      })}

      {/* Loading state for repository commands (only when not native-only mode) */}
      {!showNativeOnly && isLoading && (
        <div className="flex items-center gap-1.5 h-7 px-1.5 mx-1 text-xs text-muted-foreground">
          <IconSpinner className="h-3.5 w-3.5" />
          <span>Loading commands...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && options.length === 0 && (
        <div className="h-7 px-1.5 mx-1 flex items-center text-xs text-muted-foreground">
          {debouncedSearchText
            ? `No commands matching "${debouncedSearchText}"`
            : "No commands available"}
        </div>
      )}
    </div>
  )
})
