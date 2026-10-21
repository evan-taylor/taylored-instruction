"use client";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  pluralize,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import {
  Field,
  Money,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/field";
import {
  EmptyState,
  ListState,
  Notice,
  ResultNotice,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatMoney, INVOICE_TERMS_DAYS } from "@/shared/registration/domain";

type InvoiceRow = {
  invoice: Doc<"registrationInvoices">;
  order: Doc<"registrationOrders"> | null;
};
type InvoiceStatus = Doc<"registrationInvoices">["status"];

export const TERMS: { days: number; label: string }[] = [
  { days: 0, label: "Due on receipt" },
  { days: 15, label: "Net 15" },
  { days: 30, label: "Net 30" },
  { days: 45, label: "Net 45" },
  { days: 60, label: "Net 60" },
];

export type InvoiceDraft = {
  billToName: string;
  billToEmail: string;
  billToAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  poNumber: string;
  notes: string;
  dueDays: number;
};
export const emptyInvoiceDraft: InvoiceDraft = {
  billToName: "",
  billToEmail: "",
  billToAddress: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  poNumber: "",
  notes: "Thank you for training with Taylored Instruction.",
  dueDays: INVOICE_TERMS_DAYS,
};

export type PostalAddress = {
  city: string;
  state: string;
  postalCode: string;
  country: string;
};
/** City, state, ZIP, and country inputs shared by invoices and organizations. */
export function AddressFields({
  value,
  onChange,
}: {
  value: PostalAddress;
  onChange: (patch: Partial<PostalAddress>) => void;
}) {
  return (
    <>
      <Field label="City" required>
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => onChange({ city: e.target.value })}
            value={value.city}
          />
        )}
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="State" required>
          {(p) => (
            <TextInput
              {...p}
              maxLength={2}
              onChange={(e) =>
                onChange({ state: e.target.value.toUpperCase() })
              }
              placeholder="WA"
              value={value.state}
            />
          )}
        </Field>
        <Field label="ZIP" required>
          {(p) => (
            <TextInput
              {...p}
              inputMode="numeric"
              onChange={(e) => onChange({ postalCode: e.target.value })}
              value={value.postalCode}
            />
          )}
        </Field>
        <Field label="Country">
          {(p) => (
            <TextInput
              {...p}
              maxLength={2}
              onChange={(e) =>
                onChange({ country: e.target.value.toUpperCase() })
              }
              value={value.country}
            />
          )}
        </Field>
      </div>
    </>
  );
}
/** Bill-to and terms fields shared by the create modal and the group wizard. */
export function InvoiceFields({
  value,
  onChange,
}: {
  value: InvoiceDraft;
  onChange: (value: InvoiceDraft) => void;
}) {
  const set = (patch: Partial<InvoiceDraft>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Bill to" required>
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ billToName: e.target.value })}
            placeholder="Accounts payable contact or organization"
            value={value.billToName}
          />
        )}
      </Field>
      <Field
        hint="The invoice and payment link are emailed here."
        label="Billing email"
        required
      >
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ billToEmail: e.target.value })}
            type="email"
            value={value.billToEmail}
          />
        )}
      </Field>
      <Field
        className="sm:col-span-2"
        hint="Stripe Tax calculates sales tax from this address."
        label="Street address"
        required
      >
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ billToAddress: e.target.value })}
            value={value.billToAddress}
          />
        )}
      </Field>
      <AddressFields onChange={(patch) => set(patch)} value={value} />
      <Field label="PO number">
        {(p) => (
          <TextInput
            {...p}
            onChange={(e) => set({ poNumber: e.target.value })}
            value={value.poNumber}
          />
        )}
      </Field>
      <Field label="Payment terms">
        {(p) => (
          <Select
            {...p}
            onChange={(e) => set({ dueDays: Number(e.target.value) })}
            value={value.dueDays}
          >
            {TERMS.map((t) => (
              <option key={t.days} value={t.days}>
                {t.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        className="sm:col-span-2"
        hint="Printed in the invoice footer."
        label="Invoice notes"
      >
        {(p) => (
          <TextArea
            {...p}
            onChange={(e) => set({ notes: e.target.value })}
            value={value.notes}
          />
        )}
      </Field>
    </div>
  );
}

function dueBadge(invoice: Doc<"registrationInvoices">) {
  if (invoice.status !== "open") {
    return null;
  }
  const overdue = invoice.dueAt < Date.now();
  return (
    <Badge tone={overdue ? "danger" : "info"}>
      {overdue ? "Overdue" : `Due ${formatRelative(invoice.dueAt)}`}
    </Badge>
  );
}

function InvoiceActions({
  row,
  onMessage,
}: {
  row: InvoiceRow;
  onMessage: (text: string) => void;
}) {
  const issue = useAction(api.registrationInvoiceActions.issue);
  const remind = useMutation(api.registrationGroups.remindInvoice);
  const record = useMutation(api.registrationGroups.recordInvoicePayment);
  const voidInvoice = useMutation(api.registrationGroups.voidInvoice);
  const [dialog, setDialog] = useState<"record" | "void" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { invoice } = row;
  async function run(task: () => Promise<string>) {
    setBusy(true);
    try {
      onMessage(await task());
      setDialog(null);
      setReason("");
    } catch (error) {
      onMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  const closed = invoice.status === "paid" || invoice.status === "void";
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {invoice.hostedUrl ? (
        <a
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary text-xs hover:underline"
          href={invoice.hostedUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          Open
        </a>
      ) : null}
      {invoice.status === "draft" ? (
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const url = await issue({ id: invoice._id });
              return `Invoice ${invoice.number} sent. Pay link: ${url}`;
            })
          }
          size="xs"
          type="button"
        >
          {busy ? "Sending…" : "Send invoice"}
        </Button>
      ) : null}
      {invoice.status === "open" ? (
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              await remind({ id: invoice._id });
              return `Reminder queued for ${invoice.billToEmail}`;
            })
          }
          size="xs"
          type="button"
          variant="secondary"
        >
          Send reminder
        </Button>
      ) : null}
      {closed ? null : (
        <>
          <Button
            onClick={() => setDialog("record")}
            size="xs"
            type="button"
            variant="secondary"
          >
            Record payment
          </Button>
          <Button
            onClick={() => setDialog("void")}
            size="xs"
            type="button"
            variant="ghost"
          >
            Void
          </Button>
        </>
      )}
      <ConfirmDialog
        busy={busy}
        confirmLabel="Record payment"
        description={`Marks ${invoice.number} paid for ${formatMoney(invoice.amount + (invoice.tax ?? 0))}, settles the order, and releases materials. The hosted Stripe invoice is closed so it cannot be paid twice.`}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          run(async () => {
            await record({ id: invoice._id, reason });
            return `Payment recorded for ${invoice.number}; materials are being delivered.`;
          })
        }
        open={dialog === "record"}
        title="Record offline payment"
      >
        <Field label="How was it paid?" required>
          {(p) => (
            <TextInput
              {...p}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Check #1042, ACH, purchase card…"
              value={reason}
            />
          )}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        busy={busy}
        confirmLabel="Void invoice"
        danger
        description="Voiding cancels this invoice and its payment link. The enrollment stays awaiting payment so you can invoice again or send a card payment link."
        onClose={() => setDialog(null)}
        onConfirm={() =>
          run(async () => {
            await voidInvoice({ id: invoice._id, reason });
            return `Invoice ${invoice.number} voided.`;
          })
        }
        open={dialog === "void"}
        title={`Void ${invoice.number}?`}
      >
        <Field label="Reason" required>
          {(p) => (
            <TextInput
              {...p}
              onChange={(e) => setReason(e.target.value)}
              value={reason}
            />
          )}
        </Field>
      </ConfirmDialog>
    </div>
  );
}

