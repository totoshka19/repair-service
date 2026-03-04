import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { requireRole, logEvent } from '@/lib/api-utils'
import { REQUEST_INCLUDE } from '@/lib/constants'

// PATCH /api/requests/[id]/take — взять в работу (только MASTER)
// Защита от гонки: атомарный updateMany с двойной проверкой в WHERE
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const denied = requireRole(session, 'MASTER')
  if (denied) return denied

  const { id } = await params

  // Атомарный UPDATE: обе проверки (status и assignedTo) — в одном запросе.
  // Если другой мастер уже взял заявку — count будет 0.
  const result = await prisma.request.updateMany({
    where: {
      id,
      status: 'ASSIGNED',
      assignedTo: session.userId,
    },
    data: { status: 'IN_PROGRESS' },
  })

  if (result.count === 0) {
    return NextResponse.json(
      { error: 'Заявка уже взята или недоступна' },
      { status: 409 },
    )
  }

  const updated = await prisma.request.findUnique({ where: { id }, include: REQUEST_INCLUDE })

  await logEvent(id, 'taken', session.userId)

  return NextResponse.json(updated)
}
