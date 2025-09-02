import { NextRequest, NextResponse } from 'next/server'
import { ConversationService } from '@/lib/services/conversations'

export async function POST(request: NextRequest) {
  try {
    const { startFromIndex = 10, limit = 10 } = await request.json()

    // Validar parámetros
    if (typeof startFromIndex !== 'number' || startFromIndex < 0) {
      return NextResponse.json({
        success: false,
        error: 'startFromIndex debe ser un número positivo'
      }, { status: 400 })
    }

    if (typeof limit !== 'number' || limit <= 0 || limit > 50) {
      return NextResponse.json({
        success: false,
        error: 'limit debe ser un número entre 1 y 50'
      }, { status: 400 })
    }

    // Obtener más conversaciones usando el servicio
    const conversationService = ConversationService.getInstance()
    const additionalConversations = await conversationService.loadMoreConversations(startFromIndex, limit)

    return NextResponse.json({
      success: true,
      data: additionalConversations,
      pagination: {
        startFromIndex,
        limit,
        count: additionalConversations.length
      }
    })

  } catch (error) {
    console.error('Error en API load-more conversaciones:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}
