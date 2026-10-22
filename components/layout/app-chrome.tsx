"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { InstructorNavigation } from "@/components/layout/InstructorNavigation";

/**
 * Public site chrome for app routes. The admin workspace renders its own
 * full-height shell instead of the marketing header and footer.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return children;
  }
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <InstructorNavigation />
      <main className="grow">{children}</main>
      <Footer />
    </div>
  );
}
