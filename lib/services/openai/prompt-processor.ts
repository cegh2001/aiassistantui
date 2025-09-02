/**
 * Procesador de prompts para el servicio OpenAI
 */

import { PROMPTS, CHAT_MODES } from './constants'
import type { ChatMode } from './types'

export class PromptProcessor {
  /**
   * Procesa el input según el modo y herramientas detectadas
   */
  static processInput(
    input: string, 
    effectiveMode: ChatMode, 
    needsDatabaseTools: boolean
  ): string {
    if (effectiveMode === CHAT_MODES.AGENT) {
      return this.buildAgentPrompt(input, needsDatabaseTools)
    }
    
    if (needsDatabaseTools) {
      return this.buildDatabasePrompt(input)
    }
    
    return input
  }

  /**
   * Construye el prompt para modo agente
   */
  private static buildAgentPrompt(input: string, needsDatabaseTools: boolean): string {
    let prompt = PROMPTS.AGENT_MODE

    if (needsDatabaseTools) {
      prompt += '\n' + PROMPTS.DATABASE_TOOLS_NOTICE
    }

    prompt += `\n\nConsulta del usuario: ${input}`
    
    return prompt
  }

  /**
   * Construye el prompt para herramientas de base de datos
   */
  private static buildDatabasePrompt(input: string): string {
    return `${PROMPTS.DATABASE_AVAILABLE}\n\nConsulta del usuario: ${input}`
  }

  /**
   * Obtiene descripción del modo API para logging
   */
  static getApiModeDescription(effectiveMode: ChatMode, needsDatabaseTools: boolean): string {
    const modeText = effectiveMode === CHAT_MODES.AGENT 
      ? 'Agente (Reasoning High)' 
      : 'Rápido (Reasoning Minimal)'
    
    return `${modeText}${needsDatabaseTools ? ' + MCP Tools' : ''}`
  }
}
