"use client"

import { cn } from "../../../lib/utils"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  memo,
  useMemo,
} from "react"
import { createFileIconElement } from "./agents-file-mention"

// Debounce utility for performance optimization
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number,
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
  debouncedFn.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
  }
  return debouncedFn
}

// Threshold for skipping expensive trigger detection (characters)
const LARGE_TEXT_THRESHOLD = 50000

export interface FileMentionOption {
  id: string // file:owner/repo:path/to/file.tsx or folder:owner/repo:path/to/folder or skill:skill-name
  label: string // filename or folder name or skill name
  path: string // full path or skill description
  repository: string
  truncatedPath?: string // directory path for inline display or skill description
  additions?: number // for changed files
  deletions?: number // for changed files
  type?: "file" | "folder" | "skill" | "agent" | "category" // entry type (default: file)
  // Extended data for rich tooltips (skills/agents)
  description?: string // skill/agent description
  tools?: string[] // agent allowed tools
  model?: string // agent model
  source?: "user" | "project" // skill/agent source
}

// Mention ID prefixes
export const MENTION_PREFIXES = {
  FILE: "file:",
  FOLDER: "folder:",
  SKILL: "skill:",
  AGENT: "agent:",
} as const

type TriggerPayload = {
  searchText: string
  rect: DOMRect
}

export type AgentsMentionsEditorHandle = {
  focus: () => void
  blur: () => void
  insertMention: (option: FileMentionOption) => void
  getValue: () => string
  setValue: (value: string) => void
  clear: () => void
  setCursorPosition: (offset: number) => void
}

type AgentsMentionsEditorProps = {
  // UNCONTROLLED: no value/onChange - use ref methods instead
  initialValue?: string // optional initial content
  onTrigger: (payload: TriggerPayload) => void
  onCloseTrigger: () => void
  onContentChange?: (hasContent: boolean) => void // lightweight callback for send button state
  placeholder?: string
  className?: string
  onSubmit?: () => void
  disabled?: boolean
  onPaste?: (e: React.ClipboardEvent) => void
  onShiftTab?: () => void // callback for Shift+Tab (e.g., mode switching)
  onFocus?: () => void
  onBlur?: () => void
}

// Append text to element (no styling in input, ultrathink only in sent messages)
function appendText(root: HTMLElement, text: string) {
  if (text) {
    root.appendChild(document.createTextNode(text))
  }
}

// Create styled mention chip (matching canvas style)
function createMentionNode(option: FileMentionOption): HTMLSpanElement {
  const span = document.createElement("span")
  span.setAttribute("contenteditable", "false")
  span.setAttribute("data-mention-id", option.id)
  span.setAttribute("data-mention-type", option.type || "file")
  span.className =
    "inline-flex items-center gap-1 px-[6px] py-[1px] rounded-[4px] text-sm align-middle bg-black/[0.04] dark:bg-white/[0.08] text-foreground/80 [&.mention-selected]:bg-primary/70 [&.mention-selected]:text-primary-foreground"

  // Create icon element (pass type for folder icon)
  const iconElement = createFileIconElement(option.label, option.type)
  span.appendChild(iconElement)

  const label = document.createElement("span")
  label.textContent = option.label

  span.appendChild(label)
  return span
}

