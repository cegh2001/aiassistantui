import { Agent } from '@openai/agents'
import { databaseTools } from '@/lib/tools/database'
import { ChatMode } from './openai'

export interface AgentContext {
  userId?: string
  sessionId?: string
}

/**
 * Crea un agente de base de datos con herramientas MCP
 */
export function createDatabaseAgent(mode: ChatMode = 'agent'): Agent<AgentContext> {
  const baseInstructions = `Eres un asistente experto en bases de datos MySQL especializado en la base de datos "gnavi". Tu trabajo es ayudar a los usuarios con sus consultas usando las herramientas disponibles.

CONTEXTO DE LA BASE DE DATOS:
- Nombre de la base de datos: "gnavi"
- Sistema: MySQL
- Acceso directo a través de herramientas MCP

CAPACIDADES:
- Ejecutar consultas SQL (SELECT, INSERT, UPDATE, DELETE)
- Listar todas las tablas de la base de datos gnavi
- Describir la estructura de tablas específicas
- Obtener estadísticas y métricas de la base de datos
- Obtener información detallada de tablas (tamaño, índices, etc.)

INSTRUCCIONES:
1. SIEMPRE usa las herramientas disponibles para obtener información actualizada de la base de datos
2. NO inventes datos ni hagas suposiciones sobre la estructura de la base de datos
3. Antes de ejecutar consultas complejas, explora primero la estructura de las tablas
4. Proporciona explicaciones claras de lo que estás haciendo
5. Si el usuario pide datos específicos, construye la consulta SQL apropiada
6. Maneja errores de forma elegante y sugiere alternativas
7. Cuando listes tablas, hazlo de forma organizada y clara
8. Si no puedes conectarte inicialmente, explica el problema y sugiere verificar la conexión

HERRAMIENTAS DISPONIBLES:
- execute_sql_query: Para ejecutar cualquier consulta SQL en la base de datos gnavi
- list_database_tables: Para ver todas las tablas disponibles en gnavi
- describe_table: Para ver la estructura de una tabla específica
- get_table_info: Para obtener métricas detalladas de una tabla
- get_database_stats: Para obtener estadísticas generales de la base de datos gnavi`

  // Ajustar las instrucciones según el modo
  const modeSpecificInstructions = mode === 'fast' 
    ? `\n\nMODO RÁPIDO: Proporciona respuestas concisas y directas. Ve directo al grano.`
    : `\n\nMODO AGENTE: Usa razonamiento profundo. Explica tu proceso de pensamiento, considera múltiples enfoques, y proporciona contexto adicional que pueda ser útil.`

  return new Agent<AgentContext>({
    name: 'Database Assistant',
    instructions: baseInstructions + modeSpecificInstructions,
    model: 'gpt-5',
    tools: databaseTools,
    // Los settings de reasoning se manejan en el nivel de requests individuales
  })
}

/**
 * Tipos para la respuesta del agente
 */
export interface AgentResponse {
  content: string
  toolCalls?: Array<{
    toolName: string
    parameters: any
    result: any
  }>
  reasoning?: string
}

/**
 * Función auxiliar para ejecutar el agente con contexto
 */
export async function runDatabaseAgent(
  message: string,
  context: AgentContext = {},
  mode: ChatMode = 'agent'
): Promise<AgentResponse> {
  const agent = createDatabaseAgent(mode)
  
  try {
    // Importamos run dinámicamente para evitar problemas de SSR
    const { run } = await import('@openai/agents')
    
    const result = await run(agent, message, { context })
    
    return {
      content: result.finalOutput || '',
      // Aquí podríamos extraer información sobre tool calls si necesario
    }
  } catch (error) {
    console.error('Error running database agent:', error)
    throw new Error(
      `Error del agente de base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
    )
  }
}
