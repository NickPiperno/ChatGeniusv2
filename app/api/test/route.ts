import { NextResponse } from 'next/server'

export async function GET() {
  console.log('Test endpoint called')
  return NextResponse.json({ status: 'ok' })
} 