import { NextRequest, NextResponse } from 'next/server'
import ConversationService from '@/lib/services/conversations'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params // Await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const conversationService = ConversationService.getInstance()
    const messages = await conversationService.getMessages(id, limit)

    return NextResponse.json({
      success: true,
      data: messages
    })

  } catch (error) {
    console.error('Error obteniendo mensajes:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params // Await params
    const body = await request.json()
    const { message } = body

    if (!message || !message.content) {
      return NextResponse.json(
        { success: false, error: 'El contenido del mensaje es requerido' },
        { status: 400 }
      )
    }

    const conversationService = ConversationService.getInstance()
    await conversationService.addMessage(id, {
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: message.role || 'user',
      content: message.content,
      createdAt: message.createdAt || new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Mensaje agregado'
    })

  } catch (error) {
    console.error('Error agregando mensaje:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}
