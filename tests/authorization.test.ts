import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// Несуществующий UUID — роль проверяется до обращения к БД,
// поэтому 403 вернётся раньше, чем придёт 404
const FAKE_ID = '00000000-0000-0000-0000-000000000000'

async function loginAs(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.headers.get('set-cookie') ?? ''
}

describe('Авторизация: эндпоинты только для DISPATCHER', () => {
  describe('PATCH /api/requests/[id]/assign', () => {
    it('мастер получает 403', async () => {
      const cookie = await loginAs('master1', 'master123')

      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ masterId: FAKE_ID }),
      })

      expect(res.status).toBe(403)
    })

    it('неавторизованный получает 401 (перехват middleware)', async () => {
      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterId: FAKE_ID }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/requests/[id]/cancel', () => {
    it('мастер получает 403', async () => {
      const cookie = await loginAs('master1', 'master123')

      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('неавторизованный получает 401 (перехват middleware)', async () => {
      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/cancel`, {
        method: 'PATCH',
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/users', () => {
    it('мастер получает 403', async () => {
      const cookie = await loginAs('master1', 'master123')

      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('неавторизованный получает 403', async () => {
      const res = await fetch(`${BASE_URL}/api/users`)

      expect(res.status).toBe(403)
    })

    it('диспетчер получает список пользователей', async () => {
      const cookie = await loginAs('dispatcher', 'disp123')

      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data.users)).toBe(true)
    })
  })
})

describe('Авторизация: эндпоинты только для MASTER', () => {
  describe('PATCH /api/requests/[id]/take', () => {
    it('диспетчер получает 403', async () => {
      const cookie = await loginAs('dispatcher', 'disp123')

      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/take`, {
        method: 'PATCH',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('неавторизованный получает 401 (перехват middleware)', async () => {
      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/take`, {
        method: 'PATCH',
      })

      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/requests/[id]/complete', () => {
    it('диспетчер получает 403', async () => {
      const cookie = await loginAs('dispatcher', 'disp123')

      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/complete`, {
        method: 'PATCH',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('неавторизованный получает 401 (перехват middleware)', async () => {
      const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/complete`, {
        method: 'PATCH',
      })

      expect(res.status).toBe(401)
    })
  })
})

describe('Авторизация: GET /api/requests', () => {
  it('неавторизованный получает 401', async () => {
    const res = await fetch(`${BASE_URL}/api/requests`)

    expect(res.status).toBe(401)
  })

  it('диспетчер видит все заявки', async () => {
    const cookie = await loginAs('dispatcher', 'disp123')

    const res = await fetch(`${BASE_URL}/api/requests`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.requests)).toBe(true)
  })

  it('мастер видит только свои заявки', async () => {
    const cookie = await loginAs('master1', 'master123')

    const res = await fetch(`${BASE_URL}/api/requests`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
    const { requests } = await res.json()
    // Все возвращённые заявки должны быть назначены на master1
    const masterRes = await fetch(`${BASE_URL}/api/users?role=MASTER`, {
      headers: { Cookie: await loginAs('dispatcher', 'disp123') },
    })
    const { users } = await masterRes.json()
    const master1 = users.find((u: { username: string }) => u.username === 'master1')

    for (const req of requests) {
      expect(req.assignedTo).toBe(master1.id)
    }
  })
})
