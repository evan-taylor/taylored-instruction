"use client";
import { useMutation, useQuery } from "convex/react";
import { Building2, Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  useGroupRequests,
  useOrganizationOrders,
  useOrganizations,
} from "@/components/registration/catalog";
import {
  formatDateTime,
  formatRelative,
  pluralize,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/dialog";
import { Field, Money, Select, TextArea } from "@/components/ui/field";
import {
  DescriptionList,
  EmptyState,
  ListState,
  PageHeader,
  ResultNotice,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { type EnrollmentPrefill, GroupEnrollment } from "./group-enrollment";
import { InvoicesPanel } from "./invoices";
import { OrganizationModal } from "./organization-form";

type Tab = "requests" | "organizations" | "invoices" | "enroll";
type RequestStatus = Doc<"registrationGroupRequests">["status"];
const REQUEST_STATUSES: RequestStatus[] = [
  "new",
  "contacted",
  "quoted",
  "scheduled",
  "closed",
];

function RequestModal({
  request,
  organizations,
  onClose,
  onEnroll,
}: {
  request: Doc<"registrationGroupRequests">;
  organizations: Doc<"registrationOrganizations">[] | undefined;
  onClose: () => void;
  onEnroll: (prefill: EnrollmentPrefill) => void;
}) {
  const update = useMutation(api.registrationGroups.updateGroupRequest);
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [notes, setNotes] = useState(request.internalNotes);
  const [organizationId, setOrganizationId] = useState<
    Id<"registrationOrganizations"> | ""
  >(request.organizationId ?? "");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await update({
        id: request._id,
        status,
        internalNotes: notes,
        organizationId: organizationId || undefined,
        orderId: request.orderId,
      });
      setMessage("Request updated");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      description={`Received ${formatDateTime(request._creationTime)}`}
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Close
          </Button>
          <Button
            onClick={() =>
              onEnroll({
                requestId: request._id,
                organization: request.organization,
                contactName: request.contactName,
                contactEmail: request.email,
                phone: request.phone,
                organizationId: organizationId || undefined,
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Start group enrollment
          </Button>
          <Button disabled={busy} onClick={save} size="sm" type="button">
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={request.organization}
    >
      <div className="space-y-5">
        <DescriptionList
          items={[
            {
              label: "Contact",
              value: (
                <>
                  {request.contactName} ·{" "}
                  <a
                    className="text-primary hover:underline"
                    href={`mailto:${request.email}`}
                  >
                    {request.email}
                  </a>
                  {request.phone ? ` · ${request.phone}` : ""}
                </>
              ),
            },
            { label: "Course interest", value: request.courseInterest },
            {
              label: "Headcount",
              value: pluralize(request.headcount, "attendee"),
            },
            {
              label: "Preferred dates",
              value: request.preferredDates || "Flexible",
            },
            { label: "Location", value: request.location || "Not specified" },
            {
              label: "Linked order",
              value: request.orderId ? (
                <Link
                  className="text-primary hover:underline"
                  href={`/admin/registrations?order=${request.orderId}`}
                >
                  Open order
                </Link>
              ) : (
                "None yet"
              ),
            },
          ]}
        />
        {request.notes ? (
          <div className="rounded-lg bg-slate-50 p-3 text-slate-700 text-sm">
            <p className="font-medium text-slate-500 text-xs uppercase tracking-wide">
              Customer notes
            </p>
            <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            {(p) => (
              <Select
                {...p}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
                value={status}
              >
                {REQUEST_STATUSES.map((s) => (
                  <option className="capitalize" key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Organization">
            {(p) => (
              <div className="flex gap-2">
                <Select
                  {...p}
                  onChange={(e) =>
                    setOrganizationId(
                      e.target.value as Id<"registrationOrganizations"> | ""
                    )
                  }
                  value={organizationId}
                >
                  <option value="">Not linked</option>
                  {organizations
                    ?.filter((o) => !o.archived)
                    .map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name}
                      </option>
                    ))}
                </Select>
                <Button
                  onClick={() => setCreatingOrganization(true)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  New
                </Button>
              </div>
            )}
          </Field>
        </div>
        <Field hint="Visible to staff only." label="Internal notes">
          {(p) => (
            <TextArea
              {...p}
              onChange={(e) => setNotes(e.target.value)}
              value={notes}
            />
          )}
        </Field>
        <ResultNotice message={message} />
      </div>
      {creatingOrganization ? (
        <OrganizationModal
          initial={{
            name: request.organization,
            contactName: request.contactName,
            contactEmail: request.email,
            phone: request.phone,
          }}
          onClose={() => setCreatingOrganization(false)}
          onSaved={(id) => setOrganizationId(id)}
          open
        />
      ) : null}
    </Modal>
  );
}

function RequestsPanel({
  onEnroll,
  initialRequest,
}: {
  onEnroll: (prefill: EnrollmentPrefill) => void;
  initialRequest?: string;
}) {
  const [status, setStatus] = useState<RequestStatus | "">("");
  const requests = useGroupRequests(status || undefined);
  const organizations = useOrganizations();
  const [openId, setOpenId] = useState<string | undefined>(initialRequest);
  const open = requests?.find((r) => r._id === openId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Status">
          {(p) => (
            <Select
              {...p}
              className="w-44"
              onChange={(e) => setStatus(e.target.value as RequestStatus | "")}
              value={status}
            >
              <option value="">All requests</option>
              {REQUEST_STATUSES.map((s) => (
                <option className="capitalize" key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <p className="pb-2 text-slate-500 text-sm">
          Requests arrive from the public{" "}
          <Link className="text-primary hover:underline" href="/group-training">
            group training page
          </Link>
          .
        </p>
      </div>
      <ListState
        empty={requests?.length === 0}
        emptyState={
          <EmptyState
            description="When an organization asks for group training, it shows up here with the contact details and headcount."
            icon={<Inbox aria-hidden="true" className="h-8 w-8" />}
            title="No group requests"
          />
        }
        loading={requests === undefined}
        skeletonClassName="h-48"
      >
        <Table>
          <THead>
            <TR>
              <TH>Received</TH>
              <TH>Organization</TH>
              <TH>Course</TH>
              <TH className="text-right">People</TH>
              <TH>When / where</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {(requests ?? []).map((r) => (
              <TR key={r._id}>
                <TD className="whitespace-nowrap">
                  <div className="text-slate-900">
                    {formatRelative(r._creationTime)}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {formatDateTime(r._creationTime)}
                  </div>
                </TD>
                <TD>
                  <div className="font-medium text-slate-900">
                    {r.organization}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {r.contactName} · {r.email}
                  </div>
                </TD>
                <TD className="max-w-56 truncate" title={r.courseInterest}>
                  {r.courseInterest}
                </TD>
                <TD className="text-right tabular-nums">{r.headcount}</TD>
                <TD className="max-w-56">
                  <div
                    className="truncate text-slate-900"
                    title={r.preferredDates}
                  >
                    {r.preferredDates || "Flexible"}
                  </div>
                  <div className="truncate text-slate-500 text-xs">
                    {r.location}
                  </div>
                </TD>
                <TD>
                  <StatusBadge status={r.status} />
                </TD>
                <TD className="text-right">
                  <Button
                    onClick={() => setOpenId(r._id)}
                    size="xs"
                    type="button"
                    variant="secondary"
                  >
                    Open
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </ListState>
      {open ? (
        <RequestModal
          onClose={() => setOpenId(undefined)}
          onEnroll={onEnroll}
          organizations={organizations}
          request={open}
        />
      ) : null}
    </div>
  );
}

function OrganizationOrders({
  organization,
  onClose,
}: {
  organization: Doc<"registrationOrganizations">;
  onClose: () => void;
}) {
  const orders = useOrganizationOrders(organization._id);
  return (
    <Modal
      description={[
        organization.contactName,
        organization.contactEmail,
        organization.phone,
      ]
        .filter(Boolean)
        .join(" · ")}
      onClose={onClose}
      open
      size="lg"
      title={organization.name}
    >
      <ListState
        empty={orders?.length === 0}
        emptyState={
          <EmptyState
            description="Orders created through the group wizard with this organization appear here."
            title="No orders yet"
          />
        }
        loading={orders === undefined}
        skeletonClassName="h-32"
      >
        <Table>
          <THead>
            <TR>
              <TH>Order</TH>
              <TH className="text-right">Seats</TH>
              <TH className="text-right">Total</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {(orders ?? []).map((o) => (
              <TR key={o._id}>
                <TD>
                  <Link
                    className="text-slate-900 hover:text-primary"
                    href={`/admin/registrations?order=${o._id}`}
                  >
                    {o.title}
                  </Link>
                  <div className="text-slate-500 text-xs">
                    {formatDateTime(o._creationTime)}
                  </div>
                </TD>
                <TD className="text-right tabular-nums">{o.seats.length}</TD>
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
      </ListState>
    </Modal>
  );
}

function OrganizationsPanel() {
  const organizations = useOrganizations();
  const [editing, setEditing] =
    useState<Doc<"registrationOrganizations"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] =
    useState<Doc<"registrationOrganizations"> | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const visible = organizations?.filter((o) => showArchived || !o.archived);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-slate-600 text-sm">
          <input
            checked={showArchived}
            className="h-4 w-4 accent-primary"
            onChange={(e) => setShowArchived(e.target.checked)}
            type="checkbox"
          />
          Show archived
        </label>
        <Button onClick={() => setCreating(true)} size="sm" type="button">
          <Building2 aria-hidden="true" className="h-4 w-4" />
          New organization
        </Button>
      </div>
      <ListState
        empty={visible?.length === 0}
        emptyState={
          <EmptyState
            action={
              <Button onClick={() => setCreating(true)} size="sm" type="button">
                New organization
              </Button>
            }
            description="Organizations tie group orders and invoices to a company, school, or agency."
            icon={<Building2 aria-hidden="true" className="h-8 w-8" />}
            title="No organizations yet"
          />
        }
        loading={visible === undefined}
        skeletonClassName="h-48"
      >
        <Table>
          <THead>
            <TR>
              <TH>Organization</TH>
              <TH>Billing contact</TH>
              <TH>Address</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {(visible ?? []).map((o) => (
              <TR key={o._id}>
                <TD>
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    {o.name}
                    {o.archived ? <StatusBadge status="archived" /> : null}
                  </div>
                  {o.notes ? (
                    <div
                      className="max-w-64 truncate text-slate-500 text-xs"
                      title={o.notes}
                    >
                      {o.notes}
                    </div>
                  ) : null}
                </TD>
                <TD>
                  <div className="text-slate-900">{o.contactName || "—"}</div>
                  <div className="text-slate-500 text-xs">
                    {[o.contactEmail, o.phone].filter(Boolean).join(" · ")}
                  </div>
                </TD>
                <TD className="max-w-64 truncate" title={o.address}>
                  {o.address || "—"}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      onClick={() => setViewing(o)}
                      size="xs"
                      type="button"
                      variant="secondary"
                    >
                      Orders
                    </Button>
                    <Button
                      onClick={() => setEditing(o)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Edit
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </ListState>
      {creating ? (
        <OrganizationModal onClose={() => setCreating(false)} open />
      ) : null}
      {editing ? (
        <OrganizationModal
          key={editing._id}
          onClose={() => setEditing(null)}
          open
          organization={editing}
        />
      ) : null}
      {viewing ? (
        <OrganizationOrders
          onClose={() => setViewing(null)}
          organization={viewing}
        />
      ) : null}
    </div>
  );
}

export function GroupsAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("tab");
  const tab: Tab =
    requested === "organizations" ||
    requested === "invoices" ||
    requested === "enroll"
      ? requested
      : "requests";
  const [prefill, setPrefill] = useState<EnrollmentPrefill | undefined>();
  const attention = useQuery(api.registrationOperations.attention);
  const focusOrder = params.get("order") as Id<"registrationOrders"> | null;
  function go(next: Tab) {
    router.replace(`/admin/groups?tab=${next}`);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => go("enroll")} size="sm">
            Enroll a group
          </Button>
        }
        description="Corporate and group training: requests, organizations, roster enrollment, and invoices with net terms."
        title="Groups & invoices"
      />
      <Tabs
        label="Groups"
        onChange={go}
        tabs={[
          {
            id: "requests",
            label: "Requests",
            count: attention?.requests.length,
          },
          { id: "organizations", label: "Organizations" },
          {
            id: "invoices",
            label: "Invoices",
            count: attention?.invoices.length || undefined,
          },
          { id: "enroll", label: "Group enrollment" },
        ]}
        value={tab}
      />
      <TabPanel active={tab === "requests"} id="requests">
        <RequestsPanel
          initialRequest={params.get("request") ?? undefined}
          onEnroll={(next) => {
            setPrefill(next);
            go("enroll");
          }}
        />
      </TabPanel>
      <TabPanel active={tab === "organizations"} id="organizations">
        <OrganizationsPanel />
      </TabPanel>
      <TabPanel active={tab === "invoices"} id="invoices">
        <InvoicesPanel focusOrder={focusOrder ?? undefined} />
      </TabPanel>
      <TabPanel active={tab === "enroll"} id="enroll">
        <GroupEnrollment
          key={prefill?.requestId ?? "fresh"}
          prefill={prefill}
        />
      </TabPanel>
    </div>
  );
}
