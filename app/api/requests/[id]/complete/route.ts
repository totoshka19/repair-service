import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// PATCH /api/requests/[id]/complete — завершить заявку (только MASTER)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.userId || session.role !== 'MASTER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.request.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
  }
  if (existing.status !== 'IN_PROGRESS' || existing.assignedTo !== session.userId) {
    return NextResponse.json(
      { error: 'Завершить можно только свою заявку в статусе IN_PROGRESS' },
      { status: 409 },
    )
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: 'DONE' },
    include: { master: { select: { id: true, username: true } } },
  })

  await prisma.requestEvent.create({
    data: {
      requestId: id,
      userId: session.userId,
      action: 'completed',
    },
  })

  return NextResponse.json(updated)
}
