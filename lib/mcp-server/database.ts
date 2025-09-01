import mysql from 'mysql2/promise';
import { logger } from './logger';

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  port: number;
  database: string;
  ssl?: string | mysql.SslOptions;
  connectionLimit?: number;
  waitForConnections?: boolean;
  queueLimit?: number;
}

export class DatabaseManager {
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): DatabaseConfig {
    const sslMode = process.env.MYSQL_SSL_MODE;
    let sslConfig: string | mysql.SslOptions | undefined;
    
    if (sslMode === 'DISABLED') {
      sslConfig = undefined;
    } else if (sslMode === 'REQUIRED') {
      sslConfig = {
        rejectUnauthorized: false
      };
    } else if (sslMode) {
      sslConfig = 'true';
    }

    return {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      database: process.env.MYSQL_DB || '',
      ssl: sslConfig,
      connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
      waitForConnections: true,
      queueLimit: 0,
    };
  }

  async connect(): Promise<void> {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        port: this.config.port,
        database: this.config.database,
        ssl: this.config.ssl,
        connectionLimit: this.config.connectionLimit,
        waitForConnections: this.config.waitForConnections,
        queueLimit: this.config.queueLimit,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      logger.info(`Connected to MySQL database: ${this.config.database}@${this.config.host}:${this.config.port}`);
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Disconnected from database');
    }
  }

  private ensureConnected(): void {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    this.ensureConnected();
    
    try {
      const [rows] = await this.pool!.execute(sql, params);
      return rows as T[];
    } catch (error) {
      logger.error('Query execution failed:', { sql, error });
      throw error;
    }
  }

  async listTables(): Promise<string[]> {
    this.ensureConnected();
    
    const query = `
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    
    const results = await this.query<{ TABLE_NAME: string }>(query);
    return results.map(row => row.TABLE_NAME);
  }

  async describeTable(tableName: string): Promise<any[]> {
    this.ensureConnected();
    
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('Invalid table name');
    }
    
    const query = `DESCRIBE \`${tableName}\``;
    return await this.query(query);
  }

  async getTableInfo(tableName: string): Promise<{
    name: string;
    columns: any[];
    indexes: any[];
    rowCount: number;
    size: string;
  }> {
    this.ensureConnected();
    
    // Validate table name
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('Invalid table name');
    }
    
    // Get columns
    const columns = await this.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);
    
    // Get indexes
    const indexes = await this.query(`
      SELECT 
        INDEX_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX,
        COLUMN_NAME,
        CARDINALITY,
        INDEX_TYPE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [tableName]);
    
    // Get row count
    const [countResult] = await this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM \`${tableName}\``
    );
    
    // Get table size
    const [sizeResult] = await this.query<{ size: string }>(`
      SELECT 
        CONCAT(
          ROUND(
            (DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2
          ), 
          ' MB'
        ) as size
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `, [tableName]);
    
    return {
      name: tableName,
      columns,
      indexes,
      rowCount: countResult.count,
      size: sizeResult?.size || '0 MB',
    };
  }

  async getDatabaseStats(): Promise<{
    database: string;
    tableCount: number;
    totalSize: string;
    tables: Array<{
      name: string;
      rowCount: number;
      size: string;
    }>;
    version: string;
    uptime: string;
  }> {
    this.ensureConnected();
    
    // Get database name
    const [dbResult] = await this.query<{ db: string }>('SELECT DATABASE() as db');
    const database = dbResult.db;
    
    // Get tables with stats
    const tables = await this.query<{
      TABLE_NAME: string;
      TABLE_ROWS: number;
      size: string;
    }>(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        CONCAT(
          ROUND(
            (DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2
          ), 
          ' MB'
        ) as size
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `);
    
    // Get total size
    const [totalSizeResult] = await this.query<{ totalSize: string }>(`
      SELECT 
        CONCAT(
          ROUND(
            SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2
          ), 
          ' MB'
        ) as totalSize
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    // Get MySQL version
    const [versionResult] = await this.query<{ version: string }>('SELECT VERSION() as version');
    
    // Get uptime
    const [uptimeResult] = await this.query<{ uptime: string }>(`
      SELECT 
        CONCAT(
          FLOOR(VARIABLE_VALUE / 86400), ' days, ',
          FLOOR((VARIABLE_VALUE % 86400) / 3600), ' hours'
        ) as uptime
      FROM performance_schema.global_status
      WHERE VARIABLE_NAME = 'Uptime'
    `);
    
    return {
      database,
      tableCount: tables.length,
      totalSize: totalSizeResult.totalSize || '0 MB',
      tables: tables.map(t => ({
        name: t.TABLE_NAME,
        rowCount: t.TABLE_ROWS,
        size: t.size,
      })),
      version: versionResult.version,
      uptime: uptimeResult?.uptime || 'Unknown',
    };
  }

  // Transaction support
  async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    this.ensureConnected();
    
    const connection = await this.pool!.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Batch operations
  async batchInsert(
    tableName: string,
    columns: string[],
    values: any[][]
  ): Promise<void> {
    this.ensureConnected();
    
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('Invalid table name');
    }
    
    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO \`${tableName}\` (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await this.transaction(async (connection) => {
      for (const row of values) {
        await connection.execute(query, row);
      }
    });
  }
}
