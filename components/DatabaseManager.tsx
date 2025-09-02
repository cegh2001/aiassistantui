'use client';

import { useState } from 'react';
import { useDatabase } from '@/lib/hooks/useDatabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Table, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DatabaseManager() {
  const { language } = useLanguage();
  const { 
    loading, 
    error, 
    executeQuery, 
    listTables, 
    getDatabaseStats 
  } = useDatabase();
  
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);

  const texts = {
    en: {
      title: 'Database Manager',
      description: 'Execute SQL queries and manage your MySQL database',
      sqlQuery: 'SQL Query',
      execute: 'Execute Query',
      tables: 'Database Tables',
      stats: 'Database Statistics',
      loadTables: 'Load Tables',
      loadStats: 'Load Statistics',
      placeholder: 'Enter your SQL query here...',
      result: 'Query Result',
      noResult: 'No result to display',
      error: 'Error'
    },
    es: {
      title: 'Gestor de Base de Datos',
      description: 'Ejecuta consultas SQL y gestiona tu base de datos MySQL',
      sqlQuery: 'Consulta SQL',
      execute: 'Ejecutar Consulta',
      tables: 'Tablas de la Base de Datos',
      stats: 'Estadísticas de la Base de Datos',
      loadTables: 'Cargar Tablas',
      loadStats: 'Cargar Estadísticas',
      placeholder: 'Ingresa tu consulta SQL aquí...',
      result: 'Resultado de la Consulta',
      noResult: 'No hay resultado para mostrar',
      error: 'Error'
    }
  };

  const t = texts[language as keyof typeof texts];

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    try {
      const result = await executeQuery({ sql: sqlQuery });
      setQueryResult(result);
    } catch (err) {
      console.error('Query execution failed:', err);
    }
  };

  const handleLoadTables = async () => {
    try {
      const tableList = await listTables();
      setTables(tableList);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  };

  const handleLoadStats = async () => {
    try {
      const dbStats = await getDatabaseStats();
      setStats(dbStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t.title}</h1>
      </div>
      
      <p className="text-muted-foreground">{t.description}</p>

      {/* SQL Query Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t.sqlQuery}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={t.placeholder}
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="min-h-[100px] font-mono"
          />
          <Button 
            onClick={handleExecuteQuery} 
            disabled={loading || !sqlQuery.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.execute}...
              </>
            ) : (
              t.execute
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t.error}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Query Result */}
      {queryResult && (
        <Card>
          <CardHeader>
            <CardTitle>{t.result}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(queryResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tables Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              {t.tables}
            </CardTitle>
            <CardDescription>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLoadTables}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.loadTables}...
                  </>
                ) : (
                  t.loadTables
                )}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tables.map((table) => (
                  <Badge key={table} variant="secondary">
                    {table}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t.noResult}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t.stats}
            </CardTitle>
            <CardDescription>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLoadStats}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.loadStats}...
                  </>
                ) : (
                  t.loadStats
                )}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(stats, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">{t.noResult}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
