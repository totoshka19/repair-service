import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Укажите логин и пароль' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({ where: { username } })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: 'Неверный логин или пароль' },
      { status: 401 },
    )
  }

  const session = await getSession()
  session.userId = user.id
  session.username = user.username
  session.role = user.role
  await session.save()

  return NextResponse.json({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
}
