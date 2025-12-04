import { useState, useCallback } from 'react'
import { type ChatMessage, type ChatOptions, type ChatResponse } from '@/lib/services/openai'

interface LimitInfo {
  remaining?: number
  max?: number
  warning?: string
  // Campos adicionales para errores
  environment?: 'production' | 'development'
  enforceLimits?: boolean
  maxResponses?: number
  currentResponses?: number
  remainingResponses?: number
  hasReachedLimit?: boolean
  ip?: string
}

interface UseChatOptions {
  conversationId?: string // Para enviar mensajes en una conversación específica
  onSuccess?: (response: ChatResponse, limitInfo?: LimitInfo) => void
  onError?: (error: string, isLimitError?: boolean, limitInfo?: LimitInfo) => void
  onLimitWarning?: (warning: string, remaining: number) => void
}

interface UseChatReturn {
  sendMessage: (message: string, options?: ChatOptions) => Promise<ChatResponse | null>
  sendConversation: (messages: ChatMessage[], options?: ChatOptions) => Promise<ChatResponse | null>
  isLoading: boolean
  error: string | null
  isLimitReached: boolean
  limitInfo: LimitInfo | null
  remainingResponses: number | null
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)
  const [remainingResponses, setRemainingResponses] = useState<number | null>(null)

  const sendMessage = useCallback(async (
    message: string, 
    chatOptions?: ChatOptions
  ): Promise<ChatResponse | null> => {
    if (!message.trim()) {
      const errorMsg = 'El mensaje no puede estar vacío'
      setError(errorMsg)
      options.onError?.(errorMsg, false)
      return null
    }

    setIsLoading(true)
    setError(null)
    setIsLimitReached(false)

    try {
      // Combinar conversationId de las opciones del hook con las opciones del chat
      const finalOptions = {
        ...chatOptions,
        conversationId: chatOptions?.conversationId || options.conversationId
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          options: finalOptions
        }),
      })

      const result = await response.json()

      // Manejo especial de error 429 (límite de respuestas)
      if (response.status === 429) {
        const isLimitError = result.isLimitReached || result.error?.includes('límite')
        setIsLimitReached(true)
        setRemainingResponses(0)
        if (result.limitInfo) {
          setLimitInfo(result.limitInfo)
        }
        setError(result.error || 'Límite alcanzado')
        options.onError?.(result.error || 'Límite alcanzado', isLimitError, result.limitInfo)
        return null
      }

      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

      // Procesar info de límite en respuesta exitosa
      if (result.limitInfo) {
        setLimitInfo(result.limitInfo)
        setRemainingResponses(result.limitInfo.remaining ?? null)
        
        // Notificar advertencia si existe
        if (result.limitInfo.warning) {
          options.onLimitWarning?.(result.limitInfo.warning, result.limitInfo.remaining)
        }
      }

      const chatResponse: ChatResponse = result.data
      options.onSuccess?.(chatResponse, result.limitInfo)
      return chatResponse

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      options.onError?.(errorMsg, false)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const sendConversation = useCallback(async (
    messages: ChatMessage[], 
    chatOptions?: ChatOptions
  ): Promise<ChatResponse | null> => {
    if (!messages || messages.length === 0) {
      const errorMsg = 'La conversación no puede estar vacía'
      setError(errorMsg)
      options.onError?.(errorMsg, false)
      return null
    }

    setIsLoading(true)
    setError(null)
    setIsLimitReached(false)

    try {
      // Combinar conversationId de las opciones del hook con las opciones del chat
      const finalOptions = {
        ...chatOptions,
        conversationId: chatOptions?.conversationId || options.conversationId
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          options: finalOptions
        }),
      })

      const result = await response.json()

      // Manejo especial de error 429 (límite de respuestas)
      if (response.status === 429) {
        const isLimitError = result.isLimitReached || result.error?.includes('límite')
        setIsLimitReached(true)
        setRemainingResponses(0)
        if (result.limitInfo) {
          setLimitInfo(result.limitInfo)
        }
        setError(result.error || 'Límite alcanzado')
        options.onError?.(result.error || 'Límite alcanzado', isLimitError, result.limitInfo)
        return null
      }

      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

      // Procesar info de límite en respuesta exitosa
      if (result.limitInfo) {
        setLimitInfo(result.limitInfo)
        setRemainingResponses(result.limitInfo.remaining ?? null)
        
        // Notificar advertencia si existe
        if (result.limitInfo.warning) {
          options.onLimitWarning?.(result.limitInfo.warning, result.limitInfo.remaining)
        }
      }

      const chatResponse: ChatResponse = result.data
      options.onSuccess?.(chatResponse, result.limitInfo)
      return chatResponse

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      options.onError?.(errorMsg, false)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return {
    sendMessage,
    sendConversation,
    isLoading,
    error,
    isLimitReached,
    limitInfo,
    remainingResponses
  }
}

export default useChat
