# AI Assistant UI con OpenAI GPT-5 y MCP MySQL

Esta aplicación es un asistente de IA avanzado construido con Next.js que integra OpenAI GPT-5 con capacidades de base de datos MySQL a través del protocolo MCP (Model Context Protocol) usando únicamente la **Responses API**.

## Características

### 🤖 Asistente IA con OpenAI GPT-5
- **Dual Mode**: Modo rápido para conversaciones generales y modo agente para tareas de razonamiento complejo
- **Detección Automática**: Activación inteligente del modo agente basada en palabras clave de complejidad y análisis
- **GPT-5 Integration**: Acceso completo a las capacidades más avanzadas de OpenAI con razonamiento adaptativo
- **Reasoning Display**: Visualización opcional del proceso de razonamiento del modelo

### 📡 Sistema MCP (Model Context Protocol) Integrado
- **Native Tools**: Herramientas MCP integradas directamente en la Responses API de GPT-5
- **Direct Integration**: Las tools están integradas directamente en la API de Responses para máximo rendimiento
- **Seamless Switching**: Cambio automático entre modos sin intervención del usuario
- **Improved Performance**: Mejor rendimiento al usar únicamente la Responses API

### 🗃️ Funcionalidad de Base de Datos
- **Ejecutor de consultas SQL**: Interfaz para ejecutar consultas personalizadas
- **Explorador de tablas**: Lista y examina la estructura de las tablas
- **Estadísticas de BD**: Información general sobre la base de datos
- **Validación**: Esquemas Zod para entrada segura de datos
- **Pool de conexiones**: Gestión eficiente de conexiones MySQL

### 🌐 Interfaz Multiidioma
- **Inglés/Español**: Cambio de idioma en tiempo real
- **Persistencia**: El idioma seleccionado se guarda en localStorage
- **Contexto React**: Sistema de gestión de estado centralizado

### 🎨 UI/UX Moderna
- **Tailwind CSS**: Diseño responsivo y moderno
- **Radix UI**: Componentes accesibles y reutilizables
- **Dark/Light Mode**: Soporte para temas
- **Chat Interface**: Interfaz de chat moderna con indicadores de estado

## Estructura del Proyecto

```
aiassistantui/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # API principal de chat OpenAI GPT-5
│   │   └── database/             # APIs de base de datos
│   ├── layout.tsx               # Layout principal con providers
│   └── page.tsx                 # Página principal del chat
├── lib/
│   ├── services/               # Servicios principales
│   │   ├── openai.ts          # Cliente OpenAI con Responses API
│   │   └── openai/            # Módulos refactorizados
│   │       ├── types.ts       # Tipos e interfaces
│   │       ├── detectors.ts   # Detectores de modo y herramientas
│   │       ├── prompts.ts     # Procesamiento de prompts
│   │       ├── tools.ts       # Herramientas MCP
│   │       ├── logger.ts      # Logger optimizado
│   │       └── index.ts       # Exports
│   ├── mcp-server/           # Servidor MCP integrado
│   │   ├── database.ts       # Gestor de base de datos
│   │   ├── logger.ts         # Sistema de logging
│   │   └── schemas.ts        # Validación con Zod
│   └── hooks/                # Hooks personalizados
└── components/               # Componentes UI
```

## Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
# Configuración OpenAI
OPENAI_API_KEY=tu_api_key_de_openai

# Configuración de Base de Datos MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=tu_usuario
MYSQL_PASSWORD=tu_contraseña
MYSQL_DB=tu_base_de_datos

# Configuración SSL (opcional)
MYSQL_SSL_MODE=DISABLED

# Configuración del Pool de Conexiones
MYSQL_CONNECTION_LIMIT=10

# Nivel de Logging
LOG_LEVEL=info
```

### 2. Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Uso del Sistema

### Chat con IA
La aplicación funciona como un asistente de IA inteligente con razonamiento adaptativo:

```typescript
// El sistema detecta automáticamente tareas complejas que requieren modo agente
"Analiza paso a paso cómo optimizar esta consulta SQL" // → Activa modo agente con razonamiento profundo
"¿Cuántas tablas hay en la base de datos gnavidb?" // → Activa modo agente + tools MCP
"Hola, ¿cómo estás?" // → Usa modo rápido con razonamiento mínimo

