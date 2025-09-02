import { tool } from '@openai/agents'
import { z } from 'zod'
import { DatabaseManager } from '@/lib/mcp-server/database'

/**
 * Herramientas de base de datos que el agente puede usar
 * Estas herramientas usan directamente el DatabaseManager (MCP server)
 */

// Crear instancia singleton del DatabaseManager
let dbManager: DatabaseManager | null = null

async function getDBManager(): Promise<DatabaseManager> {
  if (!dbManager) {
    dbManager = new DatabaseManager()
    await dbManager.connect()
  }
  return dbManager
}

// Herramienta para ejecutar consultas SQL
export const executeSQLTool = tool({
  name: 'execute_sql_query',
  description: 'Execute a SQL query on the MySQL database. Use this for SELECT, INSERT, UPDATE, DELETE operations.',
  parameters: z.object({
    sql: z.string().describe('The SQL query to execute'),
  }),
  async execute({ sql }) {
    try {
      const db = await getDBManager()
      const result = await db.query(sql)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      return `Error executing SQL query: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Herramienta para listar todas las tablas
export const listTablesTool = tool({
  name: 'list_database_tables',
  description: 'Get a list of all tables in the MySQL database.',
  parameters: z.object({}),
  async execute() {
    try {
      const db = await getDBManager()
      const tables = await db.listTables()
      return JSON.stringify(tables, null, 2)
    } catch (error) {
      return `Error listing tables: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Herramienta para obtener estadísticas de la base de datos
export const getDatabaseStatsTool = tool({
  name: 'get_database_stats',
  description: 'Get comprehensive statistics about the MySQL database including table counts, sizes, and performance metrics.',
  parameters: z.object({}),
  async execute() {
    try {
      const db = await getDBManager()
      const stats = await db.getDatabaseStats()
      return JSON.stringify(stats, null, 2)
    } catch (error) {
      return `Error getting database stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Herramienta para describir una tabla específica
export const describeTableTool = tool({
  name: 'describe_table',
  description: 'Get detailed information about a specific table structure, including columns, types, keys, and constraints.',
  parameters: z.object({
    tableName: z.string().describe('The name of the table to describe'),
  }),
  async execute({ tableName }) {
    try {
      const db = await getDBManager()
      const description = await db.describeTable(tableName)
      return JSON.stringify(description, null, 2)
    } catch (error) {
      return `Error describing table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Herramienta para obtener información detallada de una tabla
export const getTableInfoTool = tool({
  name: 'get_table_info',
  description: 'Get comprehensive information about a table including row count, size, indexes, and other metadata.',
  parameters: z.object({
    tableName: z.string().describe('The name of the table to get info for'),
  }),
  async execute({ tableName }) {
    try {
      const db = await getDBManager()
      const info = await db.getTableInfo(tableName)
      return JSON.stringify(info, null, 2)
    } catch (error) {
      return `Error getting table info for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Exportar todas las herramientas como un array
export const databaseTools = [
  executeSQLTool,
  listTablesTool,
  getDatabaseStatsTool,
  describeTableTool,
  getTableInfoTool,
]
