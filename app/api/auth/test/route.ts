import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    return NextResponse.json({ 
      status: 'success',
      authenticated: !!session,
      session: session || null
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false
    }, { status: 500 })
  }
} 