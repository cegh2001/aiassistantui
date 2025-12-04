import { NextRequest, NextResponse } from 'next/server'
import OpenAIService, { type ChatMessage, type ChatOptions } from '@/lib/services/openai'
import { ResponseLimiter } from '@/lib/services/openai/response-limiter'

export async function POST(request: NextRequest) {
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

    // CRÍTICO: Verificar límite de respuestas EN PRODUCCIÓN antes de procesar
    if (ResponseLimiter.shouldEnforceLimits() && messages && messages.length > 0) {
      if (ResponseLimiter.hasReachedResponseLimit(messages)) {
        const limitInfo = ResponseLimiter.getLimitInfo(messages)
        const errorMessage = ResponseLimiter.getLimitReachedMessage()
        
        console.warn('⚠️ Límite de respuestas alcanzado en producción:', limitInfo)
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            limitInfo // Incluir info del límite para el cliente
          },
          { status: 429 } // Too Many Requests
        )
      }

      // Advertencia si se acerca al límite (log no crítico)
      const remaining = ResponseLimiter.getRemainingResponses(messages)
      const warning = ResponseLimiter.getWarningMessage(remaining)
      if (warning) {
        console.log(`⏳ Advertencia: ${warning}`)
      }
    }

    const openaiService = OpenAIService.getInstance()

    let response

    if (messages && messages.length > 0) {
      // Conversación completa - pasar los mensajes para validación de límite
      response = await openaiService.sendConversation(messages, {
        ...options,
        messages // Incluir mensajes para el límite
      })
    } else if (message) {
      // Mensaje simple
      response = await openaiService.sendMessage(message, options)
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere "message" o "messages"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error en API de chat:', error)
    
    // Detectar si es error de límite de respuestas
    const isLimitError = error instanceof Error && 
      ResponseLimiter.getLimitReachedMessage() === error.message
    
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
