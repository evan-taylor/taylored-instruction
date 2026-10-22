"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default function LoginPage() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/my-account");
      router.refresh();
    }
  }, [isAuthenticated, router]);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex min-h-[60svh] max-w-md items-center px-4 py-12 sm:px-6 lg:py-16">
        <Card className="w-full">
          <CardHeader>
            <div>
              <h1 className="font-bold text-slate-900 text-xl leading-tight lg:text-2xl">
                Sign in
              </h1>
              <CardDescription>
                Students, instructors, and staff all sign in here. Use the email
                you registered with and we’ll send a one-time code. No password
                needed.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <SignInForm />
            <p className="text-center text-slate-500 text-xs">
              Registered for a class? Your registrations, materials, and joining
              details are waiting after you sign in. New instructors need
              approval before instructor features unlock.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
