import { NextRequest, NextResponse } from 'next/server'
import OpenAIService, { type ChatMessage, type ChatOptions } from '@/lib/services/openai'
import { DemoLimitService } from '@/lib/services/demo-limit-service'

export async function POST(request: NextRequest) {
  // Obtener servicio de límites y extraer IP
  const demoLimitService = DemoLimitService.getInstance()
  const clientIP = demoLimitService.extractIP(request)
  
  try {
    // Verificar que OpenAI esté configurado
    if (!OpenAIService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key no configurada. Por favor, añade OPENAI_API_KEY al archivo .env.local' 
        },
        { status: 500 }
      )
    }

    // CRÍTICO: Verificar límite de respuestas POR IP en producción ANTES de procesar
    if (demoLimitService.shouldEnforceLimits()) {
      if (demoLimitService.hasReachedLimit(clientIP)) {
        const limitInfo = demoLimitService.getLimitInfo(clientIP)
        const errorMessage = demoLimitService.getLimitReachedMessage()
        
        console.warn(`⚠️ Límite de demo alcanzado para IP ${clientIP}:`, limitInfo)
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            limitInfo,
            isLimitReached: true
          },
          { status: 429 } // Too Many Requests
        )
      }

      // Advertencia si se acerca al límite
      const remaining = demoLimitService.getRemainingResponses(clientIP)
      const warning = demoLimitService.getWarningMessage(remaining)
      if (warning) {
        console.log(`⏳ IP ${clientIP}: ${warning}`)
      }
    }

    const body = await request.json()
    const { 
      message, 
      messages, 
      options = {} 
    }: {
      message?: string
      messages?: ChatMessage[]
      options?: ChatOptions
    } = body

    const openaiService = OpenAIService.getInstance()

    let response

    if (messages && messages.length > 0) {
      // Conversación completa
      response = await openaiService.sendConversation(messages, options)
    } else if (message) {
      // Mensaje simple
      response = await openaiService.sendMessage(message, options)
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere "message" o "messages"' },
        { status: 400 }
      )
    }

    // ÉXITO: Registrar respuesta para esta IP
    if (demoLimitService.shouldEnforceLimits()) {
      demoLimitService.recordResponse(clientIP, options.conversationId)
      
      // Incluir info de límite en respuesta exitosa
      const limitInfo = demoLimitService.getLimitInfo(clientIP)
      return NextResponse.json({
        success: true,
        data: response,
        limitInfo: {
          remaining: limitInfo.remainingResponses,
          max: limitInfo.maxResponses,
          warning: demoLimitService.getWarningMessage(limitInfo.remainingResponses)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error en API de chat:', error)
    
    // Detectar si es error de límite de respuestas
    const limitService = DemoLimitService.getInstance()
    const isLimitError = error instanceof Error && 
      limitService.getLimitReachedMessage() === error.message
    
    const statusCode = isLimitError ? 429 : 500
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        isLimitReached: isLimitError
      },
      { status: statusCode }
    )
  }
}
