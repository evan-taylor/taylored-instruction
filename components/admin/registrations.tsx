"use client";
import { useClientMediaQuery } from "@silk-hq/components";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { Fragment, useEffect, useState } from "react";
import {
  type BulkResult,
  BulkResults,
  BulkTransfer,
} from "@/components/registration/bulk-transfer";
import { errorText } from "@/components/registration/errors";
import {
  formatDateTime,
  formatRelative,
  pluralize,
} from "@/components/registration/format";
import {
  CancelSeatButton,
  charged,
  ManualEnrollment,
  OrderInvoices,
  OrderPayments,
  ReasonDialog,
  refundable,
  SeatOperations,
} from "@/components/registration/operations";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Money, TextInput, Toggle } from "@/components/ui/field";
import {
  DescriptionList,
  EmptyState,
  Notice,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/shared/registration/domain";
import { MaterialBalances, OrderMaterialEditor } from "./order-materials";

type Order = Doc<"registrationOrders">;
type OrderId = Id<"registrationOrders">;
type StatusTab = "all" | Order["status"];

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "settled", label: "Paid" },
  { id: "unpaid", label: "Awaiting payment" },
  { id: "hold", label: "Reserving" },
  { id: "exception", label: "Needs review" },
  { id: "expired", label: "Expired" },
];
const PAGE = 20;

