import { formatLastLogin } from "./helpers";
import type { ProfileWithUser } from "./types";

interface InstructorsTableProps {
  onRejectUser: (profileId: string, userEmail: string | null) => void;
  onToggleStatus: (
    profileId: string,
    userId: string,
    currentStatus: boolean
  ) => void;
  profiles: ProfileWithUser[];
}

export function InstructorsTable({
  profiles,
  onToggleStatus,
  onRejectUser,
}: InstructorsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                User ID
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                Email
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                Status
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                Last Updated
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                Last Login
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {profiles.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-4 text-center text-gray-500 text-sm"
                  colSpan={6}
                >
                  No users found or access denied by RLS.
                </td>
              </tr>
            ) : (
              profiles.map((profile) => {
                const lastLoginInfo = formatLastLogin(profile.lastLogin);
                return (
                  <tr key={profile.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {profile.shortId}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {profile.userEmail || "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {profile.isInstructor ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 font-semibold text-green-800 text-xs leading-5">
                          Instructor
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 font-semibold text-xs text-yellow-800 leading-5">
                          Not Instructor
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {profile.updatedAt
                        ? new Date(profile.updatedAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={lastLoginInfo.className}>
                        {lastLoginInfo.text}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-sm">
                      <button
                        className={`ml-2 rounded-md px-3 py-1.5 font-medium text-xs ${
                          profile.isInstructor
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        onClick={() =>
                          onToggleStatus(
                            profile.id,
                            profile.userId,
                            profile.isInstructor
                          )
                        }
                        type="button"
                      >
                        {profile.isInstructor
                          ? "Revoke Approval"
                          : "Approve Instructor"}
                      </button>
                      {!profile.isInstructor && (
                        <button
                          className="ml-2 rounded-md bg-red-700 px-3 py-1.5 font-medium text-white text-xs hover:bg-red-800"
                          onClick={() =>
                            onRejectUser(profile.id, profile.userEmail)
                          }
                          type="button"
                        >
                          Reject User
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
