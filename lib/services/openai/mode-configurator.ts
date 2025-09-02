/**
 * Configurador de modos y configuraciones para OpenAI
 */

import { REASONING_EFFORT, VERBOSITY_LEVELS, CHAT_MODES } from './constants'
import type { ChatMode, ModeConfig, ReasoningEffort, VerbosityLevel } from './types'

export class ModeConfigurator {
  /**
   * Obtiene la configuración basada en el modo
   */
  static getModeConfig(mode: ChatMode): ModeConfig {
    switch (mode) {
      case CHAT_MODES.FAST:
        return {
          reasoningEffort: REASONING_EFFORT.MINIMAL as ReasoningEffort,
          verbosity: VERBOSITY_LEVELS.LOW as VerbosityLevel
        }
      case CHAT_MODES.AGENT:
        return {
          reasoningEffort: REASONING_EFFORT.HIGH as ReasoningEffort,
          verbosity: VERBOSITY_LEVELS.HIGH as VerbosityLevel
        }
      default:
        return {
          reasoningEffort: REASONING_EFFORT.MEDIUM as ReasoningEffort,
          verbosity: VERBOSITY_LEVELS.MEDIUM as VerbosityLevel
        }
    }
  }

  /**
   * Construye el cuerpo de la request para Responses API
   */
  static buildRequestBody(
    model: string,
    processedInput: string,
    effectiveMode: ChatMode,
    verbosity: VerbosityLevel | undefined,
    maxOutputTokens?: number,
    previousResponseId?: string,
    conversationId?: string
  ): any {
    const modeConfig = this.getModeConfig(effectiveMode)
    
    const requestBody: any = {
      model,
      input: processedInput,
      reasoning: {
        effort: effectiveMode === CHAT_MODES.AGENT ? REASONING_EFFORT.HIGH : REASONING_EFFORT.MINIMAL
      },
      text: {
        verbosity: verbosity || modeConfig.verbosity
      }
    }

    if (maxOutputTokens) {
      requestBody.max_output_tokens = maxOutputTokens
    }

    if (previousResponseId) {
      requestBody.previous_response_id = previousResponseId
    }

    // Incluir conversation_id para mantener contexto
    if (conversationId) {
      requestBody.conversation = conversationId
    }

    return requestBody
  }

  /**
   * Agrega herramientas MCP al cuerpo de la request si es necesario
   */
  static addMCPToolsIfNeeded(
    requestBody: any,
    needsDatabaseTools: boolean,
    getToolsFunction: () => any[]
  ): void {
    if (!needsDatabaseTools) return

    console.log('🔧 Intentando agregar herramientas MCP a Responses API...')
    
    try {
      requestBody.tools = getToolsFunction()
      console.log('✅ Herramientas MCP agregadas a Responses API')
    } catch (error) {
      console.warn('⚠️ No se pudieron agregar herramientas MCP a Responses API:', error)
    }
  }

  /**
   * Logging de configuración de request
   */
  static logRequestConfig(requestBody: any): void {
    console.log('📤 Enviando request a Responses API:', {
      model: requestBody.model,
      reasoning_effort: requestBody.reasoning.effort,
      verbosity: requestBody.text.verbosity,
      has_tools: !!requestBody.tools,
      tools_count: requestBody.tools?.length || 0,
      conversation_id: requestBody.conversation || 'none'
    })
  }
}
