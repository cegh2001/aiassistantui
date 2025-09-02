/**
 * Procesador de prompts para el servicio OpenAI
 */

import { CHAT_MODES } from './constants'
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
    // Con GPT-5, no necesitamos prompts complejos
    // Solo devolver el input original - reasoning_effort y verbosity se encargan del comportamiento
    return input
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
