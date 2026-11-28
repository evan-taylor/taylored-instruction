"use client";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type Seat = Doc<"registrationSeats">;

const WHITESPACE = /\s+/u;

function initialForm(seat: Seat) {
  const { attendee } = seat.snapshot;
  const [first = "", ...rest] = seat.name.trim().split(WHITESPACE);
  return {
    firstName: attendee.firstName ?? first,
    lastName: attendee.lastName ?? rest.join(" "),
    email: seat.email,
    phone: attendee.phone ?? "",
    reason: "",
  };
}

/** Lets an admin correct an attendee's name, email and phone. */
export function EditAttendeeButton({
  seat,
  onDone,
  size = "xs",
  variant = "ghost",
}: {
  seat: Seat;
  onDone: (message: string) => void;
  size?: "xs" | "sm";
  variant?: "ghost" | "outline";
}) {
  const update = useMutation(api.registrationAttendees.updateContact);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(seat));
  if (seat.state === "transferred") {
    return null;
  }
  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const emailChanged =
    form.email.trim().toLowerCase() !== seat.email && form.email.trim() !== "";
  return (
    <>
      <Button
        aria-label={`Edit details for ${seat.name}`}
        onClick={() => {
          setForm(initialForm(seat));
          setOpen(true);
        }}
        size={size}
        type="button"
        variant={variant}
      >
        Edit
      </Button>
      <ConfirmDialog
        confirmLabel="Save details"
        description="Fixes the attendee's name and contact details on this registration. Invoices, sent emails and issued certificates keep the original details."
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          await update({
            seatId: seat._id,
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            reason: form.reason,
          });
          setOpen(false);
          onDone(
            `Updated details for ${form.firstName.trim()} ${form.lastName.trim()}.`
          );
        }}
        open={open}
        title={`Edit ${seat.name}`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="off"
                onChange={(e) => set("firstName")(e.target.value)}
                value={form.firstName}
              />
            )}
          </Field>
          <Field label="Last name" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="off"
                onChange={(e) => set("lastName")(e.target.value)}
                value={form.lastName}
              />
            )}
          </Field>
          <Field
            className="sm:col-span-2"
            hint={
              emailChanged
                ? "The student will sign in with the new email to see this registration, and the old email loses access. No email is sent."
                : "The student signs in with this email to see the registration."
            }
            label="Email"
            required
          >
            {(props) => (
              <TextInput
                {...props}
                autoComplete="off"
                inputMode="email"
                onChange={(e) => set("email")(e.target.value)}
                spellCheck={false}
                type="email"
                value={form.email}
              />
            )}
          </Field>
          <Field className="sm:col-span-2" label="Phone">
            {(props) => (
              <TextInput
                {...props}
                autoComplete="off"
                inputMode="tel"
                onChange={(e) => set("phone")(e.target.value)}
                type="tel"
                value={form.phone}
              />
            )}
          </Field>
          <Field
            className="sm:col-span-2"
            hint="Optional. Saved in the activity log."
            label="Reason"
          >
            {(props) => (
              <TextInput
                {...props}
                maxLength={500}
                onChange={(e) => set("reason")(e.target.value)}
                placeholder="Typo at checkout"
                value={form.reason}
              />
            )}
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
