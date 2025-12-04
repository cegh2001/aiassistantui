/**
 * Utilities para detectar el ambiente de ejecución (desarrollo/producción)
 * 
 * En producción:
 * - El chat está limitado a 4 respuestas como demo
 * - Las herramientas de BD (MCP) están deshabilitadas (experimental)
 * - El modo agente con esfuerzo máximo SÍ está disponible
 */

/**
 * Detecta si la aplicación está ejecutándose en producción
 * Considera tanto NODE_ENV como la variable ENVIRONMENT_MODE
 * @returns true si está en producción, false en desarrollo
 */
export function isProduction(): boolean {
  // Prioridad: ENVIRONMENT_MODE > NODE_ENV
  const environmentMode = process.env.ENVIRONMENT_MODE?.toLowerCase()
  const nodeEnv = process.env.NODE_ENV?.toLowerCase()
  
  if (environmentMode) {
    return environmentMode === 'production'
  }
  
  return nodeEnv === 'production'
}

/**
 * Obtiene el ambiente actual como string
 * @returns 'production' o 'development'
 */
export function getEnvironment(): 'production' | 'development' {
  return isProduction() ? 'production' : 'development'
}

/**
 * Obtiene la información del ambiente para logging
 * @returns Objeto con detalles del ambiente
 */
export function getEnvironmentInfo() {
  return {
    environment: getEnvironment(),
    nodeEnv: process.env.NODE_ENV,
    environmentMode: process.env.ENVIRONMENT_MODE,
    isDevelopment: !isProduction(),
    isProduction: isProduction(),
  }
}
