import { promises as fs } from 'fs'
import path from 'path'

// Interfaz para una conversación en el store
interface ConversationMetadata {
  id: string
  title: string
  preview: string
  pinned: boolean
  folder: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

// Interfaz para el archivo de datos
interface ConversationData {
  conversationIds: string[]
  conversations: Record<string, ConversationMetadata>
}

class ConversationFileStore {
  private static instance: ConversationFileStore
  private filePath: string
  private data: ConversationData = {
    conversationIds: [],
    conversations: {}
  }
  private isInitialized = false

  private constructor() {
    // Usar un archivo en el directorio temporal o en el proyecto
    this.filePath = path.join(process.cwd(), 'conversations.json')
  }

  static getInstance(): ConversationFileStore {
    if (!ConversationFileStore.instance) {
      ConversationFileStore.instance = new ConversationFileStore()
    }
    return ConversationFileStore.instance
  }

  private async ensureInitialized() {
    if (this.isInitialized) return

    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8')
      this.data = JSON.parse(fileContent)
    } catch (error) {
      // Si el archivo no existe o hay un error, usar datos por defecto
      console.log('📁 Archivo de conversaciones no encontrado, creando uno nuevo')
      this.data = {
        conversationIds: [],
        conversations: {}
      }
    }
    
    this.isInitialized = true
  }

  private async saveToFile() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (error) {
      console.error('❌ Error guardando conversaciones en archivo:', error)
    }
  }

  async addConversation(conversation: ConversationMetadata) {
    await this.ensureInitialized()
    
    // Agregar o actualizar la conversación
    this.data.conversations[conversation.id] = conversation
    
    // Agregar ID al inicio si no existe
    if (!this.data.conversationIds.includes(conversation.id)) {
      this.data.conversationIds.unshift(conversation.id)
    }
    
    await this.saveToFile()
  }

  async removeConversation(id: string) {
    await this.ensureInitialized()
    
    this.data.conversationIds = this.data.conversationIds.filter(existingId => existingId !== id)
    delete this.data.conversations[id]
    
    await this.saveToFile()
  }

  async updateConversation(id: string, updates: Partial<ConversationMetadata>) {
    await this.ensureInitialized()
    
    const existing = this.data.conversations[id]
    if (!existing) return

    this.data.conversations[id] = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    await this.saveToFile()
  }

  async getConversationIds(): Promise<string[]> {
    await this.ensureInitialized()
    return this.data.conversationIds
  }

  async getConversationMetadata(id: string): Promise<ConversationMetadata | null> {
    await this.ensureInitialized()
    return this.data.conversations[id] || null
  }

  async getAllConversations(): Promise<ConversationMetadata[]> {
    await this.ensureInitialized()
    
    return this.data.conversationIds
      .map(id => this.data.conversations[id])
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  async getFilteredConversations(filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  }): Promise<ConversationMetadata[]> {
    let conversations = await this.getAllConversations()
    
    if (filter.pinned !== undefined) {
      conversations = conversations.filter(c => c.pinned === filter.pinned)
    }
    
    if (filter.folder) {
      conversations = conversations.filter(c => c.folder === filter.folder)
    }
    
    if (filter.search) {
      const search = filter.search.toLowerCase()
      conversations = conversations.filter(c => 
        c.title.toLowerCase().includes(search) ||
        c.preview.toLowerCase().includes(search)
      )
    }
    
    if (filter.limit) {
      conversations = conversations.slice(0, filter.limit)
    }
    
    return conversations
  }

  async clearAll() {
    await this.ensureInitialized()
    
    this.data = {
      conversationIds: [],
      conversations: {}
    }
    
    await this.saveToFile()
  }
}

export default ConversationFileStore
