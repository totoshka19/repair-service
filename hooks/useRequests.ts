'use client'

import { useState, useEffect } from 'react'
import type { RequestData } from '@/components/RequestCard'
import type { RequestStatus } from '@/components/StatusBadge'

export function useRequests() {
  const [requests, setRequests] = useState<RequestData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeStatus, setActiveStatus] = useState<RequestStatus | null>(null)

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

  const filtered = activeStatus
    ? requests.filter((r) => r.status === activeStatus)
    : requests

  return { requests, filtered, loading, refresh, activeStatus, setActiveStatus }
}