// Serialize DOM to text with @[id] tokens
function serializeContent(root: HTMLElement): string {
  let result = ""
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  )
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ""
      node = walker.nextNode()
      continue
    }
    const el = node as HTMLElement
    // Handle <br> elements as newlines
    if (el.tagName === "BR") {
      result += "\n"
      node = walker.nextNode()
      continue
    }
    // Handle <div> elements (some browsers wrap lines in divs)
    if (el.tagName === "DIV" && el !== root) {
      // Add newline before div content (if not at start)
      if (result.length > 0 && !result.endsWith("\n")) {
        result += "\n"
      }
      node = walker.nextNode()
      continue
    }
    // Handle ultrathink styled nodes
    if (el.hasAttribute("data-ultrathink")) {
      result += el.textContent || ""
      // Skip subtree
      let next: Node | null = el.nextSibling
      if (next) {
        walker.currentNode = next
        node = next
        continue
      }
      let parent: Node | null = el.parentNode
      while (parent && !parent.nextSibling) parent = parent.parentNode
      if (parent && parent.nextSibling) {
        walker.currentNode = parent.nextSibling
        node = parent.nextSibling
      } else {
        node = null
      }
      continue
    }
    if (el.hasAttribute("data-mention-id")) {
      const id = el.getAttribute("data-mention-id") || ""
      result += `@[${id}]`
      // Skip subtree
      let next: Node | null = el.nextSibling
      if (next) {
        walker.currentNode = next
        node = next
        continue
      }
      let parent: Node | null = el.parentNode
      while (parent && !parent.nextSibling) parent = parent.parentNode
      if (parent && parent.nextSibling) {
        walker.currentNode = parent.nextSibling
        node = parent.nextSibling
      } else {
        node = null
      }
      continue
    }
    node = walker.nextNode()
  }
  return result
}

// Build DOM from serialized text
function buildContentFromSerialized(
  root: HTMLElement,
  serialized: string,
  resolveMention?: (id: string) => FileMentionOption | null,
) {
  // Clear safely
  while (root.firstChild) {
    root.removeChild(root.firstChild)
  }

  const regex = /@\[([^\]]+)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(serialized)) !== null) {
    // Text before mention
    if (match.index > lastIndex) {
      appendText(root, serialized.slice(lastIndex, match.index))
    }
    const id = match[1]
    // Try to resolve mention
    let option: FileMentionOption | null = null
    if (resolveMention) {
      option = resolveMention(id)
    }
    if (!option && (id.startsWith(MENTION_PREFIXES.FILE) || id.startsWith(MENTION_PREFIXES.FOLDER))) {
      // Parse file/folder mention: file:repo:path or folder:repo:path
      const parts = id.split(":")
      if (parts.length >= 3) {
        const type = parts[0] as "file" | "folder"
        const repo = parts[1]
        const path = parts.slice(2).join(":")
        const name = path.split("/").pop() || path
        option = { id, label: name, path, repository: repo, type }
      }
    }
    if (!option && id.startsWith(MENTION_PREFIXES.SKILL)) {
      // Parse skill mention: skill:skill-name
      const skillName = id.slice(MENTION_PREFIXES.SKILL.length)
      option = { id, label: skillName, path: "", repository: "", type: "skill" }
    }
    if (option) {
      root.appendChild(createMentionNode(option))
      root.appendChild(document.createTextNode(" "))
    } else {
      // Fallback: just show the id
      root.appendChild(document.createTextNode(`@[${id}]`))
    }
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < serialized.length) {
    appendText(root, serialized.slice(lastIndex))
  }
}

// Combined tree walk result - computes everything in ONE pass instead of 3
interface TreeWalkResult {
  serialized: string
  textBeforeCursor: string
  atPosition: { node: Node; offset: number } | null
  atIndex: number
  // Slash command trigger info
  slashPosition: { node: Node; offset: number } | null
  slashIndex: number
}

