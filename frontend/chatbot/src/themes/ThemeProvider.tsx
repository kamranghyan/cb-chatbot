import React, { useMemo } from 'react'
import type { ChatTheme } from '../core/types'
import { resolveTheme, themeToCssVars } from './defaultTheme'

interface ThemeProviderProps {
  colorScheme?: 'light' | 'dark' | 'auto'
  overrides?: Partial<ChatTheme>
  children: React.ReactNode
}

/**
 * Wraps the widget and exposes the active theme as CSS custom properties
 * on a scoped div (`.ccw-root`). All component CSS reads var(--ccw-*),
 * so a host site can re-theme the widget purely by passing a different
 * `theme` object to <ChatWidget /> — no component code changes needed.
 */
export function ThemeProvider({ colorScheme = 'light', overrides, children }: ThemeProviderProps) {
  const theme = useMemo(() => resolveTheme(colorScheme, overrides), [colorScheme, overrides])
  const cssVars = useMemo(() => themeToCssVars(theme), [theme])

  return (
    <div className="ccw-root" style={cssVars as React.CSSProperties} data-scheme={theme.colorScheme}>
      {children}
    </div>
  )
}
