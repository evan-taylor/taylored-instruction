"use client";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/dialog";
import { Field, TextArea, TextInput, Toggle } from "@/components/ui/field";
import { ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export type OrganizationDraft = {
  name: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  address: string;
  notes: string;
  archived: boolean;
};
export const emptyOrganization: OrganizationDraft = {
  name: "",
  contactName: "",
  contactEmail: "",
  phone: "",
  address: "",
  notes: "",
  archived: false,
};
export function draftFromOrganization(
  organization: Doc<"registrationOrganizations">
): OrganizationDraft {
  const { _id, _creationTime, ...fields } = organization;
  return fields;
}

/** Shared organization fields used by the editor modal and the enrollment wizard. */
export function OrganizationFields({
  value,
  onChange,
  compact = false,
}: {
  value: OrganizationDraft;
  onChange: (value: OrganizationDraft) => void;
  compact?: boolean;
}) {
  const set = (patch: Partial<OrganizationDraft>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" label="Organization name" required>
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Acme Dental Group"
            value={value.name}
          />
        )}
      </Field>
      <Field label="Billing contact">
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ contactName: e.target.value })}
            value={value.contactName}
          />
        )}
      </Field>
      <Field label="Contact email">
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ contactEmail: e.target.value })}
            type="email"
            value={value.contactEmail}
          />
        )}
      </Field>
      <Field label="Phone">
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ phone: e.target.value })}
            type="tel"
            value={value.phone}
          />
        )}
      </Field>
      <Field label="Billing address">
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Street, city, state ZIP"
            value={value.address}
          />
        )}
      </Field>
      {compact ? null : (
        <>
          <Field
            className="sm:col-span-2"
            hint="Internal only; never shown to the customer."
            label="Notes"
          >
            {(p) => (
              <TextArea
                {...p}
                onChange={(e) => set({ notes: e.target.value })}
                value={value.notes}
              />
            )}
          </Field>
          <Toggle
            checked={value.archived}
            className="sm:col-span-2"
            description="Archived organizations stay on past orders but are hidden from pickers."
            label="Archived"
            onChange={(archived) => set({ archived })}
          />
        </>
      )}
    </div>
  );
}

export function OrganizationModal({
  open,
  onClose,
  organization,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  organization?: Doc<"registrationOrganizations"> | null;
  initial?: Partial<OrganizationDraft>;
  onSaved?: (id: Id<"registrationOrganizations">) => void;
}) {
  const save = useMutation(api.registrationGroups.saveOrganization);
  const [draft, setDraft] = useState<OrganizationDraft>(() =>
    organization
      ? draftFromOrganization(organization)
      : { ...emptyOrganization, ...initial }
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      description="Organizations group orders and invoices for a company, school, or agency."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={busy || !draft.name.trim()}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                const id = await save({ id: organization?._id, ...draft });
                onSaved?.(id);
                onClose();
              } catch (error) {
                setMessage(String(error));
              } finally {
                setBusy(false);
              }
            }}
            size="sm"
            type="button"
          >
            {busy ? "Saving…" : "Save organization"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title={organization ? "Edit organization" : "New organization"}
    >
      <div className="space-y-4">
        <OrganizationFields onChange={setDraft} value={draft} />
        <ResultNotice message={message} />
      </div>
    </Modal>
  );
}