// Single O(n) tree walk that computes all needed data
function walkTreeOnce(root: HTMLElement, range: Range | null): TreeWalkResult {
  let serialized = ""
  let textBeforeCursor = ""
  let reachedCursor = false
  let atPosition: { node: Node; offset: number } | null = null
  let atIndex = -1
  let slashPosition: { node: Node; offset: number } | null = null
  let slashIndex = -1

  // Handle case where cursor is in root element (not in a text node)
  // This happens when the editor is empty or cursor is at element boundary
  let cursorInRoot = false
  let cursorRootOffset = 0
  if (range && range.endContainer === root) {
    cursorInRoot = true
    cursorRootOffset = range.endOffset
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  )
  let node: Node | null = walker.nextNode()

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ""

      // Check if cursor is in this node (direct case)
      const cursorInThisNode = range && !reachedCursor && node === range.endContainer

      // Handle cursor in root element - cursor is positioned between children
      // cursorRootOffset indicates the child index where cursor is
      let cursorAtRootBoundary = false
      if (cursorInRoot && !reachedCursor && node.parentNode === root) {
        const children = Array.from(root.childNodes)
        const nodeIndex = children.indexOf(node as ChildNode)
        // If cursor is after this node, include full text
        // If cursor is at this node's position, we've passed the cursor
        if (nodeIndex >= cursorRootOffset) {
          cursorAtRootBoundary = true
        }
      }

      if (cursorInThisNode) {
        const cursorOffset = range!.endOffset
        textBeforeCursor += text.slice(0, cursorOffset)
        reachedCursor = true

        // Find @ in text before cursor for this node
        const textBeforeInNode = text.slice(0, cursorOffset)
        const localAtIdx = textBeforeInNode.lastIndexOf("@")
        if (localAtIdx !== -1) {
          const globalAtIdx = serialized.length + localAtIdx
          // Check if this @ is the most recent one
          if (globalAtIdx > atIndex) {
            const afterAt = textBeforeCursor.slice(
              textBeforeCursor.lastIndexOf("@") + 1,
            )
            if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
              atIndex = globalAtIdx
              atPosition = { node, offset: localAtIdx }
            }
          }
        }

        // Find / at start of line (for slash commands)
        // Check all occurrences of / in this node
        for (let i = 0; i < textBeforeInNode.length; i++) {
          if (textBeforeInNode[i] === "/") {
            const globalSlashIdx = serialized.length + i
            // / is valid only at start of text OR after newline
            const charBefore =
              globalSlashIdx === 0
                ? null
                : (serialized + textBeforeInNode.slice(0, i)).charAt(
                    globalSlashIdx - 1,
                  )
            if (charBefore === null || charBefore === "\n") {
              // Check no space between / and cursor
              const afterSlash = textBeforeCursor.slice(globalSlashIdx + 1)
              if (!afterSlash.includes(" ") && !afterSlash.includes("\n")) {
                slashIndex = globalSlashIdx
                slashPosition = { node, offset: i }
              }
            }
          }
        }
      } else if (cursorAtRootBoundary) {
        // Cursor is in root element, at or past this node's position
        // Mark as reached and don't include this text in textBeforeCursor
        reachedCursor = true
      } else if (!reachedCursor) {
        textBeforeCursor += text
        // Track @ positions as we go
        const localAtIdx = text.lastIndexOf("@")
        if (localAtIdx !== -1) {
          atIndex = serialized.length + localAtIdx
          atPosition = { node, offset: localAtIdx }
        }

        // Track / positions for slash commands (same logic as @)
        for (let i = 0; i < text.length; i++) {
          if (text[i] === "/") {
            const globalSlashIdx = serialized.length + i
            // / is valid only at start of text OR after newline
            const charBefore =
              globalSlashIdx === 0
                ? null
                : (serialized + text.slice(0, i)).charAt(globalSlashIdx - 1)
            if (charBefore === null || charBefore === "\n") {
              slashIndex = globalSlashIdx
              slashPosition = { node, offset: i }
            }
          }
        }
      }

      serialized += text
      node = walker.nextNode()
      continue
    }

    // Element node - check for ultrathink or mention
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement

      // Handle ultrathink styled nodes
      if (el.hasAttribute("data-ultrathink")) {
        const text = el.textContent || ""
        serialized += text
        if (!reachedCursor) {
          textBeforeCursor += text
        }

        // Skip ultrathink subtree
        let next: Node | null = el.nextSibling
        if (next) {
          walker.currentNode = next
          node = next
          continue
        }
        let parent: Node | null = el.parentNode
        while (parent && !parent.nextSibling) parent = parent.parentNode
        if (parent && parent.nextSibling) {
          walker.currentNode = parent.nextSibling
          node = parent.nextSibling
          continue
        }
        node = null
        continue
      }

      if (el.hasAttribute("data-mention-id")) {
        const id = el.getAttribute("data-mention-id") || ""
        const mentionToken = `@[${id}]`
        serialized += mentionToken
        if (!reachedCursor) {
          textBeforeCursor += mentionToken
        }

        // Skip mention subtree
        let next: Node | null = el.nextSibling
        if (next) {
          walker.currentNode = next
          node = next
          continue
        }
        let parent: Node | null = el.parentNode
        while (parent && !parent.nextSibling) parent = parent.parentNode
        if (parent && parent.nextSibling) {
          walker.currentNode = parent.nextSibling
          node = parent.nextSibling
          continue
        }
        node = null
        continue
      }
    }

    node = walker.nextNode()
  }

  // Validate @ trigger - check if space/newline after it
  if (atIndex !== -1) {
    const afterAt = textBeforeCursor.slice(atIndex + 1)
    if (afterAt.includes(" ") || afterAt.includes("\n")) {
      atIndex = -1
      atPosition = null
    }
  }

  // Validate / trigger - check if space/newline after it
  if (slashIndex !== -1) {
    const afterSlash = textBeforeCursor.slice(slashIndex + 1)
    if (afterSlash.includes(" ") || afterSlash.includes("\n")) {
      slashIndex = -1
      slashPosition = null
    }
  }

  return {
    serialized,
    textBeforeCursor,
    atPosition,
    atIndex,
    slashPosition,
    slashIndex,
  }
}

