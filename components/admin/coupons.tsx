"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { formatDate } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, MoneyInput, TextInput, Toggle } from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Meter } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/shared/registration/domain";

type Coupon = Doc<"registrationCoupons">;
type Course = Doc<"registrationCourses">;
type Material = Doc<"registrationMaterials">;
type Scope = "tuition" | "all" | "selected";
type MaterialsList = {
  results: Material[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (n: number) => void;
};
type EditorState = { open: boolean; coupon?: Coupon };

function describeDiscount(coupon: Coupon) {
  return coupon.type === "percent"
    ? `${coupon.amount}% off per seat`
    : `${formatMoney(coupon.amount)} off per seat`;
}

function scopeOf(coupon: Pick<Coupon, "allMaterials" | "materialIds">): Scope {
  if (coupon.allMaterials) {
    return "all";
  }
  return coupon.materialIds.length ? "selected" : "tuition";
}

function ScopeBadge({ coupon }: { coupon: Coupon }) {
  const scope = scopeOf(coupon);
  if (scope === "all") {
    return <Badge tone="primary">Tuition + all materials</Badge>;
  }
  if (scope === "selected") {
    return (
      <Badge tone="info">
        Tuition + {coupon.materialIds.length}{" "}
        {coupon.materialIds.length === 1 ? "material" : "materials"}
      </Badge>
    );
  }
  return <Badge tone="neutral">Tuition only</Badge>;
}

function CoursesCell({
  coupon,
  courses,
}: {
  coupon: Coupon;
  courses: Course[] | undefined;
}) {
  if (coupon.courseIds.length === 0) {
    return <span className="text-slate-700">All courses</span>;
  }
  const titles = coupon.courseIds.map(
    (id) => courses?.find((c) => c._id === id)?.title ?? "Unknown course"
  );
  return (
    <span
      className="cursor-help underline decoration-dotted"
      title={titles.join(", ")}
    >
      {coupon.courseIds.length}{" "}
      {coupon.courseIds.length === 1 ? "course" : "courses"}
    </span>
  );
}

function UsesCell({ coupon }: { coupon: Coupon }) {
  const used = coupon.consumed + coupon.reserved;
  return (
    <div className="space-y-1">
      <Meter
        label={`${used} of ${coupon.limit} discounted seats used`}
        max={coupon.limit}
        value={used}
      />
      <p className="m-0 text-slate-500 text-xs tabular-nums">
        {coupon.consumed} used · {coupon.reserved} reserved · {coupon.limit} max
      </p>
    </div>
  );
}

function ExpiresCell({ coupon }: { coupon: Coupon }) {
  const expired = coupon.expires < Date.now();
  return (
    <div className="space-y-1">
      <div className={expired ? "text-slate-500" : "text-slate-900"}>
        {formatDate(coupon.expires, "UTC")}
      </div>
      {expired ? <Badge tone="danger">Expired</Badge> : null}
    </div>
  );
}

function CouponRow({
  coupon,
  courses,
  onEdit,
  onToggle,
}: {
  coupon: Coupon;
  courses: Course[] | undefined;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <TR>
      <TD>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-900">
            {coupon.code}
          </span>
          <CopyButton label="Copy" value={coupon.code} />
        </div>
      </TD>
      <TD className="whitespace-nowrap">{describeDiscount(coupon)}</TD>
      <TD>
        <ScopeBadge coupon={coupon} />
      </TD>
      <TD>
        <CoursesCell coupon={coupon} courses={courses} />
      </TD>
      <TD>
        <UsesCell coupon={coupon} />
      </TD>
      <TD>
        <ExpiresCell coupon={coupon} />
      </TD>
      <TD>
        {coupon.disabled ? (
          <Badge tone="neutral">Disabled</Badge>
        ) : (
          <Badge tone="success">Enabled</Badge>
        )}
      </TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button onClick={onEdit} size="xs" type="button" variant="ghost">
            Edit
          </Button>
          <Button
            onClick={onToggle}
            size="xs"
            type="button"
            variant="secondary"
          >
            {coupon.disabled ? "Enable" : "Disable"}
          </Button>
        </div>
      </TD>
    </TR>
  );
}

function CouponsTable({
  coupons,
  courses,
  onNew,
  onEdit,
  onToggle,
}: {
  coupons: Coupon[] | undefined;
  courses: Course[] | undefined;
  onNew: () => void;
  onEdit: (c: Coupon) => void;
  onToggle: (c: Coupon) => void;
}) {
  if (coupons === undefined) {
    return (
      <div className="space-y-2 p-4">
        {["a", "b", "c"].map((k) => (
          <Skeleton className="h-10 w-full" key={k} />
        ))}
      </div>
    );
  }
  if (coupons.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          action={
            <Button onClick={onNew} size="sm" type="button">
              New coupon
            </Button>
          }
          description="Create a code to discount tuition, with or without materials, for a limited number of seats."
          title="No coupons yet"
        />
      </div>
    );
  }
  return (
    <Table wrapperClassName="rounded-none border-0">
      <THead>
        <TR>
          <TH>Code</TH>
          <TH>Discount</TH>
          <TH>Scope</TH>
          <TH>Courses</TH>
          <TH>Uses</TH>
          <TH>Expires</TH>
          <TH>Status</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {coupons.map((c) => (
          <CouponRow
            coupon={c}
            courses={courses}
            key={c._id}
            onEdit={() => onEdit(c)}
            onToggle={() => onToggle(c)}
          />
        ))}
      </TBody>
    </Table>
  );
}

