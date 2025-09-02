/**
 * Constantes para el servicio OpenAI
 */

export const DEFAULT_CONFIG = {
  MODEL: 'gpt-5' as const,
  MAX_OUTPUT_TOKENS: 4000,
  TIMEOUT: 30000,
} as const

export const REASONING_EFFORT = {
  MINIMAL: 'minimal',
  LOW: 'low', 
  MEDIUM: 'medium',
  HIGH: 'high',
} as const

export const VERBOSITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
} as const

export const CHAT_MODES = {
  FAST: 'fast',
  AGENT: 'agent',
} as const

export const DATABASE_KEYWORDS = [
  'base de datos', 'database', 'sql', 'consulta', 'query', 'tabla', 'table', 'tablas',
  'mysql', 'select', 'insert', 'update', 'delete', 'show tables', 'list tables',
  'describe', 'estadísticas', 'stats', 'información', 'info', 'usuarios', 'users',
  'gnavi', 'listar', 'mostrar', 'lista', 'show', 'display'
] as const

export const COMPLEX_KEYWORDS = [
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
] as const

export const PROMPTS = {
  AGENT_MODE: `[MODO AGENTE - Razonamiento Profundo Activado]

Instrucciones especiales:
- Usa tu máxima capacidad de razonamiento
- Proporciona explicaciones detalladas y paso a paso
- Considera múltiples perspectivas y enfoques
- Analiza profundamente antes de responder
- Sé exhaustivo en tu análisis`,

  DATABASE_TOOLS_NOTICE: `
HERRAMIENTAS DE BASE DE DATOS DETECTADAS:
- Tienes acceso a la base de datos MySQL "gnavidb"
- Puedes ejecutar consultas SQL, listar tablas, describir estructuras, etc.
- Usa las herramientas MCP para obtener información actualizada
`,

  DATABASE_AVAILABLE: `[HERRAMIENTAS DE BASE DE DATOS DISPONIBLES]

Tienes acceso a la base de datos MySQL "gnavidb" con herramientas MCP.
Responde de manera concisa pero usa las herramientas cuando sea necesario.`,
} as const
