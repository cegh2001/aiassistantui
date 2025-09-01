import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/mcp-server/database';
import { TableInfoSchema } from '@/lib/mcp-server/schemas';
import { logger } from '@/lib/mcp-server/logger';
import { z } from 'zod';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    await ensureConnection();
    
    const validated = TableInfoSchema.parse({ table: params.table });
    const structure = await dbManager.describeTable(validated.table);
    
    return NextResponse.json({
      success: true,
      data: structure,
    });
    
  } catch (error) {
    logger.error('Describe table error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid table name',
          details: error.errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
