'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/FilterBar'
import { RequestCard, type RequestData } from '@/components/RequestCard'
import type { RequestStatus } from '@/components/StatusBadge'

export default function MasterPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RequestData[]>([])
  const [activeStatus, setActiveStatus] = useState<RequestStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/requests')
      if (!res.ok) return
      const { requests } = await res.json()
      setRequests(requests)
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleTake = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/take`, { method: 'PATCH' })

    if (res.status === 409) {
      toast.error('Заявка уже взята другим мастером')
      refresh()
      return
    }

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Ошибка')
      return
    }

    toast.success('Заявка взята в работу')
    refresh()
  }

  const handleComplete = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/complete`, { method: 'PATCH' })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Ошибка завершения')
      return
    }

    toast.success('Заявка завершена')
    refresh()
  }

  const filtered = activeStatus
    ? requests.filter((r) => r.status === activeStatus)
    : requests

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Панель мастера</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Выйти
          </Button>
        </div>

        {/* Filters */}
        <FilterBar activeStatus={activeStatus} onFilter={setActiveStatus} />

        {/* Requests grid */}
        {loading ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет заявок</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onTake={req.status === 'ASSIGNED' ? handleTake : undefined}
                onComplete={req.status === 'IN_PROGRESS' ? handleComplete : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
