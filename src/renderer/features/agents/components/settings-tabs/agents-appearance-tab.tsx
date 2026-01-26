"use client"

import { useTheme } from "next-themes"
import { useState, useEffect, useCallback, useMemo } from "react"
import { IconSpinner } from "../../../../icons"
import { useAtom, useSetAtom } from "jotai"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "../../../../lib/utils"
import {
  selectedFullThemeIdAtom,
  fullThemeDataAtom,
  systemLightThemeIdAtom,
  systemDarkThemeIdAtom,
  type VSCodeFullTheme,
} from "../../../../lib/atoms"
import {
  BUILTIN_THEMES,
  getBuiltinThemeById,
} from "../../../../lib/themes/builtin-themes"
import {
  generateCSSVariables,
  applyCSSVariables,
  removeCSSVariables,
  getThemeTypeFromColors,
} from "../../../../lib/themes/vscode-to-css-mapping"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select"

// Theme preview box with dot and "Aa" text
function ThemePreviewBox({ theme, size = "md", className }: { theme: VSCodeFullTheme | null; size?: "sm" | "md"; className?: string }) {
  const bgColor = theme?.colors?.["editor.background"] || "#1a1a1a"
  const accentColor = theme?.colors?.["focusBorder"] || theme?.colors?.["button.background"] || theme?.colors?.["textLink.foreground"] || "#0034FF"
  const isDark = theme ? theme.type === "dark" : true
  
  const sizeClasses = size === "sm" 
    ? "w-7 h-5 text-[9px] gap-0.5 rounded-sm" 
    : "w-8 h-6 text-[10px] gap-1 rounded-sm"
  
  const dotSize = size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5"
  
  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClasses,
        className,
      )}
      style={{ 
        backgroundColor: bgColor,
        boxShadow: "inset 0 0 0 0.5px rgba(128, 128, 128, 0.3)",
      }}
    >
      {/* Accent dot to the left of text */}
      <div 
        className={cn("rounded-full flex-shrink-0", dotSize)} 
        style={{ backgroundColor: accentColor }}
      />
      <span style={{ color: isDark ? "#fff" : "#000", opacity: 0.9 }}>Aa</span>
    </div>
  )
}

