"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

/**
 * Password sign-in used only on isolated test deployments. Rendered when
 * NEXT_PUBLIC_REGISTRATION_TEST_LOGIN is "true"; the backend provider only
 * exists when REGISTRATION_ALLOW_TEST_FIXTURES is "true" on the deployment.
 */
export function TestSignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  if (process.env.NEXT_PUBLIC_REGISTRATION_TEST_LOGIN !== "true") {
    return null;
  }
  return (
    <form
      className="mt-6 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        try {
          try {
            await signIn("password", { email, password, flow: "signUp" });
          } catch {
            await signIn("password", { email, password, flow: "signIn" });
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error));
        }
      }}
    >
      <p className="font-semibold text-amber-900">Test deployment sign-in</p>
      <label className="block">
        Test email
        <input
          className="mt-1 block w-full rounded border border-amber-300 p-2"
          data-testid="test-email"
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          value={email}
        />
      </label>
      <label className="block">
        Test password
        <input
          className="mt-1 block w-full rounded border border-amber-300 p-2"
          data-testid="test-password"
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          value={password}
        />
      </label>
      <button
        className="rounded bg-amber-700 px-3 py-1.5 font-medium text-white"
        data-testid="test-sign-in"
        type="submit"
      >
        Sign in to test deployment
      </button>
      {message ? <p className="text-rose-700">{message}</p> : null}
    </form>
  );
}
