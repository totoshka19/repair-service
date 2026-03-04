import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const FAKE_ID = '00000000-0000-0000-0000-000000000000'

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

async function getDispatcherId(dispCookie: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: dispCookie },
  })
  const { users } = await res.json()
  return users.find((u: { role: string }) => u.role === 'DISPATCHER').id
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

// ─── Общие данные ───────────────────────────────────────────────────────────

let dispCookie: string
let master1Cookie: string
let master1Id: string
let dispatcherId: string

beforeAll(async () => {
  dispCookie = await loginAs('dispatcher', 'disp123')
  master1Cookie = await loginAs('master1', 'master123')
  master1Id = await getMasterId(dispCookie, 'master1')
  dispatcherId = await getDispatcherId(dispCookie)
})

// ─── Несуществующие ресурсы ────────────────────────────────────────────────

describe('Несуществующие ресурсы', () => {
  it('/assign с несуществующим requestId → 404', async () => {
    const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: master1Id }),
    })

    expect(res.status).toBe(404)
  })

  it('/complete с несуществующим requestId → 404', async () => {
    const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/complete`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie },
    })

    expect(res.status).toBe(404)
  })

  // /take не делает findUnique до UPDATE — несуществующий ID даёт count=0 → 409
  it('/take с несуществующим requestId → 409 (атомарный updateMany не находит строку)', async () => {
    const res = await fetch(`${BASE_URL}/api/requests/${FAKE_ID}/take`, {
      method: 'PATCH',
      headers: { Cookie: master1Cookie },
    })

    expect(res.status).toBe(409)
  })
})

// ─── /assign: невалидный masterId ──────────────────────────────────────────

describe('/assign: граничные случаи masterId', () => {
  it('без masterId → 400', async () => {
    const id = await createRequest()

    const res = await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })

  it('несуществующий masterId → 404', async () => {
    const id = await createRequest()

    const res = await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: FAKE_ID }),
    })

    expect(res.status).toBe(404)
  })

  it('ID диспетчера вместо мастера → 404', async () => {
    const id = await createRequest()

    const res = await fetch(`${BASE_URL}/api/requests/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: dispatcherId }),
    })

    expect(res.status).toBe(404)
  })
})

// ─── GET /api/requests: фильтр по статусу ──────────────────────────────────

describe('GET /api/requests: фильтр по статусу', () => {
  it('?status=NEW возвращает только NEW заявки', async () => {
    const res = await fetch(`${BASE_URL}/api/requests?status=NEW`, {
      headers: { Cookie: dispCookie },
    })

    expect(res.status).toBe(200)
    const { requests } = await res.json()
    for (const req of requests) {
      expect(req.status).toBe('NEW')
    }
  })

  it('?status=ASSIGNED возвращает только ASSIGNED заявки', async () => {
    const res = await fetch(`${BASE_URL}/api/requests?status=ASSIGNED`, {
      headers: { Cookie: dispCookie },
    })

    expect(res.status).toBe(200)
    const { requests } = await res.json()
    for (const req of requests) {
      expect(req.status).toBe('ASSIGNED')
    }
  })

  it('невалидный статус игнорируется — в ответе заявки разных статусов', async () => {
    const res = await fetch(`${BASE_URL}/api/requests?status=INVALID_STATUS`, {
      headers: { Cookie: dispCookie },
    })

    expect(res.status).toBe(200)
    const { requests } = await res.json()

    // Если фильтр сработал — вернулось бы 0 результатов или только один статус.
    // Если проигнорирован — в ответе заявки с разными статусами.
    const statuses = new Set(requests.map((r: { status: string }) => r.status))
    expect(statuses.size).toBeGreaterThan(1)
  })
})

// ─── GET /api/users: фильтр по роли ───────────────────────────────────────

describe('GET /api/users: фильтр по роли', () => {
  it('?role=MASTER возвращает только мастеров', async () => {
    const res = await fetch(`${BASE_URL}/api/users?role=MASTER`, {
      headers: { Cookie: dispCookie },
    })

    expect(res.status).toBe(200)
    const { users } = await res.json()
    expect(users.length).toBeGreaterThan(0)
    for (const user of users) {
      expect(user.role).toBe('MASTER')
    }
  })

  it('?role=DISPATCHER возвращает только диспетчеров', async () => {
    const res = await fetch(`${BASE_URL}/api/users?role=DISPATCHER`, {
      headers: { Cookie: dispCookie },
    })

    expect(res.status).toBe(200)
    const { users } = await res.json()
    expect(users.length).toBeGreaterThan(0)
    for (const user of users) {
      expect(user.role).toBe('DISPATCHER')
    }
  })

  it('без фильтра возвращает всех пользователей', async () => {
    const allRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: dispCookie },
    })
    const { users: all } = await allRes.json()

    const masterRes = await fetch(`${BASE_URL}/api/users?role=MASTER`, {
      headers: { Cookie: dispCookie },
    })
    const { users: masters } = await masterRes.json()

    // Всех больше чем только мастеров
    expect(all.length).toBeGreaterThan(masters.length)
  })
})

// ─── POST /api/requests: создание заявки ───────────────────────────────────

describe('POST /api/requests: граничные случаи', () => {
  it('пустые строки в обязательных полях → 400', async () => {
    const res = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: '',
        phone: '',
        address: '',
        problemText: '',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('лишние поля игнорируются, заявка создаётся', async () => {
    const res = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Иван',
        phone: '+7 900 000-00-00',
        address: 'ул. Тестовая, д. 1',
        problemText: 'Описание',
        unknownField: 'should be ignored',
        status: 'DONE', // попытка подменить статус
      }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('NEW') // статус всегда NEW при создании
  })
})
