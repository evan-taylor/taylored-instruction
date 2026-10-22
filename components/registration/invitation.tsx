"use client";
import { useMutation } from "convex/react";
import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { errorText } from "./errors";

/** Shown when the URL hash carries a waitlist invitation token. */
export function InvitationActions() {
  const decline = useMutation(api.registrationWaitlist.decline);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  useEffect(() => {
    setToken(
      new URLSearchParams(window.location.hash.slice(1)).get("invitation") ?? ""
    );
  }, []);
  if (!token) {
    return null;
  }
  return (
    <aside
      aria-label="Waitlist invitation"
      className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-primary shadow-xs">
          <Ticket aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            You have a reserved opening
          </p>
          <p className="mt-0.5 text-slate-600 text-sm">
            Register using the invited attendee’s email before the expiry shown
            in your email. If you no longer need the seat, decline it so the
            next person can be offered the opening.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={busy || declined}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await decline({ token });
              setDeclined(true);
              setMessage(
                "Invitation declined. The next person can be offered the opening."
              );
            } catch (error) {
              setMessage(errorText(error));
            } finally {
              setBusy(false);
            }
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {busy ? "Working…" : "Decline this opening"}
        </Button>
      </div>
      <ResultNotice message={message} tone={declined ? "success" : "danger"} />
    </aside>
  );
}
