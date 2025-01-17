import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    // TODO: Implement search logic
    return NextResponse.json([])
  } catch (error) {
    console.error('[SEARCH]', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 