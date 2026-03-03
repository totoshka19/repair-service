import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// PATCH /api/requests/[id]/take — взять в работу (только MASTER)
// Защита от гонки: атомарный updateMany с двойной проверкой в WHERE
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.userId || session.role !== 'MASTER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

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

  const updated = await prisma.request.findUnique({
    where: { id },
    include: { master: { select: { id: true, username: true } } },
  })

  await prisma.requestEvent.create({
    data: {
      requestId: id,
      userId: session.userId,
      action: 'taken',
    },
  })

  return NextResponse.json(updated)
}
