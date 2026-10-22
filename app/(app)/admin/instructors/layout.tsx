import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Administrator panel for managing instructor approvals and user accounts.",
  title: "Manage Instructors - Admin | Taylored Instruction",
};

export default function AdminInstructorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
