export const CANCELABLE_STATUSES = ['NEW', 'ASSIGNED'] as const

export const REQUEST_INCLUDE = {
  master: { select: { id: true, username: true } },
} as const
