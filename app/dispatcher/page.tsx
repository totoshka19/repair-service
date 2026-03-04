'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterBar } from '@/components/FilterBar'
import { RequestCard, type RequestData } from '@/components/RequestCard'
import type { RequestStatus } from '@/components/StatusBadge'

interface Master {
  id: string
  username: string
}

export default function DispatcherPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RequestData[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [activeStatus, setActiveStatus] = useState<RequestStatus | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedMasterId, setSelectedMasterId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/requests')
    if (!res.ok) return
    const { requests } = await res.json()
    setRequests(requests)
    setLoading(false)
  }, [])

  const fetchMasters = useCallback(async () => {
    const res = await fetch('/api/users?role=MASTER')
    if (!res.ok) return
    const { users } = await res.json()
    setMasters(users)
  }, [])

  useEffect(() => {
    fetchRequests()
    fetchMasters()
  }, [fetchRequests, fetchMasters])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleAssignOpen = (id: string) => {
    setAssigningId(id)
    setSelectedMasterId('')
  }

  const handleAssignConfirm = async () => {
    if (!assigningId || !selectedMasterId) return

    const res = await fetch(`/api/requests/${assigningId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterId: selectedMasterId }),
    })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Ошибка назначения')
    } else {
      toast.success('Мастер назначен')
      setAssigningId(null)
      fetchRequests()
    }
  }

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/cancel`, { method: 'PATCH' })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Ошибка отмены')
    } else {
      toast.success('Заявка отменена')
      fetchRequests()
    }
  }

  const filtered = activeStatus
    ? requests.filter((r) => r.status === activeStatus)
    : requests

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Assign modal */}
      {assigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-sm flex flex-col gap-4">
            <p className="font-semibold">Назначить мастера</p>
            <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите мастера" />
              </SelectTrigger>
              <SelectContent>
                {masters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssigningId(null)}>
                Отмена
              </Button>
              <Button disabled={!selectedMasterId} onClick={handleAssignConfirm}>
                Назначить
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Панель диспетчера</h1>
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
                onAssign={req.status === 'NEW' ? handleAssignOpen : undefined}
                onCancel={
                  req.status === 'NEW' || req.status === 'ASSIGNED'
                    ? handleCancel
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
