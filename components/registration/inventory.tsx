"use client";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { AssignmentHistory } from "@/components/registration/assignment-history";
import {
  formatDateTime,
  formatRelative,
  pluralize,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type Code = Doc<"registrationCodes">;
type Entitlement = Doc<"registrationEntitlements">;
type InventoryTab = "available" | "assigned" | "queue";
type PaginationStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted";
type ManageArgs = {
  codeId: Id<"registrationCodes">;
  entitlementId?: Id<"registrationEntitlements">;
  reason: string;
};
type Act = (args: ManageArgs, success: string) => Promise<boolean>;

function LoadMore({
  status,
  onLoadMore,
}: {
  status: PaginationStatus;
  onLoadMore: () => void;
}) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") {
    return null;
  }
  return (
    <div className="flex justify-center border-slate-100 border-t px-4 py-3">
      <Button
        disabled={status === "LoadingMore"}
        onClick={onLoadMore}
        size="sm"
        type="button"
        variant="secondary"
      >
        {status === "LoadingMore" ? "Loading…" : "Load more"}
      </Button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {["a", "b", "c"].map((k) => (
        <Skeleton className="h-9 w-full" key={k} />
      ))}
    </div>
  );
}

function CodeUrl({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="block max-w-[18rem] truncate font-mono text-slate-800 text-xs"
        title={url}
      >
        {url}
      </span>
      <CopyButton label="Copy" value={url} />
    </div>
  );
}

function ReasonField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field
      error={error || undefined}
      hint="Recorded in the audit log."
      label="Reason"
      required
    >
      {(props) => (
        <TextInput
          {...props}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          placeholder="Why this code is being changed"
          value={value}
        />
      )}
    </Field>
  );
}

function RetireDialog({
  code,
  onClose,
  act,
}: {
  code: Code | undefined;
  onClose: () => void;
  act: Act;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmDialog
      busy={busy}
      confirmLabel="Retire code"
      danger
      description="A retired code is never delivered to a student and cannot be made available again."
      onClose={onClose}
      onConfirm={async () => {
        if (!code) {
          return;
        }
        if (!reason.trim()) {
          setError("Enter a reason before retiring.");
          return;
        }
        setError("");
        setBusy(true);
        const ok = await act(
          { codeId: code._id, reason },
          "Unused code retired."
        );
        setBusy(false);
        if (ok) {
          setReason("");
          onClose();
        }
      }}
      open={code !== undefined}
      title="Retire this code?"
    >
      {code ? (
        <p className="m-0 mb-4 break-all font-mono text-slate-600 text-xs">
          {code.url}
        </p>
      ) : null}
      <ReasonField error={error} onChange={setReason} value={reason} />
    </ConfirmDialog>
  );
}

