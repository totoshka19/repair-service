import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// ─── Хелперы ───────────────────────────────────────────────────────────────

async function loginAs(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.headers.get('set-cookie') ?? ''
}

async function getMasterId(dispCookie: string, username: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users?role=MASTER`, {
    headers: { Cookie: dispCookie },
  })
  const { users } = await res.json()
  return users.find((u: { username: string }) => u.username === username).id
}

async function createRequest(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientName: 'Тест Отмены',
      phone: '+7 900 000-00-00',
      address: 'ул. Тестовая, д. 1',
      problemText: 'Тестовая проблема',
    }),
  })
  const data = await res.json()
  return data.id
}

async function assignRequest(dispCookie: string, id: string, masterId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
    body: JSON.stringify({ masterId }),
  })
}

async function takeRequest(masterCookie: string, id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/requests/${id}/take`, {
    method: 'PATCH',
    headers: { Cookie: masterCookie },
  })
}

async function completeRequest(masterCookie: string, id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/requests/${id}/complete`, {
    method: 'PATCH',
    headers: { Cookie: masterCookie },
  })
}

// ─── Общие данные ───────────────────────────────────────────────────────────

let dispCookie: string
let master1Cookie: string
let master1Id: string

beforeAll(async () => {
  dispCookie = await loginAs('dispatcher', 'disp123')
  master1Cookie = await loginAs('master1', 'master123')
  master1Id = await getMasterId(dispCookie, 'master1')
})

// ─── Тесты ─────────────────────────────────────────────────────────────────

describe('PATCH /api/requests/[id]/cancel', () => {
  describe('успешная отмена', () => {
    it('диспетчер отменяет NEW заявку → статус CANCELED', async () => {
      const id = await createRequest()

      const res = await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: dispCookie },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('CANCELED')
      expect(data.id).toBe(id)
    })

    it('диспетчер отменяет ASSIGNED заявку → статус CANCELED', async () => {
      const id = await createRequest()
      await assignRequest(dispCookie, id, master1Id)

      const res = await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: dispCookie },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('CANCELED')
    })
  })

  describe('недопустимые переходы', () => {
    it('нельзя отменить IN_PROGRESS заявку → 409', async () => {
      const id = await createRequest()
      await assignRequest(dispCookie, id, master1Id)
      await takeRequest(master1Cookie, id)

      const res = await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: dispCookie },
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('нельзя отменить DONE заявку → 409', async () => {
      const id = await createRequest()
      await assignRequest(dispCookie, id, master1Id)
      await takeRequest(master1Cookie, id)
      await completeRequest(master1Cookie, id)

      const res = await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: dispCookie },
      })

      expect(res.status).toBe(409)
    })

    it('нельзя отменить уже CANCELED заявку → 409', async () => {
      const id = await createRequest()
      await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: dispCookie },
      })

      const res = await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: dispCookie },
      })

      expect(res.status).toBe(409)
    })

    it('несуществующая заявка → 404', async () => {
      const res = await fetch(
        `${BASE_URL}/api/requests/00000000-0000-0000-0000-000000000000/cancel`,
        {
          method: 'PATCH',
          headers: { Cookie: dispCookie },
        },
      )

      expect(res.status).toBe(404)
    })
  })
})
