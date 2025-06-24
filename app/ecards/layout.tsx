import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Purchase eCards | Taylored Instruction',
  description: 'Purchase digital certification eCards for CPR, BLS, First Aid, and other safety training courses.',
}

export default function EcardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}