// También puedes cambiar manualmente entre modos
// Modo Fast: Conversaciones generales rápidas (reasoning: minimal)
// Modo Agent: Tareas complejas con razonamiento profundo (reasoning: high) + herramientas cuando sea necesario
```

### API de Chat con Responses API

```typescript
// POST /api/chat
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '¿Puedes mostrarme las tablas de la base de datos?' }
    ],
    options: {
      model: 'gpt-5',
      mode: 'agent' // o 'fast'
    }
  })
});

const { content, reasoning, usage } = await response.json();
```

### Herramientas MCP Integradas (Activación Automática)
- `execute_sql_query`: Ejecuta consultas SQL cuando se detectan consultas de base de datos
- `list_database_tables`: Lista tablas automáticamente cuando es relevante
- `describe_table`: Describe estructura cuando se analiza una tabla específica
- `get_database_stats`: Obtiene estadísticas cuando se requiere análisis de rendimiento

## Arquitectura del Sistema

### OpenAI GPT-5 Integration
- **Pure Responses API**: Sistema completamente basado en la Responses API para máximo rendimiento
- **Native MCP Tools**: Herramientas de base de datos integradas directamente en GPT-5
- **Automatic Detection**: Sistema inteligente que detecta cuándo usar herramientas de base de datos
- **Modular Architecture**: Código refactorizado en módulos especializados para mejor mantenibilidad

### Módulos Refactorizados
- **types.ts**: Interfaces y tipos TypeScript centralizados
- **detectors.ts**: Lógica de detección de modo y herramientas
- **prompts.ts**: Procesamiento y optimización de prompts
- **tools.ts**: Definición de herramientas MCP
- **logger.ts**: Sistema de logging optimizado para debugging

### Database Layer con MCP Tools Integradas
- **Direct Tool Execution**: Las herramientas MCP se ejecutan directamente en GPT-5
- **Connection Pooling**: Pool de conexiones MySQL optimizado
- **Schema Validation**: Validación Zod para todas las operaciones
- **Native Integration**: GPT-5 maneja directamente las llamadas a herramientas de base de datos

## Dependencias Principales

```json
{
  "openai": "latest",                // Cliente OpenAI GPT-5 con Responses API
  "mysql2": "latest",                // Driver MySQL
  "zod": "latest",                   // Validación de esquemas
  "next": "15.5.2",                  // Framework React
  "@radix-ui/react-*": "latest"      // Componentes UI
}
```

## Seguridad

- **Validación de entrada**: Todos los parámetros se validan con Zod
- **Consultas preparadas**: Prevención de inyección SQL
- **Gestión de errores**: Manejo seguro de excepciones
- **Variables de entorno**: Credenciales protegidas

## Solución de Problemas

### Error de Conexión OpenAI
1. Verifica que `OPENAI_API_KEY` esté configurada correctamente
2. Confirma acceso a modelos GPT-5 y Responses API en tu cuenta OpenAI
3. Revisa los límites de rate limiting de tu API key

### Error de Conexión a Base de Datos
1. Verifica que MySQL esté ejecutándose
2. Confirma las credenciales en `.env.local`
3. Asegúrate de que la base de datos existe
4. Revisa los permisos del usuario

### Problemas con Herramientas MCP
1. Las herramientas están integradas nativamente en GPT-5 via Responses API
2. Revisa los logs para errores específicos de las tools
3. El sistema incluye logging detallado para debugging
4. Verifica que el formato de herramientas sea compatible con Responses API

## Logging y Debugging

El sistema incluye logging comprehensivo:
- Detección de herramientas MCP
- Requests y responses de la API
- Errores detallados con stack traces
- Advertencias cuando las herramientas no se ejecutan

## Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request
