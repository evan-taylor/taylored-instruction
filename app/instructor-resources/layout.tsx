import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Instructor Resources | Taylored Instruction',
  description: 'Access exclusive instructor resources, training materials, and documentation for Taylored Instruction certified instructors.',
}

export default function InstructorResourcesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}