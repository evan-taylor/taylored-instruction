import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manage Instructors - Admin | Taylored Instruction',
  description: 'Administrator panel for managing instructor approvals and user accounts.',
}

export default function AdminInstructorsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}