export function AgentsAppearanceTab() {
  const { resolvedTheme, setTheme: setNextTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Theme atoms
  const [selectedThemeId, setSelectedThemeId] = useAtom(selectedFullThemeIdAtom)
  const [systemLightThemeId, setSystemLightThemeId] = useAtom(systemLightThemeIdAtom)
  const [systemDarkThemeId, setSystemDarkThemeId] = useAtom(systemDarkThemeIdAtom)
  const setFullThemeData = useSetAtom(fullThemeDataAtom)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Group themes by type
  const darkThemes = useMemo(() => BUILTIN_THEMES.filter(t => t.type === "dark"), [])
  const lightThemes = useMemo(() => BUILTIN_THEMES.filter(t => t.type === "light"), [])
  
  // Is system mode selected
  const isSystemMode = selectedThemeId === null
  
  // Get the current theme for display
  const currentTheme = useMemo(() => {
    if (selectedThemeId === null) {
      return null // System mode
    }
    return BUILTIN_THEMES.find(t => t.id === selectedThemeId) || null
  }, [selectedThemeId])
  
  // Get theme objects for system mode selectors
  const systemLightTheme = useMemo(() => getBuiltinThemeById(systemLightThemeId), [systemLightThemeId])
  const systemDarkTheme = useMemo(() => getBuiltinThemeById(systemDarkThemeId), [systemDarkThemeId])

  // Apply theme based on current settings
  const applyTheme = useCallback((themeId: string | null) => {
    if (themeId === null) {
      // System mode - apply theme based on system preference
      setFullThemeData(null)
      setNextTheme("system")
      
      // Apply the appropriate system theme
      const isDark = resolvedTheme === "dark"
      const systemTheme = isDark 
        ? getBuiltinThemeById(systemDarkThemeId)
        : getBuiltinThemeById(systemLightThemeId)
      
      if (systemTheme) {
        const cssVars = generateCSSVariables(systemTheme.colors)
        applyCSSVariables(cssVars)
      }
      return
    }
    
    const theme = BUILTIN_THEMES.find(t => t.id === themeId)
    if (theme) {
      setFullThemeData(theme)
      
      // Apply CSS variables
      const cssVars = generateCSSVariables(theme.colors)
      applyCSSVariables(cssVars)
      
      // Sync next-themes with theme type
      const themeType = getThemeTypeFromColors(theme.colors)
      if (themeType === "dark") {
        document.documentElement.classList.add("dark")
        document.documentElement.classList.remove("light")
      } else {
        document.documentElement.classList.remove("dark")
        document.documentElement.classList.add("light")
      }
      setNextTheme(themeType)
    }
  }, [resolvedTheme, systemLightThemeId, systemDarkThemeId, setFullThemeData, setNextTheme])

  // Handle main theme selection
  const handleThemeChange = useCallback((value: string) => {
    if (value === "system") {
      setSelectedThemeId(null)
      applyTheme(null)
    } else {
      setSelectedThemeId(value)
      applyTheme(value)
    }
  }, [setSelectedThemeId, applyTheme])

  // Handle system light theme change
  const handleSystemLightThemeChange = useCallback((themeId: string) => {
    setSystemLightThemeId(themeId)
    // If currently in light mode, apply the new theme
    if (resolvedTheme === "light" && selectedThemeId === null) {
      const theme = getBuiltinThemeById(themeId)
      if (theme) {
        const cssVars = generateCSSVariables(theme.colors)
        applyCSSVariables(cssVars)
      }
    }
  }, [setSystemLightThemeId, resolvedTheme, selectedThemeId])

  // Handle system dark theme change
  const handleSystemDarkThemeChange = useCallback((themeId: string) => {
    setSystemDarkThemeId(themeId)
    // If currently in dark mode, apply the new theme
    if (resolvedTheme === "dark" && selectedThemeId === null) {
      const theme = getBuiltinThemeById(themeId)
      if (theme) {
        const cssVars = generateCSSVariables(theme.colors)
        applyCSSVariables(cssVars)
      }
    }
  }, [setSystemDarkThemeId, resolvedTheme, selectedThemeId])

  // Re-apply theme when system preference changes
  useEffect(() => {
    if (selectedThemeId === null && mounted) {
      const isDark = resolvedTheme === "dark"
      const systemTheme = isDark 
        ? getBuiltinThemeById(systemDarkThemeId)
        : getBuiltinThemeById(systemLightThemeId)
      
      if (systemTheme) {
        const cssVars = generateCSSVariables(systemTheme.colors)
        applyCSSVariables(cssVars)
      }
    }
  }, [resolvedTheme, selectedThemeId, systemLightThemeId, systemDarkThemeId, mounted])

  if (!mounted) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <IconSpinner className="h-8 w-8 text-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
        <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
        <p className="text-xs text-muted-foreground">
          Customize the look and feel of the interface
        </p>
      </div>

      {/* Interface Theme Section */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        {/* Main theme selector */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-foreground">
              Interface theme
            </span>
            <span className="text-xs text-muted-foreground">
              Select or customize your interface color scheme
            </span>
          </div>
          
          <Select
            value={selectedThemeId ?? "system"}
            onValueChange={handleThemeChange}
          >
            <SelectTrigger className="w-auto px-2">
              <div className="flex items-center gap-2 min-w-0 -ml-1">
                {isSystemMode ? (
                  <>
                    <ThemePreviewBox theme={resolvedTheme === "dark" ? (systemDarkTheme ?? null) : (systemLightTheme ?? null)} />
                    <span className="text-xs truncate">System preference</span>
                  </>
                ) : (
                  <>
                    <ThemePreviewBox theme={currentTheme} />
                    <span className="text-xs truncate">{currentTheme?.name || "Select"}</span>
                  </>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {/* System preference option */}
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <ThemePreviewBox theme={resolvedTheme === "dark" ? (systemDarkTheme ?? null) : (systemLightTheme ?? null)} size="sm" />
                  <span className="truncate">System preference</span>
                </div>
              </SelectItem>
              
              {/* Light themes */}
              {lightThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    <ThemePreviewBox theme={theme} size="sm" />
                    <span className="truncate">{theme.name}</span>
                  </div>
                </SelectItem>
              ))}
              
              {/* Dark themes */}
              {darkThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    <ThemePreviewBox theme={theme} size="sm" />
                    <span className="truncate">{theme.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Animated Light/Dark theme selectors for system mode */}
        <AnimatePresence initial={false}>
          {isSystemMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="overflow-hidden"
            >
              {/* Light theme selector */}
              <div className="flex items-center justify-between p-4 border-t border-border">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Light
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Theme to use for light system appearance
                  </span>
                </div>
                
                <Select
                  value={systemLightThemeId}
                  onValueChange={handleSystemLightThemeChange}
                >
                  <SelectTrigger className="w-auto px-2">
                    <div className="flex items-center gap-2 min-w-0 -ml-1">
                      <ThemePreviewBox theme={systemLightTheme || null} />
                      <span className="text-xs truncate">{systemLightTheme?.name || "Select"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {lightThemes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        <div className="flex items-center gap-2">
                          <ThemePreviewBox theme={theme} size="sm" />
                          <span className="truncate">{theme.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dark theme selector */}
              <div className="flex items-center justify-between p-4 border-t border-border">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Dark
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Theme to use for dark system appearance
                  </span>
                </div>
                
                <Select
                  value={systemDarkThemeId}
                  onValueChange={handleSystemDarkThemeChange}
                >
                  <SelectTrigger className="w-auto px-2">
                    <div className="flex items-center gap-2 min-w-0 -ml-1">
                      <ThemePreviewBox theme={systemDarkTheme || null} />
                      <span className="text-xs truncate">{systemDarkTheme?.name || "Select"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {darkThemes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        <div className="flex items-center gap-2">
                          <ThemePreviewBox theme={theme} size="sm" />
                          <span className="truncate">{theme.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
