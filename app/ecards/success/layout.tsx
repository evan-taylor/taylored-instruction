import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Purchase Complete | Taylored Instruction',
  description: 'Your eCard purchase has been completed successfully.',
}

export default function EcardsSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}