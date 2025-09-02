import OpenAI from 'openai'
import { DatabaseManager } from '../mcp-server/database'

// Configuración del cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Instancia del DatabaseManager para herramientas MCP
let databaseManager: DatabaseManager | null = null

async function getDatabaseManager(): Promise<DatabaseManager> {
  if (!databaseManager) {
    databaseManager = new DatabaseManager()
    await databaseManager.connect()
  }
  return databaseManager
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
  createdAt?: string
}

export interface ChatResponse {
  id: string
  content: string
  reasoning?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

export type ChatMode = 'fast' | 'agent'

export interface ChatOptions {
  model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano'
  mode?: ChatMode
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  verbosity?: 'low' | 'medium' | 'high'
  maxOutputTokens?: number
  previousResponseId?: string
}

export class OpenAIService {
  private static instance: OpenAIService
  
  private constructor() {}
  
  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }

  /**
   * Obtiene la configuración basada en el modo
   */
  private getModeConfig(mode: ChatMode) {
    switch (mode) {
      case 'fast':
        return {
          reasoningEffort: 'minimal' as const,
          verbosity: 'low' as const
        }
      case 'agent':
        return {
          reasoningEffort: 'high' as const,
          verbosity: 'high' as const
        }
      default:
        return {
          reasoningEffort: 'medium' as const,
          verbosity: 'medium' as const
        }
    }
  }

  /**
   * Detecta si un mensaje requiere herramientas de base de datos
   */
  private shouldUseDatabaseTools(input: string): boolean {
    const dbKeywords = [
      'base de datos', 'database', 'sql', 'consulta', 'query', 'tabla', 'table', 'tablas',
      'mysql', 'select', 'insert', 'update', 'delete', 'show tables', 'list tables',
      'describe', 'estadísticas', 'stats', 'información', 'info', 'usuarios', 'users',
      'gnavi', 'listar', 'mostrar', 'lista', 'show', 'display'
    ]
    
    const inputLower = input.toLowerCase()
    return dbKeywords.some(keyword => inputLower.includes(keyword))
  }

  /**
   * Detecta si un mensaje requiere razonamiento complejo (modo agente automático)
   */
  private shouldUseAgentMode(input: string): boolean {
    const complexKeywords = [
      // Palabras de análisis y razonamiento
      'analiza', 'analyze', 'compara', 'compare', 'evalúa', 'evaluate',
      'planifica', 'plan', 'estrategia', 'strategy', 'optimiza', 'optimize',
      'resuelve', 'solve', 'calcula', 'calculate', 'diseña', 'design',
      
      // Palabras de base de datos (también requieren razonamiento)
      'base de datos', 'database', 'sql', 'consulta', 'query', 'tabla', 'table', 'tablas',
      'mysql', 'select', 'insert', 'update', 'delete', 'show tables', 'list tables',
      'gnavi', 'listar', 'mostrar', 'lista', 'show', 'display',
      
      // Palabras de tareas complejas
      'paso a paso', 'step by step', 'detalladamente', 'detailed',
      'complejo', 'complex', 'avanzado', 'advanced', 'profundo', 'deep'
    ]
    
    const inputLower = input.toLowerCase()
    return complexKeywords.some(keyword => inputLower.includes(keyword))
  }

