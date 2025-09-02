import OpenAI from 'openai'
import type { Conversation, Message } from '@/lib/types/chat'
import ConversationFileStore from '@/lib/stores/conversation-file-store'

// Cliente OpenAI configurado
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class ConversationService {
  private static instance: ConversationService
  private fileStore: ConversationFileStore
  
  private constructor() {
    this.fileStore = ConversationFileStore.getInstance()
  }
  
  static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService()
    }
    return ConversationService.instance
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  /**
   * Crea una nueva conversación usando OpenAI Conversations API
   */
  async createConversation(title?: string, initialMessage?: string): Promise<string> {
    try {
      const metadata: Record<string, string> = {
        title: title || 'Nueva conversación',
        messageCount: '0',
        preview: initialMessage ? initialMessage.substring(0, 80) : 'Nueva conversación...',
        pinned: 'false',
        folder: 'General',
        updatedAt: new Date().toISOString()
      }

      const items = initialMessage ? [{
        type: "message" as const,
        role: "user" as const,
        content: [{ type: "input_text" as const, text: initialMessage }]
      }] : []

      const conversation = await client.conversations.create({
        metadata,
        items
      })

      // Guardar en el store de archivos
      await this.fileStore.addConversation({
        id: conversation.id,
        title: metadata.title,
        preview: metadata.preview,
        pinned: metadata.pinned === 'true',
        folder: metadata.folder,
        messageCount: parseInt(metadata.messageCount),
        createdAt: new Date().toISOString(),
        updatedAt: metadata.updatedAt
      })

      console.log('✅ Conversación creada:', conversation.id)
      return conversation.id
    } catch (error) {
      console.error('❌ Error creando conversación:', error)
      throw new Error('No se pudo crear la conversación')
    }
  }

  /**
   * Obtiene una conversación por ID desde OpenAI API incluyendo sus mensajes
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversation = await client.conversations.retrieve(conversationId)
      const openaiMessages = await this.getMessages(conversationId)
      
      const formattedConversation = this.formatConversationForUI(conversation)
      
      // Usar únicamente mensajes de la API de Conversations
      formattedConversation.messages = openaiMessages
      
      return formattedConversation
    } catch (error) {
      console.error('❌ Error obteniendo conversación:', error)
      return null
    }
  }

  /**
   * Lista todas las conversaciones usando el store de archivos
   */
  async listConversations(limit: number = 20): Promise<Conversation[]> {
    try {
      const conversationMetadata = await this.fileStore.getFilteredConversations({ limit })
      const conversations: Conversation[] = []

      // Obtener las conversaciones completas de la API de OpenAI
      for (const metadata of conversationMetadata) {
        try {
          const conversation = await this.getConversation(metadata.id)
          if (conversation) {
            conversations.push(conversation)
          }
        } catch (error) {
          console.warn(`No se pudo cargar conversación ${metadata.id}:`, error)
          // Remover conversación inválida del store
          await this.fileStore.removeConversation(metadata.id)
        }
      }

      return conversations
    } catch (error) {
      console.error('❌ Error listando conversaciones:', error)
      return []
    }
  }

  /**
   * Actualiza una conversación
   */
  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    try {
      const current = await client.conversations.retrieve(conversationId)
      
      const newMetadata = {
        ...(current.metadata || {}),
        ...Object.fromEntries(
          Object.entries(updates.metadata || {}).map(([key, value]) => [key, String(value)])
        ),
        updatedAt: new Date().toISOString()
      }

      await client.conversations.update(conversationId, {
        metadata: newMetadata
      })

      // Actualizar en el store de archivos también usando los updates originales y metadata actual
      const currentMetadata = current.metadata || {}
      const finalMetadata = { ...currentMetadata, ...updates.metadata }
      
      await this.fileStore.updateConversation(conversationId, {
        title: (finalMetadata as any).title || (currentMetadata as any).title || 'Sin título',
        preview: (finalMetadata as any).preview || (currentMetadata as any).preview || '',
        pinned: ((finalMetadata as any).pinned || (currentMetadata as any).pinned || 'false').toString() === 'true',
        folder: (finalMetadata as any).folder || (currentMetadata as any).folder || 'General',
        messageCount: parseInt((finalMetadata as any).messageCount || (currentMetadata as any).messageCount || '0'),
        updatedAt: newMetadata.updatedAt
      })

      console.log('✅ Conversación actualizada:', conversationId)
    } catch (error) {
      console.error('❌ Error actualizando conversación:', error)
      throw error
    }
  }

  /**
   * Agrega un mensaje a una conversación usando únicamente la API de Conversations
   */
  async addMessage(conversationId: string, message: Message): Promise<void> {
    try {
      // Agregar tanto mensajes de usuario como de asistente a la API de Conversations
      const items = [{
        type: "message" as const,
        role: message.role as "user" | "assistant",
        content: [{ type: "input_text" as const, text: message.content }]
      }]

      await client.conversations.items.create(conversationId, { items })
      console.log(`✅ Mensaje agregado a conversación: ${conversationId} Rol: ${message.role}`)

      // Actualizar metadata solo contando mensajes de la API
      const openaiMessages = await this.getMessages(conversationId)
      const messageCount = openaiMessages.length
      
      // Usar el último mensaje como preview
      const lastMessage = openaiMessages[openaiMessages.length - 1]
      const preview = lastMessage ? lastMessage.content.slice(0, 80) : ''
      
      // Si es el primer mensaje del usuario, generar un título inteligente
      const currentMetadata = await this.getConversationMetadata(conversationId)
      let title = currentMetadata?.title || 'Nueva conversación'
      if (messageCount === 1 && message.role === 'user') {
        title = this.generateSmartTitle(message.content)
      }

      await this.updateConversation(conversationId, {
        metadata: {
          ...currentMetadata,
          messageCount: messageCount.toString(),
          preview,
          title,
          updatedAt: message.createdAt || new Date().toISOString()
        }
      })

      console.log('✅ Conversación actualizada:', conversationId)
    } catch (error) {
      console.error('❌ Error agregando mensaje:', error)
      throw error
    }
  }

  /**
   * Obtiene solo los metadatos de una conversación
   */
  private async getConversationMetadata(conversationId: string): Promise<Record<string, string> | null> {
    try {
      const conversation = await client.conversations.retrieve(conversationId)
      return (conversation.metadata || {}) as Record<string, string>
    } catch (error) {
      console.error('❌ Error obteniendo metadata:', error)
      return null
    }
  }

  /**
   * Obtiene los mensajes de una conversación
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await client.conversations.items.list(conversationId, {
        limit,
        order: 'asc'
      })

      const openaiMessages = response.data
        .filter(item => {
          // Filtrar solo mensajes del usuario y cualquier item con role assistant
          const isUserMessage = item.type === 'message' && (item as any).role === 'user'
          const isAssistantItem = (item as any).role === 'assistant'
          
          return isUserMessage || isAssistantItem
        })
        .map(item => this.formatItemAsMessage(item))
      
      // Usar únicamente mensajes de la API de Conversations
      return openaiMessages
    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error)
      return []
    }
  }

  /**
   * Genera un título inteligente basado en el contenido del primer mensaje
   */
  private generateSmartTitle(content: string): string {
    const cleanContent = content.trim()
    
    if (cleanContent.length <= 30) {
      return cleanContent
    }
    
    const firstSentence = cleanContent.split(/[.!?]+/)[0]
    if (firstSentence && firstSentence.length <= 50) {
      return firstSentence.trim()
    }
    
    const words = cleanContent.split(' ')
    if (words.length <= 6) {
      return cleanContent
    }
    
    return words.slice(0, 6).join(' ') + '...'
  }

  /**
   * Alterna el estado de pin de una conversación
   */
  async togglePin(conversationId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId)
      if (!conversation) {
        throw new Error('Conversación no encontrada')
      }

      const currentPinned = (conversation.metadata?.pinned || 'false') === 'true'
      const newPinned = !currentPinned

      await this.updateConversation(conversationId, {
        metadata: {
          ...conversation.metadata,
          pinned: newPinned.toString()
        }
      })
    } catch (error) {
      console.error('❌ Error alternando pin:', error)
      throw error
    }
  }

  /**
   * Actualiza el título de una conversación
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    try {
      await this.updateConversation(conversationId, {
        metadata: { title }
      })
    } catch (error) {
      console.error('❌ Error actualizando título:', error)
      throw error
    }
  }

  /**
   * Actualiza la carpeta de una conversación
   */
  async updateFolder(conversationId: string, folder: string): Promise<void> {
    try {
      await this.updateConversation(conversationId, {
        metadata: { folder }
      })
    } catch (error) {
      console.error('❌ Error actualizando carpeta:', error)
      throw error
    }
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await client.conversations.delete(conversationId)
      await this.fileStore.removeConversation(conversationId)
      
      // No necesitamos limpiar localStorage ya que solo usamos la API
      console.log('✅ Conversación eliminada:', conversationId)
    } catch (error) {
      console.error('❌ Error eliminando conversación:', error)
      throw error
    }
  }

  /**
   * Obtiene conversaciones filtradas usando el store de archivos
   */
  async getFilteredConversations(filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  } = {}): Promise<Conversation[]> {
    try {
      const conversationMetadata = await this.fileStore.getFilteredConversations(filter)
      const conversations: Conversation[] = []

      // Obtener las conversaciones completas de la API de OpenAI
      for (const metadata of conversationMetadata) {
        try {
          const conversation = await this.getConversation(metadata.id)
          if (conversation) {
            conversations.push(conversation)
          }
        } catch (error) {
          console.warn(`No se pudo cargar conversación ${metadata.id}:`, error)
          // Remover conversación inválida del store
          await this.fileStore.removeConversation(metadata.id)
        }
      }

      return conversations
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones filtradas:', error)
      return []
    }
  }

  // Métodos auxiliares privados

  /**
   * Formatea una conversación de OpenAI para la UI
   */
  private formatConversationForUI(apiConversation: any): Conversation {
    return {
      id: apiConversation.id,
      object: apiConversation.object,
      created_at: apiConversation.created_at,
      metadata: apiConversation.metadata || {},
      // Propiedades para compatibilidad con UI existente
      title: apiConversation.metadata?.title || 'Sin título',
      updatedAt: apiConversation.metadata?.updatedAt || new Date(apiConversation.created_at * 1000).toISOString(),
      messageCount: parseInt(apiConversation.metadata?.messageCount || '0'),
      preview: apiConversation.metadata?.preview || '',
      pinned: apiConversation.metadata?.pinned === 'true',
      folder: apiConversation.metadata?.folder || 'General'
    }
  }

  /**
   * Formatea un item de conversación como mensaje
   */
  private formatItemAsMessage(item: any): Message {
    let content = ''
    
    // Manejar diferentes tipos de contenido
    if (item.content && Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        if (contentItem.type === 'input_text' || contentItem.type === 'output_text') {
          content += contentItem.text
        } else if (contentItem.type === 'text') {
          content += contentItem.text
        }
      }
    } else if (typeof item.content === 'string') {
      content = item.content
    }
    
    return {
      id: item.id,
      role: item.role || 'user',
      content: content || '[Sin contenido]',
      createdAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : new Date().toISOString()
    }
  }
}

export default ConversationService
