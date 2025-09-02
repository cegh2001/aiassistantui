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

// Interfaz para el archivo de datos OPTIMIZADO
interface ConversationData {
  conversationIds: string[] // Todos los IDs ordenados por recencia
  recentConversations: Record<string, ConversationMetadata> // Solo metadata de las primeras 10
}

class ConversationFileStore {
  private static instance: ConversationFileStore
  private filePath: string
  private data: ConversationData = {
    conversationIds: [],
    recentConversations: {}
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
      const loadedData = JSON.parse(fileContent)
      
      // Migración de datos: si tiene la estructura vieja, convertir a la nueva
      if (Array.isArray(loadedData)) {
        // Estructura vieja: array de conversaciones
        console.log('📦 Migrando estructura de datos vieja...')
        this.data = {
          conversationIds: loadedData.map(c => c.id),
          recentConversations: {}
        }
        
        // Solo mantener las primeras 10 con metadata
        const recentConversations = loadedData.slice(0, 10)
        recentConversations.forEach(conv => {
          this.data.recentConversations[conv.id] = conv
        })
        
        // Guardar la nueva estructura
        await this.saveToFile()
        console.log(`✅ Migración completada: ${this.data.conversationIds.length} IDs, ${Object.keys(this.data.recentConversations).length} con metadata`)
      } else if (loadedData.conversationIds) {
        // Estructura intermedia: tiene conversationIds pero puede tener 'conversations' en lugar de 'recentConversations'
        this.data = {
          conversationIds: loadedData.conversationIds || [],
          recentConversations: loadedData.recentConversations || loadedData.conversations || {}
        }
        
        // Si había demasiadas conversaciones con metadata, limitarlas a 10
        const conversationKeys = Object.keys(this.data.recentConversations)
        if (conversationKeys.length > 10) {
          console.log(`📦 Limitando metadata de ${conversationKeys.length} a 10 conversaciones...`)
          const recentKeys = this.data.conversationIds.slice(0, 10)
          const newRecentConversations: Record<string, ConversationMetadata> = {}
          
          recentKeys.forEach(id => {
            if (this.data.recentConversations[id]) {
              newRecentConversations[id] = this.data.recentConversations[id]
            }
          })
          
          this.data.recentConversations = newRecentConversations
          await this.saveToFile()
          console.log(`✅ Optimización completada: ${Object.keys(this.data.recentConversations).length} conversaciones con metadata`)
        }
        
        console.log(`📁 Cargadas ${this.data.conversationIds.length} conversaciones (${Object.keys(this.data.recentConversations).length} con metadata)`)
      } else {
        // Archivo corrupto o formato desconocido
        console.warn('⚠️ Formato de archivo no reconocido, inicializando nuevo')
        this.data = {
          conversationIds: [],
          recentConversations: {}
        }
      }
      
      // Asegurar que recentConversations existe
      if (!this.data.recentConversations) {
        this.data.recentConversations = {}
      }
      
    } catch (error) {
      // Si el archivo no existe o hay un error, usar datos por defecto
      console.log('📁 Archivo de conversaciones no encontrado, creando uno nuevo')
      this.data = {
        conversationIds: [],
        recentConversations: {}
      }
    }
    
    this.isInitialized = true
  }

  private async saveToFile() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
      console.log(`💾 Guardadas ${this.data.conversationIds.length} conversaciones`)
    } catch (error) {
      console.error('❌ Error guardando conversaciones en archivo:', error)
    }
  }

  async addConversation(conversation: ConversationMetadata) {
    await this.ensureInitialized()
    
    // Agregar ID al inicio si no existe
    if (!this.data.conversationIds.includes(conversation.id)) {
      this.data.conversationIds.unshift(conversation.id)
    }
    
    // Solo guardar metadata si está en los primeros 10
    const recentIds = this.data.conversationIds.slice(0, 10)
    if (recentIds.includes(conversation.id)) {
      this.data.recentConversations[conversation.id] = conversation
    }
    
    // Limpiar metadata de conversaciones que ya no están en top 10
    const keysToRemove = Object.keys(this.data.recentConversations)
      .filter(id => !recentIds.includes(id))
    
    keysToRemove.forEach(id => {
      delete this.data.recentConversations[id]
    })
    
    await this.saveToFile()
  }

  async removeConversation(id: string) {
    await this.ensureInitialized()
    
    this.data.conversationIds = this.data.conversationIds.filter(existingId => existingId !== id)
    delete this.data.recentConversations[id]
    
    await this.saveToFile()
  }

  async updateConversation(id: string, updates: Partial<ConversationMetadata>) {
    await this.ensureInitialized()
    
    const existing = this.data.recentConversations[id]
    if (!existing) {
      // Si no está en recientes, no actualizar metadata (solo se mantiene en API)
      return
    }

    this.data.recentConversations[id] = {
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
    return this.data.recentConversations[id] || null
  }

  async getAllConversations(): Promise<ConversationMetadata[]> {
    await this.ensureInitialized()
    
    // Verificar que recentConversations existe y es un objeto
    if (!this.data.recentConversations || typeof this.data.recentConversations !== 'object') {
      console.warn('⚠️ recentConversations no está definido, inicializando...')
      this.data.recentConversations = {}
      return []
    }
    
    // Solo devolver las conversaciones recientes que tienen metadata
    return Object.values(this.data.recentConversations)
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
      recentConversations: {}
    }
    
    await this.saveToFile()
  }
}

export default ConversationFileStore
