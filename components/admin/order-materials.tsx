"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useCourses, useSessions } from "@/components/registration/catalog";
import { MaterialPicker } from "@/components/registration/material-picker";
import {
  OrderInvoices,
  OrderPayments,
  ReasonDialog,
} from "@/components/registration/operations";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import { Money } from "@/components/ui/field";
import { Notice, ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { effective } from "@/shared/registration/domain";

type Order = Doc<"registrationOrders">;
type Seat = Doc<"registrationSeats">;

function MaterialEditForm({
  order,
  seat,
  onClose,
}: {
  order: Order;
  seat: Seat;
  onClose: () => void;
}) {
  const courses = useCourses();
  const sessions = useSessions();
  const edit = useMutation(api.registrationMaterialOrders.edit);
  const [selected, setSelected] = useState(
    seat.snapshot.materials.map((item) => item.materialId)
  );
  const [revision] = useState(order.materialRevision ?? 0);
  const [requestKey] = useState(crypto.randomUUID());
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("");
  const course = courses?.find((item) => item._id === seat.courseId);
  const session = sessions?.find((item) => item._id === seat.sessionId);
  if (!course || (seat.sessionId && !sessions)) {
    return <p role="status">Loading course materials…</p>;
  }
  const config = effective(course.settings, session?.overrides ?? {});
  const current = new Set(
    seat.snapshot.materials.map((item) => item.materialId)
  );
  const materials = [
    ...seat.snapshot.materials,
    ...config.materials.filter((item) => !current.has(item.materialId)),
  ];
  const removed = seat.snapshot.materials.filter(
    (item) => !selected.includes(item.materialId)
  );
  const addedCount = selected.filter((id) => !current.has(id)).length;
  const removedValue = seat.snapshot.lines
    .filter((line) =>
      removed.some((item) => item.materialId === line.materialId)
    )
    .reduce((sum, line) => sum + line.cents - line.discount, 0);
  const changed = removed.length + addedCount > 0;
  return (
    <div className="space-y-3">
      <MaterialPicker
        disabled={review}
        materials={materials}
        onChange={setSelected}
        value={selected}
      />
      <Notice tone="info">
        {order.status === "settled"
          ? "Added materials create a separate unpaid balance. After saving, choose when to invoice, record payment, or waive it. Delivery waits for settlement."
          : "Saving updates the unpaid order subtotal. No invoice or payment request is sent."}
      </Notice>
      {removed.length ? (
        <Notice tone="warning">
          Removing: {removed.map((item) => item.title).join(", ")}. Original
          purchase value on this order: <Money cents={removedValue} /> before
          tax.{" "}
          {order.status === "settled"
            ? "No refund is issued by saving. Use the payment controls on the order that charged for the material to choose a partial refund. Delivered links, codes, and physical items cannot be recalled; assigned codes are never returned to inventory."
            : "The removed material charges will be deducted from the unpaid total."}
        </Notice>
      ) : null}
      <div className="flex gap-2">
        <Button
          disabled={!changed}
          onClick={() => setReview(true)}
          size="sm"
          type="button"
        >
          Review material changes
        </Button>
        <Button onClick={onClose} size="sm" type="button" variant="secondary">
          Cancel
        </Button>
      </div>
      <ResultNotice message={message} />
      <ReasonDialog
        confirmLabel="Save material changes"
        description={`Add ${addedCount} and remove ${removed.length} materials for ${seat.name}. Saving does not send an invoice or issue a refund.`}
        onClose={() => setReview(false)}
        onConfirm={async (reason) => {
          const balance = await edit({
            seatId: seat._id,
            materialIds: selected,
            revision,
            requestKey,
            reason,
          });
          setMessage(
            balance
              ? "Saved. Review the new balance in Material balances below."
              : "Materials updated. No refund or invoice was sent."
          );
          onClose();
        }}
        open={review}
        title="Review material changes"
      />
    </div>
  );
}

export function OrderMaterialEditor({
  order,
  seat,
}: {
  order: Order;
  seat: Seat;
}) {
  const [editing, setEditing] = useState(false);
  const materials = useQuery(api.registrationMaterialOrders.selection, {
    seatId: seat._id,
  });
  if (
    order.materialSeatId ||
    !["unpaid", "settled"].includes(order.status) ||
    !["held", "active"].includes(seat.state)
  ) {
    return null;
  }
  return (
    <section className="mb-5 space-y-3">
      <h4 className="font-semibold text-sm">Edit order materials</h4>
      {editing ? (
        <MaterialEditForm
          onClose={() => setEditing(false)}
          order={order}
          seat={{
            ...seat,
            snapshot: {
              ...seat.snapshot,
              materials: materials ?? seat.snapshot.materials,
            },
          }}
        />
      ) : (
        <Button
          disabled={materials === undefined}
          onClick={() => setEditing(true)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Add or remove materials
        </Button>
      )}
    </section>
  );
}

function MaterialBalance({ order }: { order: Order }) {
  const cancel = useMutation(api.registrationMaterialOrders.cancelAddition);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-medium text-sm">{order.title}</h4>
        <StatusBadge status={order.status} />
      </div>
      <ul className="space-y-1 text-sm">
        {order.seats.flatMap((seat) =>
          seat.lines.map((line) => (
            <li key={`${seat.attendee.email}:${line.id}`}>
              {line.title} · <Money cents={line.cents - line.discount} />
            </li>
          ))
        )}
      </ul>
      <p className="text-sm">
        Subtotal <Money cents={order.total} /> · Refunded{" "}
        <Money cents={order.refunded} />
      </p>
      {order.error ? <Notice tone="warning">{order.error}</Notice> : null}
      <OrderPayments order={order} />
      <OrderInvoices order={order} />
      {["unpaid", "hold"].includes(order.status) ? (
        <Button
          onClick={() => setOpen(true)}
          size="xs"
          type="button"
          variant="secondary"
        >
          Cancel material balance
        </Button>
      ) : null}
      <ReasonDialog
        confirmLabel="Cancel balance"
        danger
        description="Closes this unpaid material balance and its invoice. The attendee's registration remains active."
        onClose={() => setOpen(false)}
        onConfirm={async (reason) => {
          await cancel({ orderId: order._id, reason });
        }}
        open={open}
        title="Cancel material balance"
      />
    </div>
  );
}

export function MaterialBalances({ order }: { order: Order }) {
  const additions = useQuery(api.registrationMaterialOrders.additions, {
    orderId: order._id,
  });
  if (order.parentOrderId) {
    return (
      <Button
        href={`/admin/registrations?order=${order.parentOrderId}`}
        size="sm"
        variant="secondary"
      >
        View original registration
      </Button>
    );
  }
  if (!additions?.length) {
    return null;
  }
  return (
    <section className="space-y-4">
      <h3 className="font-semibold">Material balances</h3>
      <p className="text-slate-500 text-sm">
        Choose payment and invoice actions for each addition. These balances do
        not change the original payment or reserve another seat.
      </p>
      {additions.map((item) => (
        <MaterialBalance key={item._id} order={item} />
      ))}
    </section>
  );
}
