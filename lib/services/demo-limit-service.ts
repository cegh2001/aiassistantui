/**
 * Demo Limit Service - Controla límites de respuestas en producción
 * 
 * Usa cookies firmadas para persistir el conteo de respuestas.
 * En Vercel/serverless, NO se puede usar sistema de archivos porque es efímero.
 * 
 * Flujo:
 * 1. Lee cookie del request para obtener conteo actual
 * 2. Valida firma para evitar manipulación
 * 3. Si alcanzó límite → bloquea
 * 4. Si no → permite y devuelve nueva cookie con conteo incrementado
 */

import { isProduction } from '@/lib/utils/environment'
import crypto from 'crypto'

const MAX_RESPONSES_PER_USER = 4
const COOKIE_NAME = 'demo_limit'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

// Clave secreta para firmar cookies
const SECRET_KEY = process.env.DEMO_LIMIT_SECRET || 'ai-assistant-demo-2025-secret'

interface DemoLimitData {
  r: number      // responses count
  f: number      // firstSeen timestamp
  l: number      // lastSeen timestamp
}

export class DemoLimitService {
  private static instance: DemoLimitService

  private constructor() {}

  static getInstance(): DemoLimitService {
    if (!DemoLimitService.instance) {
      DemoLimitService.instance = new DemoLimitService()
    }
    return DemoLimitService.instance
  }

  /**
   * Verifica si se deben aplicar límites de demo
   */
  shouldEnforceLimits(): boolean {
    return isProduction()
  }

  /**
   * Extrae la IP del request
   */
  extractIP(request: Request): string {
    const headers = new Headers(request.headers)
    
    const forwardedFor = headers.get('x-forwarded-for')
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }

    const realIP = headers.get('x-real-ip')
    if (realIP) {
      return realIP.trim()
    }

    const vercelIP = headers.get('x-vercel-forwarded-for')
    if (vercelIP) {
      return vercelIP.split(',')[0].trim()
    }

    return '127.0.0.1'
  }

  /**
   * Firma datos con HMAC-SHA256
   */
  private sign(data: string): string {
    const hmac = crypto.createHmac('sha256', SECRET_KEY)
    hmac.update(data)
    return hmac.digest('hex').substring(0, 16) // Solo primeros 16 chars para acortar cookie
  }

  /**
   * Verifica firma de datos
   */
  private verifySign(data: string, signature: string): boolean {
    try {
      const expected = this.sign(data)
      if (expected.length !== signature.length) return false
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )
    } catch {
      return false
    }
  }

  /**
   * Codifica datos para cookie
   */
  private encode(data: DemoLimitData): string {
    const json = JSON.stringify(data)
    const base64 = Buffer.from(json).toString('base64url')
    const sig = this.sign(base64)
    return `${base64}.${sig}`
  }

  /**
   * Decodifica y valida datos de cookie
   */
  private decode(cookieValue: string): DemoLimitData | null {
    try {
      const parts = cookieValue.split('.')
      if (parts.length !== 2) return null
      
      const [base64, sig] = parts
      
      if (!this.verifySign(base64, sig)) {
        console.warn('⚠️ Cookie demo_limit con firma inválida - posible manipulación')
        return null
      }

      const json = Buffer.from(base64, 'base64url').toString('utf-8')
      const data = JSON.parse(json) as DemoLimitData
      
      // Validar estructura
      if (typeof data.r !== 'number' || typeof data.f !== 'number') {
        return null
      }
      
      return data
    } catch (error) {
      console.error('❌ Error decodificando cookie demo_limit:', error)
      return null
    }
  }

  /**
   * Extrae datos de límite del request
   */
  getLimitDataFromRequest(request: Request): DemoLimitData | null {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return null

    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    if (!match) return null

    return this.decode(decodeURIComponent(match[1]))
  }

  /**
   * Verifica si el usuario ha alcanzado el límite
   */
  hasReachedLimit(request: Request): boolean {
    if (!this.shouldEnforceLimits()) {
      return false
    }

    const data = this.getLimitDataFromRequest(request)
    if (!data) {
      return false // Primera visita
    }

    const hasReached = data.r >= MAX_RESPONSES_PER_USER
    
    if (hasReached) {
      console.log(`🚫 Límite alcanzado: ${data.r}/${MAX_RESPONSES_PER_USER} respuestas`)
    }
    
    return hasReached
  }

  /**
   * Obtiene respuestas restantes
   */
  getRemainingResponses(request: Request): number {
    if (!this.shouldEnforceLimits()) {
      return Infinity
    }

    const data = this.getLimitDataFromRequest(request)
    if (!data) {
      return MAX_RESPONSES_PER_USER
    }

    return Math.max(0, MAX_RESPONSES_PER_USER - data.r)
  }

  /**
   * Obtiene respuestas actuales
   */
  getCurrentResponses(request: Request): number {
    const data = this.getLimitDataFromRequest(request)
    return data?.r || 0
  }

  /**
   * Crea cookie header con conteo incrementado
   */
  createIncrementedCookie(request: Request): string {
    const currentData = this.getLimitDataFromRequest(request)
    const now = Date.now()

    const newData: DemoLimitData = {
      r: (currentData?.r || 0) + 1,
      f: currentData?.f || now,
      l: now
    }

    const cookieValue = this.encode(newData)
    const secure = isProduction() ? '; Secure' : ''
    
    console.log(`📊 Demo limit actualizado: ${newData.r}/${MAX_RESPONSES_PER_USER} respuestas`)
    
    return `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`
  }

  /**
   * Obtiene información del límite
   */
  getLimitInfo(request: Request) {
    const data = this.getLimitDataFromRequest(request)
    const currentResponses = data?.r || 0
    const remaining = Math.max(0, MAX_RESPONSES_PER_USER - currentResponses)

    return {
      ip: this.extractIP(request),
      environment: isProduction() ? 'production' : 'development',
      enforceLimits: this.shouldEnforceLimits(),
      maxResponses: MAX_RESPONSES_PER_USER,
      currentResponses,
      remainingResponses: remaining,
      hasReachedLimit: currentResponses >= MAX_RESPONSES_PER_USER
    }
  }

  /**
   * Mensaje de error cuando se alcanza el límite
   */
  getLimitReachedMessage(): string {
    return `Has alcanzado el límite de ${MAX_RESPONSES_PER_USER} respuestas en esta demostración. ¡Gracias por probar AI Assistant UI!`
  }

  /**
   * Mensaje de advertencia cuando se acerca al límite
   */
  getWarningMessage(remaining: number): string | undefined {
    if (!this.shouldEnforceLimits() || remaining === Infinity) {
      return undefined
    }

    if (remaining === 0) {
      return `Has alcanzado el límite de respuestas de esta demostración.`
    }

    if (remaining === 1) {
      return `⚠️ Esta es tu última respuesta disponible en esta demostración.`
    }

    if (remaining <= 2) {
      return `⚠️ Solo te quedan ${remaining} respuestas en esta demostración.`
    }

    return undefined
  }

  /**
   * Obtiene el máximo de respuestas permitidas
   */
  getMaxResponses(): number {
    return MAX_RESPONSES_PER_USER
  }
}

export default DemoLimitService
