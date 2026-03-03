import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function loginAs(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.headers.get('set-cookie') ?? ''
}

describe('Создание заявки', () => {
  it('создаёт заявку и возвращает статус NEW', async () => {
    const res = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Иван Иванов',
        phone: '+7 900 000-00-00',
        address: 'ул. Тестовая, д. 1',
        problemText: 'Сломался кран на кухне',
      }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('NEW')
    expect(data.assignedTo).toBeNull()
  })

  it('отклоняет заявку без обязательных полей', async () => {
    const res = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: 'Иван' }), // нет phone, address, problemText
    })

    expect(res.status).toBe(400)
  })
})

describe('Диспетчер: назначение мастера', () => {
  it('диспетчер может назначить мастера на заявку', async () => {
    const cookie = await loginAs('dispatcher', 'disp123')

    // Получаем заявку в статусе NEW
    const listRes = await fetch(`${BASE_URL}/api/requests?status=NEW`, {
      headers: { Cookie: cookie },
    })
    const { requests } = await listRes.json()
    expect(requests.length).toBeGreaterThan(0)
    const requestId = requests[0].id

    // Получаем список мастеров
    const usersRes = await fetch(`${BASE_URL}/api/users?role=MASTER`, {
      headers: { Cookie: cookie },
    })
    const { users } = await usersRes.json()
    const masterId = users[0].id

    // Назначаем мастера
    const res = await fetch(`${BASE_URL}/api/requests/${requestId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ masterId }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ASSIGNED')
    expect(data.assignedTo).toBe(masterId)
  })
})

describe('Мастер: переходы статусов', () => {
  it('мастер завершает заявку: ASSIGNED → IN_PROGRESS → DONE', async () => {
    const dispCookie = await loginAs('dispatcher', 'disp123')
    const masterCookie = await loginAs('master1', 'master123')

    // Создаём свежую заявку
    const createRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Тест Тестов',
        phone: '+7 999 000-00-00',
        address: 'ул. Проверки, д. 2',
        problemText: 'Не работает розетка',
      }),
    })
    const newRequest = await createRes.json()

    // Диспетчер получает master1
    const usersRes = await fetch(`${BASE_URL}/api/users?role=MASTER`, {
      headers: { Cookie: dispCookie },
    })
    const { users } = await usersRes.json()
    const master1 = users.find((u: { username: string }) => u.username === 'master1')

    // Диспетчер назначает master1
    await fetch(`${BASE_URL}/api/requests/${newRequest.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: dispCookie },
      body: JSON.stringify({ masterId: master1.id }),
    })

    // Мастер берёт в работу
    const takeRes = await fetch(`${BASE_URL}/api/requests/${newRequest.id}/take`, {
      method: 'PATCH',
      headers: { Cookie: masterCookie },
    })
    expect(takeRes.status).toBe(200)

    // Мастер завершает
    const doneRes = await fetch(`${BASE_URL}/api/requests/${newRequest.id}/complete`, {
      method: 'PATCH',
      headers: { Cookie: masterCookie },
    })
    expect(doneRes.status).toBe(200)
    const done = await doneRes.json()
    expect(done.status).toBe('DONE')
  })
})
