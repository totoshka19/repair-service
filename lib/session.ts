import { getIronSession, type SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  username: string
  role: 'DISPATCHER' | 'MASTER'
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'repair-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

// Динамический импорт next/headers — чтобы этот модуль можно было
// безопасно импортировать из middleware (Edge runtime) без ошибки
export async function getSession() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
