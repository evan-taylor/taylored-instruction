"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Message = { text: string; tone: "success" | "danger" } | null;

function when(ms: number) {
  return new Date(ms).toLocaleDateString("en-US");
}

function InvitationStatus({
  acceptedAt,
  revokedAt,
}: {
  acceptedAt?: number;
  revokedAt?: number;
}) {
  if (acceptedAt) {
    return <Badge tone="success">Accepted {when(acceptedAt)}</Badge>;
  }
  if (revokedAt) {
    return <Badge tone="neutral">Revoked {when(revokedAt)}</Badge>;
  }
  return <Badge tone="warning">Pending</Badge>;
}

/** Invite instructors by email and track who has accepted. */
export function Invitations() {
  const invitations = useQuery(api.instructorInvitations.list);
  const invite = useMutation(api.instructorInvitations.invite);
  const revoke = useMutation(api.instructorInvitations.revoke);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function send(target: string) {
    setBusy(true);
    setMessage(null);
    try {
      await invite({ email: target });
      setMessage({ text: `Invitation emailed to ${target}.`, tone: "success" });
      setEmail("");
    } catch (error) {
      setMessage({ text: errorText(error), tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Invite an instructor</CardTitle>
          <CardDescription>
            They sign in with this email, accept the invitation on their account
            page, and instructor access is granted. Nobody can become an
            instructor without one.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            send(email);
          }}
        >
          <div className="flex-1">
            <Field label="Email address">
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  value={email}
                />
              )}
            </Field>
          </div>
          <Button disabled={busy} type="submit">
            {busy ? "Sending…" : "Send invitation"}
          </Button>
        </form>
        {invitations?.length ? (
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Status</TH>
                <TH>Invited</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {invitations.map((row) => {
                const pending = !(row.acceptedAt || row.revokedAt);
                return (
                  <TR key={row.id}>
                    <TD className="font-medium text-slate-900">{row.email}</TD>
                    <TD>
                      <InvitationStatus
                        acceptedAt={row.acceptedAt}
                        revokedAt={row.revokedAt}
                      />
                    </TD>
                    <TD className="whitespace-nowrap text-slate-600">
                      {when(row.createdAt)}
                      {row.invitedBy ? (
                        <span className="block text-slate-500 text-xs">
                          by {row.invitedBy}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="whitespace-nowrap text-right">
                      {pending ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            aria-label={`Resend invitation to ${row.email}`}
                            disabled={busy}
                            onClick={() => send(row.email)}
                            size="xs"
                            type="button"
                            variant="secondary"
                          >
                            Resend
                          </Button>
                          <Button
                            aria-label={`Revoke invitation for ${row.email}`}
                            disabled={busy}
                            onClick={async () => {
                              setMessage(null);
                              try {
                                await revoke({
                                  id: row.id as Id<"instructorInvitations">,
                                });
                              } catch (error) {
                                setMessage({
                                  text: errorText(error),
                                  tone: "danger",
                                });
                              }
                            }}
                            size="xs"
                            type="button"
                            variant="danger"
                          >
                            Revoke
                          </Button>
                        </div>
                      ) : null}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <p className="text-slate-500 text-sm">No invitations sent yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
