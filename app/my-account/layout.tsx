import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Account | Taylored Instruction',
  description: 'Manage your Taylored Instruction instructor account, view instructor status, and access resources.',
}

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}