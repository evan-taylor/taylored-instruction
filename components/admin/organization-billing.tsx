"use client";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Ban, CircleCheck, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useCourses } from "@/components/registration/catalog";
import { errorText } from "@/components/registration/errors";
import { formatDate, pluralize } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/dialog";
import {
  Field,
  Money,
  MoneyInput,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui/field";
import { MenuItem, RowMenu } from "@/components/ui/menu";
import {
  EmptyState,
  ListState,
  Notice,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  type BillingPricing,
  BUSINESS_TIME_ZONE,
  describeBillingPricing,
  endOfBusinessDay,
} from "@/shared/registration/billing";
import { formatMoney } from "@/shared/registration/domain";
import { businessDate } from "@/shared/registration/student-certificates";
import { Checklist, RadioGroup, RadioOption } from "./coupons";
import { CreateInvoiceModal } from "./invoices";

type Organization = Doc<"registrationOrganizations">;
type BillingCode = Doc<"registrationBillingCodes">;
type Course = Doc<"registrationCourses">;
type Balance = FunctionReturnType<
  typeof api.registrationBilling.organizationBalance
>;
type Line = Balance["lines"][number];
type Tab = "codes" | "balance";

function courseList(code: BillingCode, courses: Course[] | undefined) {
  if (code.courseIds.length === 0) {
    return "All public classes";
  }
  return code.courseIds
    .map((id) => courses?.find((c) => c._id === id)?.title ?? "Unknown course")
    .join(", ");
}

function CodeStatus({ code }: { code: BillingCode }) {
  if (!code.active) {
    return <Badge tone="neutral">Inactive</Badge>;
  }
  if (code.expires !== undefined && code.expires <= Date.now()) {
    return <Badge tone="danger">Expired</Badge>;
  }
  if (code.limit !== undefined && code.uses >= code.limit) {
    return <Badge tone="warning">Used up</Badge>;
  }
  return <Badge tone="success">Active</Badge>;
}

function BillingCodeEditor({
  organization,
  code,
  courses,
  onClose,
}: {
  organization: Organization;
  code?: BillingCode;
  courses: Course[] | undefined;
  onClose: () => void;
}) {
  const save = useMutation(api.registrationBilling.saveBillingCode);
  const [text, setText] = useState(code?.code ?? "");
  const [pricing, setPricing] = useState<BillingPricing>(
    code?.pricing ?? "percent"
  );
  const [amount, setAmount] = useState(code?.amount ?? 10);
  const [courseIds, setCourseIds] = useState<Id<"registrationCourses">[]>(
    code?.courseIds ?? []
  );
  const [limit, setLimit] = useState(code?.limit?.toString() ?? "");
  const [expires, setExpires] = useState(
    code?.expires ? businessDate(code.expires, BUSINESS_TIME_ZONE) : ""
  );
  const [active, setActive] = useState(code?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const formId = useId();

  async function submit() {
    setMessage("");
    const expiresAt = expires ? endOfBusinessDay(expires) : undefined;
    if (expiresAt !== undefined && Number.isNaN(expiresAt)) {
      setMessage("Error: choose a valid expiration date");
      return;
    }
    setBusy(true);
    try {
      await save({
        id: code?._id,
        organizationId: organization._id,
        code: text,
        pricing,
        amount: pricing === "full" ? 0 : amount,
        courseIds,
        expires: expiresAt,
        limit: limit.trim() ? Number(limit) : undefined,
        active,
      });
      onClose();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      description={`People who enter this code register for public classes without paying. ${organization.name} is billed later.`}
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={busy} form={formId} size="sm" type="submit">
            {busy ? "Saving…" : "Save code"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={code ? `Edit ${code.code}` : "New billing code"}
    >
      <form
        className="space-y-6"
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          hint={
            code
              ? "Codes can't be renamed. Deactivate this one and create a new code instead."
              : "Leave blank to generate one. Not case-sensitive."
          }
          label="Code"
        >
          {(props) => (
            <TextInput
              {...props}
              autoCapitalize="characters"
              className="font-mono uppercase"
              disabled={Boolean(code)}
              onChange={(e) => setText(e.target.value.toUpperCase())}
              placeholder="Generated automatically"
              spellCheck={false}
              value={text}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <RadioGroup legend="What the organization pays per seat">
            <RadioOption
              current={pricing}
              description="For example, 10% off for training a whole team."
              label="Discount off the class price"
              name="billing-pricing"
              onChange={setPricing}
              value="percent"
            />
            <RadioOption
              current={pricing}
              description="The same agreed price for every class."
              label="Fixed price per seat"
              name="billing-pricing"
              onChange={(next) => {
                setPricing(next);
                setAmount(0);
              }}
              value="fixed"
            />
            <RadioOption
              current={pricing}
              label="Full class price"
              name="billing-pricing"
              onChange={setPricing}
              value="full"
            />
          </RadioGroup>
          {pricing === "percent" ? (
            <Field label="Percent off" required>
              {(props) => (
                <div className="relative">
                  <TextInput
                    {...props}
                    className="pr-8 tabular-nums"
                    inputMode="numeric"
                    max={100}
                    min={0}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    step={1}
                    type="number"
                    value={amount}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-sm">
                    %
                  </span>
                </div>
              )}
            </Field>
          ) : null}
          {pricing === "fixed" ? (
            <Field label="Price per seat" required>
              {(props) => (
                <MoneyInput {...props} onChange={setAmount} value={amount} />
              )}
            </Field>
          ) : null}
        </div>
        <Checklist
          hint={
            courseIds.length
              ? `${pluralize(courseIds.length, "course")} selected`
              : "None selected: the code works for every public class."
          }
          items={courses?.map((c) => ({ id: c._id, title: c.title }))}
          legend="Limit to courses"
          onChange={setCourseIds}
          selected={courseIds}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            hint={
              code?.uses
                ? `Optional. Each attendee counts once; ${code.uses} used so far.`
                : "Optional. Each attendee counts once."
            }
            label="Maximum uses"
          >
            {(props) => (
              <TextInput
                {...props}
                className="tabular-nums"
                inputMode="numeric"
                min={Math.max(1, code?.uses ?? 0)}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="No limit"
                step={1}
                type="number"
                value={limit}
              />
            )}
          </Field>
          <Field
            hint="Optional. Stops working at the end of this day (UTC)."
            label="Expires"
          >
            {(props) => (
              <TextInput
                {...props}
                onChange={(e) => setExpires(e.target.value)}
                type="date"
                value={expires}
              />
            )}
          </Field>
        </div>
        <Toggle
          checked={active}
          description="Inactive codes are refused at checkout. Their history stays."
          label="Active"
          onChange={setActive}
        />
        <ResultNotice message={message} />
      </form>
    </Modal>
  );
}

function BillingCodesPanel({ organization }: { organization: Organization }) {
  const codes = useQuery(api.registrationBilling.billingCodes, {
    organizationId: organization._id,
  });
  const courses = useCourses();
  const setActive = useMutation(api.registrationBilling.setBillingCodeActive);
  const [editing, setEditing] = useState<BillingCode | "new" | null>(null);
  const [message, setMessage] = useState("");
  async function toggle(code: BillingCode) {
    setMessage("");
    try {
      await setActive({ id: code._id, active: !code.active });
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-slate-600 text-sm">
          Give a code to {organization.name}. Their people enter it at checkout,
          skip payment, and each registration is added to the balance.
        </p>
        <Button onClick={() => setEditing("new")} size="sm" type="button">
          <Plus aria-hidden="true" className="h-4 w-4" />
          New code
        </Button>
      </div>
      <ResultNotice message={message} />
      <ListState
        empty={codes?.length === 0}
        emptyState={
          <EmptyState
            description="Create a code to let this organization's people register now and be invoiced later."
            title="No billing codes yet"
          />
        }
        loading={codes === undefined}
        skeletonClassName="h-32"
      >
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Organization pays</TH>
              <TH>Classes</TH>
              <TH className="text-right">Uses</TH>
              <TH>Expires</TH>
              <TH>Status</TH>
              <TH className="text-right">
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {(codes ?? []).map((code) => (
              <TR key={code._id}>
                <TD>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-semibold text-slate-900">
                      {code.code}
                    </span>
                    <CopyButton
                      compact
                      label={`Copy code ${code.code}`}
                      value={code.code}
                    />
                  </div>
                </TD>
                <TD className="whitespace-nowrap">
                  {describeBillingPricing(code)}
                </TD>
                <TD
                  className="max-w-56 truncate"
                  title={courseList(code, courses)}
                >
                  {courseList(code, courses)}
                </TD>
                <TD className="text-right tabular-nums">
                  {code.uses}
                  {code.limit === undefined ? "" : ` / ${code.limit}`}
                </TD>
                <TD className="whitespace-nowrap">
                  {code.expires
                    ? formatDate(code.expires, BUSINESS_TIME_ZONE)
                    : "Never"}
                </TD>
                <TD>
                  <CodeStatus code={code} />
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      aria-label={`Edit ${code.code}`}
                      onClick={() => setEditing(code)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Edit
                    </Button>
                    <RowMenu label={`More actions for ${code.code}`}>
                      <MenuItem
                        icon={code.active ? Ban : CircleCheck}
                        onSelect={() => toggle(code)}
                      >
                        {code.active ? "Deactivate code" : "Activate code"}
                      </MenuItem>
                    </RowMenu>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </ListState>
      {editing ? (
        <BillingCodeEditor
          code={editing === "new" ? undefined : editing}
          courses={courses}
          key={editing === "new" ? "new" : editing._id}
          onClose={() => setEditing(null)}
          organization={organization}
        />
      ) : null}
    </div>
  );
}

function ClassCell({ line }: { line: Line }) {
  return (
    <>
      <div className="text-slate-900">{line.title}</div>
      <div className="text-slate-500 text-xs">
        {line.classStart ? formatDate(line.classStart) : "Self-paced"} · code{" "}
        <span className="font-mono">{line.code}</span>
      </div>
    </>
  );
}

function StudentCell({ line }: { line: Line }) {
  return (
    <>
      <div className="text-slate-900">{line.attendeeName}</div>
      <div className="text-slate-500 text-xs">{line.attendeeEmail}</div>
    </>
  );
}

function ResolveFollowUp({
  line,
  onClose,
}: {
  line: Line;
  onClose: () => void;
}) {
  const resolve = useMutation(api.registrationBilling.resolveFollowUp);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const formId = useId();
  return (
    <Modal
      description={line.followUp?.reason}
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Close
          </Button>
          <Button disabled={busy} form={formId} size="sm" type="submit">
            {busy ? "Saving…" : "Mark resolved"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      title={`Resolve ${line.attendeeName}'s line`}
    >
      <form
        className="space-y-4"
        id={formId}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await resolve({ chargeId: line._id, note });
            onClose();
          } catch (error) {
            setMessage(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="How was it resolved?" required>
          {(props) => (
            <TextArea
              {...props}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Credited $72.00 on TI-2026-0012"
              required
              value={note}
            />
          )}
        </Field>
        <ResultNotice message={message} />
      </form>
    </Modal>
  );
}

function UnbilledLines({
  organization,
  lines,
  onInvoiced,
}: {
  organization: Organization;
  lines: Line[];
  onInvoiced: (orderId: Id<"registrationOrders">) => void;
}) {
  const invoice = useMutation(api.registrationBilling.invoiceBalance);
  const [excluded, setExcluded] = useState<
    Id<"registrationOrganizationCharges">[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const chosen = lines.filter((line) => !excluded.includes(line._id));
  const total = chosen.reduce((sum, line) => sum + line.amount, 0);
  if (lines.length === 0) {
    return (
      <EmptyState
        description={`Registrations made with ${organization.name}'s codes appear here until they're invoiced.`}
        title="Nothing unbilled"
      />
    );
  }
  return (
    <div className="space-y-3">
      <Table>
        <THead>
          <TR>
            <TH className="w-10">
              <input
                aria-label="Select all unbilled lines"
                checked={excluded.length === 0}
                className="h-4 w-4 rounded-sm accent-primary"
                onChange={(e) =>
                  setExcluded(e.target.checked ? [] : lines.map((l) => l._id))
                }
                type="checkbox"
              />
            </TH>
            <TH>Student</TH>
            <TH>Class</TH>
            <TH className="text-right">List price</TH>
            <TH className="text-right">Agreed</TH>
          </TR>
        </THead>
        <TBody>
          {lines.map((line) => (
            <TR key={line._id}>
              <TD>
                <input
                  aria-label={`Include ${line.attendeeName}`}
                  checked={!excluded.includes(line._id)}
                  className="h-4 w-4 rounded-sm accent-primary"
                  onChange={(e) =>
                    setExcluded((current) =>
                      e.target.checked
                        ? current.filter((id) => id !== line._id)
                        : [...current, line._id]
                    )
                  }
                  type="checkbox"
                />
              </TD>
              <TD>
                <StudentCell line={line} />
              </TD>
              <TD>
                <ClassCell line={line} />
                {line.adjustment ? (
                  <div className="text-amber-800 text-xs">
                    {line.adjustment.reason}
                  </div>
                ) : null}
              </TD>
              <TD className="text-right text-slate-500">
                <Money cents={line.listPrice} />
              </TD>
              <TD className="text-right font-medium">
                <Money cents={line.amount} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultNotice message={message} />
        <Button
          disabled={busy || chosen.length === 0 || total <= 0}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              onInvoiced(
                await invoice({
                  organizationId: organization._id,
                  chargeIds: chosen.map((line) => line._id),
                })
              );
              setExcluded([]);
            } catch (error) {
              setMessage(errorText(error));
            } finally {
              setBusy(false);
            }
          }}
          size="sm"
          type="button"
        >
          {busy
            ? "Preparing…"
            : `Invoice ${pluralize(chosen.length, "line")} · ${formatMoney(total)}`}
        </Button>
      </div>
    </div>
  );
}

function BillingOrders({
  lines,
  onInvoice,
}: {
  lines: Line[];
  onInvoice: (orderId: Id<"registrationOrders">) => void;
}) {
  const giveBack = useMutation(api.registrationBilling.returnBalanceOrder);
  const [message, setMessage] = useState("");
  const orders = new Map<
    Id<"registrationOrders">,
    { count: number; total: number; status?: string }
  >();
  for (const line of lines) {
    if (line.state === "invoiced" && line.billingOrderId) {
      const entry = orders.get(line.billingOrderId) ?? {
        count: 0,
        total: 0,
        status: line.billingOrderStatus,
      };
      orders.set(line.billingOrderId, {
        ...entry,
        count: entry.count + 1,
        total: entry.total + line.amount,
      });
    }
  }
  if (orders.size === 0) {
    return null;
  }
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-base text-slate-900">Invoiced</h3>
      <ResultNotice message={message} />
      <Table>
        <THead>
          <TR>
            <TH>Balance order</TH>
            <TH className="text-right">Lines</TH>
            <TH className="text-right">Amount</TH>
            <TH>Status</TH>
            <TH className="text-right">
              <span className="sr-only">Actions</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {[...orders].map(([orderId, entry]) => (
            <TR key={orderId}>
              <TD>
                <Link
                  className="text-primary hover:underline"
                  href={`/admin/groups?tab=invoices&order=${orderId}`}
                >
                  View invoice
                </Link>
              </TD>
              <TD className="text-right tabular-nums">{entry.count}</TD>
              <TD className="text-right">
                <Money cents={entry.total} />
              </TD>
              <TD>
                <StatusBadge status={entry.status ?? "unpaid"} />
              </TD>
              <TD>
                {entry.status === "unpaid" ? (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      onClick={() => onInvoice(orderId)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Create invoice
                    </Button>
                    <Button
                      onClick={async () => {
                        setMessage("");
                        try {
                          await giveBack({
                            orderId,
                            reason: "Returned to the unbilled balance by staff",
                          });
                        } catch (error) {
                          setMessage(errorText(error));
                        }
                      }}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Return to balance
                    </Button>
                  </div>
                ) : null}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </section>
  );
}

function FollowUps({ lines }: { lines: Line[] }) {
  const [resolving, setResolving] = useState<Line | null>(null);
  const flagged = lines.filter(
    (line) => line.followUp || (line.sessionCanceled && line.state !== "void")
  );
  if (flagged.length === 0) {
    return null;
  }
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-base text-slate-900">
        Needs follow-up
      </h3>
      <Table>
        <TBody>
          {flagged.map((line) => (
            <TR key={line._id}>
              <TD>
                <StudentCell line={line} />
              </TD>
              <TD>
                <ClassCell line={line} />
              </TD>
              <TD className="max-w-80 text-amber-900 text-sm">
                {line.followUp?.reason ??
                  "This class was canceled. Cancel or transfer the registration to update the balance."}
              </TD>
              <TD className="text-right">
                {line.followUp ? (
                  <Button
                    onClick={() => setResolving(line)}
                    size="xs"
                    type="button"
                    variant="secondary"
                  >
                    Resolve
                  </Button>
                ) : (
                  <Link
                    className="text-primary text-sm hover:underline"
                    href={`/admin/registrations?order=${line.orderId}`}
                  >
                    Open order
                  </Link>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {resolving ? (
        <ResolveFollowUp line={resolving} onClose={() => setResolving(null)} />
      ) : null}
    </section>
  );
}

function BalancePanel({ organization }: { organization: Organization }) {
  const balance = useQuery(api.registrationBilling.organizationBalance, {
    organizationId: organization._id,
  });
  const [invoicing, setInvoicing] = useState<Id<"registrationOrders">>();
  if (balance === undefined) {
    return <Skeleton className="h-40" />;
  }
  const unbilled = balance.lines.filter((line) => line.state === "unbilled");
  const reversed = balance.lines.filter((line) => line.state === "void").length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-slate-600 text-sm">
          Unbilled balance{" "}
          <span className="font-semibold text-2xl text-slate-900 tabular-nums">
            <Money cents={balance.unbilled} />
          </span>
        </p>
        <p className="text-slate-500 text-sm">
          {pluralize(unbilled.length, "registration")} waiting to be invoiced
          {reversed ? ` · ${reversed} reversed by cancellation` : ""}
        </p>
      </div>
      <FollowUps lines={balance.lines} />
      <UnbilledLines
        lines={unbilled}
        onInvoiced={setInvoicing}
        organization={organization}
      />
      <BillingOrders lines={balance.lines} onInvoice={setInvoicing} />
      {invoicing ? (
        <CreateInvoiceModal
          key={invoicing}
          onClose={() => setInvoicing(undefined)}
          open
          orderId={invoicing}
        />
      ) : null}
    </div>
  );
}

export function OrganizationBilling({
  organization,
  onClose,
}: {
  organization: Organization;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("codes");
  return (
    <Modal
      description="Billing codes defer class fees to this organization's balance for invoicing."
      onClose={onClose}
      open
      size="xl"
      title={organization.name}
    >
      <div className="space-y-5">
        {organization.archived ? (
          <Notice tone="warning">
            This organization is archived, so its codes are refused at checkout.
          </Notice>
        ) : null}
        <Tabs
          label="Organization billing"
          onChange={setTab}
          tabs={[
            { id: "codes", label: "Billing codes" },
            { id: "balance", label: "Balance" },
          ]}
          value={tab}
        />
        <TabPanel active={tab === "codes"} id="codes">
          <BillingCodesPanel organization={organization} />
        </TabPanel>
        <TabPanel active={tab === "balance"} id="balance">
          <BalancePanel organization={organization} />
        </TabPanel>
      </div>
    </Modal>
  );
}
