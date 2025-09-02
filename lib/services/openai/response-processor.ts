/**
 * Procesador de respuestas de OpenAI con soporte para herramientas MCP
 */

import { MCPToolHandler } from './mcp-tool-handler'
import type { ResponseProcessingResult } from './types'

export class ResponseProcessor {
  /**
   * Procesa la respuesta de OpenAI con herramientas MCP
   */
  static async processResponseWithTools(
    response: any,
    needsDatabaseTools: boolean
  ): Promise<ResponseProcessingResult | null> {
    if (!needsDatabaseTools || !response.output || !Array.isArray(response.output)) {
      return null
    }

    console.log('🔧 Procesando output con herramientas MCP reales...')
    
    let finalContent = ''
    let hasToolCalls = false
    
    for (const outputItem of response.output) {
      console.log('📋 Output item:', { type: outputItem.type, id: outputItem.id })
      
      if (outputItem.type === 'function_call') {
        hasToolCalls = true
        const toolResult = await this.processFunctionCall(outputItem)
        finalContent += toolResult + '\n\n'
      } else if (outputItem.type === 'message' && (outputItem as any).content) {
        finalContent += (outputItem as any).content
      }
    }
    
    if (hasToolCalls) {
      console.log('✅ Herramientas MCP reales ejecutadas exitosamente')
      return {
        content: finalContent || 'Herramientas ejecutadas pero sin contenido',
        hasToolCalls: true,
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        }
      }
    }
    
    return null
  }

  /**
   * Procesa una llamada a función específica
   */
  private static async processFunctionCall(outputItem: any): Promise<string> {
    const toolName = outputItem.name
    const toolArgs = JSON.parse(outputItem.arguments || '{}')
    
    console.log('🔧 Function call detectada:', {
      name: toolName,
      status: outputItem.status,
      arguments: toolArgs
    })
    
    try {
      const result = await MCPToolHandler.executeToolCall(toolName, toolArgs)
      return result.content
    } catch (error) {
      console.error(`❌ Error ejecutando herramienta ${toolName}:`, error)
      return `❌ Error ejecutando ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }
  }

  /**
   * Crea el objeto de respuesta final
   */
  static createResponse(
    response: any,
    content: string,
    conversationId?: string,
    reasoning?: string
  ) {
    return {
      id: response.id || `responses_${Date.now()}`,
      content,
      reasoning,
      conversationId,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      }
    }
  }

  /**
   * Logging de respuesta para debugging
   */
  static logResponse(response: any): void {
    console.log('📥 Respuesta recibida:', {
      id: response.id,
      usage: response.usage,
      output_length: response.output_text?.length || 0,
      has_output_text: !!response.output_text,
      has_output_array: !!response.output && Array.isArray(response.output),
      output_array_length: response.output?.length || 0
    })
  }

  /**
   * Logging de debugging para respuestas vacías
   */
  static logEmptyResponseDebug(response: any, processedInput: string): void {
    console.warn('⚠️ RESPUESTA VACÍA - Debugging completo:')
    console.warn('📋 Respuesta completa:', JSON.stringify(response, null, 2))
    
    if (response.reasoning) {
      console.log('🧠 Se encontró razonamiento')
    }
  }

  /**
   * Valida si las herramientas de BD fueron utilizadas
   */
  static validateDatabaseToolUsage(
    needsDatabaseTools: boolean, 
    response: any, 
    processedInput: string
  ): void {
    if (needsDatabaseTools && !response.output_text?.includes('gnavidb')) {
      console.warn('⚠️ POSIBLE PROBLEMA: Se detectaron herramientas de BD pero la respuesta no parece usarlas')
      console.warn('📋 Para debugging - Input procesado:', processedInput.substring(0, 200) + '...')
    }
  }
}
