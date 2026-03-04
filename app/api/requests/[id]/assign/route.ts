import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { requireRole, logEvent } from '@/lib/api-utils'
import { REQUEST_INCLUDE } from '@/lib/constants'

// PATCH /api/requests/[id]/assign — назначить мастера (только DISPATCHER)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const denied = requireRole(session, 'DISPATCHER')
  if (denied) return denied

  const { id } = await params
  const { masterId } = await request.json()

  if (!masterId) {
    return NextResponse.json({ error: 'Укажите мастера' }, { status: 400 })
  }

  const existing = await prisma.request.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
  }
  if (existing.status !== 'NEW') {
    return NextResponse.json(
      { error: `Нельзя назначить мастера: статус заявки — ${existing.status}` },
      { status: 409 },
    )
  }

  const master = await prisma.user.findUnique({ where: { id: masterId } })
  if (!master || master.role !== 'MASTER') {
    return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: 'ASSIGNED', assignedTo: masterId },
    include: REQUEST_INCLUDE,
  })

  await logEvent(id, 'assigned', session.userId, `Назначен мастер: ${master.username}`)

  return NextResponse.json(updated)
}
