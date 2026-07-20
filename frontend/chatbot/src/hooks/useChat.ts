import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChatMessage,
  ChatWidgetConfig,
  ConnectionStatus,
  ChatTransport
} from '../core/types'
import { createTransport } from '../core/transports'
import { seedMessages } from '../core/mockData'

interface UseChatResult {
  messages: ChatMessage[]
  connectionStatus: ConnectionStatus
  isBotTyping: boolean
  sendMessage: (text: string) => void
  stopGeneration: () => void
}

/**
 * useChat is the bridge between the transport layer (Http/WS/Stream/Mock)
 * and React state. Components never touch a transport directly — they call
 * sendMessage() and read `messages`/`isBotTyping` from this hook.
 */
export function useChat(config: ChatWidgetConfig): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>(
    config.protocol.type === 'mock' ? seedMessages : []
  )
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [isBotTyping, setIsBotTyping] = useState(false)
  const transportRef = useRef<ChatTransport | null>(null)

  const upsertMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === message.id)
      if (existingIndex === -1) return [...prev, message]
      const next = [...prev]
      next[existingIndex] = message
      return next
    })
  }, [])

  const appendChunk = useCallback((id: string, chunkText: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: m.content + chunkText } : m
      )
    )
  }, [])

  const markComplete = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'complete', isStreaming: false } : m
      )
    )
    setIsBotTyping(false)
  }, [])

  const attachSources = useCallback((id: string, sources: ChatMessage['sources']) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, sources } : m))
    )
  }, [])

  const markError = useCallback((error: string, messageId?: string) => {
    setIsBotTyping(false)
    if (!messageId) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: 'error', error, isStreaming: false } : m
      )
    )
  }, [])

  useEffect(() => {
    const transport = createTransport(config.protocol, {
      onMessage: (message) => {
        upsertMessage(message)
        if (message.role === 'assistant' && message.isStreaming) {
          setIsBotTyping(true)
        }
      },
      onStreamChunk: appendChunk,
      onStreamEnd: markComplete,
      onError: markError,
      onConnectionChange: setConnectionStatus,
      onSources: attachSources
    })
    transportRef.current = transport
    transport.connect()

    return () => {
      transport.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.protocol.type])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !transportRef.current) return
      setIsBotTyping(true)
      transportRef.current.sendMessage(trimmed, messages)
    },
    [messages]
  )

  const stopGeneration = useCallback(() => {
    transportRef.current?.stopGeneration?.()
    setIsBotTyping(false)
  }, [])

  return useMemo(
    () => ({ messages, connectionStatus, isBotTyping, sendMessage, stopGeneration }),
    [messages, connectionStatus, isBotTyping, sendMessage, stopGeneration]
  )
}
