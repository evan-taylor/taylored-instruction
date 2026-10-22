"use client";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Field, TextArea, TextInput, Toggle } from "@/components/ui/field";
import {
  EmptyState,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type Location = Doc<"registrationLocations">;
type LocationDraft = {
  id?: Id<"registrationLocations">;
  name: string;
  address: string;
  instructions: string;
  archived: boolean;
};
const blankLocation: LocationDraft = {
  name: "",
  address: "",
  instructions: "",
  archived: false,
};
function draftFrom(location: Location): LocationDraft {
  return {
    id: location._id,
    name: location.name,
    address: location.address,
    instructions: location.instructions,
    archived: location.archived,
  };
}

function LocationEditorModal({
  draft,
  onChange,
  onClose,
  onSubmit,
  busy,
  message,
}: {
  draft: LocationDraft;
  onChange: (draft: LocationDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
  message: string;
}) {
  const formId = useId();
  return (
    <Modal
      description="Saved locations fill in the venue and private instructions when you schedule meetings."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={busy} form={formId} size="sm" type="submit">
            {busy ? "Working…" : "Save location"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="md"
      title={draft.id ? "Edit location" : "New location"}
    >
      <form
        className="space-y-4"
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Name" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="Vancouver training center"
              required
              value={draft.name}
            />
          )}
        </Field>
        <Field
          hint="Shown to attendees on confirmations and calendar invites."
          label="Public address"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onChange({ ...draft, address: e.target.value })}
              required
              value={draft.address}
            />
          )}
        </Field>
        <Field
          hint="Parking, entry codes, or room directions. Sent only to registered attendees."
          label="Private instructions"
        >
          {(props) => (
            <TextArea
              {...props}
              onChange={(e) =>
                onChange({ ...draft, instructions: e.target.value })
              }
              value={draft.instructions}
            />
          )}
        </Field>
        <Toggle
          checked={draft.archived}
          description="Archived locations stay on past sessions but are hidden from the meeting picker."
          label="Archived"
          onChange={(archived) => onChange({ ...draft, archived })}
        />
        <ResultNotice message={message} />
      </form>
    </Modal>
  );
}

function LocationsTable({
  locations,
  onEdit,
}: {
  locations: Location[];
  onEdit: (location: Location) => void;
}) {
  return (
    <Table wrapperClassName="rounded-none border-0">
      <THead>
        <TR>
          <TH>Name</TH>
          <TH>Address</TH>
          <TH>Private instructions</TH>
          <TH>Status</TH>
          <TH className="text-right">
            <span className="sr-only">Actions</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {locations.map((l) => (
          <TR key={l._id}>
            <TD className="font-medium text-slate-900">{l.name}</TD>
            <TD>{l.address}</TD>
            <TD className="max-w-xs">
              <span className="block truncate text-slate-500">
                {l.instructions || "—"}
              </span>
            </TD>
            <TD>
              {l.archived ? (
                <Badge tone="neutral">Archived</Badge>
              ) : (
                <Badge tone="success">Active</Badge>
              )}
            </TD>
            <TD className="text-right">
              <Button
                aria-label={`Edit ${l.name}`}
                onClick={() => onEdit(l)}
                size="xs"
                type="button"
                variant="ghost"
              >
                Edit
              </Button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/** Saved venues used by session meetings: table of locations plus an editor dialog. */
export function LocationsPanel() {
  const locations = useQuery(api.registrationOperations.locations);
  const save = useMutation(api.registrationOperations.saveLocation);
  const [draft, setDraft] = useState<LocationDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submit = async () => {
    if (!draft) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await save({
        id: draft.id,
        name: draft.name,
        address: draft.address,
        instructions: draft.instructions,
        archived: draft.archived,
      });
      setNotice(`Saved ${draft.name}.`);
      setDraft(null);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  };
  const openNew = () => {
    setNotice("");
    setError("");
    setDraft(blankLocation);
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Saved locations</CardTitle>
          <CardDescription>
            Reusable venues with public addresses and private arrival notes.
          </CardDescription>
        </div>
        <Button onClick={openNew} size="sm" type="button">
          New location
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {notice ? <ResultNotice className="m-4" message={notice} /> : null}
        {locations === undefined ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : null}
        {locations && locations.length === 0 ? (
          <div className="p-5">
            <EmptyState
              action={
                <Button onClick={openNew} size="sm" type="button">
                  Add a location
                </Button>
              }
              description="Save your training center once and pick it for every meeting."
              title="No saved locations"
            />
          </div>
        ) : null}
        {locations && locations.length > 0 ? (
          <LocationsTable
            locations={locations}
            onEdit={(l) => {
              setNotice("");
              setError("");
              setDraft(draftFrom(l));
            }}
          />
        ) : null}
      </CardContent>
      {draft ? (
        <LocationEditorModal
          busy={busy}
          draft={draft}
          message={error}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSubmit={submit}
        />
      ) : null}
    </Card>
  );
}

/** Legacy name kept for existing imports. */
export { LocationsPanel as LocationEditor };
