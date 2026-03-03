import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const CANCELABLE_STATUSES = ['NEW', 'ASSIGNED'] as const

// PATCH /api/requests/[id]/cancel — отменить заявку (только DISPATCHER)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.userId || session.role !== 'DISPATCHER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

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
    include: { master: { select: { id: true, username: true } } },
  })

  await prisma.requestEvent.create({
    data: {
      requestId: id,
      userId: session.userId,
      action: 'canceled',
    },
  })

  return NextResponse.json(updated)
}
