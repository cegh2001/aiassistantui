import { NextRequest, NextResponse } from 'next/server'
import OpenAIService from '@/lib/services/openai'

export async function GET(request: NextRequest) {
  try {
    // Verificar solo la configuración sin hacer peticiones a OpenAI
    const isConfigured = OpenAIService.isConfigured()
    
    return NextResponse.json({
      success: isConfigured,
      status: isConfigured ? 'OK' : 'NOT_CONFIGURED',
      timestamp: new Date().toISOString(),
      message: isConfigured 
        ? 'OpenAI configurado correctamente' 
        : 'OpenAI API key no configurada'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      error: 'Error verificando estado'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      received: body
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Error procesando petición'
    }, { status: 400 })
  }
}