function matches(order: Order, needle: string) {
  if (!needle) {
    return true;
  }
  const haystack = [
    order.title,
    order.purchaser,
    order.purchaserName,
    ...order.seats.flatMap((seat) => [seat.attendee.name, seat.attendee.email]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

/* ------------------------------------------------------------------ */
/* Order detail                                                        */
/* ------------------------------------------------------------------ */

function TaxCodes({ lines }: { lines: Order["seats"][number]["lines"] }) {
  const codes = [...new Set(lines.map((line) => line.taxCode).filter(Boolean))];
  if (codes.length === 0) {
    return null;
  }
  return (
    <div className="text-slate-500 text-xs" title="Stripe tax codes">
      {codes.join(", ")}
    </div>
  );
}

function AttendeesTable({ order }: { order: Order }) {
  const seats = useQuery(api.registrationOperations.orderSeats, {
    orderId: order._id,
  });
  const [expanded, setExpanded] = useState<Id<"registrationSeats"> | null>(
    null
  );
  const wide = useClientMediaQuery("(min-width: 640px)");
  const [notice, setNotice] = useState("");
  if (!seats) {
    return <Skeleton className="h-24" />;
  }
  if (seats.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        No seats have been created for this order yet.
      </p>
    );
  }
  const toggle = (seat: (typeof seats)[number]) =>
    setExpanded(expanded === seat._id ? null : seat._id);
  // One layout at a time, so an expanded attendee's editing state is not
  // duplicated into a hidden copy that would surface on rotation.
  if (!wide) {
    return (
      <div className="space-y-3">
        <ResultNotice message={notice} />
        <ul className="list-none space-y-3 p-0">
          {seats.map((seat) => {
            const open = expanded === seat._id;
            return (
              <li
                className="rounded-lg border border-slate-200 bg-white p-4"
                key={seat._id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-900">
                      {seat.name}
                    </p>
                    <p className="break-all text-slate-500 text-xs">
                      {seat.email}
                      {seat.snapshot.attendee.phone
                        ? ` · ${seat.snapshot.attendee.phone}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={seat.state} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500 text-xs uppercase tracking-wide">
                      Materials
                    </dt>
                    <dd className="tabular-nums">
                      {seat.snapshot.materials.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs uppercase tracking-wide">
                      Seat total
                    </dt>
                    <dd>
                      <Money cents={seat.snapshot.total} />
                      <TaxCodes lines={seat.snapshot.lines} />
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    aria-expanded={open}
                    onClick={() => toggle(seat)}
                    size="sm"
                    type="button"
                    variant={open ? "secondary" : "outline"}
                  >
                    {open ? "Hide" : "Manage"}
                  </Button>
                  <CancelSeatButton
                    onDone={setNotice}
                    seat={seat}
                    size="sm"
                    variant="secondary"
                  />
                </div>
                {open ? (
                  <div className="mt-3 rounded-md bg-slate-50 p-3">
                    <OrderMaterialEditor order={order} seat={seat} />
                    <SeatOperations seat={seat} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <ResultNotice message={notice} />
      <Table>
        <THead>
          <TR>
            <TH>Attendee</TH>
            <TH>State</TH>
            <TH>Materials</TH>
            <TH className="text-right">Seat total</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {seats.map((seat) => {
            const open = expanded === seat._id;
            return (
              <Fragment key={seat._id}>
                <TR>
                  <TD>
                    <div className="font-medium text-slate-900">
                      {seat.name}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {seat.email}
                      {seat.snapshot.attendee.phone
                        ? ` · ${seat.snapshot.attendee.phone}`
                        : ""}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge status={seat.state} />
                  </TD>
                  <TD className="tabular-nums">
                    {seat.snapshot.materials.length}
                  </TD>
                  <TD className="text-right">
                    <Money cents={seat.snapshot.total} />
                    <TaxCodes lines={seat.snapshot.lines} />
                  </TD>
                  <TD className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        aria-expanded={open}
                        aria-label={`${open ? "Hide" : "Manage"} ${seat.name}`}
                        onClick={() => toggle(seat)}
                        size="xs"
                        type="button"
                        variant={open ? "secondary" : "ghost"}
                      >
                        {open ? "Hide" : "Manage"}
                      </Button>
                      <CancelSeatButton
                        onDone={setNotice}
                        seat={seat}
                        variant="ghost"
                      />
                    </div>
                  </TD>
                </TR>
                {open ? (
                  <TR className="hover:bg-slate-50">
                    <TD className="bg-slate-50 p-4" colSpan={5}>
                      <OrderMaterialEditor order={order} seat={seat} />
                      <SeatOperations seat={seat} />
                    </TD>
                  </TR>
                ) : null}
              </Fragment>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-base text-slate-900">{title}</h3>
        {description ? (
          <p className="text-slate-500 text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function orderFacts(order: Order) {
  const items: { label: string; value: React.ReactNode }[] = [
    {
      label: "Purchaser",
      value: (
        <>
          <span className="block">{order.purchaserName}</span>
          <span className="block text-slate-500 text-xs">
            {order.purchaser}
          </span>
        </>
      ),
    },
    { label: "Status", value: <StatusBadge status={order.status} /> },
    {
      label: "Source",
      value: order.source ? <Badge>{order.source}</Badge> : "—",
    },
    { label: "Created", value: formatDateTime(order._creationTime) },
    {
      label: "Settled",
      value: order.settledAt ? formatDateTime(order.settledAt) : "—",
    },
    { label: "Subtotal", value: <Money cents={order.total} /> },
    {
      label: "Sales tax",
      value: order.tax === undefined ? "—" : <Money cents={order.tax} />,
    },
    { label: "Total charged", value: <Money cents={charged(order)} /> },
    { label: "Refunded", value: <Money cents={order.refunded} /> },
    {
      label: "Refundable remaining",
      value: order.paymentIntent ? <Money cents={refundable(order)} /> : "—",
    },
    {
      label: "Coupon uses",
      value: order.couponId
        ? `${order.couponUses} used · ${order.restoredUses} restored`
        : "—",
    },
  ];
  if (order.pricingNote) {
    items.push({ label: "Pricing note", value: order.pricingNote });
  }
  if (order.organizationId) {
    items.push({
      label: "Organization",
      value: <code className="text-xs">{order.organizationId}</code>,
    });
  }
  if (order.error) {
    items.push({
      label: "Last error",
      value: <span className="text-rose-700">{order.error}</span>,
    });
  }
  return items;
}

function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="space-y-8">
      <DescriptionList items={orderFacts(order)} />
      <Section
        description="Expand an attendee to manage materials, cancel, transfer, or override completion."
        title="Attendees"
      >
        <AttendeesTable order={order} />
      </Section>
      <MaterialBalances order={order} />
      <Section title="Payments">
        <OrderPayments order={order} />
      </Section>
      <Section
        description="Invoice actions (send, remind, record payment, void) live on the Groups page."
        title="Invoices"
      >
        <OrderInvoices order={order} />
      </Section>
    </div>
  );
}

function OrderModal({
  orderId,
  loaded,
  onClose,
}: {
  orderId: OrderId | null;
  loaded: Order[];
  onClose: () => void;
}) {
  const fetched = useQuery(
    api.registrationOperations.order,
    orderId ? { orderId } : "skip"
  );
  // Fall back to the loaded list only while the direct lookup is in flight.
  const order =
    fetched === undefined
      ? loaded.find((o) => o._id === orderId)
      : (fetched ?? undefined);
  const pending = fetched === undefined && !order;
  let body: React.ReactNode = (
    <Notice tone="warning">
      This order could not be found. It may have been removed, or the link is
      out of date.
    </Notice>
  );
  if (order) {
    body = <OrderDetail order={order} />;
  } else if (pending) {
    body = (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  return (
    <Modal
      description={
        order
          ? `${order.purchaserName} · ${pluralize(order.seats.length, "seat")} · ${formatMoney(charged(order))}`
          : undefined
      }
      onClose={onClose}
      open={orderId !== null}
      size="xl"
      title={order?.title ?? "Order"}
    >
      {body}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk actions                                                        */
/* ------------------------------------------------------------------ */

function useBulkActions(orders: Order[], selected: OrderId[]) {
  const cancelOrder = useMutation(api.registrationOperations.cancelOrderSeats);
  const requestRefund = useMutation(api.registrationPayments.requestRefund);
  const refund = useAction(api.registrationExternal.refund);
  const [results, setResults] = useState<BulkResult[]>([]);
  const label = (orderId: OrderId) =>
    orders.find((o) => o._id === orderId)?.title ?? orderId;
  const cancelAll = async (reason: string, notify: boolean) => {
    const rows = await Promise.all(
      selected.map(async (orderId): Promise<BulkResult> => {
        try {
          const { canceled, skipped } = await cancelOrder({
            orderId,
            reason,
            notify,
          });
          return {
            key: orderId,
            label: label(orderId),
            ok: true,
            detail: `${canceled} canceled${skipped ? `, ${skipped} already canceled or transferred` : ""}`,
          };
        } catch (error) {
          return {
            key: orderId,
            label: label(orderId),
            ok: false,
            detail: errorText(error),
          };
        }
      })
    );
    setResults(rows);
  };
  const refundAll = async (reason: string) => {
    const rows = await Promise.all(
      selected.map(async (orderId): Promise<BulkResult> => {
        try {
          const order = orders.find((o) => o._id === orderId);
          if (!order) {
            throw new Error("Order is no longer loaded; reload and retry");
          }
          const cents = refundable(order);
          if (cents <= 0) {
            throw new Error("Nothing left to refund");
          }
          const id = await requestRefund({
            orderId,
            cents,
            reason,
            key: crypto.randomUUID(),
          });
          await refund({ id });
          return {
            key: orderId,
            label: order.title,
            ok: true,
            detail: `Refunded ${formatMoney(cents)}`,
          };
        } catch (error) {
          return {
            key: orderId,
            label: label(orderId),
            ok: false,
            detail: errorText(error),
          };
        }
      })
    );
    setResults(rows);
  };
  return { results, cancelAll, refundAll };
}

function BulkBar({
  orders,
  selected,
  onClear,
}: {
  orders: Order[];
  selected: OrderId[];
  onClear: () => void;
}) {
  const [dialog, setDialog] = useState<"cancel" | "refund" | "transfer" | null>(
    null
  );
  const [notify, setNotify] = useState(true);
  const { results, cancelAll, refundAll } = useBulkActions(orders, selected);
  const close = () => setDialog(null);
  const total = selected.reduce((sum, id) => {
    const order = orders.find((o) => o._id === id);
    return sum + (order ? refundable(order) : 0);
  }, 0);
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800 text-sm">
            <Badge tone="primary">{selected.length}</Badge>
            {selected.length === 1 ? "order selected" : "orders selected"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setDialog("transfer")}
              size="xs"
              type="button"
              variant="secondary"
            >
              Transfer selected
            </Button>
            <Button
              onClick={() => setDialog("refund")}
              size="xs"
              type="button"
              variant="secondary"
            >
              Refund remaining
            </Button>
            <Button
              onClick={() => setDialog("cancel")}
              size="xs"
              type="button"
              variant="secondary"
            >
              Cancel selected
            </Button>
            <Button onClick={onClear} size="xs" type="button" variant="ghost">
              Clear
            </Button>
          </div>
        </div>
        <BulkResults results={results} />
      </CardContent>
      <ReasonDialog
        confirmLabel="Cancel registrations"
        danger
        description={`Cancels every seat in ${pluralize(selected.length, "order")}. Payments are not refunded.`}
        onClose={close}
        onConfirm={(reason) => cancelAll(reason, notify)}
        open={dialog === "cancel"}
        title="Cancel selected registrations"
      >
        <Toggle
          checked={notify}
          description="Each attendee receives a cancellation email."
          label="Notify attendees"
          onChange={setNotify}
        />
      </ReasonDialog>
      <ReasonDialog
        confirmLabel="Refund"
        danger
        description={`Refunds the full remaining card payment on each selected order (${formatMoney(total)} in total). Orders without a Stripe payment are reported as failed.`}
        onClose={close}
        onConfirm={refundAll}
        open={dialog === "refund"}
        title="Refund remaining payments"
      />
      <Modal
        onClose={close}
        open={dialog === "transfer"}
        size="lg"
        title="Transfer selected registrations"
      >
        <BulkTransfer orders={selected} />
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Orders table                                                        */
/* ------------------------------------------------------------------ */

function OrderRow({
  order,
  checked,
  onToggle,
  onOpen,
}: {
  order: Order;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <TR>
      <TD className="w-10">
        <input
          aria-label={`Select ${order.title} for ${order.purchaserName}`}
          checked={checked}
          className="h-4 w-4 rounded-sm accent-primary"
          onChange={onToggle}
          type="checkbox"
        />
      </TD>
      <TD>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{order.title}</span>
          {order.source ? <Badge>{order.source}</Badge> : null}
        </div>
        <div className="text-slate-500 text-xs">
          {formatDateTime(order._creationTime)} ·{" "}
          {formatRelative(order._creationTime)}
        </div>
      </TD>
      <TD>
        <div className="text-slate-900">{order.purchaserName}</div>
        <div className="text-slate-500 text-xs">{order.purchaser}</div>
      </TD>
      <TD className="tabular-nums">{order.seats.length}</TD>
      <TD className="text-right">
        <Money cents={charged(order)} />
        {order.tax ? (
          <div className="text-slate-500 text-xs">
            incl. <Money cents={order.tax} /> tax
          </div>
        ) : null}
        {order.refunded > 0 ? (
          <div className="text-slate-500 text-xs">
            <Money cents={order.refunded} /> refunded
          </div>
        ) : null}
      </TD>
      <TD>
        <StatusBadge status={order.status} />
      </TD>
      <TD className="text-right">
        <Button onClick={onOpen} size="xs" type="button" variant="ghost">
          Open
        </Button>
      </TD>
    </TR>
  );
}

function OrdersTable({
  orders,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
}: {
  orders: Order[];
  selected: OrderId[];
  onToggle: (id: OrderId) => void;
  onToggleAll: () => void;
  onOpen: (id: OrderId) => void;
}) {
  const allSelected =
    orders.length > 0 && orders.every((o) => selected.includes(o._id));
  return (
    <Table wrapperClassName="rounded-none border-0">
      <THead>
        <TR>
          <TH className="w-10">
            <input
              aria-label="Select all visible orders"
              checked={allSelected}
              className="h-4 w-4 rounded-sm accent-primary"
              onChange={onToggleAll}
              type="checkbox"
            />
          </TH>
          <TH>Order</TH>
          <TH>Purchaser</TH>
          <TH>Seats</TH>
          <TH className="text-right">Total</TH>
          <TH>Status</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {orders.map((order) => (
          <OrderRow
            checked={selected.includes(order._id)}
            key={order._id}
            onOpen={() => onOpen(order._id)}
            onToggle={() => onToggle(order._id)}
            order={order}
          />
        ))}
      </TBody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function useOrderParam() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const orderId = params.get("order") as OrderId | null;
  const setOrderId = (id: OrderId | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) {
      next.set("order", id);
    } else {
      next.delete("order");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };
  return { orderId, setOrderId, openNew: params.get("new") === "1" };
}

function useVisibleOrders(search: string, tab: StatusTab) {
  const paginated = usePaginatedQuery(
    api.registrationOperations.orders,
    {},
    { initialNumItems: PAGE }
  );
  const trimmed = search.trim();
  const byEmail = trimmed.includes("@");
  const [debounced, setDebounced] = useState(trimmed);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), 300);
    return () => clearTimeout(timer);
  }, [trimmed]);
  const lookup = useQuery(
    api.registrationDashboard.lookup,
    byEmail && debounced.includes("@") ? { email: debounced } : "skip"
  );
  const [lastLookup, setLastLookup] = useState<typeof lookup>();
  useEffect(() => {
    if (lookup !== undefined) {
      setLastLookup(lookup);
    }
  }, [lookup]);
  const emailOrders = (lookup ?? lastLookup)?.orders ?? [];
  const needle = trimmed.toLowerCase();
  const base = byEmail
    ? emailOrders
    : paginated.results.filter((order) => matches(order, needle));
  const loading =
    paginated.status === "LoadingFirstPage" ||
    (byEmail && !(lookup ?? lastLookup));
  const countFor = (id: StatusTab) => {
    if (loading) {
      return;
    }
    return id === "all"
      ? base.length
      : base.filter((o) => o.status === id).length;
  };
  const counts = Object.fromEntries(
    STATUS_TABS.map((t) => [t.id, countFor(t.id)])
  ) as Record<StatusTab, number | undefined>;
  const visible = tab === "all" ? base : base.filter((o) => o.status === tab);
  const known = [...paginated.results, ...emailOrders];
  return { paginated, byEmail, visible, counts, known, loading };
}

function emptyDescription(search: string, byEmail: boolean) {
  if (!search) {
    return "Orders appear here as soon as someone registers or staff enroll an attendee.";
  }
  return byEmail
    ? "No orders list this address as purchaser or attendee."
    : "Nothing in the loaded orders matches. Try the full email address to search all orders.";
}

function OrdersBody({
  loading,
  visible,
  byEmail,
  search,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onNew,
}: {
  loading: boolean;
  visible: Order[];
  byEmail: boolean;
  search: string;
  selected: OrderId[];
  onToggle: (id: OrderId) => void;
  onToggleAll: () => void;
  onOpen: (id: OrderId) => void;
  onNew: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-5">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }
  if (visible.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          action={
            <Button onClick={onNew} size="sm" type="button">
              Manual enrollment
            </Button>
          }
          description={emptyDescription(search, byEmail)}
          title={search ? "No matching orders" : "No orders yet"}
        />
      </div>
    );
  }
  return (
    <OrdersTable
      onOpen={onOpen}
      onToggle={onToggle}
      onToggleAll={onToggleAll}
      orders={visible}
      selected={selected}
    />
  );
}

export function OrderAdmin() {
  const { orderId, setOrderId, openNew } = useOrderParam();
  const [enrollOpen, setEnrollOpen] = useState(openNew);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");
  const [selected, setSelected] = useState<OrderId[]>([]);
  const { paginated, byEmail, visible, counts, known, loading } =
    useVisibleOrders(search, tab);
  const toggle = (id: OrderId) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  const toggleAll = () =>
    setSelected((current) =>
      visible.every((o) => current.includes(o._id))
        ? current.filter((id) => !visible.some((o) => o._id === id))
        : [...new Set([...current, ...visible.map((o) => o._id)])]
    );
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              href="/admin/groups?tab=enroll"
              size="sm"
              variant="secondary"
            >
              Group enrollment & invoices
            </Button>
            <Button onClick={() => setEnrollOpen(true)} size="sm" type="button">
              Manual enrollment
            </Button>
          </>
        }
        description="Every order with its attendees, payments, refunds, and invoices."
        title="Registrations"
      />
      <Card>
        <CardHeader className="sm:items-center">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              {byEmail
                ? "Showing every order where this address is the purchaser or an attendee."
                : "Type part of a course, purchaser, or attendee to filter loaded orders; enter a full email to search all orders."}
            </CardDescription>
          </div>
          <div className="w-full sm:w-80">
            <TextInput
              aria-label="Search orders"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, course, or email"
              type="search"
              value={search}
            />
          </div>
        </CardHeader>
        <div className="px-5">
          <Tabs
            label="Order status"
            onChange={setTab}
            tabs={STATUS_TABS.map((t) => ({ ...t, count: counts[t.id] }))}
            value={tab}
          />
        </div>
        <CardContent className="p-0">
          <OrdersBody
            byEmail={byEmail}
            loading={loading}
            onNew={() => setEnrollOpen(true)}
            onOpen={setOrderId}
            onToggle={toggle}
            onToggleAll={toggleAll}
            search={search.trim()}
            selected={selected}
            visible={visible}
          />
        </CardContent>
        {!byEmail &&
        (paginated.status === "CanLoadMore" ||
          paginated.status === "LoadingMore") ? (
          <div className="border-slate-100 border-t px-5 py-3">
            <Button
              disabled={paginated.status === "LoadingMore"}
              onClick={() => paginated.loadMore(PAGE)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {paginated.status === "LoadingMore" ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </Card>
      {selected.length ? (
        <BulkBar
          onClear={() => setSelected([])}
          orders={known}
          selected={selected}
        />
      ) : null}
      <Modal
        description="Create a single-seat order on behalf of an attendee. For rosters and invoices use Group enrollment."
        onClose={() => setEnrollOpen(false)}
        open={enrollOpen}
        size="lg"
        title="Manual enrollment"
      >
        {enrollOpen ? <ManualEnrollment /> : null}
      </Modal>
      <OrderModal
        loaded={known}
        onClose={() => setOrderId(null)}
        orderId={orderId}
      />
    </div>
  );
}
