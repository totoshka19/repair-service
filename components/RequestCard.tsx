'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge, type RequestStatus } from '@/components/StatusBadge'
import { Phone, MapPin, Calendar, User } from 'lucide-react'

export interface RequestData {
  id: string
  clientName: string
  phone: string
  address: string
  problemText: string
  status: RequestStatus
  assignedTo: string | null
  master: { id: string; username: string } | null
  createdAt: string
}

interface RequestCardProps {
  request: RequestData
  onAssign?: (id: string) => void
  onCancel?: (id: string) => void
  onTake?: (id: string) => void
  onComplete?: (id: string) => void
}

export function RequestCard({
  request,
  onAssign,
  onCancel,
  onTake,
  onComplete,
}: RequestCardProps) {
  const createdAt = new Date(request.createdAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const hasActions = onAssign || onCancel || onTake || onComplete

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-base">{request.clientName}</p>
            <p className="text-xs text-muted-foreground font-mono">#{request.id.slice(-6)}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm flex-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{request.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{request.address}</span>
        </div>
        <p className="mt-1 text-foreground">{request.problemText}</p>
        {request.master && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>Мастер: {request.master.username}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{createdAt}</span>
        </div>
      </CardContent>

      {hasActions && (
        <CardFooter className="flex flex-wrap gap-2 pt-2">
          {onAssign && (
            <Button size="sm" onClick={() => onAssign(request.id)}>
              Назначить
            </Button>
          )}
          {onCancel && (
            <Button size="sm" variant="destructive" onClick={() => onCancel(request.id)}>
              Отменить
            </Button>
          )}
          {onTake && (
            <Button size="sm" onClick={() => onTake(request.id)}>
              Взять в работу
            </Button>
          )}
          {onComplete && (
            <Button size="sm" variant="outline" onClick={() => onComplete(request.id)}>
              Завершить
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
