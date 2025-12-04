/**
 * Demo Limit Service - Controla límites de respuestas por IP en producción
 * Almacena datos en JSON para persistencia simple sin base de datos
 */

import { isProduction } from '@/lib/utils/environment'
import fs from 'fs'
import path from 'path'

const MAX_RESPONSES_PER_IP = 4
const DATA_FILE = path.join(process.cwd(), 'data', 'demo-limits.json')

interface IPLimitData {
  responses: number
  firstSeen: string
  lastSeen: string
  conversations: string[] // IDs de conversaciones usadas
}

interface DemoLimitsStore {
  _comment: string
  limits: Record<string, IPLimitData>
}

export class DemoLimitService {
  private static instance: DemoLimitService
  private cache: DemoLimitsStore | null = null
  private lastRead: number = 0
  private readonly CACHE_TTL = 5000 // 5 segundos de caché

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
   * Lee los datos del archivo JSON con caché
   */
  private readData(): DemoLimitsStore {
    const now = Date.now()
    
    // Usar caché si es válido
    if (this.cache && (now - this.lastRead) < this.CACHE_TTL) {
      return this.cache
    }

    try {
      // Asegurar que el directorio existe
      const dir = path.dirname(DATA_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Leer o crear archivo
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8')
        this.cache = JSON.parse(content)
      } else {
        this.cache = {
          _comment: "Límites de demo por IP. No editar manualmente.",
          limits: {}
        }
        this.writeData(this.cache)
      }

      this.lastRead = now
      return this.cache!
    } catch (error) {
      console.error('❌ Error leyendo demo-limits.json:', error)
      return { _comment: "", limits: {} }
    }
  }

  /**
   * Escribe los datos al archivo JSON
   */
  private writeData(data: DemoLimitsStore): void {
    try {
      const dir = path.dirname(DATA_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
      this.cache = data
      this.lastRead = Date.now()
    } catch (error) {
      console.error('❌ Error escribiendo demo-limits.json:', error)
    }
  }

  /**
   * Extrae la IP del request de Next.js
   */
  extractIP(request: Request): string {
    const headers = new Headers(request.headers)
    
    // Prioridad de headers para obtener IP real
    const forwardedFor = headers.get('x-forwarded-for')
    if (forwardedFor) {
      // x-forwarded-for puede tener múltiples IPs, tomar la primera
      return forwardedFor.split(',')[0].trim()
    }

    const realIP = headers.get('x-real-ip')
    if (realIP) {
      return realIP.trim()
    }

    // Vercel específico
    const vercelIP = headers.get('x-vercel-forwarded-for')
    if (vercelIP) {
      return vercelIP.split(',')[0].trim()
    }

    // Fallback para desarrollo local
    return '127.0.0.1'
  }

  /**
   * Obtiene los datos de límite para una IP
   */
  getIPData(ip: string): IPLimitData | null {
    const data = this.readData()
    return data.limits[ip] || null
  }

  /**
   * Verifica si una IP ha alcanzado el límite
   */
  hasReachedLimit(ip: string): boolean {
    if (!this.shouldEnforceLimits()) {
      return false
    }

    const ipData = this.getIPData(ip)
    if (!ipData) {
      return false
    }

    return ipData.responses >= MAX_RESPONSES_PER_IP
  }

  /**
   * Obtiene el número de respuestas restantes para una IP
   */
  getRemainingResponses(ip: string): number {
    if (!this.shouldEnforceLimits()) {
      return Infinity
    }

    const ipData = this.getIPData(ip)
    if (!ipData) {
      return MAX_RESPONSES_PER_IP
    }

    return Math.max(0, MAX_RESPONSES_PER_IP - ipData.responses)
  }

  /**
   * Registra una respuesta para una IP
   */
  recordResponse(ip: string, conversationId?: string): void {
    if (!this.shouldEnforceLimits()) {
      return
    }

    const data = this.readData()
    const now = new Date().toISOString()

    if (!data.limits[ip]) {
      data.limits[ip] = {
        responses: 0,
        firstSeen: now,
        lastSeen: now,
        conversations: []
      }
    }

    data.limits[ip].responses += 1
    data.limits[ip].lastSeen = now

    if (conversationId && !data.limits[ip].conversations.includes(conversationId)) {
      data.limits[ip].conversations.push(conversationId)
    }

    this.writeData(data)

    console.log(`📊 Demo limit: IP ${ip} ha usado ${data.limits[ip].responses}/${MAX_RESPONSES_PER_IP} respuestas`)
  }

  /**
   * Obtiene información completa del límite para una IP
   */
  getLimitInfo(ip: string) {
    const ipData = this.getIPData(ip)
    const remaining = this.getRemainingResponses(ip)
    const hasReached = this.hasReachedLimit(ip)

    return {
      ip,
      environment: isProduction() ? 'production' : 'development',
      enforceLimits: this.shouldEnforceLimits(),
      maxResponses: MAX_RESPONSES_PER_IP,
      currentResponses: ipData?.responses || 0,
      remainingResponses: remaining,
      hasReachedLimit: hasReached,
      firstSeen: ipData?.firstSeen,
      lastSeen: ipData?.lastSeen,
      conversationsUsed: ipData?.conversations.length || 0
    }
  }

  /**
   * Genera mensaje de error cuando se alcanza el límite
   */
  getLimitReachedMessage(): string {
    return `Has alcanzado el límite de ${MAX_RESPONSES_PER_IP} respuestas en esta demostración. Gracias por probar AI Assistant UI.`
  }

  /**
   * Genera mensaje de advertencia cuando se acerca al límite
   */
  getWarningMessage(remaining: number): string | undefined {
    if (!this.shouldEnforceLimits() || remaining === Infinity) {
      return undefined
    }

    if (remaining === 1) {
      return `⚠️ Esta es tu última respuesta disponible en esta demostración.`
    }

    if (remaining > 0 && remaining <= 2) {
      return `⚠️ Solo te quedan ${remaining} respuesta${remaining === 1 ? '' : 's'} en esta demostración.`
    }

    return undefined
  }

  /**
   * Limpia IPs antiguas (más de 30 días) - para mantenimiento
   */
  cleanupOldEntries(daysOld: number = 30): number {
    const data = this.readData()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysOld)
    
    let removed = 0
    const newLimits: Record<string, IPLimitData> = {}

    for (const [ip, ipData] of Object.entries(data.limits)) {
      const lastSeen = new Date(ipData.lastSeen)
      if (lastSeen > cutoff) {
        newLimits[ip] = ipData
      } else {
        removed++
      }
    }

    if (removed > 0) {
      data.limits = newLimits
      this.writeData(data)
      console.log(`🧹 Limpieza: ${removed} IPs antiguas eliminadas`)
    }

    return removed
  }
}

export default DemoLimitService
