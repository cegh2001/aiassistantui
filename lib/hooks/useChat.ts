import { useState, useCallback } from 'react'
import { type ChatMessage, type ChatOptions, type ChatResponse } from '@/lib/services/openai'

interface UseChatOptions {
  onSuccess?: (response: ChatResponse) => void
  onError?: (error: string) => void
}

interface UseChatReturn {
  sendMessage: (message: string, options?: ChatOptions) => Promise<ChatResponse | null>
  sendConversation: (messages: ChatMessage[], options?: ChatOptions) => Promise<ChatResponse | null>
  isLoading: boolean
  error: string | null
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (
    message: string, 
    chatOptions?: ChatOptions
  ): Promise<ChatResponse | null> => {
    if (!message.trim()) {
      const errorMsg = 'El mensaje no puede estar vacío'
      setError(errorMsg)
      options.onError?.(errorMsg)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          options: chatOptions
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

      const chatResponse: ChatResponse = result.data
      options.onSuccess?.(chatResponse)
      return chatResponse

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      options.onError?.(errorMsg)
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
      options.onError?.(errorMsg)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          options: chatOptions
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

      const chatResponse: ChatResponse = result.data
      options.onSuccess?.(chatResponse)
      return chatResponse

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      options.onError?.(errorMsg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return {
    sendMessage,
    sendConversation,
    isLoading,
    error
  }
}

export default useChat
