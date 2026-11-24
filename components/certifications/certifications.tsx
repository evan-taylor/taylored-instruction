"use client";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { BadgeCheck, FileText, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  agencyLabel,
  CERTIFICATION_AGENCIES,
  CERTIFICATION_TYPES,
  type CertificationAgency,
  certificationToday,
  formatCertificationDate,
  typeLabel,
} from "@/shared/instructor-certifications";

export type CertificationRow = NonNullable<
  FunctionReturnType<typeof api.instructorCertifications.mine>
>["certifications"][number];

const ACCEPT = "application/pdf,image/jpeg,image/png";

/** Today's Pacific date, updated when it rolls over so open pages re-query. */
export function useCertificationToday() {
  const [today, setToday] = useState(() => certificationToday());
  useEffect(() => {
    const timer = setInterval(() => setToday(certificationToday()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}

export function CertificationStatusBadge({
  daysLeft,
  superseded,
}: {
  daysLeft: number;
  superseded?: boolean;
}) {
  if (superseded) {
    return <Badge tone="neutral">Replaced by newer card</Badge>;
  }
  if (daysLeft < 0) {
    return <Badge tone="danger">Expired</Badge>;
  }
  if (daysLeft === 0) {
    return <Badge tone="danger">Expires today</Badge>;
  }
  if (daysLeft <= 90) {
    return (
      <Badge tone="warning">
        Expires in {daysLeft} {daysLeft === 1 ? "day" : "days"}
      </Badge>
    );
  }
  return <Badge tone="success">Valid</Badge>;
}

type FormState = {
  agency: CertificationAgency;
  agencyOther: string;
  type: string;
  typeOther: string;
  number: string;
  issuedOn: string;
  expiresOn: string;
};

const EMPTY: FormState = {
  agency: "arc",
  agencyOther: "",
  type: "",
  typeOther: "",
  number: "",
  issuedOn: "",
  expiresOn: "",
};

function toForm(row?: CertificationRow): FormState {
  if (!row) {
    return EMPTY;
  }
  return {
    agency: row.agency,
    agencyOther: row.agencyOther ?? "",
    type: row.type,
    typeOther: row.typeOther ?? "",
    number: row.number ?? "",
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
  };
}

/** Add or edit one certification. Staff pass `userId` to act for an instructor. */
export function CertificationForm({
  open,
  onClose,
  certification,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  certification?: CertificationRow;
  userId?: Id<"users">;
}) {
  const save = useMutation(api.instructorCertifications.save);
  const upload = useAction(api.instructorCertifications.uploadCard);
  const formId = useId();
  const [form, setForm] = useState<FormState>(() => toForm(certification));
  // Set once a new record is saved, so retrying a failed upload updates it.
  const [savedId, setSavedId] = useState<
    Id<"instructorCertifications"> | undefined
  >();
  // Bumped on every open, so a save still running from a closed form can't
  // write its result into the next one.
  const session = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      session.current += 1;
      setForm(toForm(certification));
      setSavedId(undefined);
      setFile(null);
      setError("");
    }
  }, [open, certification]);
  const set = (patch: Partial<FormState>) =>
    setForm((previous) => ({ ...previous, ...patch }));

  const submit = async () => {
    const started = session.current;
    setBusy(true);
    setError("");
    try {
      const id = await save({
        id: certification?.id ?? savedId,
        userId,
        agency: form.agency,
        agencyOther: form.agency === "other" ? form.agencyOther : undefined,
        type: form.type,
        typeOther: form.type === "other" ? form.typeOther : undefined,
        number: form.number,
        issuedOn: form.issuedOn,
        expiresOn: form.expiresOn,
      });
      if (session.current !== started) {
        return;
      }
      setSavedId(id);
      if (file) {
        await upload({ id, name: file.name, bytes: await file.arrayBuffer() });
      }
      onClose();
    } catch (failure) {
      if (session.current === started) {
        setError(errorText(failure));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      description="Enter the details exactly as they appear on the card."
      footer={
        <>
          <Button
            disabled={busy}
            onClick={onClose}
            size="sm"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button disabled={busy} form={formId} size="sm" type="submit">
            {busy ? "Saving…" : "Save certification"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={certification ? "Edit certification" : "Add a certification"}
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          submit().catch(() => undefined);
        }}
      >
        <Field label="Agency" required>
          {(props) => (
            <Select
              {...props}
              onChange={(event) =>
                set({ agency: event.target.value as CertificationAgency })
              }
              required
              value={form.agency}
            >
              {CERTIFICATION_AGENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {form.agency === "other" ? (
          <Field label="Agency name" required>
            {(props) => (
              <TextInput
                {...props}
                maxLength={80}
                onChange={(event) => set({ agencyOther: event.target.value })}
                required
                value={form.agencyOther}
              />
            )}
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Certification" required>
          {(props) => (
            <Select
              {...props}
              onChange={(event) => set({ type: event.target.value })}
              required
              value={form.type}
            >
              <option disabled value="">
                Choose a certification
              </option>
              {CERTIFICATION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {form.type === "other" ? (
          <Field label="Certification name" required>
            {(props) => (
              <TextInput
                {...props}
                maxLength={80}
                onChange={(event) => set({ typeOther: event.target.value })}
                required
                value={form.typeOther}
              />
            )}
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field className="sm:col-span-2" label="Certificate or ID number">
          {(props) => (
            <TextInput
              {...props}
              autoComplete="off"
              maxLength={80}
              onChange={(event) => set({ number: event.target.value })}
              value={form.number}
            />
          )}
        </Field>
        <Field label="Issue date" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(event) => set({ issuedOn: event.target.value })}
              required
              type="date"
              value={form.issuedOn}
            />
          )}
        </Field>
        <Field label="Expiration date" required>
          {(props) => (
            <TextInput
              {...props}
              min={form.issuedOn || undefined}
              onChange={(event) => set({ expiresOn: event.target.value })}
              required
              type="date"
              value={form.expiresOn}
            />
          )}
        </Field>
        <Field
          className="sm:col-span-2"
          hint={
            certification?.card
              ? `Choosing a file replaces ${certification.card.name}. PDF, JPEG, or PNG up to 3 MB.`
              : "Optional. PDF, JPEG, or PNG up to 3 MB."
          }
          label="Copy of the card"
        >
          {(props) => (
            <input
              {...props}
              accept={ACCEPT}
              className="block w-full text-slate-700 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium file:text-slate-800 hover:file:bg-slate-200"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          )}
        </Field>
        {error ? (
          <Notice className="sm:col-span-2" tone="danger">
            {error}
          </Notice>
        ) : null}
      </form>
    </Modal>
  );
}

function CertificationItem({
  row,
  staff,
  onEdit,
}: {
  row: CertificationRow;
  staff: boolean;
  onEdit: () => void;
}) {
  const remove = useMutation(api.instructorCertifications.remove);
  const setVerified = useMutation(api.instructorCertifications.setVerified);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const title = typeLabel(row.type, row.typeOther);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{title}</span>
            <CertificationStatusBadge
              daysLeft={row.daysLeft}
              superseded={row.superseded}
            />
            {row.verified ? (
              <Badge title={`Verified by ${row.verified.by}`} tone="info">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Verified by staff
              </Badge>
            ) : null}
          </div>
          <p className="text-slate-600 text-sm">
            {agencyLabel(row.agency, row.agencyOther)}
            {row.number ? <> · ID {row.number}</> : null}
          </p>
          <p className="text-slate-500 text-sm tabular-nums">
            Issued {formatCertificationDate(row.issuedOn)} · Expires{" "}
            {formatCertificationDate(row.expiresOn)}
          </p>
          {row.card?.url ? (
            <a
              className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
              href={row.card.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              {row.card.name}
            </a>
          ) : (
            <p className="text-slate-400 text-sm">No card uploaded</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {staff ? (
            <Button
              onClick={() => {
                setError("");
                setVerified({ id: row.id, verified: !row.verified }).catch(
                  (failure) => setError(errorText(failure))
                );
              }}
              size="xs"
              variant="secondary"
            >
              {row.verified ? "Remove verification" : "Mark verified"}
            </Button>
          ) : null}
          <Button onClick={onEdit} size="xs" variant="secondary">
            Edit
          </Button>
          <Button onClick={() => setConfirming(true)} size="xs" variant="ghost">
            Remove
          </Button>
        </div>
      </div>
      {error ? (
        <Notice className="mt-3" tone="danger">
          {error}
        </Notice>
      ) : null}
      <ConfirmDialog
        confirmLabel="Remove certification"
        danger
        description={`This deletes ${title} and its uploaded card. Reminder and audit history stay.`}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await remove({ id: row.id });
          setConfirming(false);
        }}
        open={confirming}
        title="Remove this certification?"
      />
    </li>
  );
}

/** A list of certifications with add, edit, remove and (for staff) verify. */
export function CertificationList({
  certifications,
  userId,
  staff = false,
  emptyText,
}: {
  certifications: CertificationRow[];
  userId?: Id<"users">;
  staff?: boolean;
  emptyText: string;
}) {
  const [editing, setEditing] = useState<CertificationRow | "new" | null>(null);
  return (
    <div className="space-y-4">
      {certifications.length ? (
        <ul className="list-none divide-y divide-slate-100 p-0">
          {certifications.map((row) => (
            <CertificationItem
              key={row.id}
              onEdit={() => setEditing(row)}
              row={row}
              staff={staff}
            />
          ))}
        </ul>
      ) : (
        <p className="text-slate-600 text-sm">{emptyText}</p>
      )}
      <Button onClick={() => setEditing("new")} size="sm" variant="secondary">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add certification
      </Button>
      <CertificationForm
        certification={
          editing === "new" || editing === null ? undefined : editing
        }
        onClose={() => setEditing(null)}
        open={editing !== null}
        userId={userId}
      />
    </div>
  );
}

/** The instructor's own certifications on their account page. */
export function MyCertificationsCard() {
  const today = useCertificationToday();
  const mine = useQuery(api.instructorCertifications.mine, { today });
  if (mine === null) {
    return null;
  }
  return (
    <Card id="certifications">
      <CardHeader>
        <div>
          <CardTitle>Instructor certifications</CardTitle>
          <CardDescription>
            We email you 90, 30 and 7 days before a certification expires, and
            on the day. Only you and Taylored Instruction staff can see these.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {mine === undefined ? (
          <Skeleton className="h-24" />
        ) : (
          <CertificationList
            certifications={mine.certifications}
            emptyText="Add each instructor certification you hold so we can remind you before it expires."
          />
        )}
      </CardContent>
    </Card>
  );
}
