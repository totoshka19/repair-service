import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { SessionData } from '@/lib/session'

export function requireRole(
  session: { userId: SessionData['userId']; role: SessionData['role'] },
  role: SessionData['role'],
): NextResponse | null {
  if (!session.userId || session.role !== role) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }
  return null
}

export async function logEvent(
  requestId: string,
  action: string,
  userId?: string,
  comment?: string,
) {
  return prisma.requestEvent.create({
    data: {
      requestId,
      action,
      ...(userId && { userId }),
      ...(comment && { comment }),
    },
  })
}
