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
    const conversationService = ConversationService.getInstance()
    const conversation = await conversationService.getConversation(id)

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: conversation
    })

  } catch (error) {
    console.error('Error obteniendo conversación:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params // Await params
    const body = await request.json()
    const { title, folder, pinned } = body

    const conversationService = ConversationService.getInstance()

    if (title !== undefined) {
      await conversationService.updateTitle(id, title)
    }

    if (folder !== undefined) {
      await conversationService.updateFolder(id, folder)
    }

    if (pinned !== undefined) {
      await conversationService.togglePin(id)
    }

    return NextResponse.json({
      success: true,
      message: 'Conversación actualizada'
    })

  } catch (error) {
    console.error('Error actualizando conversación:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const conversationService = ConversationService.getInstance()
    await conversationService.deleteConversation(params.id)

    return NextResponse.json({
      success: true,
      message: 'Conversación eliminada'
    })

  } catch (error) {
    console.error('Error eliminando conversación:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}
