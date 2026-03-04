'use client'

import { toast } from 'sonner'

export function useRequestAction(refresh: () => void) {
  return async (
    url: string,
    successMsg: string,
    errorFallback = 'Ошибка',
    options: RequestInit = { method: 'PATCH' },
  ) => {
    const res = await fetch(url, options)
    if (res.ok) {
      toast.success(successMsg)
      refresh()
    } else {
      const body = await res.json().catch(() => ({}))
      toast.error((body as { error?: string }).error ?? errorFallback)
      // При конфликте (409) тоже обновляем список — состояние могло измениться
      if (res.status === 409) refresh()
    }
    return res.ok
  }
}
