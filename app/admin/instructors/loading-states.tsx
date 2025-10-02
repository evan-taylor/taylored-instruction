export function LoadingVerification({
  profileLoading,
  adminAccessCheckInProgress,
}: {
  profileLoading: boolean;
  adminAccessCheckInProgress: boolean;
}) {
  return (
    <div className="container mx-auto flex items-center justify-center px-4 py-8">
      <div className="text-center">
        <p className="text-lg">Verifying admin access...</p>
        {profileLoading && (
          <p className="mt-1 text-gray-500 text-sm">Loading user profile...</p>
        )}
        {adminAccessCheckInProgress && !profileLoading && (
          <p className="mt-1 text-gray-500 text-sm">
            Checking admin privileges...
          </p>
        )}
      </div>
    </div>
  );
}

export function LoadingAdminPanel() {
  return (
    <div className="container mx-auto flex items-center justify-center px-4 py-8">
      <p className="text-lg">Loading administrator panel...</p>
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
