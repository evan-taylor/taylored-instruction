"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { trackVisitorsEvent } from "@/lib/analytics";

type LoginStep = "email" | "code";
type Message = { text: string; tone: "success" | "danger" } | null;

const OTP_CODE_LENGTH = 6;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_FOR_EXPIRY = 10;
const OTP_EXPIRY_MS = MINUTES_FOR_EXPIRY * SECONDS_PER_MINUTE * MS_PER_SECOND;
const DIGITS_ONLY = /\D/gu;

function formatRemaining(expiryTime: number, now: number) {
  const remaining = Math.max(0, Math.floor((expiryTime - now) / MS_PER_SECOND));
  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
  const seconds = remaining % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <title>Google</title>
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
  );
}

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const providers = useQuery(api.auth.availableProviders);
  const posthog = usePostHog();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<LoginStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/my-account");
      router.refresh();
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!expiryTime || step !== "code") {
      return;
    }
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiryTime) {
        setMessage({
          text: "That code has expired. Request a new one.",
          tone: "danger",
        });
        setStep("email");
        setExpiryTime(null);
      }
    }, MS_PER_SECOND);
    return () => clearInterval(interval);
  }, [expiryTime, step]);

  useEffect(() => {
    if (step === "code") {
      codeRef.current?.focus();
    }
  }, [step]);

  const sendCode = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("email", normalizedEmail);
      await signIn("resend-otp", formData);
      setCode("");
      setStep("code");
      setExpiryTime(Date.now() + OTP_EXPIRY_MS);
      setNow(Date.now());
      posthog.capture("otp_requested", { email: normalizedEmail });
    } catch (error) {
      setMessage({
        text: "We couldn’t send a code to that address. Check it and try again.",
        tone: "danger",
      });
      posthog.capture("otp_request_error", { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("email", normalizedEmail);
      formData.append("code", code.trim());
      await signIn("resend-otp", formData);
      posthog.capture("otp_verified", { email: normalizedEmail });
      trackVisitorsEvent("Login Success", { method: "email_otp" });
    } catch (error) {
      setMessage({
        text: "That code is invalid or has expired. Try again or request a new one.",
        tone: "danger",
      });
      posthog.capture("otp_verification_failed", {
        email: normalizedEmail,
        error: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editEmail = () => {
    setStep("email");
    setCode("");
    setMessage(null);
    setExpiryTime(null);
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      await signIn("google");
      posthog.capture("google_signin_initiated");
      trackVisitorsEvent("Google Sign-in Initiated", { method: "google" });
    } catch (error) {
      setMessage({
        text: "Google sign-in didn’t complete. Please try again.",
        tone: "danger",
      });
      posthog.capture("google_signin_error", { error: String(error) });
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12 sm:px-6 lg:py-16">
        <Card className="w-full">
          <CardHeader>
            <div>
              <h1 className="m-0 font-bold text-slate-900 text-xl leading-tight lg:text-2xl">
                Sign in
              </h1>
              <CardDescription>
                For instructors and staff. Registered students can open their
                classes from the{" "}
                <a
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  href="/registrations"
                >
                  secure portal
                </a>
                .
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {message ? (
              <Notice tone={message.tone}>{message.text}</Notice>
            ) : null}

            {step === "email" ? (
              <>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendCode();
                  }}
                >
                  <Field label="Email">
                    {(props) => (
                      <TextInput
                        {...props}
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        disabled={isLoading}
                        enterKeyHint="send"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        spellCheck={false}
                        type="email"
                        value={email}
                      />
                    )}
                  </Field>
                  <Button className="w-full" disabled={isLoading} type="submit">
                    {isLoading ? "Sending code…" : "Email me a sign-in code"}
                  </Button>
                </form>

                {providers?.google ? (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 text-xs uppercase tracking-wide">
                      <span className="h-px flex-1 bg-slate-200" />
                      or
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <Button
                      className="w-full"
                      disabled={isLoading}
                      onClick={signInWithGoogle}
                      type="button"
                      variant="secondary"
                    >
                      <GoogleLogo />
                      Continue with Google
                    </Button>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Notice tone="info">
                  We emailed a {OTP_CODE_LENGTH}-digit code to{" "}
                  <span className="font-medium">{normalizedEmail}</span>.{" "}
                  <button
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={editEmail}
                    type="button"
                  >
                    Use a different email
                  </button>
                </Notice>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    verifyCode();
                  }}
                >
                  <Field
                    hint={
                      expiryTime ? (
                        <span className="tabular-nums">
                          Code expires in {formatRemaining(expiryTime, now)}
                        </span>
                      ) : undefined
                    }
                    label="Verification code"
                  >
                    {(props) => (
                      <TextInput
                        {...props}
                        autoComplete="one-time-code"
                        className="text-center font-mono text-2xl tracking-[0.4em]"
                        disabled={isLoading}
                        enterKeyHint="done"
                        inputMode="numeric"
                        onChange={(e) =>
                          setCode(
                            e.target.value
                              .replace(DIGITS_ONLY, "")
                              .slice(0, OTP_CODE_LENGTH)
                          )
                        }
                        pattern="[0-9]*"
                        placeholder="000000"
                        ref={codeRef}
                        required
                        type="text"
                        value={code}
                      />
                    )}
                  </Field>
                  <Button
                    className="w-full"
                    disabled={isLoading || code.length !== OTP_CODE_LENGTH}
                    type="submit"
                  >
                    {isLoading ? "Verifying…" : "Sign in"}
                  </Button>
                </form>
                <p className="m-0 text-center text-slate-600 text-sm">
                  Didn’t get it?{" "}
                  <button
                    className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                    disabled={isLoading}
                    onClick={sendCode}
                    type="button"
                  >
                    Resend code
                  </button>
                </p>
              </>
            )}
            <p className="m-0 text-center text-slate-500 text-xs">
              New instructors need approval before instructor features unlock.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
