import OpenAI from 'openai'

// Configuración del cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

export type ChatMode = 'fast' | 'agent'

export interface ChatOptions {
  model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano'
  mode?: ChatMode
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  verbosity?: 'low' | 'medium' | 'high'
  maxOutputTokens?: number
  previousResponseId?: string
}

export class OpenAIService {
  private static instance: OpenAIService
  
  private constructor() {}
  
  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }

  /**
   * Obtiene la configuración basada en el modo
   */
  private getModeConfig(mode: ChatMode) {
    switch (mode) {
      case 'fast':
        return {
          reasoningEffort: 'low' as const,
          verbosity: 'low' as const
        }
      case 'agent':
        return {
          reasoningEffort: 'high' as const,
          verbosity: 'medium' as const
        }
      default:
        return {
          reasoningEffort: 'medium' as const,
          verbosity: 'medium' as const
        }
    }
  }

  /**
   * Detecta si un mensaje requiere uso del agente MCP
   */
  private shouldUseMCPAgent(input: string): boolean {
    const mcpKeywords = [
      'base de datos', 'database', 'sql', 'consulta', 'query', 'tabla', 'table',
      'mysql', 'select', 'insert', 'update', 'delete', 'show tables',
      'describe', 'estadísticas', 'stats', 'información', 'info'
    ]
    
    const inputLower = input.toLowerCase()
    return mcpKeywords.some(keyword => inputLower.includes(keyword))
  }

  /**
   * Envía un mensaje usando GPT-5 con la Responses API
   */
  async sendMessage(
    input: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const {
        model = 'gpt-5',
        mode = 'fast',
        reasoningEffort,
        verbosity,
        maxOutputTokens = 4000,
        previousResponseId
      } = options

      // Si está en modo agente y el mensaje parece requerir base de datos, usar MCP
      if (mode === 'agent' && this.shouldUseMCPAgent(input)) {
        try {
          // Importación dinámica para evitar problemas de SSR
          const { runDatabaseAgent } = await import('./agent')
          
          const agentResponse = await runDatabaseAgent(input, {}, mode)
          
          return {
            id: `agent_${Date.now()}`,
            content: agentResponse.content,
            reasoning: agentResponse.reasoning,
            usage: {
              input_tokens: input.length, // Aproximación
              output_tokens: agentResponse.content.length, // Aproximación
              total_tokens: input.length + agentResponse.content.length
            }
          }
        } catch (agentError) {
          console.warn('Agent MCP failed, falling back to regular GPT-5:', agentError)
          // Continuar con el flujo normal si el agente falla
        }
      }

      // Configuración basada en el modo
      const modeConfig = this.getModeConfig(mode)
      
      const requestBody: any = {
        model,
        input,
        reasoning: {
          effort: reasoningEffort || modeConfig.reasoningEffort
        },
        text: {
          verbosity: verbosity || modeConfig.verbosity
        }
      }

      // Solo añadir max_output_tokens si se especifica
      if (maxOutputTokens) {
        requestBody.max_output_tokens = maxOutputTokens
      }

      // Solo añadir previous_response_id si se especifica
      if (previousResponseId) {
        requestBody.previous_response_id = previousResponseId
      }

      const response = await client.responses.create(requestBody)

      return {
        id: response.id || `msg_${Date.now()}`,
        content: response.output_text || '',
        reasoning: undefined, // El reasoning no está disponible directamente en output_text
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        }
      }
    } catch (error) {
      console.error('Error sending message to OpenAI:', error)
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Envía una conversación completa usando GPT-5 
   */
  async sendConversation(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      // Convertir mensajes a formato de input para GPT-5
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const input = `Previous conversation:\n${conversationText}\n\nPlease respond as the assistant.`

      return await this.sendMessage(input, options)
    } catch (error) {
      console.error('Error sending conversation to OpenAI:', error)
      throw new Error(`OpenAI conversation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Envía un mensaje con configuración optimizada para velocidad
   */
  async sendFastMessage(input: string): Promise<ChatResponse> {
    return this.sendMessage(input, {
      model: 'gpt-5',
      reasoningEffort: 'minimal',
      verbosity: 'low'
    })
  }

  /**
   * Envía un mensaje con configuración optimizada para tareas complejas
   */
  async sendComplexMessage(input: string): Promise<ChatResponse> {
    return this.sendMessage(input, {
      model: 'gpt-5',
      reasoningEffort: 'high',
      verbosity: 'high'
    })
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY
  }
}

export default OpenAIService
