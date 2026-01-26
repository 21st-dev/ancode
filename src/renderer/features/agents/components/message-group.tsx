import { useEffect, useRef } from "react"

interface MessageGroupProps {
  children: React.ReactNode
  isLastGroup?: boolean
}

/**
 * Message group wrapper - measures user message height for sticky todo positioning.
 * Uses content-visibility: auto for performance optimization in long chats.
 * Only visible groups are rendered, providing significant performance improvements.
 */
export function MessageGroup({ children, isLastGroup }: MessageGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null)
  const userMessageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const groupEl = groupRef.current
    if (!groupEl) return

    // Find the actual bubble element (not the wrapper which includes gradient)
    const bubbleEl = groupEl.querySelector('[data-user-bubble]') as HTMLDivElement | null
    if (!bubbleEl) return

    userMessageRef.current = bubbleEl

    const updateHeight = () => {
      const height = bubbleEl.offsetHeight
      // Set CSS variable directly on DOM - no React state, no re-renders
      groupEl.style.setProperty('--user-message-height', `${height}px`)
    }

    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(bubbleEl)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={groupRef}
      className="relative"
      style={{
        // content-visibility: auto - браузер пропускает layout/paint для элементов вне viewport
        // Это ОГРОМНАЯ оптимизация для длинных чатов - рендерится только видимое
        contentVisibility: "auto",
        // Примерная высота для правильного скроллбара до рендеринга
        containIntrinsicSize: "auto 200px",
        // Последняя группа имеет минимальную высоту контейнера чата (минус отступ)
        ...(isLastGroup && { minHeight: "calc(var(--chat-container-height) - 32px)" }),
      }}
      data-last-group={isLastGroup || undefined}
    >
      {children}
    </div>
  )
}
