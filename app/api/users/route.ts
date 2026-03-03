import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Role } from '@/generated/prisma/client'

// GET /api/users?role=MASTER — список пользователей по роли (только DISPATCHER)
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'DISPATCHER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roleParam = searchParams.get('role')

  const roleFilter =
    roleParam && Object.values(Role).includes(roleParam as Role)
      ? { role: roleParam as Role }
      : {}

  const users = await prisma.user.findMany({
    where: roleFilter,
    select: { id: true, username: true, role: true },
    orderBy: { username: 'asc' },
  })

  return NextResponse.json({ users })
}
