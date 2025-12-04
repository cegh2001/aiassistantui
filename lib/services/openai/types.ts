/**
 * Tipos TypeScript para el servicio OpenAI
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
  createdAt?: string
}

export interface ChatResponse {
  id: string
  content: string
  reasoning?: string
  conversationId?: string // ID de la conversación en OpenAI
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

export type ChatMode = 'fast' | 'agent'

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

export type VerbosityLevel = 'low' | 'medium' | 'high'

export type ModelType = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano'

export interface ChatOptions {
  model?: ModelType
  mode?: ChatMode
  reasoningEffort?: ReasoningEffort
  verbosity?: VerbosityLevel
  maxOutputTokens?: number
  conversationId?: string // Para continuar conversaciones existentes
  previousResponseId?: string
  messages?: ChatMessage[] // Para verificar límite en conversaciones
}

export interface ModeConfig {
  reasoningEffort: ReasoningEffort
  verbosity: VerbosityLevel
}

export interface DatabaseTool {
  type: string
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

export interface ToolExecutionResult {
  success: boolean
  content: string
  error?: Error
}

export interface ResponseProcessingResult {
  content: string
  hasToolCalls: boolean
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}
