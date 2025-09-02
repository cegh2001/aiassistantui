import { useState, useCallback } from 'react'
import { ChatMode } from '../services/openai'

export function useChatMode() {
  const [mode, setMode] = useState<ChatMode>('fast')

  const toggleMode = useCallback(() => {
    setMode(prevMode => prevMode === 'fast' ? 'agent' : 'fast')
  }, [])

  const setFastMode = useCallback(() => {
    setMode('fast')
  }, [])

  const setAgentMode = useCallback(() => {
    setMode('agent')
  }, [])

  return {
    mode,
    setMode,
    toggleMode,
    setFastMode,
    setAgentMode,
    isFastMode: mode === 'fast',
    isAgentMode: mode === 'agent'
  }
}