function AssignDialog({
  code,
  missing,
  onClose,
  act,
}: {
  code: Code | undefined;
  missing: {
    results: Entitlement[];
    status: PaginationStatus;
    loadMore: (n: number) => void;
  };
  onClose: () => void;
  act: Act;
}) {
  const [entitlementId, setEntitlementId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmDialog
      busy={busy}
      confirmLabel="Assign code"
      description="The student is emailed and the code appears in their portal immediately."
      onClose={onClose}
      onConfirm={async () => {
        if (!code) {
          return;
        }
        if (!(entitlementId && reason.trim())) {
          setError("Choose a student and enter a reason.");
          return;
        }
        setError("");
        setBusy(true);
        const ok = await act(
          {
            codeId: code._id,
            entitlementId: entitlementId as Id<"registrationEntitlements">,
            reason,
          },
          "Code assigned and recorded in the assignment history."
        );
        setBusy(false);
        if (ok) {
          setEntitlementId("");
          setReason("");
          onClose();
        }
      }}
      open={code !== undefined}
      title="Assign code to a waiting student"
    >
      <div className="space-y-4">
        {code ? (
          <p className="m-0 break-all font-mono text-slate-600 text-xs">
            {code.url}
          </p>
        ) : null}
        <Field
          hint={
            missing.results.length
              ? "Outstanding paid entitlements, oldest first."
              : "No one is waiting for this material right now."
          }
          label="Outstanding entitlement"
          required
        >
          {(props) => (
            <Select
              {...props}
              onChange={(e) => setEntitlementId(e.target.value)}
              value={entitlementId}
            >
              <option value="">Choose a student…</option>
              {missing.results.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title} · paid {formatDateTime(e.paidAt)} · seat {e.seatId}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {missing.status === "CanLoadMore" ? (
          <Button
            onClick={() => missing.loadMore(20)}
            size="xs"
            type="button"
            variant="ghost"
          >
            Load more waiting students
          </Button>
        ) : null}
        <ReasonField error={error} onChange={setReason} value={reason} />
      </div>
    </ConfirmDialog>
  );
}

function AssignNextDialog({
  entitlement,
  nextCode,
  onClose,
  act,
}: {
  entitlement: Entitlement | undefined;
  nextCode: Code | undefined;
  onClose: () => void;
  act: Act;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmDialog
      busy={busy || !nextCode}
      confirmLabel="Assign next available"
      description="The oldest available code in this inventory is assigned to the student and they are notified."
      onClose={onClose}
      onConfirm={async () => {
        if (!(entitlement && nextCode)) {
          return;
        }
        if (!reason.trim()) {
          setError("Enter a reason before assigning.");
          return;
        }
        setError("");
        setBusy(true);
        const ok = await act(
          { codeId: nextCode._id, entitlementId: entitlement._id, reason },
          `Code assigned to ${entitlement.title}.`
        );
        setBusy(false);
        if (ok) {
          setReason("");
          onClose();
        }
      }}
      open={entitlement !== undefined}
      title="Assign the next available code?"
    >
      <div className="space-y-4">
        {entitlement ? (
          <p className="m-0 text-slate-600 text-sm">
            {entitlement.title} · paid {formatDateTime(entitlement.paidAt)}
          </p>
        ) : null}
        {nextCode ? (
          <p className="m-0 break-all font-mono text-slate-600 text-xs">
            {nextCode.url}
          </p>
        ) : (
          <p className="m-0 text-rose-700 text-sm">
            No available code is loaded. Restock this inventory or load more
            codes first.
          </p>
        )}
        <ReasonField error={error} onChange={setReason} value={reason} />
      </div>
    </ConfirmDialog>
  );
}

function AvailableTable({
  codes,
  status,
  onLoadMore,
  onRetire,
  onAssign,
  filtered,
}: {
  codes: Code[];
  status: PaginationStatus;
  onLoadMore: () => void;
  onRetire: (code: Code) => void;
  onAssign: (code: Code) => void;
  filtered: boolean;
}) {
  if (status === "LoadingFirstPage") {
    return <TableSkeleton />;
  }
  if (codes.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          description={
            filtered
              ? "No loaded codes match your search."
              : "Paste links with Restock to add codes to this inventory."
          }
          title="No available codes"
        />
      </div>
    );
  }
  return (
    <>
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Code</TH>
            <TH>State</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {codes.map((code) => (
            <TR key={code._id}>
              <TD>
                <CodeUrl url={code.url} />
              </TD>
              <TD>
                <StatusBadge status={code.state} />
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    onClick={() => onAssign(code)}
                    size="xs"
                    type="button"
                    variant="secondary"
                  >
                    Assign
                  </Button>
                  <Button
                    onClick={() => onRetire(code)}
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    Retire
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <LoadMore onLoadMore={onLoadMore} status={status} />
    </>
  );
}

function AssignedTable({
  codes,
  status,
  onLoadMore,
  filtered,
}: {
  codes: Code[];
  status: PaginationStatus;
  onLoadMore: () => void;
  filtered: boolean;
}) {
  if (status === "LoadingFirstPage") {
    return <TableSkeleton />;
  }
  if (codes.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          description={
            filtered
              ? "No loaded codes match your search."
              : "Codes move here once they are delivered to a student."
          }
          title="No assigned codes"
        />
      </div>
    );
  }
  return (
    <>
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Code</TH>
            <TH>State</TH>
            <TH>History</TH>
          </TR>
        </THead>
        <TBody>
          {codes.map((code) => (
            <TR key={code._id}>
              <TD className="align-top">
                <CodeUrl url={code.url} />
              </TD>
              <TD className="align-top">
                <StatusBadge status={code.state} />
              </TD>
              <TD className="align-top">
                {code.entitlementId ? (
                  <AssignmentHistory entitlementId={code.entitlementId} />
                ) : (
                  <span className="text-slate-400 text-xs">—</span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <LoadMore onLoadMore={onLoadMore} status={status} />
    </>
  );
}

function QueueTable({
  entitlements,
  status,
  onLoadMore,
  onAssignNext,
  hasAvailable,
}: {
  entitlements: Entitlement[];
  status: PaginationStatus;
  onLoadMore: () => void;
  onAssignNext: (entitlement: Entitlement) => void;
  hasAvailable: boolean;
}) {
  if (status === "LoadingFirstPage") {
    return <TableSkeleton />;
  }
  if (entitlements.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          description="Every paid student has received a code for this material."
          title="Queue is empty"
        />
      </div>
    );
  }
  return (
    <>
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Paid</TH>
            <TH>Material</TH>
            <TH>Seat</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {entitlements.map((e) => (
            <TR key={e._id}>
              <TD className="whitespace-nowrap">
                <div className="text-slate-900">{formatDateTime(e.paidAt)}</div>
                <div className="text-slate-500 text-xs">
                  {formatRelative(e.paidAt)}
                </div>
              </TD>
              <TD>
                <div className="text-slate-900">{e.title}</div>
                <div className="text-slate-500 text-xs">
                  version {e.version}
                </div>
              </TD>
              <TD>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-600 text-xs">
                    {e.seatId}
                  </span>
                  <CopyButton label="Copy" value={e.seatId} />
                </div>
              </TD>
              <TD className="text-right">
                <Button
                  onClick={() => onAssignNext(e)}
                  size="xs"
                  title={
                    hasAvailable
                      ? undefined
                      : "No available codes loaded. Restock first."
                  }
                  type="button"
                  variant="secondary"
                >
                  Assign next available
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <LoadMore onLoadMore={onLoadMore} status={status} />
    </>
  );
}

/** Available, assigned, and waiting-queue views for one keycode inventory. */
export function InventoryManager({
  materialId,
}: {
  materialId: Id<"registrationMaterials">;
}) {
  const availableStock = usePaginatedQuery(
    api.registrationOperations.stock,
    { materialId, state: "available" },
    { initialNumItems: 20 }
  );
  const assignedStock = usePaginatedQuery(
    api.registrationOperations.stock,
    { materialId, state: "assigned" },
    { initialNumItems: 20 }
  );
  const missing = usePaginatedQuery(
    api.registrationOperations.missingMaterials,
    { materialId },
    { initialNumItems: 20 }
  );
  const manage = useMutation(api.registrationOperations.manageCode);
  const [tab, setTab] = useState<InventoryTab>("available");
  const [search, setSearch] = useState("");
  const [retiring, setRetiring] = useState<Code>();
  const [assigning, setAssigning] = useState<Code>();
  const [queued, setQueued] = useState<Entitlement>();
  const [message, setMessage] = useState("");

  const act: Act = async (args, success) => {
    setMessage("");
    try {
      await manage(args);
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(String(error));
      return false;
    }
  };

  const needle = search.trim().toLowerCase();
  const matches = (code: Code) =>
    needle === "" || code.url.toLowerCase().includes(needle);
  const available = availableStock.results.filter(matches);
  const assigned = assignedStock.results.filter(matches);
  const nextCode = availableStock.results.at(0);
  const loaded = availableStock.results.length + assignedStock.results.length;
  const exhausted =
    availableStock.status === "Exhausted" &&
    assignedStock.status === "Exhausted";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 px-5 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          className="flex-1"
          label="Inventory views"
          onChange={setTab}
          tabs={[
            {
              id: "available",
              label: "Available codes",
              count: available.length,
            },
            { id: "assigned", label: "Assigned", count: assigned.length },
            {
              id: "queue",
              label: "Missing-code queue",
              count: missing.results.length,
            },
          ]}
          value={tab}
        />
        <Field
          className="sm:w-64"
          label={<span className="sr-only">Search loaded codes</span>}
        >
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loaded codes…"
              type="search"
              value={search}
            />
          )}
        </Field>
      </div>
      {message ? (
        <div className="px-5">
          <ResultNotice message={message} />
        </div>
      ) : null}
      <TabPanel active={tab === "available"} className="pt-0" id="available">
        <AvailableTable
          codes={available}
          filtered={needle !== ""}
          onAssign={setAssigning}
          onLoadMore={() => availableStock.loadMore(20)}
          onRetire={setRetiring}
          status={availableStock.status}
        />
      </TabPanel>
      <TabPanel active={tab === "assigned"} className="pt-0" id="assigned">
        <AssignedTable
          codes={assigned}
          filtered={needle !== ""}
          onLoadMore={() => assignedStock.loadMore(20)}
          status={assignedStock.status}
        />
      </TabPanel>
      <TabPanel active={tab === "queue"} className="pt-0" id="queue">
        <QueueTable
          entitlements={missing.results}
          hasAvailable={nextCode !== undefined}
          onAssignNext={setQueued}
          onLoadMore={() => missing.loadMore(20)}
          status={missing.status}
        />
      </TabPanel>
      <p className="m-0 px-5 pb-4 text-slate-500 text-xs">
        Showing {pluralize(loaded, "loaded code")}
        {exhausted ? "" : " · load more to search older codes"}
      </p>
      <RetireDialog
        act={act}
        code={retiring}
        onClose={() => setRetiring(undefined)}
      />
      <AssignDialog
        act={act}
        code={assigning}
        missing={missing}
        onClose={() => setAssigning(undefined)}
      />
      <AssignNextDialog
        act={act}
        entitlement={queued}
        nextCode={nextCode}
        onClose={() => setQueued(undefined)}
      />
    </div>
  );
}