// Memoized to prevent re-renders when parent re-renders
export const AgentsMentionsEditor = memo(
  forwardRef<AgentsMentionsEditorHandle, AgentsMentionsEditorProps>(
    function AgentsMentionsEditor(
      {
        initialValue,
        onTrigger,
        onCloseTrigger,
        onContentChange,
        placeholder,
        className,
        onSubmit,
        disabled,
        onPaste,
        onShiftTab,
        onFocus,
        onBlur,
      },
      ref,
    ) {
      const editorRef = useRef<HTMLDivElement>(null)
      const triggerActive = useRef(false)
      const triggerStartIndex = useRef<number | null>(null)
      // Track if editor has content for placeholder (updated via DOM, no React state)
      const [hasContent, setHasContent] = useState(false)

      // Resolve mention from id for rendering
      const resolveMention = useCallback(
        (id: string): FileMentionOption | null => {
          if (id.startsWith(MENTION_PREFIXES.FILE) || id.startsWith(MENTION_PREFIXES.FOLDER)) {
            const parts = id.split(":")
            if (parts.length >= 3) {
              const type = parts[0] as "file" | "folder"
              const repo = parts[1]
              const path = parts.slice(2).join(":")
              const name = path.split("/").pop() || path
              return { id, label: name, path, repository: repo, type }
            }
          }
          if (id.startsWith(MENTION_PREFIXES.SKILL)) {
            const skillName = id.slice(MENTION_PREFIXES.SKILL.length)
            return { id, label: skillName, path: "", repository: "", type: "skill" }
          }
          return null
        },
        [],
      )

      // Initialize editor with initialValue on mount
      useEffect(() => {
        if (editorRef.current && initialValue) {
          buildContentFromSerialized(
            editorRef.current,
            initialValue,
            resolveMention,
          )
          setHasContent(!!initialValue)
        }
      }, []) // Only on mount

      // Handle selection changes to highlight mention chips
      useEffect(() => {
        const handleSelectionChange = () => {
          if (!editorRef.current) return

          const selection = window.getSelection()
          if (!selection || selection.rangeCount === 0) {
            // Clear all highlights when no selection
            const mentions =
              editorRef.current.querySelectorAll("[data-mention-id]")
            mentions.forEach((mention) => {
              const mentionEl = mention as HTMLElement
              mentionEl.classList.remove("mention-selected")
            })
            return
          }

          const range = selection.getRangeAt(0)

          // Check if selection is within our editor
          const commonAncestor = range.commonAncestorContainer
          const isInEditor = editorRef.current.contains(
            commonAncestor.nodeType === Node.ELEMENT_NODE
              ? commonAncestor
              : commonAncestor.parentElement,
          )

          if (!isInEditor) return

          // Get all mention chips
          const mentions =
            editorRef.current.querySelectorAll("[data-mention-id]")

          mentions.forEach((mention) => {
            const mentionEl = mention as HTMLElement

            // Check if mention is within selection range
            if (range.intersectsNode(mentionEl)) {
              mentionEl.classList.add("mention-selected")
            } else {
              mentionEl.classList.remove("mention-selected")
            }
          })
        }

        document.addEventListener("selectionchange", handleSelectionChange)
        return () => {
          document.removeEventListener("selectionchange", handleSelectionChange)
        }
      }, [])

      // Debounced trigger detection for performance (expensive tree walk)
      const debouncedTriggerDetection = useMemo(
        () =>
          debounce(() => {
            if (!editorRef.current) return

            const content = editorRef.current.textContent || ""

            // Skip expensive trigger detection for very large text
            // This prevents UI freeze when pasting large content
            if (content.length > LARGE_TEXT_THRESHOLD) {
              // Close any open triggers since we can't detect them
              if (triggerActive.current) {
                triggerActive.current = false
                triggerStartIndex.current = null
                onCloseTrigger()
              }
              return
            }

            // Get selection for cursor position
            const sel = window.getSelection()
            const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null

            // Handle non-collapsed selection (close triggers)
            if (range && !range.collapsed) {
              if (triggerActive.current) {
                triggerActive.current = false
                triggerStartIndex.current = null
                onCloseTrigger()
              }
              return
            }

            // Tree walk for @ trigger detection
            const {
              textBeforeCursor,
              atPosition,
              atIndex,
            } = walkTreeOnce(editorRef.current, range)

            // Handle @ trigger
            if (atIndex !== -1 && atPosition) {
              triggerActive.current = true
              triggerStartIndex.current = atIndex

              const afterAt = textBeforeCursor.slice(atIndex + 1)

              // Get position for dropdown
              if (atPosition.node.nodeType === Node.TEXT_NODE) {
                const tempRange = document.createRange()
                tempRange.setStart(atPosition.node, atPosition.offset)
                tempRange.setEnd(atPosition.node, atPosition.offset + 1)
                const rect = tempRange.getBoundingClientRect()
                onTrigger({ searchText: afterAt, rect })
                return
              }
            }

            // Close @ trigger if no @ found
            if (triggerActive.current) {
              triggerActive.current = false
              triggerStartIndex.current = null
              onCloseTrigger()
            }

          }, 16), // ~1 frame delay for debounce
        [onTrigger, onCloseTrigger],
      )

      // Cleanup debounce on unmount
      useEffect(() => {
        return () => {
          debouncedTriggerDetection.cancel()
        }
      }, [debouncedTriggerDetection])

      // Handle input - UNCONTROLLED: no onChange, just @ trigger detection
      const handleInput = useCallback(() => {
        if (!editorRef.current) return

        // Update placeholder visibility and notify parent IMMEDIATELY (cheap operation)
        // Use textContent without trim() so placeholder hides even with just spaces
        const content = editorRef.current.textContent
        const newHasContent = !!content
        setHasContent(newHasContent)
        onContentChange?.(newHasContent)

        // Debounce the expensive trigger detection
        debouncedTriggerDetection()
      }, [onContentChange, debouncedTriggerDetection])

      // Handle keydown
      const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            if (triggerActive.current) {
              // Let dropdown handle Enter
              return
            }
            e.preventDefault()
            onSubmit?.()
          }
          if (e.key === "Escape") {
            // Close mention dropdown
            if (triggerActive.current) {
              e.preventDefault()
              triggerActive.current = false
              triggerStartIndex.current = null
              onCloseTrigger()
              return
            }
            // If no dropdown is open, blur the editor (but don't prevent default
            // to allow other handlers like multi-select clear to run)
            editorRef.current?.blur()
          }
          if (e.key === "Tab" && e.shiftKey) {
            e.preventDefault()
            onShiftTab?.()
          }
        },
        [onSubmit, onCloseTrigger, onShiftTab],
      )

      // Expose methods via ref (UNCONTROLLED pattern)
      useImperativeHandle(
        ref,
        () => ({
          focus: () => {
            const editor = editorRef.current
            if (!editor) return

            editor.focus()

            // Always ensure cursor is visible at end
            const sel = window.getSelection()
            if (sel && sel.rangeCount === 0) {
              sel.selectAllChildren(editor)
              sel.collapseToEnd()
            }
          },

          blur: () => {
            const editor = editorRef.current
            if (!editor) return
            editor.blur()
          },

          // Get serialized value with @[id] tokens
          getValue: () => {
            if (!editorRef.current) return ""
            return serializeContent(editorRef.current)
          },

          // Set content from serialized string
          setValue: (value: string) => {
            if (!editorRef.current) return
            buildContentFromSerialized(editorRef.current, value, resolveMention)
            const newHasContent = !!value
            setHasContent(newHasContent)
            onContentChange?.(newHasContent)
          },

          // Clear editor content
          clear: () => {
            if (!editorRef.current) return
            editorRef.current.innerHTML = ""
            setHasContent(false)
            onContentChange?.(false)
            triggerActive.current = false
            triggerStartIndex.current = null
          },

          setCursorPosition: (offset: number) => {
            if (!editorRef.current) return

            const sel = window.getSelection()
            if (!sel) return

            // Find the text node and set cursor position
            const walker = document.createTreeWalker(
              editorRef.current,
              NodeFilter.SHOW_TEXT,
            )
            const firstTextNode = walker.nextNode()

            if (firstTextNode && firstTextNode.nodeType === Node.TEXT_NODE) {
              const range = document.createRange()
              const maxOffset = Math.min(offset, firstTextNode.textContent?.length || 0)
              range.setStart(firstTextNode, maxOffset)
              range.collapse(true)
              sel.removeAllRanges()
              sel.addRange(range)
            }
          },

          insertMention: (option: FileMentionOption) => {
            if (!editorRef.current) return

            const sel = window.getSelection()
            if (!sel || sel.rangeCount === 0) return

            const range = sel.getRangeAt(0)
            const node = range.startContainer

            // Remove @ and search text
            if (
              node.nodeType === Node.TEXT_NODE &&
              triggerStartIndex.current !== null
            ) {
              const text = node.textContent || ""

              // Find local position of @ within THIS text node
              let localAtPosition = 0
              let serializedCharCount = 0

              const walker = document.createTreeWalker(
                editorRef.current,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
              )
              let walkNode: Node | null = walker.nextNode()

              while (walkNode) {
                if (walkNode === node) {
                  localAtPosition =
                    triggerStartIndex.current - serializedCharCount
                  break
                }

                if (walkNode.nodeType === Node.TEXT_NODE) {
                  serializedCharCount += (walkNode.textContent || "").length
                } else if (walkNode.nodeType === Node.ELEMENT_NODE) {
                  const el = walkNode as HTMLElement
                  if (el.hasAttribute("data-mention-id")) {
                    const id = el.getAttribute("data-mention-id") || ""
                    serializedCharCount += `@[${id}]`.length
                    let next: Node | null = el.nextSibling
                    if (next) {
                      walker.currentNode = next
                      walkNode = next
                      continue
                    }
                  }
                }
                walkNode = walker.nextNode()
              }

              const beforeAt = text.slice(0, localAtPosition)
              const afterCursor = text.slice(range.startOffset)
              node.textContent = beforeAt + afterCursor

              // Insert mention node
              const mentionNode = createMentionNode(option)
              const newRange = document.createRange()
              newRange.setStart(node, localAtPosition)
              newRange.collapse(true)
              newRange.insertNode(mentionNode)

              // Add space after and move cursor
              const space = document.createTextNode(" ")
              mentionNode.after(space)
              newRange.setStartAfter(space)
              newRange.collapse(true)
              sel.removeAllRanges()
              sel.addRange(newRange)

              // Update hasContent
              setHasContent(true)
            }

            // Close trigger
            triggerActive.current = false
            triggerStartIndex.current = null
            onCloseTrigger()
          },
        }),
        [onCloseTrigger, resolveMention, onContentChange],
      )

      return (
        <div className="relative">
          {!hasContent && placeholder && (
            <div className="pointer-events-none absolute left-1 top-1 text-sm text-muted-foreground/60 whitespace-pre-wrap">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            spellCheck={false}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            className={cn(
              "min-h-[24px] outline-none whitespace-pre-wrap break-words text-sm relative",
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
          />
        </div>
      )
    },
  ),
)