function RadioOption<T extends string>({
  name,
  value,
  current,
  onChange,
  label,
  description,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (value: T) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        checked={current === value}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        id={id}
        name={name}
        onChange={() => onChange(value)}
        type="radio"
        value={value}
      />
      <label className="text-sm" htmlFor={id}>
        <span className="font-medium text-slate-800">{label}</span>
        {description ? (
          <span className="block text-slate-500 text-xs">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

function RadioGroup({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 block font-medium text-slate-700 text-sm">
        {legend}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Checklist<T extends string>({
  legend,
  hint,
  items,
  selected,
  onChange,
  footer,
}: {
  legend: string;
  hint: string;
  items: { id: T; title: string }[] | undefined;
  selected: T[];
  onChange: (next: T[]) => void;
  footer?: React.ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1 block font-medium text-slate-700 text-sm">
        {legend}
      </legend>
      <p className="m-0 mb-2 text-slate-500 text-xs">{hint}</p>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
        {items === undefined ? <Skeleton className="h-8 w-full" /> : null}
        {items?.length === 0 ? (
          <p className="m-0 text-slate-500 text-xs">
            Nothing to choose from yet.
          </p>
        ) : null}
        {items?.map((item) => (
          <Toggle
            checked={selected.includes(item.id)}
            key={item.id}
            label={item.title}
            onChange={(checked) =>
              onChange(
                checked
                  ? [...selected, item.id]
                  : selected.filter((id) => id !== item.id)
              )
            }
          />
        ))}
        {footer}
      </div>
    </fieldset>
  );
}

function DiscountFields({
  type,
  amount,
  onType,
  onAmount,
}: {
  type: Coupon["type"];
  amount: number;
  onType: (type: Coupon["type"]) => void;
  onAmount: (amount: number) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <RadioGroup legend="Discount type">
        <RadioOption
          current={type}
          label="Percentage"
          name="discount-type"
          onChange={(next) => {
            onType(next);
            onAmount(Math.min(100, amount));
          }}
          value="percent"
        />
        <RadioOption
          current={type}
          label="Fixed amount per seat"
          name="discount-type"
          onChange={(next) => {
            onType(next);
            onAmount(0);
          }}
          value="fixed"
        />
      </RadioGroup>
      {type === "percent" ? (
        <Field
          hint="Applied to each discounted seat."
          label="Percent off"
          required
        >
          {(props) => (
            <div className="relative">
              <TextInput
                {...props}
                className="pr-8 tabular-nums"
                inputMode="numeric"
                max={100}
                min={0}
                onChange={(e) => onAmount(Number(e.target.value))}
                required
                type="number"
                value={amount}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-sm">
                %
              </span>
            </div>
          )}
        </Field>
      ) : (
        <Field
          hint="Taken off each discounted seat."
          label="Amount off"
          required
        >
          {(props) => (
            <MoneyInput {...props} onChange={onAmount} value={amount} />
          )}
        </Field>
      )}
    </div>
  );
}

function MaterialsChecklist({
  materials,
  selected,
  onChange,
}: {
  materials: MaterialsList;
  selected: Id<"registrationMaterials">[];
  onChange: (next: Id<"registrationMaterials">[]) => void;
}) {
  return (
    <Checklist
      footer={
        materials.status === "CanLoadMore" ? (
          <Button
            onClick={() => materials.loadMore(50)}
            size="xs"
            type="button"
            variant="ghost"
          >
            Load more materials
          </Button>
        ) : null
      }
      hint={
        selected.length
          ? `${selected.length} selected`
          : "Pick at least one material, or switch scope to tuition only."
      }
      items={
        materials.status === "LoadingFirstPage"
          ? undefined
          : materials.results.map((m) => ({ id: m._id, title: m.title }))
      }
      legend="Discounted materials"
      onChange={onChange}
      selected={selected}
    />
  );
}

function LimitAndExpiry({
  limit,
  minLimit,
  expires,
  onLimit,
  onExpires,
}: {
  limit: number;
  minLimit: number;
  expires: string;
  onLimit: (limit: number) => void;
  onExpires: (expires: string) => void;
}) {
  const seatHint =
    "Each discounted seat counts as one use, even within a single order.";
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        hint={
          minLimit
            ? `${seatHint} At least ${minLimit} (already used or reserved).`
            : seatHint
        }
        label="Maximum discounted seats"
        required
      >
        {(props) => (
          <TextInput
            {...props}
            className="tabular-nums"
            inputMode="numeric"
            min={minLimit}
            onChange={(e) => onLimit(Number(e.target.value))}
            required
            step={1}
            type="number"
            value={limit}
          />
        )}
      </Field>
      <Field
        hint="Stops working at the end of this day (UTC)."
        label="Expires"
        required
      >
        {(props) => (
          <TextInput
            {...props}
            onChange={(e) => onExpires(e.target.value)}
            required
            type="date"
            value={expires}
          />
        )}
      </Field>
    </div>
  );
}

function CouponEditor({
  coupon,
  courses,
  materials,
  onClose,
}: {
  coupon: Coupon | undefined;
  courses: Course[] | undefined;
  materials: MaterialsList;
  onClose: () => void;
}) {
  const save = useMutation(api.registration.saveCoupon);
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<Coupon["type"]>(coupon?.type ?? "percent");
  const [amount, setAmount] = useState(coupon?.amount ?? 100);
  const [limit, setLimit] = useState(coupon?.limit ?? 2);
  const [scope, setScope] = useState<Scope>(
    coupon ? scopeOf(coupon) : "tuition"
  );
  const [materialIds, setMaterialIds] = useState<Id<"registrationMaterials">[]>(
    coupon?.materialIds ?? []
  );
  const [courseIds, setCourseIds] = useState<Id<"registrationCourses">[]>(
    coupon?.courseIds ?? []
  );
  const [expires, setExpires] = useState(
    coupon ? new Date(coupon.expires).toISOString().slice(0, 10) : ""
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    setMessage("");
    const expiresAt = Date.parse(`${expires}T23:59:59Z`);
    if (Number.isNaN(expiresAt)) {
      setMessage("Error: choose an expiration date");
      return;
    }
    setBusy(true);
    try {
      await save({
        id: coupon?._id,
        code,
        type,
        amount,
        materialIds: scope === "selected" ? materialIds : [],
        allMaterials: scope === "all",
        courseIds,
        expires: expiresAt,
        limit,
        reserved: 0,
        consumed: 0,
        disabled: coupon?.disabled ?? false,
      });
      onClose();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  };

  const minLimit = coupon ? coupon.reserved + coupon.consumed : 0;

  return (
    <Modal
      description="Uses count discounted seats, not orders."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={busy || !code.trim() || !expires}
            onClick={submit}
            size="sm"
            type="button"
          >
            {busy ? "Working…" : "Save coupon"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          hint="Letters and numbers; stored in uppercase."
          label="Code"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              autoCapitalize="characters"
              className="font-mono uppercase"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPRING25"
              required
              value={code}
            />
          )}
        </Field>
        <DiscountFields
          amount={amount}
          onAmount={setAmount}
          onType={setType}
          type={type}
        />
        <RadioGroup legend="What the discount applies to">
          <RadioOption
            current={scope}
            description="Materials are charged at full price."
            label="Tuition only"
            name="scope"
            onChange={setScope}
            value="tuition"
          />
          <RadioOption
            current={scope}
            description="Every material line on the seat is discounted too."
            label="Tuition + all materials"
            name="scope"
            onChange={setScope}
            value="all"
          />
          <RadioOption
            current={scope}
            description="Only the materials you pick below are discounted."
            label="Tuition + selected materials"
            name="scope"
            onChange={setScope}
            value="selected"
          />
        </RadioGroup>
        {scope === "selected" ? (
          <MaterialsChecklist
            materials={materials}
            onChange={setMaterialIds}
            selected={materialIds}
          />
        ) : null}
        <LimitAndExpiry
          expires={expires}
          limit={limit}
          minLimit={minLimit}
          onExpires={setExpires}
          onLimit={setLimit}
        />
        <Checklist
          hint={
            courseIds.length
              ? `Valid for ${courseIds.length} ${courseIds.length === 1 ? "course" : "courses"}.`
              : "All courses. Select courses to restrict the code."
          }
          items={courses?.map((c) => ({ id: c._id, title: c.title }))}
          legend="Eligible courses"
          onChange={setCourseIds}
          selected={courseIds}
        />
        <ResultNotice message={message} />
      </form>
    </Modal>
  );
}

function ToggleDialog({
  coupon,
  onClose,
  onDone,
}: {
  coupon: Coupon | undefined;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const save = useMutation(api.registration.saveCoupon);
  const [busy, setBusy] = useState(false);
  const disabling = coupon ? !coupon.disabled : false;
  return (
    <ConfirmDialog
      busy={busy}
      confirmLabel={disabling ? "Disable coupon" : "Enable coupon"}
      danger={disabling}
      description={
        disabling
          ? "Live checkouts that already applied this code will fail safely at payment and the customer is asked to try again without it. Reserved uses are released."
          : "Customers can apply this code again immediately."
      }
      onClose={onClose}
      onConfirm={async () => {
        if (!coupon) {
          return;
        }
        setBusy(true);
        const { _id, _creationTime, ...fields } = coupon;
        try {
          await save({ ...fields, id: _id, disabled: !coupon.disabled });
          onDone(`${coupon.code} ${disabling ? "disabled" : "enabled"}.`);
          onClose();
        } catch (error) {
          onDone(String(error));
        } finally {
          setBusy(false);
        }
      }}
      open={coupon !== undefined}
      title={
        disabling
          ? `Disable ${coupon?.code ?? ""}?`
          : `Enable ${coupon?.code ?? ""}?`
      }
    />
  );
}

export function CouponAdmin() {
  const params = useSearchParams();
  const courses = useQuery(api.registration.courses);
  const coupons = useQuery(api.registration.coupons);
  const materials = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 50 }
  );
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [toggling, setToggling] = useState<Coupon>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditor({ open: true });
    }
  }, [params]);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() => setEditor({ open: true })}
            size="sm"
            type="button"
          >
            New coupon
          </Button>
        }
        description="Uses count discounted seats, not orders."
        title="Coupons"
      />
      <ResultNotice message={message} />
      <Card>
        <CardContent className="p-0">
          <CouponsTable
            coupons={coupons}
            courses={courses}
            onEdit={(c) => {
              setMessage("");
              setEditor({ open: true, coupon: c });
            }}
            onNew={() => setEditor({ open: true })}
            onToggle={(c) => {
              setMessage("");
              setToggling(c);
            }}
          />
        </CardContent>
      </Card>
      {editor.open ? (
        <CouponEditor
          coupon={editor.coupon}
          courses={courses}
          key={editor.coupon?._id ?? "new"}
          materials={materials}
          onClose={() => setEditor({ open: false })}
        />
      ) : null}
      <ToggleDialog
        coupon={toggling}
        onClose={() => setToggling(undefined)}
        onDone={setMessage}
      />
    </div>
  );
}
