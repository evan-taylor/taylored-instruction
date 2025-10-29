"use client";

import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const posthog = usePostHog();
  const authToken = useAuthToken();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authToken !== null) {
      router.push("/my-account");
    }
  }, [authToken, router]);

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      await signIn("email", { email });
      setMessage("Check your email for a magic link to sign in!");
      posthog.capture("magic_link_requested", { email });
    } catch (error) {
      setMessage("Failed to send magic link. Please try again.");
      posthog.capture("magic_link_error", { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google");
      posthog.capture("google_signin_initiated");
    } catch (error) {
      setMessage("Failed to sign in with Google. Please try again.");
      posthog.capture("google_signin_error", { error: String(error) });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center justify-center">
          <h2 className="text-center font-bold text-2xl text-gray-900">
            Instructor Login
          </h2>
        </div>

        <div className="w-full space-y-4">
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.includes("Check your email")
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleMagicLinkSignIn}>
            <div>
              <label
                className="mb-2 block font-medium text-gray-700 text-sm"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isLoading}
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                type="email"
                value={email}
              />
            </div>

            <button
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Sending Magic Link..." : "Send Magic Link"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-gray-300 border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            type="button"
          >
            <svg
              aria-label="Google logo"
              className="h-5 w-5"
              role="img"
              viewBox="0 0 24 24"
            >
              <title>Google logo</title>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>This login is for instructors only.</p>
          <p className="mt-1">
            New instructors will need approval before accessing instructor
            features.
          </p>
        </div>
      </div>
    </div>
  );
}
