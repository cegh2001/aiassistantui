import { NextRequest, NextResponse } from 'next/server'
import ConversationService from '@/lib/services/conversations'

export async function GET(request: NextRequest) {
  try {
    // Verificar que OpenAI esté configurado
    if (!ConversationService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key no configurada. Por favor, añade OPENAI_API_KEY al archivo .env.local' 
        },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const pinned = searchParams.get('pinned')
    const folder = searchParams.get('folder')
    const search = searchParams.get('search')

    const conversationService = ConversationService.getInstance()

    // Si hay filtros, usar getFilteredConversations
    if (pinned !== null || folder || search) {
      const filter = {
        ...(pinned !== null && { pinned: pinned === 'true' }),
        ...(folder && { folder }),
        ...(search && { search }),
        limit
      }
      
      const conversations = await conversationService.getFilteredConversations(filter)
      return NextResponse.json({
        success: true,
        data: conversations
      })
    }

    // Lista normal (OPTIMIZADA - solo metadata)
    const conversations = await conversationService.listConversations(limit)
    return NextResponse.json({
      success: true,
      data: conversations
    })

  } catch (error) {
    console.error('Error en API de conversaciones:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que OpenAI esté configurado
    if (!ConversationService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key no configurada. Por favor, añade OPENAI_API_KEY al archivo .env.local' 
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { title, initialMessage } = body

    const conversationService = ConversationService.getInstance()
    const conversationId = await conversationService.createConversation(title, initialMessage)

    return NextResponse.json({
      success: true,
      data: { id: conversationId }
    })

  } catch (error) {
    console.error('Error creando conversación:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}
