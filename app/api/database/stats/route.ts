import { NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/mcp-server/database';
import { logger } from '@/lib/mcp-server/logger';

const dbManager = new DatabaseManager();
let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    try {
      await dbManager.connect();
      isConnected = true;
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw new Error('Database connection failed');
    }
  }
}

export async function GET() {
  try {
    await ensureConnection();
    
    const stats = await dbManager.getDatabaseStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
    
  } catch (error) {
    logger.error('Get database stats error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
