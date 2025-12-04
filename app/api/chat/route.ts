import { NextRequest, NextResponse } from 'next/server'
import OpenAIService, { type ChatMessage, type ChatOptions } from '@/lib/services/openai'
import { DemoLimitService } from '@/lib/services/demo-limit-service'

export async function POST(request: NextRequest) {
  const demoLimitService = DemoLimitService.getInstance()
  
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

    // CRÍTICO: Verificar límite de respuestas ANTES de procesar
    if (demoLimitService.shouldEnforceLimits()) {
      if (demoLimitService.hasReachedLimit(request)) {
        const limitInfo = demoLimitService.getLimitInfo(request)
        const errorMessage = demoLimitService.getLimitReachedMessage()
        
        console.warn(`🚫 Límite de demo alcanzado:`, limitInfo)
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            limitInfo,
            isLimitReached: true
          },
          { status: 429 }
        )
      }

      // Log de advertencia si se acerca al límite
      const remaining = demoLimitService.getRemainingResponses(request)
      const warning = demoLimitService.getWarningMessage(remaining)
      if (warning) {
        console.log(`⏳ ${warning}`)
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
      response = await openaiService.sendConversation(messages, options)
    } else if (message) {
      response = await openaiService.sendMessage(message, options)
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere "message" o "messages"' },
        { status: 400 }
      )
    }

    // ÉXITO: Crear respuesta con cookie actualizada
    if (demoLimitService.shouldEnforceLimits()) {
      const cookieHeader = demoLimitService.createIncrementedCookie(request)
      const limitInfo = demoLimitService.getLimitInfo(request)
      
      // Calcular remaining DESPUÉS de incrementar (por eso restamos 1)
      const newRemaining = Math.max(0, limitInfo.remainingResponses - 1)
      
      const jsonResponse = NextResponse.json({
        success: true,
        data: response,
        limitInfo: {
          remaining: newRemaining,
          max: limitInfo.maxResponses,
          current: limitInfo.currentResponses + 1,
          warning: demoLimitService.getWarningMessage(newRemaining)
        }
      })
      
      // Setear cookie en la respuesta
      jsonResponse.headers.set('Set-Cookie', cookieHeader)
      
      return jsonResponse
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error en API de chat:', error)
    
    const isLimitError = error instanceof Error && 
      demoLimitService.getLimitReachedMessage() === error.message
    
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
