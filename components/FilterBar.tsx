'use client'

import { Button } from '@/components/ui/button'
import { type RequestStatus, STATUS_LABELS } from '@/components/StatusBadge'

const FILTERS: { label: string; value: RequestStatus | null }[] = [
  { label: 'Все', value: null },
  { label: STATUS_LABELS.NEW, value: 'NEW' },
  { label: STATUS_LABELS.ASSIGNED, value: 'ASSIGNED' },
  { label: STATUS_LABELS.IN_PROGRESS, value: 'IN_PROGRESS' },
  { label: STATUS_LABELS.DONE, value: 'DONE' },
  { label: STATUS_LABELS.CANCELED, value: 'CANCELED' },
]

interface FilterBarProps {
  activeStatus: RequestStatus | null
  onFilter: (status: RequestStatus | null) => void
}

export function FilterBar({ activeStatus, onFilter }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(({ label, value }) => (
        <Button
          key={value ?? 'all'}
          variant={activeStatus === value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilter(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
