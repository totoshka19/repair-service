import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

/**
 * Тест защиты от гонки при одновременном "взятии в работу".
 *
 * Как запустить вручную:
 *   1. docker compose up -d
 *   2. npx vitest run tests/race-condition.test.ts
 *
 * Ожидаемый результат:
 *   - один запрос возвращает 200
 *   - второй возвращает 409 Conflict
 */
describe('Race condition: take request', () => {
  it('только один из двух параллельных take-запросов успешен', async () => {
    // 1. Логинимся под master1
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'master1', password: 'master123' }),
    })
    expect(loginRes.ok).toBe(true)
    const cookie = loginRes.headers.get('set-cookie') ?? ''

    // 2. Находим заявку со статусом ASSIGNED, назначенную на master1
    const listRes = await fetch(`${BASE_URL}/api/requests?status=ASSIGNED`, {
      headers: { Cookie: cookie },
    })
    expect(listRes.ok).toBe(true)
    const { requests } = await listRes.json()
    expect(requests.length).toBeGreaterThan(0)
    const requestId = requests[0].id

    // 3. Одновременно шлём два PATCH-запроса
    const [r1, r2] = await Promise.all([
      fetch(`${BASE_URL}/api/requests/${requestId}/take`, {
        method: 'PATCH',
        headers: { Cookie: cookie },
      }),
      fetch(`${BASE_URL}/api/requests/${requestId}/take`, {
        method: 'PATCH',
        headers: { Cookie: cookie },
      }),
    ])

    const statuses = [r1.status, r2.status].sort((a, b) => a - b)

    // Один успешен (200), второй отклонён (409)
    expect(statuses).toEqual([200, 409])
  })
})
