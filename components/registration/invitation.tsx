"use client";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/_generated/api";
export function InvitationActions() {
  const decline = useMutation(api.registrationWaitlist.decline);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setToken(
      new URLSearchParams(window.location.hash.slice(1)).get("invitation") ?? ""
    );
  }, []);
  if (!token) {
    return null;
  }
  return (
    <aside className="rounded border p-4">
      <p>
        You have a reserved opening. Register using the invited attendee’s email
        before the expiry shown in your email.
      </p>
      <Button
        onClick={async () => {
          try {
            await decline({ token });
            setMessage(
              "Invitation declined; the next person can be offered the opening."
            );
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
        variant="outline"
      >
        Decline this opening
      </Button>
      <p role="status">{message}</p>
    </aside>
  );
}
