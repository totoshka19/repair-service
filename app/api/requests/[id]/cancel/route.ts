import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { requireRole, logEvent } from '@/lib/api-utils'
import { CANCELABLE_STATUSES, REQUEST_INCLUDE } from '@/lib/constants'

// PATCH /api/requests/[id]/cancel — отменить заявку (только DISPATCHER)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const denied = requireRole(session, 'DISPATCHER')
  if (denied) return denied

  const { id } = await params

  const existing = await prisma.request.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
  }
  if (!CANCELABLE_STATUSES.includes(existing.status as typeof CANCELABLE_STATUSES[number])) {
    return NextResponse.json(
      { error: `Нельзя отменить заявку со статусом ${existing.status}` },
      { status: 409 },
    )
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: 'CANCELED' },
    include: REQUEST_INCLUDE,
  })

  await logEvent(id, 'canceled', session.userId)

  return NextResponse.json(updated)
}
