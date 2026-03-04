'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/FilterBar'
import type { RequestData } from '@/components/RequestCard'
import type { RequestStatus } from '@/components/StatusBadge'

interface PageShellProps {
  title: string
  loading: boolean
  filtered: RequestData[]
  activeStatus: RequestStatus | null
  onFilter: (status: RequestStatus | null) => void
  onLogout: () => void
  renderCard: (req: RequestData) => ReactNode
  modal?: ReactNode
}

export function PageShell({
  title,
  loading,
  filtered,
  activeStatus,
  onFilter,
  onLogout,
  renderCard,
  modal,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-muted/40">
      {modal}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Выйти
          </Button>
        </div>

        <FilterBar activeStatus={activeStatus} onFilter={onFilter} />

        {loading ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет заявок</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(renderCard)}
          </div>
        )}
      </div>
    </div>
  )
}
