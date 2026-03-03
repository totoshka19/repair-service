import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { type SessionData, sessionOptions } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const session = await getIronSession<SessionData>(request.cookies, sessionOptions)

  if (!session.userId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/dispatcher') && session.role !== 'DISPATCHER') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/master') && session.role !== 'MASTER') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dispatcher/:path*', '/master/:path*', '/api/requests/:path+'],
}