  /**
   * Ejecuta herramientas MCP reales usando el DatabaseManager
   */
  private async executeToolCall(toolName: string, args: any): Promise<string> {
    try {
      const db = await getDatabaseManager()
      
      switch (toolName) {
        case 'list_database_tables':
          console.log('🔧 Ejecutando list_database_tables...')
          const tables = await db.listTables()
          return `**Tablas de la base de datos gnavidb:**\n\n${tables.map(table => `• ${table}`).join('\n')}\n\n_Total: ${tables.length} tablas encontradas_`
          
        case 'execute_sql_query':
          console.log('🔧 Ejecutando execute_sql_query:', args.sql)
          const results = await db.query(args.sql)
          return `**Resultado de consulta SQL:**\n\`\`\`sql\n${args.sql}\n\`\`\`\n\n**Resultados:** ${results.length} filas\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\``
          
        case 'describe_table':
          console.log('🔧 Ejecutando describe_table:', args.tableName)
          const tableInfo = await db.getTableInfo(args.tableName)
          let description = `**Información de la tabla: ${args.tableName}**\n\n`
          description += `• **Filas:** ${tableInfo.rowCount}\n`
          description += `• **Tamaño:** ${tableInfo.size}\n\n`
          description += `**Columnas:**\n`
          tableInfo.columns.forEach((col: any) => {
            description += `• \`${col.COLUMN_NAME}\` (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'NO' ? '- NOT NULL' : ''} ${col.COLUMN_KEY ? `- ${col.COLUMN_KEY}` : ''}\n`
          })
          return description
          
        case 'get_database_stats':
          console.log('🔧 Ejecutando get_database_stats...')
          const stats = await db.getDatabaseStats()
          let statsText = `**Estadísticas de la base de datos: ${stats.database}**\n\n`
          statsText += `• **Tablas:** ${stats.tableCount}\n`
          statsText += `• **Tamaño total:** ${stats.totalSize}\n`
          statsText += `• **Versión MySQL:** ${stats.version}\n`
          statsText += `• **Uptime:** ${stats.uptime}\n\n`
          statsText += `**Top 5 tablas por tamaño:**\n`
          stats.tables.slice(0, 5).forEach(table => {
            statsText += `• ${table.name}: ${table.rowCount} filas (${table.size})\n`
          })
          return statsText
          
        default:
          return `❌ Herramienta desconocida: ${toolName}`
      }
    } catch (error) {
      console.error(`❌ Error ejecutando ${toolName}:`, error)
      return `❌ Error ejecutando ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }
  }

  /**
   * Crea las herramientas MCP para base de datos (formato Responses API)
   */
  private getDatabaseTools() {
    console.log('🔧 Preparando herramientas MCP para Responses API...')
    return [
      {
        type: 'function',
        name: 'execute_sql_query',
        description: 'Execute a SQL query on the MySQL database gnavidb. Use for SELECT, INSERT, UPDATE, DELETE operations.',
        parameters: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'The SQL query to execute'
            }
          },
          required: ['sql']
        }
      },
      {
        type: 'function',
        name: 'list_database_tables',
        description: 'Get a list of all tables in the MySQL database gnavidb.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'describe_table',
        description: 'Get detailed information about a specific table structure, columns, types, and constraints.',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'The name of the table to describe'
            }
          },
          required: ['tableName']
        }
      },
      {
        type: 'function',
        name: 'get_database_stats',
        description: 'Get comprehensive statistics about the MySQL database including table counts and sizes.',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ]
  }

  /**
   * Envía un mensaje usando GPT-5 con Responses API y razonamiento adaptativo
   */
  async sendMessage(
    input: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const {
        model = 'gpt-5',
        mode: requestedMode = 'fast',
        reasoningEffort,
        verbosity,
        maxOutputTokens = 4000,
        previousResponseId
      } = options

      // Detectar automáticamente si necesita modo agente (si no se especificó explícitamente)
      let effectiveMode = requestedMode
      if (requestedMode === 'fast' && this.shouldUseAgentMode(input)) {
        effectiveMode = 'agent'
        console.log('🤖 Activación automática del modo agente detectada')
      }

      // Configuración basada en el modo efectivo
      const modeConfig = this.getModeConfig(effectiveMode)
      
      // Detectar si necesita herramientas de base de datos
      const needsDatabaseTools = this.shouldUseDatabaseTools(input)

      // Logging detallado para debugging
      if (needsDatabaseTools) {
        console.log('� DETECCIÓN MCP TOOLS:', {
          input: input.substring(0, 100) + '...',
          needsDatabaseTools,
          effectiveMode,
          reasoningEffort: reasoningEffort || modeConfig.reasoningEffort
        })
      }

      // Preparar el input según el modo y herramientas detectadas
      let processedInput = input
      
      if (effectiveMode === 'agent') {
        processedInput = `[MODO AGENTE - Razonamiento Profundo Activado]

${needsDatabaseTools ? `
HERRAMIENTAS DE BASE DE DATOS DETECTADAS:
- Tienes acceso a la base de datos MySQL "gnavidb"
- Puedes ejecutar consultas SQL, listar tablas, describir estructuras, etc.
- Usa las herramientas MCP para obtener información actualizada

` : ''}Instrucciones especiales:
- Usa tu máxima capacidad de razonamiento
- Proporciona explicaciones detalladas y paso a paso
- Considera múltiples perspectivas y enfoques
- Analiza profundamente antes de responder
- Sé exhaustivo en tu análisis

Consulta del usuario: ${input}`
      } else if (needsDatabaseTools) {
        processedInput = `[HERRAMIENTAS DE BASE DE DATOS DISPONIBLES]

Tienes acceso a la base de datos MySQL "gnavidb" con herramientas MCP.
Responde de manera concisa pero usa las herramientas cuando sea necesario.

Consulta del usuario: ${input}`
      }

      // Usar Responses API exclusivamente
      const apiMode = effectiveMode === 'agent' ? 'Agente (Reasoning High)' : 'Rápido (Reasoning Minimal)'
      console.log(`🚀 Usando Responses API - Modo: ${apiMode}${needsDatabaseTools ? ' + MCP Tools' : ''}`)
      
      const requestBody: any = {
        model,
        input: processedInput,
        reasoning: {
          effort: effectiveMode === 'agent' ? 'high' : 'minimal'
        },
        text: {
          verbosity: verbosity || modeConfig.verbosity
        }
      }

      // Agregar herramientas MCP si son necesarias
      if (needsDatabaseTools) {
        console.log('🔧 Intentando agregar herramientas MCP a Responses API...')
        
        // EXPERIMENTAL: Intentar agregar tools a Responses API
        try {
          requestBody.tools = this.getDatabaseTools()
          console.log('✅ Herramientas MCP agregadas a Responses API')
        } catch (error) {
          console.warn('⚠️ No se pudieron agregar herramientas MCP a Responses API:', error)
        }
      }

      if (maxOutputTokens) {
        requestBody.max_output_tokens = maxOutputTokens
      }

      if (previousResponseId) {
        requestBody.previous_response_id = previousResponseId
      }

      console.log('📤 Enviando request a Responses API:', {
        model: requestBody.model,
        reasoning_effort: requestBody.reasoning.effort,
        verbosity: requestBody.text.verbosity,
        has_tools: !!requestBody.tools,
        tools_count: requestBody.tools?.length || 0
      })

      const response = await client.responses.create(requestBody)

      console.log('📥 Respuesta recibida:', {
        id: response.id,
        usage: response.usage,
        output_length: response.output_text?.length || 0,
        has_output_text: !!response.output_text,
        has_output_array: !!response.output && Array.isArray(response.output),
        output_array_length: response.output?.length || 0
      })

      // Procesar respuesta con herramientas MCP
      if (needsDatabaseTools && response.output && Array.isArray(response.output)) {
        console.log('🔧 Procesando output con herramientas MCP reales...')
        
        let finalContent = ''
        let hasToolCalls = false
        
        for (const outputItem of response.output) {
          console.log('📋 Output item:', { type: outputItem.type, id: outputItem.id })
          
          if (outputItem.type === 'function_call') {
            hasToolCalls = true
            const toolName = (outputItem as any).name
            const toolArgs = JSON.parse((outputItem as any).arguments || '{}')
            
            console.log('🔧 Function call detectada:', {
              name: toolName,
              status: (outputItem as any).status,
              arguments: toolArgs
            })
            
            // Ejecutar herramienta MCP real
            try {
              const toolResult = await this.executeToolCall(toolName, toolArgs)
              finalContent += toolResult + '\n\n'
            } catch (error) {
              console.error(`❌ Error ejecutando herramienta ${toolName}:`, error)
              finalContent += `❌ Error ejecutando ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}\n\n`
            }
          } else if (outputItem.type === 'message' && (outputItem as any).content) {
            finalContent += (outputItem as any).content
          }
        }
        
        if (hasToolCalls) {
          console.log('✅ Herramientas MCP reales ejecutadas exitosamente')
          return {
            id: response.id || `responses_${Date.now()}`,
            content: finalContent || 'Herramientas ejecutadas pero sin contenido',
            reasoning: undefined,
            usage: {
              input_tokens: response.usage?.input_tokens,
              output_tokens: response.usage?.output_tokens || 0,
              total_tokens: response.usage?.total_tokens || 0,
            }
          }
        }
      }

      // Logging completo de la respuesta para debugging (solo si no hay herramientas)
      if ((!response.output_text || response.output_text.length === 0) && !needsDatabaseTools) {
        console.warn('⚠️ RESPUESTA VACÍA - Debugging completo:')
        console.warn('📋 Respuesta completa:', JSON.stringify(response, null, 2))
        
        // Si no hay output_text, verificar si hay otros campos
        if (response.reasoning) {
          console.log('🧠 Se encontró razonamiento')
        }
        
        // Si las herramientas están causando problemas, intentar sin herramientas
        if (needsDatabaseTools) {
          console.warn('🔄 Reintentando sin herramientas MCP...')
          
          const fallbackBody: any = {
            model,
            input: processedInput,
            reasoning: {
              effort: effectiveMode === 'agent' ? 'high' : 'minimal'
            },
            text: {
              verbosity: verbosity || modeConfig.verbosity
            }
          }
          
          if (maxOutputTokens) {
            fallbackBody.max_output_tokens = maxOutputTokens
          }
          
          console.log('📤 Reintentando sin tools...')
          const fallbackResponse = await client.responses.create(fallbackBody)
          
          console.log('📥 Respuesta fallback:', {
            id: fallbackResponse.id,
            usage: fallbackResponse.usage,
            output_length: fallbackResponse.output_text?.length || 0
          })
          
          return {
            id: fallbackResponse.id || `responses_${Date.now()}`,
            content: fallbackResponse.output_text || 'No se pudo obtener respuesta',
            reasoning: undefined,
            usage: {
              input_tokens: fallbackResponse.usage?.input_tokens,
              output_tokens: fallbackResponse.usage?.output_tokens || 0,
              total_tokens: fallbackResponse.usage?.total_tokens || 0,
            }
          }
        }
      }

      // Si se detectaron herramientas de BD pero no se ejecutaron, notificar
      if (needsDatabaseTools && !response.output_text?.includes('gnavidb')) {
        console.warn('⚠️ POSIBLE PROBLEMA: Se detectaron herramientas de BD pero la respuesta no parece usarlas')
        console.warn('📋 Para debugging - Input procesado:', processedInput.substring(0, 200) + '...')
      }

      return {
        id: response.id || `responses_${Date.now()}`,
        content: response.output_text || '',
        reasoning: undefined, // Disponible en versiones futuras
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        }
      }
    } catch (error) {
      console.error('❌ Error en Responses API:', error)
      
      // Logging adicional para debugging
      if (error instanceof Error) {
        console.error('📋 Detalles del error:', {
          message: error.message,
          stack: error.stack?.substring(0, 500)
        })
      }
      
      throw new Error(`OpenAI Responses API error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Envía una conversación completa usando GPT-5 
   */
  async sendConversation(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      // Convertir mensajes a formato de input para GPT-5
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const input = `Previous conversation:\n${conversationText}\n\nPlease respond as the assistant.`

      return await this.sendMessage(input, options)
    } catch (error) {
      console.error('Error sending conversation to OpenAI:', error)
      throw new Error(`OpenAI conversation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Envía un mensaje con configuración optimizada para velocidad (razonamiento mínimo)
   */
  async sendFastMessage(input: string): Promise<ChatResponse> {
    return this.sendMessage(input, {
      model: 'gpt-5',
      mode: 'fast',
      reasoningEffort: 'minimal',
      verbosity: 'low'
    })
  }

  /**
   * Envía un mensaje con configuración optimizada para tareas complejas (razonamiento máximo)
   */
  async sendComplexMessage(input: string): Promise<ChatResponse> {
    return this.sendMessage(input, {
      model: 'gpt-5',
      mode: 'agent',
      reasoningEffort: 'high',
      verbosity: 'high'
    })
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  /**
   * Cierra la conexión de base de datos
   */
  static async cleanup(): Promise<void> {
    if (databaseManager) {
      await databaseManager.disconnect()
      databaseManager = null
    }
  }
}

export default OpenAIService
