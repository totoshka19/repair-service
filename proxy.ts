import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { type SessionData, sessionOptions } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // RequestCookies несовместим с CookieStore iron-session по типу set().
  // Адаптер: читаем из request.cookies, пишем в response.cookies.
  const cookies = {
    get: request.cookies.get.bind(request.cookies),
    set: response.cookies.set.bind(response.cookies),
    delete: response.cookies.delete.bind(response.cookies),
  }

  const session = await getIronSession<SessionData>(cookies, sessionOptions)

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

  return response
}

export const config = {
  matcher: ['/dispatcher/:path*', '/master/:path*', '/api/requests/:path+'],
}
