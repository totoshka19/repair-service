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
      clientName: 'Тест',
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

// ─── Общие данные для всех тестов ──────────────────────────────────────────

let dispCookie: string
let master1Cookie: string
let master2Cookie: string
let master1Id: string
let master2Id: string

beforeAll(async () => {
  dispCookie = await loginAs('dispatcher', 'disp123')
  master1Cookie = await loginAs('master1', 'master123')
  master2Cookie = await loginAs('master2', 'master123')
  master1Id = await getMasterId(dispCookie, 'master1')
  master2Id = await getMasterId(dispCookie, 'master2')
})

// ─── /assign ───────────────────────────────────────────────────────────────

describe('Переход статусов: /assign (только из NEW)', () => {
  it('нельзя назначить мастера на ASSIGNED заявку → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)

    const res = await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: master2Id }),
    })

    expect(res.status).toBe(409)
  })

  it('нельзя назначить мастера на IN_PROGRESS заявку → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)
    await takeRequest(master1Cookie, id)

    const res = await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: master2Id }),
    })

    expect(res.status).toBe(409)
  })

  it('нельзя назначить мастера на CANCELED заявку → 409', async () => {
    const id = await createRequest()
    await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
      method: 'PATCH',
      headers: { Cookie: dispCookie },
    })

    const res = await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: master1Id }),
    })

    expect(res.status).toBe(409)
  })
})

// ─── /cancel ───────────────────────────────────────────────────────────────

describe('Переход статусов: /cancel (только из NEW и ASSIGNED)', () => {
  it('нельзя отменить IN_PROGRESS заявку → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)
    await takeRequest(master1Cookie, id)

    const res = await fetch(`${BASE_URL}/api/requests/${id}/cancel`, {
      method: 'PATCH',
      headers: { Cookie: dispCookie },
    })

    expect(res.status).toBe(409)
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
})

// ─── /take ─────────────────────────────────────────────────────────────────

describe('Переход статусов: /take (только из ASSIGNED, только своя заявка)', () => {
  it('нельзя взять NEW заявку → 409', async () => {
    const id = await createRequest()

    // Назначаем на master1, чтобы мастер мог делать запрос
    await assignRequest(dispCookie, id, master1Id)

    // Берём в работу — успех
    await takeRequest(master1Cookie, id)

    // Создаём ещё одну в статусе NEW и пробуем взять
    const newId = await createRequest()
    const res = await fetch(`${BASE_URL}/api/requests/${newId}/take`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie },
    })

    expect(res.status).toBe(409)
  })

  it('нельзя взять заявку, назначенную на другого мастера → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master2Id) // назначена на master2

    const res = await fetch(`${BASE_URL}/api/requests/${id}/take`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie }, // пытается взять master1
    })

    expect(res.status).toBe(409)
  })

  it('нельзя взять IN_PROGRESS заявку повторно → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)
    await takeRequest(master1Cookie, id)

    const res = await fetch(`${BASE_URL}/api/requests/${id}/take`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie },
    })

    expect(res.status).toBe(409)
  })
})

// ─── /complete ─────────────────────────────────────────────────────────────

describe('Переход статусов: /complete (только из IN_PROGRESS, только своя заявка)', () => {
  it('нельзя завершить ASSIGNED заявку → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)

    const res = await fetch(`${BASE_URL}/api/requests/${id}/complete`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie },
    })

    expect(res.status).toBe(409)
  })

  it('нельзя завершить чужую IN_PROGRESS заявку → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)
    await takeRequest(master1Cookie, id) // master1 взял

    const res = await fetch(`${BASE_URL}/api/requests/${id}/complete`, {
      method: 'PATCH',
      headers: { Cookie: master2Cookie }, // master2 пытается завершить
    })

    expect(res.status).toBe(409)
  })

  it('нельзя завершить уже DONE заявку → 409', async () => {
    const id = await createRequest()
    await assignRequest(dispCookie, id, master1Id)
    await takeRequest(master1Cookie, id)
    await completeRequest(master1Cookie, id)

    const res = await fetch(`${BASE_URL}/api/requests/${id}/complete`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie },
    })

    expect(res.status).toBe(409)
  })
})
