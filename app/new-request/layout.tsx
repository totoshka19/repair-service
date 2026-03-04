import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Создать заявку — Ремонтная служба',
}

export default function NewRequestLayout({ children }: { children: React.ReactNode }) {
  return children
}
