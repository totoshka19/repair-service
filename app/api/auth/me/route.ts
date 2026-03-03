import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()

  if (!session.userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  return NextResponse.json({
    userId: session.userId,
    username: session.username,
    role: session.role,
  })
}
