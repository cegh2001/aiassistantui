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

export interface ChatOptions {
  model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano'
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
   * Envía un mensaje usando GPT-5 con la Responses API
   */
  async sendMessage(
    input: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const {
        model = 'gpt-5',
        reasoningEffort = 'medium',
        verbosity = 'medium',
        maxOutputTokens = 4000,
        previousResponseId
      } = options

      const requestBody: any = {
        model,
        input,
        reasoning: {
          effort: reasoningEffort
        },
        text: {
          verbosity: verbosity
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
