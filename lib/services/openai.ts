import OpenAI from 'openai'

// Importar módulos refactorizados
import { ContextDetector } from './openai/context-detector'
import { ModeConfigurator } from './openai/mode-configurator'
import { PromptProcessor } from './openai/prompt-processor'
import { MCPToolHandler } from './openai/mcp-tool-handler'
import { ResponseProcessor } from './openai/response-processor'
import { DEFAULT_CONFIG } from './openai/constants'

// Importar tipos refactorizados
import type { 
  ChatMessage, 
  ChatResponse, 
  ChatMode, 
  ChatOptions 
} from './openai/types'

// Re-exportar tipos para compatibilidad
export type { ChatMessage, ChatResponse, ChatMode, ChatOptions }

// Configuración del cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
   * Envía un mensaje usando GPT-5 con Responses API y razonamiento adaptativo
   */
  async sendMessage(
    input: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const {
        model = 'gpt-5',
        mode: requestedMode = 'fast',
        reasoningEffort,
        verbosity,
        maxOutputTokens = DEFAULT_CONFIG.MAX_OUTPUT_TOKENS,
        previousResponseId
      } = options

      // Analizar contexto usando módulos refactorizados
      const context = ContextDetector.analyzeContext(input, requestedMode)
      const { needsDatabaseTools, effectiveMode } = context

      // Configuración basada en el modo efectivo
      const modeConfig = ModeConfigurator.getModeConfig(effectiveMode)
      
      // Logging detallado para debugging
      if (needsDatabaseTools) {
        console.log('🔧 DETECCIÓN MCP TOOLS:', {
          input: input.substring(0, 100) + '...',
          needsDatabaseTools,
          effectiveMode,
          reasoningEffort: reasoningEffort || modeConfig.reasoningEffort
        })
      }

      // Preparar el input según el modo y herramientas detectadas usando módulos refactorizados
      const processedInput = PromptProcessor.processInput(input, effectiveMode, needsDatabaseTools)

      // Usar Responses API exclusivamente
      const apiMode = PromptProcessor.getApiModeDescription(effectiveMode, needsDatabaseTools)
      console.log(`� Usando Responses API - Modo: ${apiMode}`)
      
      const requestBody = ModeConfigurator.buildRequestBody(
        model,
        processedInput,
        effectiveMode,
        verbosity,
        maxOutputTokens,
        previousResponseId
      )

      // Agregar herramientas MCP si son necesarias
      ModeConfigurator.addMCPToolsIfNeeded(
        requestBody, 
        needsDatabaseTools, 
        () => MCPToolHandler.getDatabaseTools()
      )

      ModeConfigurator.logRequestConfig(requestBody)

      const response = await client.responses.create(requestBody)

      ResponseProcessor.logResponse(response)

      // Procesar respuesta con herramientas MCP
      const toolProcessingResult = await ResponseProcessor.processResponseWithTools(
        response, 
        needsDatabaseTools
      )

      if (toolProcessingResult) {
        return ResponseProcessor.createResponse(
          response,
          toolProcessingResult.content,
          undefined
        )
      }

      // Logging completo de la respuesta para debugging (solo si no hay herramientas)
      if ((!response.output_text || response.output_text.length === 0) && !needsDatabaseTools) {
        ResponseProcessor.logEmptyResponseDebug(response, processedInput)
        
        // Si las herramientas están causando problemas, intentar sin herramientas
        if (needsDatabaseTools) {
          console.warn('🔄 Reintentando sin herramientas MCP...')
          
          const fallbackBody = ModeConfigurator.buildRequestBody(
            model,
            processedInput,
            effectiveMode,
            verbosity,
            maxOutputTokens
          )
          
          console.log('📤 Reintentando sin tools...')
          const fallbackResponse = await client.responses.create(fallbackBody)
          
          console.log('📥 Respuesta fallback:', {
            id: fallbackResponse.id,
            usage: fallbackResponse.usage,
            output_length: fallbackResponse.output_text?.length || 0
          })
          
          return ResponseProcessor.createResponse(
            fallbackResponse,
            fallbackResponse.output_text || 'No se pudo obtener respuesta',
            undefined
          )
        }
      }

      // Validar uso de herramientas de BD
      ResponseProcessor.validateDatabaseToolUsage(needsDatabaseTools, response, processedInput)

      return ResponseProcessor.createResponse(
        response,
        response.output_text || '',
        undefined
      )
    } catch (error) {
      console.error('❌ Error en Responses API:', error)
      
      // Logging adicional para debugging
      if (error instanceof Error) {
        console.error('📋 Detalles del error:', {
          message: error.message,
          stack: error.stack?.substring(0, 500)
        })
      }
      
      throw new Error(`OpenAI Responses API error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
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
   * Envía un mensaje con configuración optimizada para velocidad (razonamiento mínimo)
   */
  async sendFastMessage(input: string): Promise<ChatResponse> {
    return this.sendMessage(input, {
      model: 'gpt-5',
      mode: 'fast',
      reasoningEffort: 'minimal',
      verbosity: 'low'
    })
  }

  /**
   * Envía un mensaje con configuración optimizada para tareas complejas (razonamiento máximo)
   */
  async sendComplexMessage(input: string): Promise<ChatResponse> {
    return this.sendMessage(input, {
      model: 'gpt-5',
      mode: 'agent',
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

  /**
   * Cierra la conexión de base de datos
   */
  static async cleanup(): Promise<void> {
    await MCPToolHandler.cleanup()
  }
}

export default OpenAIService
