import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/mcp-server/database';
import { QuerySchema } from '@/lib/mcp-server/schemas';
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

export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    
    const body = await request.json();
    const validated = QuerySchema.parse(body);
    
    logger.info(`Executing query: ${validated.sql.substring(0, 100)}...`);
    
    const results = await dbManager.query(validated.sql, validated.params);
    
    return NextResponse.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    logger.error('Query execution error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
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
