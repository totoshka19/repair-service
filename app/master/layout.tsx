import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Панель мастера — Ремонтная служба',
}

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return children
}
