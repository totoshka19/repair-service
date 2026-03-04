'use client'

import { RequestCard } from '@/components/RequestCard'
import { PageShell } from '@/components/PageShell'
import { useRequests } from '@/hooks/useRequests'
import { useLogout } from '@/hooks/useLogout'
import { useRequestAction } from '@/hooks/useRequestAction'

export default function MasterPage() {
  const { filtered, loading, refresh, activeStatus, setActiveStatus } = useRequests()
  const logout = useLogout()
  const requestAction = useRequestAction(refresh)

  const handleTake = (id: string) =>
    requestAction(`/api/requests/${id}/take`, 'Заявка взята в работу', 'Ошибка')

  const handleComplete = (id: string) =>
    requestAction(`/api/requests/${id}/complete`, 'Заявка завершена', 'Ошибка завершения')

  return (
    <PageShell
      title="Панель мастера"
      loading={loading}
      filtered={filtered}
      activeStatus={activeStatus}
      onFilter={setActiveStatus}
      onLogout={logout}
      renderCard={(req) => (
        <RequestCard
          key={req.id}
          request={req}
          onTake={req.status === 'ASSIGNED' ? handleTake : undefined}
          onComplete={req.status === 'IN_PROGRESS' ? handleComplete : undefined}
        />
      )}
    />
  )
}
