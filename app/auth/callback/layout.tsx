import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Completing Login | Taylored Instruction',
  description: 'Completing authentication...',
}

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}