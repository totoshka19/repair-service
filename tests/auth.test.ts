import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function loginAs(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return { res, cookie: res.headers.get('set-cookie') ?? '' }
}

describe('POST /api/auth/login', () => {
  it('успешный вход диспетчера возвращает 200 и данные пользователя', async () => {
    const { res } = await loginAs('dispatcher', 'disp123')

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.username).toBe('dispatcher')
    expect(data.role).toBe('DISPATCHER')
    expect(data.userId).toBeDefined()
  })

  it('успешный вход мастера возвращает роль MASTER', async () => {
    const { res } = await loginAs('master1', 'master123')

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.role).toBe('MASTER')
  })

  it('неверный пароль возвращает 401', async () => {
    const { res } = await loginAs('dispatcher', 'wrongpassword')

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('несуществующий пользователь возвращает 401', async () => {
    const { res } = await loginAs('nobody', 'anypassword')

    expect(res.status).toBe(401)
  })

  it('отсутствие логина возвращает 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'disp123' }),
    })

    expect(res.status).toBe(400)
  })

  it('отсутствие пароля возвращает 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dispatcher' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  it('без сессии возвращает 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`)

    expect(res.status).toBe(401)
  })

  it('с валидной сессией возвращает данные текущего пользователя', async () => {
    const { cookie } = await loginAs('dispatcher', 'disp123')

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.username).toBe('dispatcher')
    expect(data.role).toBe('DISPATCHER')
    expect(data.userId).toBeDefined()
  })

  it('мастер получает корректную роль MASTER', async () => {
    const { cookie } = await loginAs('master1', 'master123')

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.role).toBe('MASTER')
    expect(data.username).toBe('master1')
  })
})

describe('POST /api/auth/logout', () => {
  it('логаут возвращает success: true', async () => {
    const { cookie } = await loginAs('dispatcher', 'disp123')

    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('после логаута сессия недействительна', async () => {
    const { cookie } = await loginAs('master1', 'master123')

    // Логаут — iron-session устанавливает очищенную куку в Set-Cookie ответа
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    const clearedCookie = logoutRes.headers.get('set-cookie') ?? ''

    // /me с очищенной кукой должен вернуть 401
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: clearedCookie },
    })
    expect(meRes.status).toBe(401)
  })
})
