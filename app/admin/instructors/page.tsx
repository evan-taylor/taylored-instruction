'use client'

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "../../../hooks/useProfile";
import { createClient } from "@/utils/supabase/client";

interface ProfileWithUser {
  id: string;
  is_instructor: boolean;
  updated_at: string | null;
  user_email: string | null;
  short_id?: string;
}

function AdminInstructorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loading: profileLoading,
    session,
  } = useProfile();

  const [supabase] = useState(() => createClient());
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmailForDisplay, setUserEmailForDisplay] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [adminAccessCheckInProgress, setAdminAccessCheckInProgress] = useState(true);
  const [adminDataLoading, setAdminDataLoading] = useState(true);

  const forceAdmin = searchParams?.get('admin') === 'true';

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
        if (!session) {
          // isAdmin is already false
        } else {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            console.error(
              "Admin Check: Error fetching user for admin status:",
              userError
            );
          } else if (user) {
            let emailToCheck = user.email;
            if (!emailToCheck && user.user_metadata?.email) {
              emailToCheck = user.user_metadata.email;
            }
            else if (!emailToCheck && user.identities) {
              const googleIdentity = user.identities.find(
                (id) => id.provider === "google"
              );
              if (googleIdentity?.identity_data?.email) {
                emailToCheck = googleIdentity.identity_data.email;
              }
            }

            if (isMounted) setUserEmailForDisplay(emailToCheck || null);

            const adminEmails = [
              "admin@tayloredinstruction.com",
              "evan@tayloredinstruction.com",
            ].filter(Boolean);

            if (
              forceAdmin ||
              (emailToCheck && adminEmails.includes(emailToCheck))
            ) {
              if (isMounted) setIsAdmin(true);
            }
          }
        }
      } catch (err) {
        console.error(
          "Admin Check: Exception during admin status determination:",
          err
        );
      } finally {
        if (isMounted) setAdminAccessCheckInProgress(false);
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
      if (isMounted) setAdminDataLoading(true);
      setError(null);
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, is_instructor, updated_at")
          .order("updated_at", { ascending: false });

        if (profilesError) throw profilesError;

        let profilesWithEmail: ProfileWithUser[] = (profilesData || []).map(
          (p: any) => ({
            id: p.id,
            is_instructor: p.is_instructor,
            updated_at: p.updated_at,
            user_email: null,
            short_id: p.id.substring(0, 8),
          })
        );

        const profileIds = profilesWithEmail.map((p) => p.id);
        const { data: usersData, error: usersError } = await supabase.rpc(
          "get_users_with_emails",
          {
            profile_ids: profileIds,
          }
        );

        if (!usersError && usersData) {
          const userEmailMap = new Map();
          usersData.forEach((user: any) => {
            if (user && user.id) {
              userEmailMap.set(user.id, user.email || null);
            }
          });

          profilesWithEmail = profilesWithEmail.map((profile) => {
            const email = userEmailMap.get(profile.id);
            return {
              ...profile,
              user_email: email || null,
            };
          });
        } else {
          console.error("Error fetching user emails:", usersError);
        }

        if (isMounted) setProfiles(profilesWithEmail);
      } catch (err: any) {
        console.error("Admin Data Fetch: Error fetching profiles:", err);
        if (isMounted)
          setError(`Failed to fetch instructor profiles: ${err.message}`);
      } finally {
        if (isMounted) setAdminDataLoading(false);
      }
    };

    if (!adminAccessCheckInProgress && isAdmin) {
      fetchAdminData();
    } else if (!adminAccessCheckInProgress && !isAdmin) {
      if (isMounted) setAdminDataLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [adminAccessCheckInProgress, isAdmin, supabase]);

  const toggleInstructorStatus = async (
    profileId: string,
    currentStatus: boolean,
    userEmail: string | null
  ) => {
    if (!supabase) {
      console.error("Supabase client not available for toggling status.");
      setError("Action failed: client unavailable.");
      return;
    }
    setActionMessage(null);
    setError(null);

    try {
      const now = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ is_instructor: !currentStatus, updated_at: now })
        .eq("id", profileId)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, is_instructor: !currentStatus, updated_at: now }
            : p
        )
      );
      setActionMessage(
        `Instructor status successfully ${!currentStatus ? "approved" : "revoked"}.`
      );

      if (!currentStatus && userEmail) {
        try {
          const { data: responseData, error: invokeError } =
            await supabase.functions.invoke("send-approval-email", {
              body: { email: userEmail, name: userEmail.split("@")[0] },
            });

          if (invokeError) {
            console.error("Supabase function invocation failed:", invokeError);
            setActionMessage(
              (prev) =>
                prev +
                ` (Approval email failed to send. Error: ${invokeError.message})`
            );
          } else {
            if (
              responseData &&
              responseData.message &&
              responseData.message.includes("Approval email sent successfully")
            ) {
              setActionMessage((prev) => prev + " (Approval email sent.)");
            } else if (
              responseData &&
              responseData.message &&
              responseData.message.includes("could not be sent due to server config")
            ) {
              setActionMessage(
                (prev) => prev + " (Email server configuration issue.)"
              );
            } else if (responseData && responseData.error) {
              setActionMessage(
                (prev) =>
                  prev +
                  ` (Approval email process reported an error: ${responseData.error})`
              );
            } else {
              setActionMessage(
                (prev) => prev + " (Approval email status uncertain.)"
              );
            }
          }
        } catch (exceptionDuringInvoke: any) {
          console.error(
            "Critical exception during email approval process:",
            exceptionDuringInvoke
          );
          setActionMessage(
            (prev) =>
              prev +
              ` (Approval email failed due to an unexpected error: ${exceptionDuringInvoke.message})`
          );
        }
      }
    } catch (err: any) {
      console.error("Error updating instructor status:", err);
      setError(`Failed to update status: ${err.message}`);
    }
  };

  const handleRejectUser = async (
    profileId: string,
    userEmail: string | null
  ) => {
    if (!supabase) {
      console.error("Supabase client not available for rejecting user.");
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
      console.error("Error rejecting user:", err);
      setError(`Failed to reject user: ${err.message}`);
    }
  };

  if (profileLoading || adminAccessCheckInProgress) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Verifying admin access...</p>
          {profileLoading && (
            <p className="text-sm text-gray-500 mt-1">
              Loading user profile...
            </p>
          )}
          {adminAccessCheckInProgress && !profileLoading && (
            <p className="text-sm text-gray-500 mt-1">
              Checking admin privileges...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isAdmin && !forceAdmin) {
    if (typeof window !== "undefined") {
      router.push(session ? "/my-account" : "/");
      return null;
    }
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
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
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <p className="text-lg">Loading administrator panel...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">
            Manage Instructors
          </h1>
          {forceAdmin && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
              Testing Mode Active
            </span>
          )}
        </div>

        {userEmailForDisplay && (
          <p className="mb-4 text-sm text-gray-600">
            Logged in as Admin: {userEmailForDisplay}
          </p>
        )}

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {actionMessage && (
          <div
            className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4"
            role="alert"
          >
            <strong className="font-bold">Info:</strong>
            <span className="block sm:inline"> {actionMessage}</span>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    User ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Last Updated
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No users found or access denied by RLS.
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.short_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.user_email || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.is_instructor ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Instructor
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Not Instructor
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            toggleInstructorStatus(
                              profile.id,
                              profile.is_instructor,
                              profile.user_email
                            )
                          }
                          className={`ml-2 px-3 py-1.5 text-xs font-medium rounded-md ${
                            profile.is_instructor
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          }`}
                        >
                          {profile.is_instructor
                            ? "Revoke Approval"
                            : "Approve Instructor"}
                        </button>
                        {!profile.is_instructor && (
                          <button
                            onClick={() =>
                              handleRejectUser(profile.id, profile.user_email)
                            }
                            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md bg-red-700 hover:bg-red-800 text-white"
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
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    }>
      <AdminInstructorsContent />
    </Suspense>
  );
}