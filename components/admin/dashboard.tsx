"use client";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  formatDateTime,
  formatRelative,
  formatWeekday,
  pluralize,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Money } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { Meter, StatTile } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/shared/registration/domain";

function AttentionRow({
  count,
  label,
  href,
  tone = "warning",
}: {
  count: number;
  label: string;
  href: string;
  tone?: "warning" | "danger" | "info";
}) {
  if (count === 0) {
    return null;
  }
  return (
    <li>
      <Link
        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50"
        href={href}
      >
        <span className="flex items-center gap-2 text-slate-800">
          <Badge tone={tone}>{count}</Badge>
          {label}
        </span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-slate-400" />
      </Link>
    </li>
  );
}

export function AdminDashboard() {
  const summary = useQuery(api.registrationDashboard.summary);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  if (!summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton className="h-24" key={k} />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  const attentionTotal =
    summary.failedEmails +
    summary.paymentExceptions +
    summary.pendingRefunds +
    summary.overdueInvoices +
    summary.newGroupRequests +
    summary.lowStock.length;
  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button
              href="/admin/groups?tab=enroll"
              size="sm"
              variant="secondary"
            >
              Group enrollment
            </Button>
            <Button href="/admin/sessions?new=1" size="sm">
              New session
            </Button>
          </>
        }
        description="Registrations, payments, and fulfillment at a glance."
        title="Dashboard"
      />
      {summary.sampled ? (
        <Notice tone="info">
          This overview has reached its display limit. Figures summarize up to
          200 recent orders and upcoming sessions, and up to 50 items in each
          attention category; they are not complete account totals. Use order
          history and provider records for complete financial reporting.
        </Notice>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          hint={`${pluralize(summary.seatsSold, "seat")} across ${pluralize(summary.ordersSettled, "order")} in ${summary.windowDays} days`}
          icon={<Banknote aria-hidden="true" className="h-5 w-5" />}
          label="Payments including tax"
          tone="primary"
          value={formatMoney(summary.revenue)}
        />
        <StatTile
          hint={
            summary.seatsCapacity
              ? `${summary.seatsReserved} of ${summary.seatsCapacity} seats reserved`
              : "No open sessions scheduled"
          }
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          label="Upcoming sessions"
          value={summary.upcomingSessions}
        />
        <StatTile
          hint={pluralize(summary.unpaidOrders, "enrollment")}
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          label="Awaiting payment"
          tone={summary.unpaidOrders ? "warning" : "neutral"}
          value={formatMoney(summary.unpaidTotal)}
        />
        <StatTile
          hint={
            summary.overdueInvoices
              ? `${pluralize(summary.overdueInvoices, "invoice")} overdue`
              : pluralize(summary.openInvoices, "open invoice")
          }
          icon={<FileText aria-hidden="true" className="h-5 w-5" />}
          label="Open invoices"
          tone={summary.overdueInvoices ? "danger" : "neutral"}
          value={formatMoney(summary.openInvoiceTotal)}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Next sessions</CardTitle>
              <CardDescription>
                Open sessions in start order, with live seat counts.
              </CardDescription>
            </div>
            <Button href="/admin/sessions" size="xs" variant="ghost">
              All sessions
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {summary.nextSessions.length ? (
              <Table wrapperClassName="rounded-none border-0">
                <THead>
                  <TR>
                    <TH>Starts</TH>
                    <TH>Session</TH>
                    <TH>Seats</TH>
                    <TH>Visibility</TH>
                    <TH className="text-right">Share</TH>
                  </TR>
                </THead>
                <TBody>
                  {summary.nextSessions.map((s) => (
                    <TR key={s._id}>
                      <TD className="whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {formatWeekday(s.firstStart, s.timeZone)}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {formatRelative(s.firstStart)}
                        </div>
                      </TD>
                      <TD>
                        <Link
                          className="font-medium text-slate-900 hover:text-primary"
                          href={`/admin/sessions?session=${s._id}`}
                        >
                          {s.title}
                        </Link>
                        <div className="text-slate-500 text-xs">
                          {pluralize(s.meetings.length, "meeting")} ·{" "}
                          {s.publication}
                        </div>
                      </TD>
                      <TD>
                        <Meter
                          label={`${s.reserved} of ${s.capacity} seats reserved`}
                          max={s.capacity}
                          value={s.reserved}
                        />
                      </TD>
                      <TD>
                        <StatusBadge status={s.visibility} />
                      </TD>
                      <TD className="text-right">
                        <CopyButton value={`${origin}/s/${s.code}`} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <div className="p-5">
                <EmptyState
                  action={
                    <Button href="/admin/sessions?new=1" size="sm">
                      Schedule a session
                    </Button>
                  }
                  description="Create a session from a course template to start taking registrations."
                  title="No upcoming sessions"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>
                Items that block a customer or a payment.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {attentionTotal === 0 ? (
              <div className="flex items-center gap-3 px-3 py-6 text-emerald-700 text-sm">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                All clear. Nothing is waiting on you.
              </div>
            ) : (
              <ul className="m-0 list-none space-y-0.5 p-0">
                <AttentionRow
                  count={summary.paymentExceptions}
                  href="/admin/registration-activity"
                  label="Payments needing reconciliation"
                  tone="danger"
                />
                <AttentionRow
                  count={summary.failedEmails}
                  href="/admin/registration-activity"
                  label="Failed emails to retry"
                  tone="danger"
                />
                <AttentionRow
                  count={summary.pendingRefunds}
                  href="/admin/registration-activity"
                  label="Refunds awaiting confirmation"
                />
                <AttentionRow
                  count={summary.overdueInvoices}
                  href="/admin/groups?tab=invoices"
                  label="Overdue invoices"
                  tone="danger"
                />
                <AttentionRow
                  count={summary.newGroupRequests}
                  href="/admin/groups"
                  label="New group training requests"
                  tone="info"
                />
                <AttentionRow
                  count={summary.lowStock.length}
                  href="/admin/materials"
                  label="Keycode inventories running low"
                />
              </ul>
            )}
            {summary.lowStock.length ? (
              <div className="mt-2 border-slate-100 border-t px-3 pt-3">
                <p className="m-0 mb-1 flex items-center gap-1.5 font-medium text-slate-600 text-xs">
                  <AlertTriangle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-amber-600"
                  />
                  Low stock
                </p>
                <ul className="m-0 list-none space-y-1 p-0 text-sm">
                  {summary.lowStock.map((m) => (
                    <li className="flex justify-between gap-2" key={m.id}>
                      <span className="truncate text-slate-800">{m.title}</span>
                      <span className="text-slate-500 tabular-nums">
                        {pluralize(m.available, "code")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>
                Newest checkouts, invoices, and staff enrollments.
              </CardDescription>
            </div>
            <Button href="/admin/registrations" size="xs" variant="ghost">
              All registrations
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {summary.recentOrders.length ? (
              <Table wrapperClassName="rounded-none border-0">
                <THead>
                  <TR>
                    <TH>Order</TH>
                    <TH>Purchaser</TH>
                    <TH>Seats</TH>
                    <TH className="text-right">Total</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {summary.recentOrders.map((o) => (
                    <TR key={o._id}>
                      <TD>
                        <Link
                          className="font-medium text-slate-900 hover:text-primary"
                          href={`/admin/registrations?order=${o._id}`}
                        >
                          {o.title}
                        </Link>
                        <div className="text-slate-500 text-xs">
                          {formatDateTime(o._creationTime)}
                        </div>
                      </TD>
                      <TD>
                        <div className="text-slate-900">{o.purchaserName}</div>
                        <div className="text-slate-500 text-xs">
                          {o.purchaser}
                        </div>
                      </TD>
                      <TD className="tabular-nums">{o.seats.length}</TD>
                      <TD className="text-right">
                        <Money cents={o.total} />
                      </TD>
                      <TD>
                        <StatusBadge status={o.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <div className="p-5">
                <EmptyState
                  description="Orders appear here as soon as someone registers."
                  title="No orders yet"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Audit trail of staff and system actions.
              </CardDescription>
            </div>
            <Button
              href="/admin/registration-activity"
              size="xs"
              variant="ghost"
            >
              Full log
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {summary.recentActivity.map((row) => (
                <li className="px-5 py-3" key={row._id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 text-sm capitalize">
                      {row.action.replaceAll("-", " ")}
                    </span>
                    <span className="whitespace-nowrap text-slate-400 text-xs">
                      {formatRelative(row.at)}
                    </span>
                  </div>
                  <p className="m-0 mt-0.5 truncate text-slate-500 text-xs">
                    {row.detail}
                  </p>
                </li>
              ))}
              {summary.recentActivity.length === 0 ? (
                <li className="px-5 py-6 text-slate-500 text-sm">
                  No activity recorded yet.
                </li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
