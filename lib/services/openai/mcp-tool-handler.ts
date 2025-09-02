/**
 * Manejador de herramientas MCP para base de datos
 */

import { DatabaseManager } from '../../mcp-server/database'
import type { DatabaseTool, ToolExecutionResult } from './types'

// Instancia singleton del DatabaseManager
let databaseManager: DatabaseManager | null = null

async function getDatabaseManager(): Promise<DatabaseManager> {
  if (!databaseManager) {
    databaseManager = new DatabaseManager()
    await databaseManager.connect()
  }
  return databaseManager
}

export class MCPToolHandler {
  /**
   * Obtiene la definición de herramientas MCP para Responses API
   */
  static getDatabaseTools(): DatabaseTool[] {
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
   * Ejecuta una herramienta MCP específica
   */
  static async executeToolCall(toolName: string, args: any): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseManager()
      const content = await this.executeSpecificTool(db, toolName, args)
      
      return {
        success: true,
        content
      }
    } catch (error) {
      console.error(`❌ Error ejecutando ${toolName}:`, error)
      return {
        success: false,
        content: `❌ Error ejecutando ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error: error instanceof Error ? error : new Error('Error desconocido')
      }
    }
  }

  /**
   * Ejecuta herramienta específica según el nombre
   */
  private static async executeSpecificTool(
    db: DatabaseManager, 
    toolName: string, 
    args: any
  ): Promise<string> {
    switch (toolName) {
      case 'list_database_tables':
        return this.executeListTables(db)
        
      case 'execute_sql_query':
        return this.executeSqlQuery(db, args.sql)
        
      case 'describe_table':
        return this.executeDescribeTable(db, args.tableName)
        
      case 'get_database_stats':
        return this.executeGetStats(db)
        
      default:
        throw new Error(`Herramienta desconocida: ${toolName}`)
    }
  }

  /**
   * Ejecuta list_database_tables
   */
  private static async executeListTables(db: DatabaseManager): Promise<string> {
    console.log('🔧 Ejecutando list_database_tables...')
    const tables = await db.listTables()
    return `**Tablas de la base de datos gnavidb:**\n\n${tables.map(table => `• ${table}`).join('\n')}\n\n_Total: ${tables.length} tablas encontradas_`
  }

  /**
   * Ejecuta execute_sql_query
   */
  private static async executeSqlQuery(db: DatabaseManager, sql: string): Promise<string> {
    console.log('🔧 Ejecutando execute_sql_query:', sql)
    const results = await db.query(sql)
    return `**Resultado de consulta SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n\n**Resultados:** ${results.length} filas\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\``
  }

  /**
   * Ejecuta describe_table
   */
  private static async executeDescribeTable(db: DatabaseManager, tableName: string): Promise<string> {
    console.log('🔧 Ejecutando describe_table:', tableName)
    const tableInfo = await db.getTableInfo(tableName)
    
    let description = `**Información de la tabla: ${tableName}**\n\n`
    description += `• **Filas:** ${tableInfo.rowCount}\n`
    description += `• **Tamaño:** ${tableInfo.size}\n\n`
    description += `**Columnas:**\n`
    
    tableInfo.columns.forEach((col: any) => {
      description += `• \`${col.COLUMN_NAME}\` (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'NO' ? '- NOT NULL' : ''} ${col.COLUMN_KEY ? `- ${col.COLUMN_KEY}` : ''}\n`
    })
    
    return description
  }

  /**
   * Ejecuta get_database_stats
   */
  private static async executeGetStats(db: DatabaseManager): Promise<string> {
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
  }

  /**
   * Limpia las conexiones de base de datos
   */
  static async cleanup(): Promise<void> {
    if (databaseManager) {
      await databaseManager.disconnect()
      databaseManager = null
    }
  }
}
