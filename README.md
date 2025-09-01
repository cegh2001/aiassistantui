# AI Assistant UI con Integración MySQL

Esta aplicación combina una interfaz de asistente de IA construida con Next.js y un servidor MySQL MCP (Model Context Protocol) integrado para operaciones de base de datos.

## Estructura del Proyecto

```
aiassistantui/
├── app/
│   ├── api/database/          # APIs de base de datos
│   │   ├── query/route.ts     # Ejecutar consultas SQL
│   │   ├── tables/route.ts    # Listar tablas
│   │   ├── tables/[table]/
│   │   │   ├── describe/route.ts  # Describir estructura de tabla
│   │   │   └── info/route.ts      # Información detallada de tabla
│   │   └── stats/route.ts     # Estadísticas de base de datos
│   ├── database/page.tsx      # Página del gestor de BD
│   └── ...                    # Otras páginas de la app
├── lib/
│   ├── mcp-server/           # Servidor MCP migrado
│   │   ├── database.ts       # Gestor de base de datos
│   │   ├── logger.ts         # Sistema de logging
│   │   └── schemas.ts        # Validación con Zod
│   ├── hooks/
│   │   └── useDatabase.ts    # Hook para APIs de BD
│   └── i18n/                 # Sistema de internacionalización
├── components/
│   ├── DatabaseManager.tsx   # Componente gestor de BD
│   └── ...                   # Otros componentes
└── .env.example              # Variables de entorno
```

## Características

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
- **Framer Motion**: Animaciones fluidas
- **Dark/Light Mode**: Soporte para temas

## Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
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

## Uso de las APIs

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

## Funcionalidades del Gestor de Base de Datos

Visita `/database` para acceder al gestor integrado que permite:

1. **Ejecutar consultas SQL personalizadas**
2. **Explorar tablas de la base de datos**
3. **Ver estadísticas generales**
4. **Interfaz bilingüe (Inglés/Español)**

## Seguridad

- **Validación de entrada**: Todos los parámetros se validan con Zod
- **Consultas preparadas**: Prevención de inyección SQL
- **Gestión de errores**: Manejo seguro de excepciones
- **Variables de entorno**: Credenciales protegidas

## Migración desde MCP Server

Este proyecto migra la funcionalidad del servidor MCP independiente a una arquitectura integrada de Next.js:

- **Antes**: Servidor MCP standalone con comunicación stdio
- **Ahora**: APIs de Next.js con funcionalidad MCP integrada
- **Ventajas**: 
  - Interfaz web integrada
  - Mejor gestión de estado
  - APIs RESTful familiares
  - Despliegue simplificado

## Desarrollo

### Estructura de Archivos
- `lib/mcp-server/`: Lógica del servidor MCP migrada
- `app/api/database/`: Endpoints de la API REST
- `lib/hooks/`: Hooks personalizados de React
- `components/`: Componentes de UI reutilizables

### Logging
El sistema de logging está configurado para entornos Next.js:
- Desarrollo: Logs detallados en consola
- Producción: Logs filtrados por nivel

### Testing
Para probar las APIs:
```bash
# Listar tablas
curl http://localhost:3000/api/database/tables

# Ejecutar consulta
curl -X POST http://localhost:3000/api/database/query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SHOW TABLES"}'
```

## Solución de Problemas

### Error de Conexión a Base de Datos
1. Verifica que MySQL esté ejecutándose
2. Confirma las credenciales en `.env.local`
3. Asegúrate de que la base de datos existe
4. Revisa los permisos del usuario

### Errores de Hidratación
- Los errores de hidratación han sido resueltos
- Se usa `suppressHydrationWarning` donde es necesario
- Patrones de `useEffect` para estado cliente

### Problemas de TypeScript
- Todas las APIs están tipadas con TypeScript
- Esquemas Zod para validación en tiempo de ejecución
- Tipos exportados para reutilización

## Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request
