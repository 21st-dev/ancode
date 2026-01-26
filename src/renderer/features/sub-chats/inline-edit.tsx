import { Input } from "../../components/ui/input"
import { useEffect, useRef } from "react"

interface InlineEditProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function InlineEdit({
  value,
  onChange,
  onSave,
  onCancel,
  isEditing,
  disabled = false,
  className = "",
  placeholder = "",
}: InlineEditProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Use refs to avoid stale closures and effect re-runs
  const onSaveRef = useRef(onSave)
  const onCancelRef = useRef(onCancel)

  // Keep refs up to date
  useEffect(() => {
    onSaveRef.current = onSave
    onCancelRef.current = onCancel
  }, [onSave, onCancel])

  // Auto-focus and select text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use setTimeout to ensure the input is rendered first
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [isEditing])

  // Handle clicks outside to save and exit editing mode
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onSaveRef.current()
      }
    }

    // Add delay to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      onSaveRef.current()
    } else if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      onCancelRef.current()
    }
  }

  if (!isEditing) {
    return null
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`ring-1 ring-[#3182ED] focus-visible:ring-1 focus-visible:ring-[#3182ED] focus-visible:ring-offset-0 rounded-[2px] shadow-none min-w-0 text-foreground border-0 h-auto px-1 py-0 leading-4 inline-flex ${className}`}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
    />
  )
}
