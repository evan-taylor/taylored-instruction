import { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useProfile } from "../../hooks/useProfile";
import { createClient } from "@/utils/supabase/client";

// Define the shape of a profile with user data
interface ProfileWithUser {
  id: string;
  is_instructor: boolean;
  updated_at: string | null;
  user_email: string | null;
  // Include the first part of the UUID as identifier for display
  short_id?: string;
}

const AdminInstructorsPage: NextPage = () => {
  const router = useRouter();
  const {
    loading: profileLoading,
    session,
    // userId // userId from useProfile might not be needed if we fetch user for email directly
  } = useProfile();

  const [supabase] = useState(() => createClient());
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmailForDisplay, setUserEmailForDisplay] = useState<string | null>(
    null
  ); // For display purposes
  const [actionMessage, setActionMessage] = useState<string | null>(null); // For success/error messages from actions

  // New state to manage the admin access check process specifically
  const [adminAccessCheckInProgress, setAdminAccessCheckInProgress] =
    useState(true);
  // State for loading the list of profiles (data for the admin page itself)
  const [adminDataLoading, setAdminDataLoading] = useState(true);

  const forceAdmin = router.query.admin === "true"; // Keep forceAdmin for testing

  // Effect 1: Determine Admin Status
  useEffect(() => {
    let isMounted = true;

    const determineAdminStatus = async () => {
      if (profileLoading) {
        // setAdminAccessCheckInProgress(true) is initial state, so no need to set here
        return;
      }

      // If profileLoading is false, we can proceed with the admin check.
      // Default to not admin, and check will set it true if applicable.
      if (isMounted) {
        setIsAdmin(false);
        setAdminAccessCheckInProgress(true); // Explicitly set to true at start of actual check logic
      }

      try {
        if (!session) {
          // isAdmin is already false. Access check will complete in finally.
        } else {
          // Session exists, try to get user email for admin check
          // We fetch user again here to ensure we have the latest email,
          // as session.user.email might not always be the primary or most up-to-date one.
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            console.error(
              "Admin Check: Error fetching user for admin status:",
              userError
            );
            // isAdmin remains false. Access check will complete in finally.
          } else if (user) {
            let emailToCheck = user.email; // Prefer primary email
            if (!emailToCheck && user.user_metadata?.email) {
              emailToCheck = user.user_metadata.email; // Fallback to metadata
            }
            // Add more fallbacks if necessary, e.g., for Google provider specifically if primary is missing
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
            } else {
              // isAdmin is already false
            }
          } else {
            // isAdmin remains false
          }
        }
      } catch (err) {
        console.error(
          "Admin Check: Exception during admin status determination:",
          err
        );
        // isAdmin remains false
      } finally {
        if (isMounted) setAdminAccessCheckInProgress(false); // Admin check process is complete
      }
    };

    determineAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [profileLoading, session, forceAdmin, supabase]); // Dependencies for admin check

  // Effect 2: Fetch profiles data if user is admin and access check is complete
  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      if (isMounted) setAdminDataLoading(true);
      setError(null);
      try {
        // First fetch profiles without trying to join
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, is_instructor, updated_at")
          .order("updated_at", { ascending: false });

        if (profilesError) throw profilesError;

        // Initialize the profiles array with null emails
        let profilesWithEmail: ProfileWithUser[] = (profilesData || []).map(
          (p: any) => ({
            id: p.id,
            is_instructor: p.is_instructor,
            updated_at: p.updated_at,
            user_email: null,
            short_id: p.id.substring(0, 8),
          })
        );

        // For admin users with appropriate permissions, directly query
        // This uses the SQL function we deployed to Supabase
        const profileIds = profilesWithEmail.map((p) => p.id);
        const { data: usersData, error: usersError } = await supabase.rpc(
          "get_users_with_emails",
          {
            profile_ids: profileIds,
          }
        );

        if (!usersError && usersData) {
          // Create a map of id -> email for quick lookup
          const userEmailMap = new Map();
          usersData.forEach((user: any) => {
            if (user && user.id) {
              userEmailMap.set(user.id, user.email || null);
            }
          });

          // Update profiles with emails
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

    // Only fetch data if admin access check is done AND the user is an admin.
    if (!adminAccessCheckInProgress && isAdmin) {
      fetchAdminData();
    } else if (!adminAccessCheckInProgress && !isAdmin) {
      // If admin check is done and user is NOT admin, no need to load admin data.
      if (isMounted) setAdminDataLoading(false);
    }
    // If adminAccessCheckInProgress is true, wait for it to complete.

    return () => {
      isMounted = false;
    };
  }, [adminAccessCheckInProgress, isAdmin, supabase]); // Dependencies for data fetching

  // Function to approve or revoke instructor status
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
    setActionMessage(null); // Clear previous messages
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

      // If user is being approved, send them an email
      if (!currentStatus && userEmail) {
        // !currentStatus means they are being set to is_instructor = true
        try {
          console.log(
            "[AdminInstructorsPage] Attempting to invoke send-approval-email function for:",
            userEmail
          );
          const { data: responseData, error: invokeError } =
            await supabase.functions.invoke("send-approval-email", {
              body: { email: userEmail, name: userEmail.split("@")[0] },
            });

          console.log(
            "[AdminInstructorsPage] send-approval-email responseData:",
            responseData
          );
          console.log(
            "[AdminInstructorsPage] send-approval-email invokeError:",
            invokeError
          );

          if (invokeError) {
            // Case 1: The function invocation itself failed (network, function threw unhandled 5xx, etc.)
            console.error(
              "[AdminInstructorsPage] Supabase function invocation failed:",
              invokeError
            );
            if ("isRelayError" in invokeError) {
              console.error(
                "[AdminInstructorsPage] Supabase Relay Error:",
                (invokeError as any).isRelayError
              );
            }
            setActionMessage(
              (prev) =>
                prev +
                ` (Approval email failed to send. Client/Invoke Error: ${invokeError.message})`
            );
          } else {
            // Case 2: Function invocation was successful (e.g., function returned 2xx)
            // Now, check the content of 'responseData'
            if (
              responseData &&
              responseData.message &&
              responseData.message.includes("Approval email sent successfully")
            ) {
              // Case 2a: Email explicitly reported as sent by the function
              console.log(
                "[AdminInstructorsPage] Approval email reported as sent successfully by function."
              );
              setActionMessage((prev) => prev + " (Approval email sent.)");
            } else if (
              responseData &&
              responseData.message &&
              responseData.message.includes(
                "could not be sent due to server config"
              )
            ) {
              // Case 2b: Function reported server config issue for email
              console.warn(
                "[AdminInstructorsPage] Email server configuration issue reported by function:",
                responseData.message
              );
              setActionMessage(
                (prev) => prev + " (Email server configuration issue.)"
              );
            } else if (responseData && responseData.error) {
              // Case 2c: Function returned a 2xx but included an 'error' field in its JSON response
              console.error(
                "[AdminInstructorsPage] Error message in function response data:",
                responseData.error
              );
              setActionMessage(
                (prev) =>
                  prev +
                  ` (Approval email process reported an error: ${responseData.error})`
              );
            } else {
              // Case 2d: Function returned 2xx, but response is not one of the expected success/known-issue messages.
              console.warn(
                "[AdminInstructorsPage] Unexpected response from send-approval-email function:",
                responseData
              );
              setActionMessage(
                (prev) => prev + " (Approval email status uncertain.)"
              );
            }
          }
        } catch (exceptionDuringInvoke: any) {
          // Catch for truly unexpected exceptions during the email sending try block
          console.error(
            "[AdminInstructorsPage] Critical exception during email approval process:",
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

  // Function to reject and delete a user
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

    // Confirm before deleting
    if (
      !window.confirm(
        `Are you sure you want to reject and delete user ${userEmail || profileId}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Call a Supabase function to delete the user's auth entry and profile.
      // The function should handle this atomically if possible, or at least ensure both are attempted.
      const { error: functionError } = await supabase.functions.invoke(
        "delete-user-and-profile",
        {
          body: { userId: profileId },
        }
      );

      if (functionError) {
        throw functionError;
      }

      // If successful, remove the user from the local state
      setProfiles(profiles.filter((p) => p.id !== profileId));
      setActionMessage(
        `User ${userEmail || profileId} successfully rejected and deleted.`
      );
    } catch (err: any) {
      console.error("Error rejecting user:", err);
      setError(`Failed to reject user: ${err.message}`);
    }
  };

  // Combined loading state for initial page view: waits for profile and then admin access check.
  if (profileLoading || adminAccessCheckInProgress) {
    return (
      <div className="flex flex-col min-h-screen">
        <Head>
          <title>Admin - Verifying Access | Taylored Instruction</title>
          <meta
            name="description"
            content="Verifying administrator access..."
          />
        </Head>
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
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
        </main>
        <Footer />
      </div>
    );
  }

  // After admin access check is complete, if user is NOT admin (and not forced by query param)
  if (!isAdmin && !forceAdmin) {
    // Note: forceAdmin here means if it was true but email still didn't match, it's not true admin.
    // Consider if forceAdmin should bypass this entirely if true.
    // For now, if !isAdmin is true, access is denied unless forceAdmin is specifically allowing override.
    // Correct logic: if !isAdmin (which considers forceAdmin already) then deny.
    if (typeof window !== "undefined") {
      // Redirect non-admins away. Redirect to home or /my-account if they are logged in.
      router.push(session ? "/my-account" : "/"); // Go to my-account if logged in, else home.
      return null; // Prevent flash of content by returning null during redirect
    }
    // Fallback for server-side or if redirect doesn't happen immediately
    return (
      <div className="flex flex-col min-h-screen">
        <Head>
          <title>Access Denied | Taylored Instruction</title>
          <meta
            name="description"
            content="Administrator privileges required to access this page."
          />
        </Head>
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
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
        </main>
        <Footer />
      </div>
    );
  }

  // If user IS admin (or forceAdmin is true and considered), but data is still loading for the admin panel:
  if (adminDataLoading) {
    // This implies isAdmin is true or forceAdmin override is active
    return (
      <div className="flex flex-col min-h-screen">
        <Head>
          <title>Loading Admin Panel | Taylored Instruction</title>
          <meta name="description" content="Loading administrator panel..." />
        </Head>
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-lg">Loading administrator panel...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Head>
        <title>Manage Instructors - Admin | Taylored Instruction</title>
        <meta
          name="description"
          content="Administrator panel for managing instructor approvals and user accounts."
        />
      </Head>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
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
      </main>
      <Footer />
    </div>
  );
};

export default AdminInstructorsPage;
