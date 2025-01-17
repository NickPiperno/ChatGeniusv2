import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = session.user.sub

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