import { loader } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

// Configure Monaco loader for Electron
// In Electron, we need to ensure Monaco loads from local node_modules
// rather than from CDN, which may not work in packaged apps
export function configureMonacoLoader() {
  // Monaco will automatically resolve from node_modules in Electron
  // The @monaco-editor/react package handles this well by default
  // but we can configure it explicitly if needed
  loader.config({
    // Use default CDN in development, will work in Electron
    // For production builds, the bundler handles Monaco correctly
  })
}

// Default editor options for read-only file viewing
export const defaultEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  minimap: { enabled: true },
  lineNumbers: "on",
  wordWrap: "off",
  automaticLayout: true,
  fontSize: 13,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  folding: true,
  foldingStrategy: "indentation",
  showFoldingControls: "mouseover",
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
  scrollBeyondLastLine: false,
  renderWhitespace: "selection",
  scrollbar: {
    vertical: "auto",
    horizontal: "auto",
    useShadows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
  padding: {
    top: 8,
    bottom: 8,
  },
  // Disable features not needed for read-only viewing
  quickSuggestions: false,
  parameterHints: { enabled: false },
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  wordBasedSuggestions: "off",
  // Enable search functionality
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: "never",
    seedSearchStringFromSelection: "always",
  },
  // Make it look nice
  smoothScrolling: true,
  cursorBlinking: "solid",
  cursorStyle: "line",
  renderLineHighlight: "line",
  contextmenu: true,
  mouseWheelZoom: true,
}

// Map app theme to Monaco theme
export function getMonacoTheme(appTheme: string): string {
  // Check if it's a dark theme
  const isDark = appTheme.includes("dark") ||
                 appTheme === "vesper" ||
                 appTheme === "min-dark" ||
                 appTheme === "vitesse-dark"

  return isDark ? "vs-dark" : "vs"
}
