import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Status } from '@/generated/prisma/client'
import { logEvent } from '@/lib/api-utils'
import { REQUEST_INCLUDE } from '@/lib/constants'

const createRequestSchema = z.object({
  clientName: z.string().min(1, 'Имя клиента обязательно'),
  phone: z.string().min(1, 'Телефон обязателен'),
  address: z.string().min(1, 'Адрес обязателен'),
  problemText: z.string().min(1, 'Описание проблемы обязательно'),
})

// GET /api/requests — список заявок
// Диспетчер видит все, мастер — только свои
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')

  const statusFilter = statusParam && Object.values(Status).includes(statusParam as Status)
    ? { status: statusParam as Status }
    : {}

  const where =
    session.role === 'MASTER'
      ? { assignedTo: session.userId, ...statusFilter }
      : statusFilter

  const requests = await prisma.request.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}

// POST /api/requests — создать заявку (публично, без авторизации)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = createRequestSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Ошибка валидации', details: result.error.issues },
      { status: 400 },
    )
  }

  const newRequest = await prisma.request.create({
    data: result.data,
  })

  await logEvent(newRequest.id, 'created')

  return NextResponse.json(newRequest, { status: 201 })
}
