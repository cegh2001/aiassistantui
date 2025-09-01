import { useState, useCallback } from 'react';

interface DatabaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

interface QueryParams {
  sql: string;
  params?: (string | number | boolean | null)[];
}

export function useDatabase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async (queryParams: QueryParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryParams),
      });
      
      const result: DatabaseResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/database/tables');
      const result: DatabaseResponse<string[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to list tables');
      }
      
      return result.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const describeTable = useCallback(async (tableName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/database/tables/${tableName}/describe`);
      const result: DatabaseResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to describe table');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTableInfo = useCallback(async (tableName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/database/tables/${tableName}/info`);
      const result: DatabaseResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get table info');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDatabaseStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/database/stats');
      const result: DatabaseResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get database stats');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    executeQuery,
    listTables,
    describeTable,
    getTableInfo,
    getDatabaseStats,
  };
}
