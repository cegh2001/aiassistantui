# AI Assistant UI con OpenAI GPT-5 y MCP MySQL

Esta aplicación es un asistente de IA avanzado construido con Next.js que integra OpenAI GPT-5 con capacidades de base de datos MySQL a través del protocolo MCP (Model Context Protocol).

## Estructura del Proyecto

```
aiassistantui/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # API principal de chat OpenAI GPT-5
│   │   └── database/             # APIs de base de datos
│   │       ├── query/route.ts    # Ejecutar consultas SQL
│   │       ├── tables/route.ts   # Listar tablas
│   │       ├── tables/[table]/
│   │       │   ├── describe/route.ts # Describir estructura de tabla
│   │       │   └── info/route.ts     # Información detallada de tabla
│   │       └── stats/route.ts    # Estadísticas de base de datos
│   ├── layout.tsx               # Layout principal con providers
│   └── page.tsx                 # Página principal del chat
├── lib/
│   ├── services/               # Servicios principales
│   │   ├── openai.ts          # Cliente OpenAI con detección automática MCP
│   │   └── agent.ts           # Sistema de agentes MCP para base de datos
│   ├── tools/                 # Herramientas MCP
│   │   └── database.ts        # Tools de base de datos para agentes
│   ├── mcp-server/           # Servidor MCP integrado
│   │   ├── database.ts       # Gestor de base de datos
│   │   ├── logger.ts         # Sistema de logging
│   │   └── schemas.ts        # Validación con Zod
│   ├── hooks/
│   │   └── useDatabase.ts    # Hook para APIs de BD
│   └── i18n/                 # Sistema de internacionalización
├── components/
│   ├── AIAssistantUI.jsx     # Interfaz principal del asistente
│   ├── ChatModeSelector.tsx  # Selector de modo (fast/agent)
│   ├── ChatPane.jsx          # Panel de conversación
│   ├── Composer.jsx          # Compositor de mensajes
│   └── ...                   # Otros componentes UI
└── .env.example              # Variables de entorno
```

## Características

### 🤖 Asistente IA con OpenAI GPT-5
- **Dual Mode**: Modo rápido para conversaciones generales y modo agente para consultas de base de datos
- **Detección Automática**: Activación inteligente del modo agente basada en palabras clave relacionadas con base de datos
- **GPT-5 Integration**: Acceso completo a las capacidades más avanzadas de OpenAI
- **Reasoning Display**: Visualización opcional del proceso de razonamiento del modelo

### � Sistema MCP (Model Context Protocol)
- **Agentes Especializados**: Agentes automáticos para operaciones de base de datos usando @openai/agents
- **Tools Integration**: Herramientas MCP nativas para consultas SQL, exploración de tablas y estadísticas
- **Seamless Switching**: Cambio automático entre modos sin intervención del usuario
- **Error Handling**: Fallback automático a modo estándar en caso de errores

### �🗃️ Funcionalidad de Base de Datos
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
- **Framer Motion**: Animaciones fluidas
- **Dark/Light Mode**: Soporte para temas
- **Chat Interface**: Interfaz de chat moderna con indicadores de typing y estado

## Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
# Configuración OpenAI
OPENAI_API_KEY=tu_api_key_de_openai

# Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=tu_base_de_datos

# Configuración del Pool de Conexiones
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# Nivel de Logging
LOG_LEVEL=info
```

### 2. Instalación de Dependencias

```bash
npm install
```

### 3. Configuración de MySQL

Asegúrate de tener MySQL ejecutándose y una base de datos creada:

```sql
CREATE DATABASE tu_base_de_datos;
CREATE USER 'tu_usuario'@'localhost' IDENTIFIED BY 'tu_contraseña';
GRANT ALL PRIVILEGES ON tu_base_de_datos.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Ejecutar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Uso del Sistema

### Chat con IA
La aplicación funciona como un asistente de IA inteligente:

```typescript
// El sistema detecta automáticamente consultas de base de datos
"¿Cuántos usuarios hay en la tabla users?" // → Activa modo agente
"Hola, ¿cómo estás?" // → Usa modo rápido

// También puedes cambiar manualmente entre modos
// Modo Fast: Conversaciones generales rápidas
// Modo Agent: Consultas de base de datos con herramientas MCP
```

### API de Chat
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

### APIs de Base de Datos

### Ejecutar Consulta SQL
```typescript
// POST /api/database/query
const response = await fetch('/api/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: 'SELECT * FROM usuarios WHERE activo = ?',
    params: [true]
  })
});
```

### Listar Tablas
```typescript
// GET /api/database/tables
const response = await fetch('/api/database/tables');
const { data: tables } = await response.json();
```

### Usando el Hook personalizado
```tsx
import { useDatabase } from '@/lib/hooks/useDatabase';

function MiComponente() {
  const { executeQuery, listTables, loading, error } = useDatabase();
  
  const handleQuery = async () => {
    try {
      const result = await executeQuery({
        sql: 'SELECT COUNT(*) as total FROM usuarios'
      });
      console.log(result);
    } catch (err) {
      console.error('Error:', err);
    }
  };
}
```

## Funcionalidades Principales

### 1. Chat Inteligente con Detección Automática
- **Palabras clave detectadas**: database, tabla, SQL, consulta, usuarios, etc.
- **Activación automática**: El modo agente se activa sin intervención manual
- **Fallback inteligente**: Si el agente falla, automáticamente usa el modo estándar

