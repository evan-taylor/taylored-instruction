import { Skeleton } from "@/components/ui/page-header";

export function LoadingAdminPanel() {
  return (
    <div aria-busy="true" className="space-y-6" role="status">
      <span className="sr-only">Loading instructors…</span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function AccessDenied({
  userEmailForDisplay,
}: {
  userEmailForDisplay: string | null;
}) {
  return (
    <div className="container mx-auto flex items-center justify-center px-4 py-8">
      <div className="text-center">
        <p className="text-lg text-red-600">
          Access Denied. Administrator privileges required.
        </p>
        <p className="mt-2">
          Detected Email:{" "}
          {userEmailForDisplay || "Not available (or not logged in)"}
        </p>
        <p className="mt-4 text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
