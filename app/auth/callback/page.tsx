"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // After the auth flow is completed, redirect to the account page
    router.push("/my-account");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg">Completing login...</p>
    </div>
  );
}
