"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useProfile } from "../../../hooks/useProfile";

type ProfileWithUser = {
  id: string;
  is_instructor: boolean;
  updated_at: string | null;
  last_login: string | null;
  user_email: string | null;
  short_id?: string;
};

function AdminInstructorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: profileLoading, session } = useProfile();

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) {
      return { text: "Never", className: "text-gray-400" };
    }

    const loginDate = new Date(lastLogin);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return { text: "Today", className: "text-green-600 font-medium" };
    }
    if (diffInDays === 1) {
      return { text: "Yesterday", className: "text-green-500" };
    }
    if (diffInDays < 7) {
      return { text: `${diffInDays} days ago`, className: "text-yellow-600" };
    }
    if (diffInDays < 30) {
      return { text: `${diffInDays} days ago`, className: "text-orange-600" };
    }
    return { text: loginDate.toLocaleDateString(), className: "text-red-600" };
  };

  const [supabase] = useState(() => createClient());
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmailForDisplay, setUserEmailForDisplay] = useState<string | null>(
    null
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [adminAccessCheckInProgress, setAdminAccessCheckInProgress] =
    useState(true);
  const [adminDataLoading, setAdminDataLoading] = useState(true);

  const forceAdmin = searchParams?.get("admin") === "true";

  // Effect 1: Determine Admin Status
  useEffect(() => {
    let isMounted = true;

    const determineAdminStatus = async () => {
      if (profileLoading) {
        return;
      }

      if (isMounted) {
        setIsAdmin(false);
        setAdminAccessCheckInProgress(true);
      }

      try {
        if (session) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
          } else if (user) {
            let emailToCheck = user.email;
            if (!emailToCheck && user.user_metadata?.email) {
              emailToCheck = user.user_metadata.email;
            } else if (!emailToCheck && user.identities) {
              const googleIdentity = user.identities.find(
                (id) => id.provider === "google"
              );
              if (googleIdentity?.identity_data?.email) {
                emailToCheck = googleIdentity.identity_data.email;
              }
            }

            if (isMounted) {
              setUserEmailForDisplay(emailToCheck || null);
            }

            const adminEmails = [
              "admin@tayloredinstruction.com",
              "evan@tayloredinstruction.com",
            ].filter(Boolean);

            if (
              (forceAdmin ||
                (emailToCheck && adminEmails.includes(emailToCheck))) &&
              isMounted
            ) {
              setIsAdmin(true);
            }
          }
        } else {
          // isAdmin is already false
        }
      } catch (_err) {
      } finally {
        if (isMounted) {
          setAdminAccessCheckInProgress(false);
        }
      }
    };

    determineAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [profileLoading, session, forceAdmin, supabase]);

  // Effect 2: Fetch profiles data if user is admin and access check is complete
  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      if (isMounted) {
        setAdminDataLoading(true);
      }
      setError(null);
      try {
        const res = await fetch("/api/admin/instructors", {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to load admin data (${res.status})`
          );
        }
        const list = (await res.json()) as ProfileWithUser[];
        if (isMounted) {
          setProfiles(list);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(`Failed to fetch instructor profiles: ${err.message}`);
        }
      } finally {
        if (isMounted) {
          setAdminDataLoading(false);
        }
      }
    };

    if (!adminAccessCheckInProgress && isAdmin) {
      fetchAdminData();
    } else if (!(adminAccessCheckInProgress || isAdmin) && isMounted) {
      setAdminDataLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [adminAccessCheckInProgress, isAdmin]);

  const toggleInstructorStatus = async (
    profileId: string,
    currentStatus: boolean,
    userEmail: string | null
  ) => {
    if (!supabase) {
      setError("Action failed: client unavailable.");
      return;
    }
    setActionMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/instructors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, newStatus: !currentStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to update status (${res.status})`
        );
      }
      const { updated_at } = await res.json();
      const now = updated_at || new Date().toISOString();

      setProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, is_instructor: !currentStatus, updated_at: now }
            : p
        )
      );
      setActionMessage(
        `Instructor status successfully ${currentStatus ? "revoked" : "approved"}.`
      );

      if (!currentStatus && userEmail) {
        try {
          const { data: responseData, error: invokeError } =
            await supabase.functions.invoke("send-approval-email", {
              body: { email: userEmail, name: userEmail.split("@")[0] },
            });

          if (invokeError) {
            setActionMessage(
              (prev) =>
                prev +
                ` (Approval email failed to send. Error: ${invokeError.message})`
            );
          } else if (
            responseData?.message?.includes("Approval email sent successfully")
          ) {
            setActionMessage((prev) => `${prev} (Approval email sent.)`);
          } else if (
            responseData?.message?.includes(
              "could not be sent due to server config"
            )
          ) {
            setActionMessage(
              (prev) => `${prev} (Email server configuration issue.)`
            );
          } else if (responseData?.error) {
            setActionMessage(
              (prev) =>
                prev +
                ` (Approval email process reported an error: ${responseData.error})`
            );
          } else {
            setActionMessage(
              (prev) => `${prev} (Approval email status uncertain.)`
            );
          }
        } catch (exceptionDuringInvoke: any) {
          setActionMessage(
            (prev) =>
              prev +
              ` (Approval email failed due to an unexpected error: ${exceptionDuringInvoke.message})`
          );
        }
      }
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
    }
  };

  const handleRejectUser = async (
    profileId: string,
    userEmail: string | null
  ) => {
    if (!supabase) {
      setError("Action failed: client unavailable.");
      return;
    }
    setActionMessage(null);
    setError(null);

    if (
      !window.confirm(
        `Are you sure you want to reject and delete user ${userEmail || profileId}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { error: functionError } = await supabase.functions.invoke(
        "delete-user-and-profile",
        {
          body: { userId: profileId },
        }
      );

      if (functionError) {
        throw functionError;
      }

      setProfiles(profiles.filter((p) => p.id !== profileId));
      setActionMessage(
        `User ${userEmail || profileId} successfully rejected and deleted.`
      );
    } catch (err: any) {
      setError(`Failed to reject user: ${err.message}`);
    }
  };

  if (profileLoading || adminAccessCheckInProgress) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-lg">Verifying admin access...</p>
          {profileLoading && (
            <p className="mt-1 text-gray-500 text-sm">
              Loading user profile...
            </p>
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

  if (!(isAdmin || forceAdmin)) {
    if (typeof window !== "undefined") {
      router.push(session ? "/my-account" : "/");
      return null;
    }
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

  if (adminDataLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <p className="text-lg">Loading administrator panel...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-bold text-3xl md:text-4xl">Manage Instructors</h1>
          {forceAdmin && (
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
              Testing Mode Active
            </span>
          )}
        </div>

        {userEmailForDisplay && (
          <p className="mb-4 text-gray-600 text-sm">
            Logged in as Admin: {userEmailForDisplay}
          </p>
        )}

        {error && (
          <div
            className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {actionMessage && (
          <div
            className="mb-4 rounded border border-blue-400 bg-blue-100 px-4 py-3 text-blue-700"
            role="alert"
          >
            <strong className="font-bold">Info:</strong>
            <span className="block sm:inline"> {actionMessage}</span>
          </div>
        )}

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
                  profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                        {profile.short_id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                        {profile.user_email || "N/A"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                        {profile.is_instructor ? (
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
                        {profile.updated_at
                          ? new Date(profile.updated_at).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={
                            formatLastLogin(profile.last_login).className
                          }
                        >
                          {formatLastLogin(profile.last_login).text}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-sm">
                        <button
                          className={`ml-2 rounded-md px-3 py-1.5 font-medium text-xs ${
                            profile.is_instructor
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-green-500 text-white hover:bg-green-600"
                          }`}
                          onClick={() =>
                            toggleInstructorStatus(
                              profile.id,
                              profile.is_instructor,
                              profile.user_email
                            )
                          }
                        >
                          {profile.is_instructor
                            ? "Revoke Approval"
                            : "Approve Instructor"}
                        </button>
                        {!profile.is_instructor && (
                          <button
                            className="ml-2 rounded-md bg-red-700 px-3 py-1.5 font-medium text-white text-xs hover:bg-red-800"
                            onClick={() =>
                              handleRejectUser(profile.id, profile.user_email)
                            }
                          >
                            Reject User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminInstructorsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex items-center justify-center px-4 py-8">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <AdminInstructorsContent />
    </Suspense>
  );
}
