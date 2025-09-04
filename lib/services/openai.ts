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
  ChatOptions,
  VerbosityLevel 
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
   * Ahora integrado con OpenAI Conversations API
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
        conversationId,
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
          reasoningEffort: reasoningEffort || modeConfig.reasoningEffort,
          conversationId
        })
      }

      // Si tenemos conversationId, usar la API de conversaciones
      if (conversationId) {
        return await this.sendMessageWithConversation(
          input,
          conversationId,
          model,
          effectiveMode,
          verbosity,
          maxOutputTokens,
          needsDatabaseTools
        )
      }

      // Preparar el input según el modo y herramientas detectadas usando módulos refactorizados
      const processedInput = PromptProcessor.processInput(input, effectiveMode, needsDatabaseTools)

      // Usar Responses API exclusivamente
      const apiMode = PromptProcessor.getApiModeDescription(effectiveMode, needsDatabaseTools)
      console.log(`🚀 Usando Responses API - Modo: ${apiMode}`)
      
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
          undefined,
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
            undefined,
            undefined
          )
        }
      }

      // Validar uso de herramientas de BD
      ResponseProcessor.validateDatabaseToolUsage(needsDatabaseTools, response, processedInput)

      return ResponseProcessor.createResponse(
        response,
        response.output_text || '',
        undefined,
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
   * Envía un mensaje usando una conversación existente
   */
  private async sendMessageWithConversation(
    input: string,
    conversationId: string,
    model: string,
    effectiveMode: ChatMode,
    verbosity?: VerbosityLevel,
    maxOutputTokens?: number,
    needsDatabaseTools?: boolean
  ): Promise<ChatResponse> {
    try {
      console.log(`💬 Usando Conversación: ${conversationId}`)

      // Preparar el input procesado
      const processedInput = PromptProcessor.processInput(input, effectiveMode, needsDatabaseTools || false)

      // Crear la respuesta usando la conversación
      const requestBody = ModeConfigurator.buildRequestBody(
        model,
        processedInput,
        effectiveMode,
        verbosity,
        maxOutputTokens,
        undefined, // previousResponseId
        conversationId // Pasar conversationId para mantener contexto
      )

      // Agregar herramientas MCP si son necesarias
      ModeConfigurator.addMCPToolsIfNeeded(
        requestBody, 
        needsDatabaseTools || false, 
        () => MCPToolHandler.getDatabaseTools()
      )

      console.log('📤 Enviando con conversación:', {
        conversationId,
        mode: effectiveMode,
        hasTools: needsDatabaseTools
      })

      // Generar respuesta usando Responses API (sin conversation_id)
      const response = await client.responses.create(requestBody)

      console.log('📥 Respuesta de conversación:', {
        id: response.id,
        usage: response.usage,
        output_length: response.output_text?.length || 0
      })

      // Procesar respuesta con herramientas MCP
      const toolProcessingResult = await ResponseProcessor.processResponseWithTools(
        response, 
        needsDatabaseTools || false
      )

      const finalContent = toolProcessingResult?.content || response.output_text || ''

      // Si hay herramientas MCP procesadas, agregar manualmente el resultado a la conversación
      // porque el Responses API no maneja tool outputs automáticamente con conversation_id
      if (toolProcessingResult && finalContent) {
        await client.conversations.items.create(conversationId, {
          items: [{
            type: 'message',
            role: 'assistant',
            content: finalContent
          }]
        })
        console.log('✅ Resultado de herramientas MCP agregado a conversación:', conversationId)
      }

      console.log('✅ Respuesta generada para conversación:', conversationId)

      // OPTIMIZACIÓN: Actualizar metadata de forma asíncrona (no bloqueante)
      this.updateConversationMetadataAsync(conversationId).catch((error: any) => {
        console.warn('⚠️ Error actualizando metadata (no crítico):', error)
      })

      if (toolProcessingResult) {
        return ResponseProcessor.createResponse(
          response,
          toolProcessingResult.content,
          conversationId
        )
      }

      return ResponseProcessor.createResponse(
        response,
        finalContent,
        conversationId
      )

    } catch (error) {
      console.error('❌ Error en conversación:', error)
      throw new Error(`Error en conversación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Envía una conversación completa usando OpenAI Conversations API
   */
  async sendConversation(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const { conversationId, ...restOptions } = options

      if (conversationId) {
        // Si ya tenemos una conversación, usar el último mensaje
        const lastMessage = messages[messages.length - 1]
        if (lastMessage && lastMessage.role === 'user') {
          return await this.sendMessage(lastMessage.content, {
            ...restOptions,
            conversationId
          })
        }
      }

      // Si no hay conversationId, crear una nueva conversación
      const { ConversationService } = await import('./conversations')
      const conversationService = ConversationService.getInstance()
      
      // Crear nueva conversación con el primer mensaje
      const firstUserMessage = messages.find(msg => msg.role === 'user')
      const newConversationId = await conversationService.createConversation(
        undefined,
        firstUserMessage?.content
      )

      // Agregar todos los mensajes a la conversación
      for (const message of messages) {
        if (message.role === 'user') {
          await conversationService.addMessage(newConversationId, {
            id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt || new Date().toISOString()
          })
        }
      }

      // Enviar el último mensaje de usuario
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()
      if (lastUserMessage) {
        return await this.sendMessage(lastUserMessage.content, {
          ...restOptions,
          conversationId: newConversationId
        })
      }

      throw new Error('No se encontró mensaje de usuario en la conversación')
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
   * Actualiza metadata de conversación de forma asíncrona (no bloquea la respuesta)
   */
  private async updateConversationMetadataAsync(conversationId: string): Promise<void> {
    try {
      const { ConversationService } = await import('./conversations')
      const conversationService = ConversationService.getInstance()
      
      // Obtener todos los mensajes para actualizar metadata
      const allMessages = await conversationService.getMessages(conversationId)
      const messageCount = allMessages.length
      
      // Usar el último mensaje como preview
      const lastMessage = allMessages[allMessages.length - 1]
      const preview = lastMessage ? lastMessage.content.slice(0, 80) : ''
      
      // Si es el primer intercambio (2 mensajes), generar título inteligente del primer mensaje de usuario
      const currentConversation = await conversationService.getConversation(conversationId)
      let title = currentConversation?.title || 'Nueva conversación'
      if (messageCount === 2) {
        const firstUserMessage = allMessages.find(msg => msg.role === 'user')
        if (firstUserMessage) {
          // Generar título simple basado en el primer mensaje
          title = firstUserMessage.content
            .trim()
            .slice(0, 50)
            .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, '')
            .split(' ')
            .slice(0, 6)
            .join(' ')
            .trim() || 'Nueva conversación'
        }
      }

      await conversationService.updateConversation(conversationId, {
        metadata: {
          ...currentConversation?.metadata,
          messageCount: messageCount.toString(),
          preview,
          title,
          updatedAt: new Date().toISOString()
        }
      })

      console.log('✅ Metadata actualizada para conversación:', conversationId)
    } catch (error) {
      console.error('❌ Error actualizando metadata:', error)
    }
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
