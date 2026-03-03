import { Badge } from '@/components/ui/badge'

export type RequestStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'Новая',
  ASSIGNED: 'Назначена',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
  CANCELED: 'Отменена',
}

const STATUS_CLASSES: Record<RequestStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  ASSIGNED: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  IN_PROGRESS: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  DONE: 'bg-green-100 text-green-800 hover:bg-green-100',
  CANCELED: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
}

interface StatusBadgeProps {
  status: RequestStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
