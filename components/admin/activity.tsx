"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  pluralize,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Money, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type Attention = NonNullable<
  ReturnType<typeof useQuery<typeof api.registrationOperations.attention>>
>;
type ActivityTab = "attention" | "audit";
const PAGE = 25;
const DANGER_ACTION = /cancel|fail|void|exception|refund/u;
const SUCCESS_ACTION = /paid|settled|sent|created|restored|offline|waived/u;

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}
function actionTone(action: string): BadgeTone {
  if (DANGER_ACTION.test(action)) {
    return "danger";
  }
  if (SUCCESS_ACTION.test(action)) {
    return "success";
  }
  return "info";
}

function orderLink(orderId: Id<"registrationOrders">, label: string) {
  return (
    <Link
      className="font-medium text-slate-900 hover:text-primary"
      href={`/admin/registrations?order=${orderId}`}
    >
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Attention                                                           */
/* ------------------------------------------------------------------ */

function AttentionCard({
  title,
  description,
  count,
  tone = "warning",
  action,
  children,
}: {
  title: string;
  description: string;
  count: number;
  tone?: BadgeTone;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (count === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge tone={tone}>{count}</Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function PaymentExceptions({ orders }: { orders: Attention["payments"] }) {
  return (
    <AttentionCard
      count={orders.length}
      description="Stripe reported a payment the system could not reconcile. Open the order to review and settle it."
      title="Payment exceptions"
      tone="danger"
    >
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Order</TH>
            <TH>Purchaser</TH>
            <TH>Error</TH>
            <TH className="text-right">Total</TH>
          </TR>
        </THead>
        <TBody>
          {orders.map((o) => (
            <TR key={o._id}>
              <TD>
                {orderLink(o._id, o.title)}
                <div className="text-slate-500 text-xs">
                  {formatDateTime(o._creationTime)}
                </div>
              </TD>
              <TD>
                <div className="text-slate-900">{o.purchaserName}</div>
                <div className="text-slate-500 text-xs">{o.purchaser}</div>
              </TD>
              <TD className="max-w-md text-rose-700 text-xs">
                {o.error ?? "No details recorded"}
              </TD>
              <TD className="text-right">
                <Money cents={o.total} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </AttentionCard>
  );
}

function FailedEmailRow({ job }: { job: Doc<"registrationJobs"> }) {
  const retry = useMutation(api.registrationOperations.retryEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <TR>
      <TD>
        <div className="font-medium text-slate-900">{job.subject}</div>
        <div className="text-slate-500 text-xs">{job.recipient}</div>
      </TD>
      <TD className="max-w-md text-rose-700 text-xs">
        {job.error ?? "Unknown delivery error"}
        <ResultNotice className="mt-2" message={message} />
      </TD>
      <TD className="tabular-nums">{job.attempts}</TD>
      <TD className="whitespace-nowrap text-slate-500 text-xs">
        {formatRelative(job.due)}
      </TD>
      <TD className="text-right">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await retry({ id: job._id });
              setMessage("Retry queued.");
            } catch (error) {
              setMessage(errorText(error));
            } finally {
              setBusy(false);
            }
          }}
          size="xs"
          type="button"
          variant="secondary"
        >
          {busy ? "Working…" : "Retry"}
        </Button>
      </TD>
    </TR>
  );
}

function FailedEmails({ jobs }: { jobs: Attention["emails"] }) {
  return (
    <AttentionCard
      count={jobs.length}
      description="Deliveries the provider rejected. Retrying resets the attempt counter and sends immediately."
      title="Failed emails"
      tone="danger"
    >
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Email</TH>
            <TH>Error</TH>
            <TH>Attempts</TH>
            <TH>Due</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {jobs.map((job) => (
            <FailedEmailRow job={job} key={job._id} />
          ))}
        </TBody>
      </Table>
    </AttentionCard>
  );
}

function PendingRefunds({ refunds }: { refunds: Attention["refunds"] }) {
  return (
    <AttentionCard
      count={refunds.length}
      description="Refunds requested but not yet confirmed by Stripe. A durable retry runs automatically."
      title="Refunds awaiting confirmation"
    >
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Order</TH>
            <TH className="text-right">Amount</TH>
            <TH>Reason</TH>
            <TH>Provider</TH>
          </TR>
        </THead>
        <TBody>
          {refunds.map((r) => (
            <TR key={r._id}>
              <TD>
                {orderLink(r.orderId, shortId(r.orderId))}
                <div className="text-slate-500 text-xs">
                  {formatDateTime(r._creationTime)}
                </div>
              </TD>
              <TD className="text-right">
                <Money cents={r.cents} />
              </TD>
              <TD className="max-w-xs text-slate-600 text-xs">{r.reason}</TD>
              <TD className="max-w-md text-xs">
                {r.error ? (
                  <span className="text-rose-700">{r.error}</span>
                ) : (
                  <span className="text-slate-500">Awaiting provider</span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </AttentionCard>
  );
}

function UnpaidEnrollments({ orders }: { orders: Attention["unpaid"] }) {
  return (
    <AttentionCard
      count={orders.length}
      description="Seats reserved by staff that still need a payment, card link, or invoice."
      title="Unpaid enrollments"
    >
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Order</TH>
            <TH>Purchaser</TH>
            <TH>Seats</TH>
            <TH className="text-right">Total</TH>
            <TH>Created</TH>
          </TR>
        </THead>
        <TBody>
          {orders.map((o) => (
            <TR key={o._id}>
              <TD>{orderLink(o._id, o.title)}</TD>
              <TD>
                <div className="text-slate-900">{o.purchaserName}</div>
                <div className="text-slate-500 text-xs">{o.purchaser}</div>
              </TD>
              <TD className="tabular-nums">{o.seats.length}</TD>
              <TD className="text-right">
                <Money cents={o.total} />
              </TD>
              <TD className="whitespace-nowrap">
                <div>{formatDateTime(o._creationTime)}</div>
                <div className="text-slate-500 text-xs">
                  {formatRelative(o._creationTime)}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </AttentionCard>
  );
}

function OverdueInvoices({ invoices }: { invoices: Attention["invoices"] }) {
  return (
    <AttentionCard
      action={
        <Button href="/admin/groups?tab=invoices" size="xs" variant="ghost">
          Manage invoices
        </Button>
      }
      count={invoices.length}
      description="Open invoices past their due date. Send reminders or record payments from the Groups page."
      title="Overdue invoices"
      tone="danger"
    >
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Invoice</TH>
            <TH>Bill to</TH>
            <TH className="text-right">Amount</TH>
            <TH>Due</TH>
          </TR>
        </THead>
        <TBody>
          {invoices.map((i) => (
            <TR key={i._id}>
              <TD>
                <Link
                  className="font-medium text-slate-900 hover:text-primary"
                  href="/admin/groups?tab=invoices"
                >
                  {i.number}
                </Link>
              </TD>
              <TD>
                <div className="text-slate-900">{i.billToName}</div>
                <div className="text-slate-500 text-xs">{i.billToEmail}</div>
              </TD>
              <TD className="text-right">
                <Money cents={i.amount + (i.tax ?? 0)} />
              </TD>
              <TD className="whitespace-nowrap">
                <div className="text-rose-700">{formatDate(i.dueAt)}</div>
                <div className="text-slate-500 text-xs">
                  {formatRelative(i.dueAt)}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </AttentionCard>
  );
}

function GroupRequests({ requests }: { requests: Attention["requests"] }) {
  return (
    <AttentionCard
      action={
        <Button href="/admin/groups" size="xs" variant="ghost">
          Open groups
        </Button>
      }
      count={requests.length}
      description="Organizations asking about group training that nobody has contacted yet."
      title="New group requests"
      tone="info"
    >
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Organization</TH>
            <TH>Contact</TH>
            <TH>Headcount</TH>
            <TH>Interest</TH>
            <TH>Received</TH>
          </TR>
        </THead>
        <TBody>
          {requests.map((r) => (
            <TR key={r._id}>
              <TD>
                <Link
                  className="font-medium text-slate-900 hover:text-primary"
                  href="/admin/groups"
                >
                  {r.organization}
                </Link>
              </TD>
              <TD>
                <div className="text-slate-900">{r.contactName}</div>
                <div className="text-slate-500 text-xs">{r.email}</div>
              </TD>
              <TD className="tabular-nums">{r.headcount}</TD>
              <TD className="max-w-xs truncate">{r.courseInterest}</TD>
              <TD className="whitespace-nowrap text-slate-500 text-xs">
                {formatRelative(r._creationTime)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </AttentionCard>
  );
}

function attentionTotal(attention: Attention) {
  return (
    attention.payments.length +
    attention.emails.length +
    attention.refunds.length +
    attention.unpaid.length +
    attention.invoices.length +
    attention.requests.length
  );
}

function AttentionPanel({ attention }: { attention: Attention | undefined }) {
  if (!attention) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (attentionTotal(attention) === 0) {
    return (
      <EmptyState
        description="No failed emails, payment exceptions, pending refunds, unpaid enrollments, overdue invoices, or new group requests."
        icon={<CheckCircle2 aria-hidden="true" className="h-8 w-8" />}
        title="All clear"
      />
    );
  }
  return (
    <div className="space-y-6">
      <PaymentExceptions orders={attention.payments} />
      <FailedEmails jobs={attention.emails} />
      <PendingRefunds refunds={attention.refunds} />
      <UnpaidEnrollments orders={attention.unpaid} />
      <OverdueInvoices invoices={attention.invoices} />
      <GroupRequests requests={attention.requests} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

function Actor({ actor }: { actor: string }) {
  if (actor === "system" || actor === "guest") {
    return <span className="text-slate-400">{actor}</span>;
  }
  return (
    <span className="text-slate-700" title={actor}>
      {shortId(actor)}
    </span>
  );
}

function AuditRow({ row }: { row: Doc<"registrationActivity"> }) {
  return (
    <TR>
      <TD className="whitespace-nowrap">
        <div className="text-slate-900">{formatDateTime(row.at)}</div>
        <div className="text-slate-500 text-xs">{formatRelative(row.at)}</div>
      </TD>
      <TD>
        <Badge className="capitalize" tone={actionTone(row.action)}>
          {row.action.replaceAll("-", " ")}
        </Badge>
      </TD>
      <TD className="text-xs">
        <Actor actor={row.actor} />
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <code className="text-slate-600 text-xs" title={row.entity}>
            {shortId(row.entity)}
          </code>
          <CopyButton label="Copy" value={row.entity} />
        </div>
      </TD>
      <TD className="max-w-lg break-words text-slate-600 text-xs">
        {row.detail}
      </TD>
    </TR>
  );
}

function AuditPanel() {
  const activity = usePaginatedQuery(
    api.registrationOperations.activity,
    {},
    { initialNumItems: PAGE }
  );
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const rows = activity.results.filter(
    (row) =>
      !needle ||
      `${row.action} ${row.detail} ${row.actor}`.toLowerCase().includes(needle)
  );
  let body: React.ReactNode = (
    <Table wrapperClassName="rounded-none border-0">
      <THead>
        <TR>
          <TH>When</TH>
          <TH>Action</TH>
          <TH>Actor</TH>
          <TH>Entity</TH>
          <TH>Detail</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <AuditRow key={row._id} row={row} />
        ))}
      </TBody>
    </Table>
  );
  if (activity.status === "LoadingFirstPage") {
    body = (
      <div className="space-y-2 p-5">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="p-5">
        <EmptyState
          description={
            needle
              ? "Nothing in the loaded entries matches. Load more to search further back."
              : "Staff and system actions will be recorded here."
          }
          title={needle ? "No matching entries" : "No activity yet"}
        />
      </div>
    );
  }
  return (
    <Card>
      <CardHeader className="sm:items-center">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>
            {pluralize(activity.results.length, "entry", "entries")} loaded,
            newest first.
          </CardDescription>
        </div>
        <div className="w-full sm:w-72">
          <TextInput
            aria-label="Filter audit log"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by action, detail, or actor"
            type="search"
            value={filter}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">{body}</CardContent>
      {activity.status === "CanLoadMore" ||
      activity.status === "LoadingMore" ? (
        <div className="border-slate-100 border-t px-5 py-3">
          <Button
            disabled={activity.status === "LoadingMore"}
            onClick={() => activity.loadMore(PAGE)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {activity.status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function ActivityAdmin() {
  const params = useSearchParams();
  const [tab, setTab] = useState<ActivityTab>(
    params.get("tab") === "audit" ? "audit" : "attention"
  );
  const attention = useQuery(api.registrationOperations.attention);
  return (
    <div className="space-y-6">
      <PageHeader
        description="Items that block a customer or a payment, plus the full audit trail."
        title="Activity & attention"
      />
      <Tabs
        label="Activity views"
        onChange={setTab}
        tabs={[
          {
            id: "attention",
            label: "Attention",
            count: attention ? attentionTotal(attention) : undefined,
          },
          { id: "audit", label: "Audit log" },
        ]}
        value={tab}
      />
      <TabPanel active={tab === "attention"} id="attention">
        <AttentionPanel attention={attention} />
      </TabPanel>
      <TabPanel active={tab === "audit"} id="audit">
        <AuditPanel />
      </TabPanel>
    </div>
  );
}
