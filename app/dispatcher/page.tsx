'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RequestCard } from '@/components/RequestCard'
import { PageShell } from '@/components/PageShell'
import { useRequests } from '@/hooks/useRequests'
import { useLogout } from '@/hooks/useLogout'
import { useRequestAction } from '@/hooks/useRequestAction'

interface Master {
  id: string
  username: string
}

export default function DispatcherPage() {
  const { filtered, loading, refresh, activeStatus, setActiveStatus } = useRequests()
  const logout = useLogout()
  const requestAction = useRequestAction(refresh)

  const [masters, setMasters] = useState<Master[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedMasterId, setSelectedMasterId] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/users?role=MASTER')
      if (!res.ok) return
      const { users } = await res.json()
      setMasters(users)
    }
    load()
  }, [])

  const handleAssignOpen = (id: string) => {
    setAssigningId(id)
    setSelectedMasterId('')
  }

  const handleAssignConfirm = async () => {
    if (!assigningId || !selectedMasterId) return
    const ok = await requestAction(
      `/api/requests/${assigningId}/assign`,
      'Мастер назначен',
      'Ошибка назначения',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterId: selectedMasterId }),
      },
    )
    if (ok) setAssigningId(null)
  }

  const handleCancel = (id: string) =>
    requestAction(`/api/requests/${id}/cancel`, 'Заявка отменена', 'Ошибка отмены')

  return (
    <>
      <Dialog open={!!assigningId} onOpenChange={(open) => !open && setAssigningId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить мастера</DialogTitle>
          </DialogHeader>
          <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
            <SelectTrigger className="w-full">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningId(null)}>
              Отмена
            </Button>
            <Button disabled={!selectedMasterId} onClick={handleAssignConfirm}>
              Назначить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageShell
        title="Панель диспетчера"
        loading={loading}
        filtered={filtered}
        activeStatus={activeStatus}
        onFilter={setActiveStatus}
        onLogout={logout}
        renderCard={(req) => (
          <RequestCard
            key={req.id}
            request={req}
            onAssign={req.status === 'NEW' ? handleAssignOpen : undefined}
            onCancel={
              req.status === 'NEW' || req.status === 'ASSIGNED' ? handleCancel : undefined
            }
          />
        )}
      />
    </>
  )
}
