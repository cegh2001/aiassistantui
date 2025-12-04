/**
 * Response Limiter - Limita respuestas del modelo en producción
 * En demo (producción), máximo 4 respuestas por conversación
 */

import { isProduction } from '@/lib/utils/environment'
import type { ChatMessage } from './types'

const MAX_RESPONSES_IN_PRODUCTION = 4

export class ResponseLimiter {
  /**
   * Verifica si se debe limitar las respuestas basado en el ambiente
   * @returns true si está en producción, false en desarrollo
   */
  static shouldEnforceLimits(): boolean {
    return isProduction()
  }

  /**
   * Cuenta cuántas respuestas del asistente hay en un historial de mensajes
   * @param messages - Array de mensajes del chat
   * @returns Número de respuestas del asistente
   */
  static countAssistantResponses(messages: ChatMessage[]): number {
    return messages.filter(msg => msg.role === 'assistant').length
  }

  /**
   * Verifica si se alcanzó el límite de respuestas en producción
   * @param messages - Array de mensajes de la conversación
   * @returns true si se alcanzó el límite, false si se puede seguir respondiendo
   */
  static hasReachedResponseLimit(messages: ChatMessage[]): boolean {
    if (!this.shouldEnforceLimits()) {
      return false
    }

    const assistantResponses = this.countAssistantResponses(messages)
    return assistantResponses >= MAX_RESPONSES_IN_PRODUCTION
  }

  /**
   * Obtiene el número de respuestas restantes en producción
   * @param messages - Array de mensajes de la conversación
   * @returns Número de respuestas restantes (puede ser 0)
   */
  static getRemainingResponses(messages: ChatMessage[]): number {
    if (!this.shouldEnforceLimits()) {
      return Infinity
    }

    const assistantResponses = this.countAssistantResponses(messages)
    const remaining = MAX_RESPONSES_IN_PRODUCTION - assistantResponses
    return Math.max(0, remaining)
  }

  /**
   * Obtiene el límite máximo de respuestas
   * @returns Máximo número de respuestas permitidas
   */
  static getMaxResponses(): number {
    return MAX_RESPONSES_IN_PRODUCTION
  }

  /**
   * Genera mensaje de error cuando se alcanza el límite
   * @returns Mensaje de error en español
   */
  static getLimitReachedMessage(): string {
    return `Límite de respuestas alcanzado. Esta es una demostración y está limitada a ${MAX_RESPONSES_IN_PRODUCTION} respuestas por conversación. Por favor, crea una nueva conversación si deseas continuar.`
  }

  /**
   * Genera mensaje de advertencia cuando se acerca al límite
   * @param remainingResponses - Respuestas restantes
   * @returns Mensaje de advertencia o undefined si no aplica
   */
  static getWarningMessage(remainingResponses: number): string | undefined {
    if (!this.shouldEnforceLimits() || remainingResponses === Infinity) {
      return undefined
    }

    if (remainingResponses === 1) {
      return `⚠️ Esta es tu última respuesta disponible en esta conversación de demostración.`
    }

    if (remainingResponses > 0 && remainingResponses <= 2) {
      return `⚠️ Solo te quedan ${remainingResponses} respuesta${remainingResponses === 1 ? '' : 's'} en esta conversación de demostración.`
    }

    return undefined
  }

  /**
   * Obtiene información detallada sobre el límite
   * @param messages - Array de mensajes de la conversación
   * @returns Objeto con detalles del límite
   */
  static getLimitInfo(messages: ChatMessage[]) {
    const currentCount = this.countAssistantResponses(messages)
    const remaining = this.getRemainingResponses(messages)
    const hasReached = this.hasReachedResponseLimit(messages)

    return {
      environment: isProduction() ? 'production' : 'development',
      enforceLimits: this.shouldEnforceLimits(),
      maxResponses: MAX_RESPONSES_IN_PRODUCTION,
      currentResponses: currentCount,
      remainingResponses: remaining,
      hasReachedLimit: hasReached,
      warning: this.getWarningMessage(remaining)
    }
  }
}
