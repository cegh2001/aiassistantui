import { NextRequest, NextResponse } from 'next/server'
import OpenAIService, { type ChatMessage, type ChatOptions } from '@/lib/services/openai'

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

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error en API de chat:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}
