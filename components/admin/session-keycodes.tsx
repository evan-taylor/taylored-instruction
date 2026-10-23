"use client";
import { useQuery } from "convex/react";
import { useState } from "react";
import { pluralize } from "@/components/registration/format";
import { InventoryManager } from "@/components/registration/inventory";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, Notice, Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { RestockModal } from "./materials";

type Bank = {
  materialId: Id<"registrationMaterials">;
  title: string;
  attached: boolean;
  available: number;
  assigned: number;
  retired: number;
  inUse: number;
  waiting: number;
};

function BankStatus({ bank, capacity }: { bank: Bank; capacity: number }) {
  if (bank.waiting > 0) {
    return (
      <Badge tone="danger">
        {pluralize(bank.waiting, "student")} waiting for a link
      </Badge>
    );
  }
  // Only links held by enrolled students fill seats; links kept by
  // transferred or replaced registrations can't serve a reopened seat.
  const short = capacity - bank.inUse - bank.available;
  if (short > 0) {
    return <Badge tone="warning">{short} short of capacity</Badge>;
  }
  return <Badge tone="success">Covers every seat</Badge>;
}

function BankCard({
  bank,
  session,
}: {
  bank: Bank;
  session: Doc<"registrationSessions">;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Card>
      <CardHeader>
        <div className="space-y-1.5">
          <CardTitle>{bank.title}</CardTitle>
          <CardDescription className="tabular-nums">
            {bank.available} unused · {bank.inUse} with enrolled students ·{" "}
            {bank.assigned - bank.inUse} kept by transferred or replaced
            registrations · {bank.retired} retired · {session.capacity} seats
          </CardDescription>
          <div className="flex flex-wrap gap-1.5">
            <BankStatus bank={bank} capacity={session.capacity} />
            {bank.attached ? null : (
              <Badge tone="neutral">No longer attached to this session</Badge>
            )}
          </div>
        </div>
        <Button onClick={() => setLoading(true)} size="xs" type="button">
          Add links
        </Button>
      </CardHeader>
      <CardContent className="px-0 pt-4 pb-0">
        <InventoryManager
          materialId={bank.materialId}
          sessionId={session._id}
        />
      </CardContent>
      {loading ? (
        <RestockModal
          material={{ _id: bank.materialId, title: bank.title }}
          onClose={() => setLoading(false)}
          session={session}
        />
      ) : null}
    </Card>
  );
}

/** Per-session keycode banks: the links issued for this session only. */
export function SessionKeycodes({
  session,
}: {
  session: Doc<"registrationSessions">;
}) {
  const banks = useQuery(api.registrationOperations.sessionCodeBanks, {
    sessionId: session._id,
  });
  if (banks === undefined) {
    return <Skeleton className="h-48" />;
  }
  if (banks.length === 0) {
    return (
      <EmptyState
        description="Materials marked “Separate links for each session” keep their own bank here. Create one under Materials & keycodes and attach it to this session's course template."
        title="No per-session code banks"
      />
    );
  }
  return (
    <div className="space-y-5">
      <Notice tone="info">
        Paste the links issued for this session. Each paid student in this
        session receives one, oldest registration first. Other sessions never
        draw from these links.
      </Notice>
      {banks.map((bank) => (
        <BankCard bank={bank} key={bank.materialId} session={session} />
      ))}
    </div>
  );
}
