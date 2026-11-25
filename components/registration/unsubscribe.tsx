"use client";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Notice, Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";

/**
 * The unsubscribe link in reminder emails. One click opts the address out of
 * reminder and marketing email; class and certificate mail still arrives.
 */
export function UnsubscribePage() {
  const token = useSearchParams().get("token") ?? "";
  const status = useQuery(
    api.emailPreferences.status,
    token ? { token } : "skip"
  );
  const unsubscribe = useMutation(api.emailPreferences.unsubscribe);
  const resubscribe = useMutation(api.emailPreferences.resubscribe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: typeof unsubscribe) => {
    setBusy(true);
    setError("");
    try {
      await action({ token });
    } catch (failure) {
      setError(errorText(failure, "That didn’t work. Try again in a moment."));
    } finally {
      setBusy(false);
    }
  };
  let body: React.ReactNode;
  if (!token) {
    body = (
      <Notice tone="warning">
        This unsubscribe link is missing its code. Open the link from your email
        again.
      </Notice>
    );
  } else if (status === undefined) {
    body = <Skeleton className="h-24" />;
  } else if (status.unsubscribed) {
    body = (
      <div className="space-y-4">
        <Notice tone="success">
          {status.email} is unsubscribed from certificate reminders and
          marketing emails. You’ll still get emails about classes you book and
          certificates we issue.
        </Notice>
        <Button
          disabled={busy}
          onClick={() => run(resubscribe)}
          type="button"
          variant="secondary"
        >
          Resubscribe
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-slate-700">
          Stop certificate renewal reminders and marketing emails to{" "}
          <span className="font-medium">{status.email}</span>?
        </p>
        <Button disabled={busy} onClick={() => run(unsubscribe)} type="button">
          {busy ? "Unsubscribing…" : "Unsubscribe"}
        </Button>
      </div>
    );
  }
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Email preferences</CardTitle>
            <CardDescription>
              Taylored Instruction reminder and marketing emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {body}
            {error ? <Notice tone="danger">{error}</Notice> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
