import type { ChatTheme } from '../core/types'

// ============================================================================
// Default theme tokens.
// Deliberately not the generic "cream + terracotta" or "black + neon-green"
// AI-chat defaults — this uses an ink/indigo pairing with a mint accent for
// live/streaming states, giving the widget its own identity out of the box.
// Every value maps 1:1 to a CSS custom property (see ThemeProvider.tsx),
// so host sites can override individual tokens without forking the theme.
// ============================================================================

export const lightTheme: ChatTheme = {
  colorScheme: 'light',
  accentColor: '#4F46E5', // indigo — primary actions, user bubbles
  accentContrastColor: '#FFFFFF',
  backgroundColor: '#F7F7FB',
  surfaceColor: '#FFFFFF',
  textColor: '#1B1D28',
  mutedTextColor: '#6B6F80',
  borderColor: '#E4E4EE',
  borderRadius: '16px',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  bubbleRadiusUser: '18px 18px 4px 18px',
  bubbleRadiusAssistant: '18px 18px 18px 4px'
}

export const darkTheme: ChatTheme = {
  colorScheme: 'dark',
  accentColor: '#6D6AF6',
  accentContrastColor: '#FFFFFF',
  backgroundColor: '#14151F',
  surfaceColor: '#1D1F2E',
  textColor: '#EDEEF7',
  mutedTextColor: '#9296AA',
  borderColor: '#2B2D40',
  borderRadius: '16px',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  bubbleRadiusUser: '18px 18px 4px 18px',
  bubbleRadiusAssistant: '18px 18px 18px 4px'
}

export function resolveTheme(
  scheme: 'light' | 'dark' | 'auto' = 'light',
  overrides?: Partial<ChatTheme>
): ChatTheme {
  const prefersDark =
    scheme === 'auto' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches

  const base = scheme === 'dark' || prefersDark ? darkTheme : lightTheme
  return { ...base, ...overrides }
}

/** Converts a ChatTheme object into a CSS custom-property map for injection */
export function themeToCssVars(theme: ChatTheme): Record<string, string> {
  return {
    '--ccw-accent': theme.accentColor,
    '--ccw-accent-contrast': theme.accentContrastColor,
    '--ccw-bg': theme.backgroundColor,
    '--ccw-surface': theme.surfaceColor,
    '--ccw-text': theme.textColor,
    '--ccw-text-muted': theme.mutedTextColor,
    '--ccw-border': theme.borderColor,
    '--ccw-radius': theme.borderRadius,
    '--ccw-font': theme.fontFamily,
    '--ccw-bubble-radius-user': theme.bubbleRadiusUser,
    '--ccw-bubble-radius-assistant': theme.bubbleRadiusAssistant
  }
}