### 2. Modos de Operación
- **Fast Mode**: Para conversaciones generales usando GPT-5 estándar
- **Agent Mode**: Para consultas de base de datos con herramientas MCP integradas
- **Manual Override**: Posibilidad de forzar un modo específico

### 3. Herramientas MCP Disponibles
- `execute_sql_query`: Ejecuta consultas SQL personalizadas
- `list_database_tables`: Lista todas las tablas de la base de datos
- `get_database_stats`: Obtiene estadísticas generales de la BD
- `describe_table`: Describe la estructura de una tabla específica
- `get_table_info`: Información detallada de una tabla

## Seguridad

- **Validación de entrada**: Todos los parámetros se validan con Zod
- **Consultas preparadas**: Prevención de inyección SQL
- **Gestión de errores**: Manejo seguro de excepciones
- **Variables de entorno**: Credenciales protegidas

## Arquitectura del Sistema

### OpenAI GPT-5 Integration
- **Client Configuration**: Cliente OpenAI configurado para GPT-5 con support completo
- **Dual Response System**: Responses API para modo rápido y Agents SDK para MCP
- **Automatic Detection**: Sistema inteligente que detecta cuándo usar agentes MCP
- **Error Resilience**: Fallback automático entre modos

### MCP Agent System
- **Database Agent**: Agente especializado con herramientas de base de datos
- **Tool Integration**: Herramientas MCP que usan directamente el DatabaseManager
- **Context Management**: Manejo inteligente del contexto y estado de conversación
- **Performance Optimization**: Lazy loading de agentes para mejor rendimiento

### Database Layer
- **Connection Pooling**: Pool de conexiones MySQL optimizado
- **Direct Integration**: MCP tools acceden directamente al DatabaseManager
- **Schema Validation**: Validación Zod para todas las operaciones
- **Error Handling**: Manejo robusto de errores de base de datos

## Desarrollo

### Estructura de Archivos Clave
- `lib/services/openai.ts`: Cliente OpenAI con detección automática MCP
- `lib/services/agent.ts`: Sistema de agentes MCP para base de datos
- `lib/tools/database.ts`: Herramientas MCP que interfaz con DatabaseManager
- `app/api/chat/route.ts`: API principal de chat que maneja ambos modos
- `components/ChatModeSelector.tsx`: Selector visual de modos
- `components/AIAssistantUI.jsx`: Interfaz principal del chat

### Dependencias Principales
```json
{
  "@openai/agents": "^0.1.0",        // SDK de agentes OpenAI
  "openai": "latest",                // Cliente OpenAI GPT-5
  "mysql2": "latest",                // Driver MySQL
  "zod": "latest"                    // Validación de esquemas
}
```

### Variables de Entorno Requeridas
```bash
OPENAI_API_KEY=          # Requerido para OpenAI GPT-5
DB_HOST=                 # Host de MySQL
DB_USER=                 # Usuario de MySQL  
DB_PASSWORD=             # Contraseña de MySQL
DB_NAME=                 # Nombre de base de datos
```

### Logging
El sistema de logging está configurado para entornos Next.js:
- Desarrollo: Logs detallados en consola
- Producción: Logs filtrados por nivel

### Testing del Sistema
```bash
# Probar el chat API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "¿Cuántas tablas hay en la base de datos?"}],
    "options": {"model": "gpt-5", "mode": "agent"}
  }'

# Probar APIs de base de datos directamente
curl http://localhost:3000/api/database/tables

# Ejecutar consulta SQL
curl -X POST http://localhost:3000/api/database/query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SHOW TABLES"}'
```

### Ejemplo de Uso Completo
```tsx
import { useState } from 'react';
import { ChatMessage, chatWithOpenAI } from '@/lib/services/openai';

function ChatExample() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // El sistema detecta automáticamente si necesita usar agentes MCP
      const response = await chatWithOpenAI([...messages, userMessage], {
        model: 'gpt-5',
        mode: 'auto' // Detección automática
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        id: response.id,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    }

    setInput('');
  };

  return (
    <div>
      {/* Interfaz del chat */}
    </div>
  );
}
```

## Solución de Problemas

### Error de Conexión OpenAI
1. Verifica que `OPENAI_API_KEY` esté configurada correctamente
2. Confirma acceso a modelos GPT-5 en tu cuenta OpenAI
3. Revisa los límites de rate limiting de tu API key

### Error de Conexión a Base de Datos
1. Verifica que MySQL esté ejecutándose
2. Confirma las credenciales en `.env.local`
3. Asegúrate de que la base de datos existe
4. Revisa los permisos del usuario

### Problemas con Agentes MCP
1. Verifica que `@openai/agents` esté instalado correctamente
2. Confirma que las herramientas de base de datos estén disponibles
3. Revisa los logs para errores específicos del agente
4. El sistema debería hacer fallback automático al modo estándar

### Errores de TypeScript
- Todas las APIs están tipadas con TypeScript
- Esquemas Zod para validación en tiempo de ejecución
- Tipos exportados para reutilización

### Problemas de Detección Automática
- El sistema detecta palabras clave en español e inglés
- Keywords incluyen: database, tabla, SQL, consulta, users, etc.
- Puedes forzar un modo específico usando el selector manual

## Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request
