'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // After the auth flow is completed, redirect to the account page
    router.push("/my-account");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Completing login...</p>
    </div>
  );
}