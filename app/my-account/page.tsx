"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useProfile } from "../../hooks/useProfile";

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
    if (!(userLoading || user)) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  if (error) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-red-600">Error loading account: {error}</p>
          <button
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (userLoading || loading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-lg">Loading account information...</p>
          <p className="mt-2 text-gray-500 text-sm">
            User: {user ? "Loaded" : "Loading"} | Profile:{" "}
            {profile ? "Loaded" : loading ? "Loading" : "Not found"}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 font-bold text-3xl md:text-4xl">My Account</h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 font-semibold text-xl">Account Information</h2>

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
              <p className="mt-1 text-gray-500 text-sm">
                Your instructor status is pending approval from an
                administrator.
              </p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 font-semibold text-xl">Quick Links</h2>
          <div className="space-y-2">
            {isInstructor && profile && (
              <>
                <Link
                  className="block text-primary hover:underline"
                  href="/ecards"
                >
                  Purchase eCards
                </Link>
                <Link
                  className="block text-primary hover:underline"
                  href="/instructor-resources"
                >
                  Instructor Resources
                </Link>
              </>
            )}
            {isAdmin && (
              <div>
                <button
                  className="block text-primary hover:underline"
                  onClick={() => setShowAdmin(!showAdmin)}
                >
                  Admin
                </button>
                {showAdmin && (
                  <div className="mt-2 ml-4 space-y-1">
                    <Link
                      className="block text-primary hover:underline"
                      href="/admin/instructors"
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
          className="w-full transform rounded-lg bg-red-600 px-6 py-3 font-medium text-sm text-white capitalize tracking-wide transition-colors duration-300 hover:bg-red-500 focus:outline-none focus:ring focus:ring-red-300 focus:ring-opacity-50 md:w-auto"
          onClick={async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
            } else {
              router.push("/");
            }
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
