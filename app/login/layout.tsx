import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Instructor Login | Taylored Instruction',
  description: 'Login portal for Taylored Instruction instructors. Access instructor resources, eCards, and more.',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}