function createLabel(busy: boolean, sendNow: boolean) {
  if (busy) {
    return "Working…";
  }
  return sendNow ? "Create and send" : "Create draft";
}

export function CreateInvoiceModal({
  open,
  onClose,
  orderId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  orderId?: Id<"registrationOrders">;
  onCreated?: (id: Id<"registrationInvoices">) => void;
}) {
  const unpaid = usePaginatedQuery(
    api.registrationOperations.orders,
    { unpaid: true },
    { initialNumItems: 50 }
  );
  const organizations = useQuery(api.registrationGroups.organizations);
  const create = useMutation(api.registrationGroups.createInvoice);
  const issue = useAction(api.registrationInvoiceActions.issue);
  const [selected, setSelected] = useState<Id<"registrationOrders"> | "">(
    orderId ?? ""
  );
  const [organizationId, setOrganizationId] = useState<
    Id<"registrationOrganizations"> | ""
  >("");
  const [draft, setDraft] = useState<InvoiceDraft>(emptyInvoiceDraft);
  const [sendNow, setSendNow] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const order = useQuery(
    api.registrationOperations.order,
    selected ? { orderId: selected } : "skip"
  );
  useEffect(() => {
    if (!order) {
      return;
    }
    const organization = organizations?.find(
      (o) => o._id === (organizationId || order.organizationId)
    );
    setDraft((current) => ({
      ...current,
      billToName:
        current.billToName || organization?.name || order.purchaserName,
      billToEmail:
        current.billToEmail || organization?.contactEmail || order.purchaser,
      billToAddress: current.billToAddress || organization?.address || "",
      city: current.city || organization?.city || "",
      state: current.state || organization?.state || "",
      postalCode: current.postalCode || organization?.postalCode || "",
      country: current.country || organization?.country || "US",
    }));
  }, [order, organizations, organizationId]);
  return (
    <Modal
      description="Invoices are only for enrollments awaiting payment. Totals come from the order and cannot be edited here."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              !order ||
              !draft.billToName ||
              !draft.billToEmail ||
              !draft.city ||
              !draft.state ||
              !draft.postalCode
            }
            onClick={async () => {
              if (!order) {
                return;
              }
              setBusy(true);
              setMessage("");
              try {
                const id = await create({
                  orderId: order._id,
                  ...draft,
                  organizationId: organizationId || undefined,
                });
                let text = "Invoice created as a draft.";
                if (sendNow) {
                  const url = await issue({ id });
                  text = `Invoice sent to ${draft.billToEmail}. Pay link: ${url}`;
                }
                onCreated?.(id);
                setMessage(text);
              } catch (error) {
                setMessage(String(error));
              } finally {
                setBusy(false);
              }
            }}
            size="sm"
            type="button"
          >
            {createLabel(busy, sendNow)}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="Create invoice"
    >
      <div className="space-y-5">
        <Field
          hint="Only orders awaiting payment can be invoiced."
          label="Order"
          required
        >
          {(p) => (
            <Select
              {...p}
              onChange={(e) =>
                setSelected(e.target.value as Id<"registrationOrders"> | "")
              }
              value={selected}
            >
              <option value="">Choose an unpaid enrollment…</option>
              {(order && !unpaid.results.some((o) => o._id === order._id)
                ? [order, ...unpaid.results]
                : unpaid.results
              ).map((o) => (
                <option key={o._id} value={o._id}>
                  {o.title} · {o.purchaserName} ·{" "}
                  {pluralize(o.seats.length, "seat")} · {formatMoney(o.total)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {unpaid.status === "CanLoadMore" ? (
          <Button
            onClick={() => unpaid.loadMore(50)}
            type="button"
            variant="secondary"
          >
            Load more unpaid orders
          </Button>
        ) : null}
        {order ? (
          <Notice tone="info">
            Invoicing <strong>{formatMoney(order.total)}</strong> for{" "}
            {pluralize(order.seats.length, "attendee")} in {order.title}.
          </Notice>
        ) : null}
        <Field label="Organization">
          {(p) => (
            <Select
              {...p}
              onChange={(e) =>
                setOrganizationId(
                  e.target.value as Id<"registrationOrganizations"> | ""
                )
              }
              value={organizationId}
            >
              <option value="">No organization</option>
              {organizations
                ?.filter((o) => !o.archived)
                .map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <InvoiceFields onChange={setDraft} value={draft} />
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={sendNow}
            className="h-4 w-4 accent-primary"
            onChange={(e) => setSendNow(e.target.checked)}
            type="checkbox"
          />
          Send the invoice email now with a hosted pay link
        </label>
        <ResultNotice message={message} />
      </div>
    </Modal>
  );
}

function InvoiceRowView({
  row,
  onMessage,
}: {
  row: InvoiceRow;
  onMessage: (text: string) => void;
}) {
  return (
    <TR key={row.invoice._id}>
      <TD>
        <div className="flex items-center gap-2 font-mono text-slate-900 text-xs">
          {row.invoice.number}
          <CopyButton label="Copy" value={row.invoice.number} />
        </div>
        <div className="text-slate-500 text-xs">
          Created {formatDateTime(row.invoice._creationTime)}
          {row.invoice.poNumber ? ` · PO ${row.invoice.poNumber}` : ""}
        </div>
      </TD>
      <TD>
        <div className="text-slate-900">{row.invoice.billToName}</div>
        <div className="text-slate-500 text-xs">{row.invoice.billToEmail}</div>
      </TD>
      <TD>
        {row.order ? (
          <>
            <Link
              className="text-slate-900 hover:text-primary"
              href={`/admin/registrations?order=${row.order._id}`}
            >
              {row.order.title}
            </Link>
            <div className="text-slate-500 text-xs">
              {pluralize(row.order.seats.length, "attendee")} ·{" "}
              <StatusBadge status={row.order.status} />
            </div>
          </>
        ) : (
          <span className="text-slate-400">Order removed</span>
        )}
      </TD>
      <TD className="text-right">
        <Money cents={row.invoice.amount + (row.invoice.tax ?? 0)} />
        {row.invoice.tax ? (
          <div className="text-slate-500 text-xs">
            incl. <Money cents={row.invoice.tax} /> tax
          </div>
        ) : null}
      </TD>
      <TD>
        <div className="text-slate-900">{formatDate(row.invoice.dueAt)}</div>
        <div className="mt-0.5">{dueBadge(row.invoice)}</div>
      </TD>
      <TD>
        <StatusBadge status={row.invoice.status} />
        {row.invoice.method ? (
          <div className="mt-0.5 text-slate-500 text-xs capitalize">
            {row.invoice.method === "stripe" ? "Paid online" : "Paid offline"}
          </div>
        ) : null}
        {row.invoice.error ? (
          <div
            className="mt-0.5 max-w-48 truncate text-rose-700 text-xs"
            title={row.invoice.error}
          >
            {row.invoice.error}
          </div>
        ) : null}
      </TD>
      <TD>
        <InvoiceActions onMessage={onMessage} row={row} />
      </TD>
    </TR>
  );
}

export function InvoicesPanel({
  focusOrder,
}: {
  focusOrder?: Id<"registrationOrders">;
}) {
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const invoicePage = usePaginatedQuery(
    api.registrationGroups.invoices,
    status ? { status } : {},
    { initialNumItems: 50 }
  );
  const rows =
    invoicePage.status === "LoadingFirstPage" ? undefined : invoicePage.results;
  const [creating, setCreating] = useState(Boolean(focusOrder));
  const [message, setMessage] = useState("");
  const open = rows?.filter((r) => r.invoice.status === "open") ?? [];
  const outstanding = open.reduce(
    (sum, r) => sum + r.invoice.amount + (r.invoice.tax ?? 0),
    0
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Field label="Status">
            {(p) => (
              <Select
                {...p}
                className="w-44"
                onChange={(e) =>
                  setStatus(e.target.value as InvoiceStatus | "")
                }
                value={status}
              >
                <option value="">All invoices</option>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="void">Voided</option>
              </Select>
            )}
          </Field>
          {rows ? (
            <p className="m-0 pb-2 text-slate-500 text-sm">
              {pluralize(open.length, "open invoice")} ·{" "}
              <Money cents={outstanding} /> outstanding in the loaded invoices
            </p>
          ) : null}
        </div>
        <Button onClick={() => setCreating(true)} size="sm" type="button">
          <FileText aria-hidden="true" className="h-4 w-4" />
          Create invoice
        </Button>
      </div>
      <ResultNotice message={message} />
      <ListState
        empty={rows?.length === 0}
        emptyState={
          <EmptyState
            action={
              <Button onClick={() => setCreating(true)} size="sm" type="button">
                Create invoice
              </Button>
            }
            description="Create an unpaid group enrollment, then invoice it with net terms and a hosted pay link."
            icon={<FileText aria-hidden="true" className="h-8 w-8" />}
            title="No invoices yet"
          />
        }
        loading={rows === undefined}
        skeletonClassName="h-48"
      >
        <Table>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Bill to</TH>
              <TH>Order</TH>
              <TH className="text-right">Amount</TH>
              <TH>Due</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {(rows ?? []).map((row) => (
              <InvoiceRowView
                key={row.invoice._id}
                onMessage={setMessage}
                row={row}
              />
            ))}
          </TBody>
        </Table>
      </ListState>
      {invoicePage.status === "CanLoadMore" ? (
        <Button
          onClick={() => invoicePage.loadMore(50)}
          type="button"
          variant="secondary"
        >
          Load more invoices
        </Button>
      ) : null}
      {creating ? (
        <CreateInvoiceModal
          onClose={() => setCreating(false)}
          open={creating}
          orderId={focusOrder}
        />
      ) : null}
    </div>
  );
}
