"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "../../hooks/useProfile";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function MyAccountPage() {
  const router = useRouter();
  const [supabaseClient] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const { profile, loading, isInstructor, error } = useProfile(user?.id);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUser(user);
      setUserLoading(false);
    };
    getUser();
  }, [supabaseClient]);

  useEffect(() => {
    const userEmail = user?.email;
    if (userEmail) {
      const adminEmails = [
        "admin@tayloredinstruction.com",
        "evan@tayloredinstruction.com",
      ].filter(Boolean);
      setIsAdmin(adminEmails.includes(userEmail));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">Error loading account: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading account information...</p>
          <p className="text-sm text-gray-500 mt-2">
            User: {user ? "Loaded" : "Loading"} | Profile:{" "}
            {profile ? "Loaded" : loading ? "Loading" : "Not found"}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">My Account</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>

          <div className="mb-4">
            <p className="text-gray-600">Email:</p>
            <p className="font-medium">{user.email || "Not available"}</p>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">Instructor Status:</p>
            <p className="font-medium">
              {isInstructor ? (
                <span className="text-green-600">Approved Instructor</span>
              ) : (
                <span className="text-yellow-600">Pending Approval</span>
              )}
            </p>
            {!isInstructor && profile && (
              <p className="text-sm text-gray-500 mt-1">
                Your instructor status is pending approval from an
                administrator.
              </p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            {isInstructor && profile && (
              <>
                <Link
                  href="/ecards"
                  className="text-primary hover:underline block"
                >
                  Purchase eCards
                </Link>
                <Link
                  href="/instructor-resources"
                  className="text-primary hover:underline block"
                >
                  Instructor Resources
                </Link>
              </>
            )}
            {isAdmin && (
              <div>
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className="text-primary hover:underline block"
                >
                  Admin
                </button>
                {showAdmin && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/instructors"
                      className="text-primary hover:underline block"
                    >
                      Manage Instructors
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
              console.error("Logout error:", error);
            } else {
              router.push("/");
            }
          }}
          className="w-full md:w-auto px-6 py-3 text-sm font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-red-600 rounded-lg hover:bg-red-500 focus:outline-none focus:ring focus:ring-red-300 focus:ring-opacity-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
