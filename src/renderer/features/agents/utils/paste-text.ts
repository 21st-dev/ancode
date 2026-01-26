/**
 * Insert text at the current cursor position in a contentEditable element.
 * Uses requestAnimationFrame for async insertion to prevent UI freeze with large text.
 *
 * @param text - The text to insert
 * @param editableElement - The contentEditable element to dispatch input event to
 */
export function insertTextAtCursor(text: string, editableElement: Element): void {
  // Use async insertion to prevent UI freeze with large text
  // requestAnimationFrame allows the browser to process the paste event
  // before we modify the DOM, preventing blocking the main thread
  requestAnimationFrame(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const textNode = document.createTextNode(text)
      range.insertNode(textNode)
      // Move cursor to end of inserted text
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
      selection.removeAllRanges()
      selection.addRange(range)
      // Trigger input event on the contentEditable element for editor to update state
      const inputEvent = new Event("input", { bubbles: true })
      editableElement.dispatchEvent(inputEvent)
    }
  })
}

/**
 * Handle paste event for contentEditable elements.
 * Extracts images and passes them to handleAddAttachments.
 * For text, pastes as plain text only (prevents HTML).
 *
 * @param e - The clipboard event
 * @param handleAddAttachments - Callback to handle image attachments
 */
export function handlePasteEvent(
  e: React.ClipboardEvent,
  handleAddAttachments: (files: File[]) => void,
): void {
  const files = Array.from(e.clipboardData.items)
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean) as File[]

  if (files.length > 0) {
    e.preventDefault()
    handleAddAttachments(files)
  } else {
    // Paste as plain text only (prevents HTML from being pasted)
    const text = e.clipboardData.getData("text/plain")
    if (text) {
      e.preventDefault()
      // Get the contentEditable element before async operation
      const target = e.currentTarget as HTMLElement
      const editableElement =
        target.closest('[contenteditable="true"]') || target
      insertTextAtCursor(text, editableElement)
    }
  }
}
