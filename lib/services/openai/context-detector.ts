/**
 * Detectores de contexto y modo para el servicio OpenAI
 */

import { DATABASE_KEYWORDS, COMPLEX_KEYWORDS, CHAT_MODES } from './constants'
import type { ChatMode } from './types'
import { isProduction } from '@/lib/utils/environment'

export class ContextDetector {
  /**
   * Detecta si un mensaje requiere herramientas de base de datos
   * NOTA: En producción, las herramientas de BD están deshabilitadas (experimental)
   */
  static shouldUseDatabaseTools(input: string): boolean {
    // En producción, deshabilitar herramientas de BD (feature experimental)
    if (isProduction()) {
      return false
    }
    
    const inputLower = input.toLowerCase()
    return DATABASE_KEYWORDS.some(keyword => inputLower.includes(keyword))
  }

  /**
   * Detecta si un mensaje requiere razonamiento complejo (modo agente automático)
   */
  static shouldUseAgentMode(input: string): boolean {
    const inputLower = input.toLowerCase()
    return COMPLEX_KEYWORDS.some(keyword => inputLower.includes(keyword))
  }

  /**
   * Determina el modo efectivo basado en la entrada y modo solicitado
   */
  static determineEffectiveMode(input: string, requestedMode: ChatMode): ChatMode {
    if (requestedMode === CHAT_MODES.FAST && this.shouldUseAgentMode(input)) {
      console.log('🤖 Activación automática del modo agente detectada')
      return CHAT_MODES.AGENT
    }
    return requestedMode
  }

  /**
   * Analiza el contexto completo de la entrada
   */
  static analyzeContext(input: string, requestedMode: ChatMode) {
    const needsDatabaseTools = this.shouldUseDatabaseTools(input)
    const effectiveMode = this.determineEffectiveMode(input, requestedMode)
    
    // Log en producción cuando se detecta intento de usar BD
    if (isProduction()) {
      const inputLower = input.toLowerCase()
      const wouldNeedDb = DATABASE_KEYWORDS.some(keyword => inputLower.includes(keyword))
      if (wouldNeedDb) {
        console.log('🔒 Herramientas de BD deshabilitadas en producción (feature experimental)')
      }
    }
    
    return {
      needsDatabaseTools,
      effectiveMode,
      hasComplexRequirements: this.shouldUseAgentMode(input)
    }
  }
}
