"use client";
import { useConvexAuth } from "convex/react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Link2,
  MapPin,
  Package,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  EmptyState,
  Notice,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { trackRegistration } from "@/lib/registration-analytics";
import { formatMoney } from "@/shared/registration/domain";
import { formatMeeting, formatTime, shortZone } from "./format";

type PortalView = "registrations" | "orders";
type PortalRow = {
  id: string;
  title: string;
  state?: string;
  timeZone?: string;
  status?: string;
  total?: number;
  refunded?: number;
  tax?: number;
  materials?: {
    id: string;
    title: string;
    state: string;
    kind?: string;
    instructions?: string;
  }[];
  meetings?: {
    id: string;
    start: number;
    end?: number;
    location: string;
    onlineUrl?: string;
    instructions: string;
  }[];
  attendees?: { name: string; email: string }[];
};
type Message = { text: string; tone: "info" | "success" | "danger" } | null;

const TABS: { id: PortalView; label: string }[] = [
  { id: "registrations", label: "My registrations" },
  { id: "orders", label: "Orders I placed" },
];

async function fetchMaterialPage(
  seatId: string,
  cursor: string | null
): Promise<{
  page: NonNullable<PortalRow["materials"]>;
  continueCursor: string;
  isDone: boolean;
}> {
  const response = await fetch(
    `/api/registration/portal?materials=${encodeURIComponent(seatId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
  );
  if (!response.ok) {
    throw new Error("Unable to load materials");
  }
  return await response.json();
}

function MaterialList({
  row,
  onMessage,
}: {
  row: PortalRow;
  onMessage: (message: Message) => void;
}) {
  const [loaded, setLoaded] = useState<NonNullable<
    PortalRow["materials"]
  > | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const materials = loaded ?? row.materials ?? [];
  return (
    <>
      {materials.length ? (
        <ul className="list-none divide-y divide-slate-100 p-0">
          {materials.map((m) => (
            <MaterialRow
              key={m.id}
              material={m}
              onUnavailable={() =>
                onMessage({ text: "Material unavailable", tone: "danger" })
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-slate-500 text-sm">
          No materials are available for this registration yet.
        </p>
      )}
      {!done && (row.materials?.length ?? 0) >= 50 ? (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const first = await fetchMaterialPage(row.id, cursor);
              // The card already includes page one. Fetch past it on the first click.
              const next =
                cursor || first.isDone
                  ? null
                  : await fetchMaterialPage(row.id, first.continueCursor);
              setLoaded([
                ...(loaded ?? []),
                ...first.page,
                ...(next?.page ?? []),
              ]);
              setCursor(next?.continueCursor ?? first.continueCursor);
              setDone(next?.isDone ?? first.isDone);
            } catch {
              onMessage({ text: "Unable to load materials", tone: "danger" });
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {busy ? "Loading…" : "Load material history"}
        </Button>
      ) : null}
    </>
  );
}

const KIND_ICON = {
  pdf: FileText,
  link: Link2,
  keycode: KeyRound,
  physical: Package,
} as const;
const KIND_LABEL = {
  pdf: "PDF download",
  link: "Online access",
  keycode: "Access code",
  physical: "Physical item",
} as const;
type MaterialKind = keyof typeof KIND_ICON;
/** Letters and digits with at least one digit, so a shouted heading never qualifies. */
const ACCESS_CODE = /^(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{7,}$/u;
const MENTIONS_CODE = /\bcode\b/iu;
const LINE_BREAKS = /\n+/u;
const STEP_NUMBER = /^\d+[.)]\s+/u;

function materialKind(kind?: string): MaterialKind | null {
  return kind && kind in KIND_ICON ? (kind as MaterialKind) : null;
}
/**
 * Splits instructions into steps. For a keycode material, a bare code that
 * directly follows a line introducing it ("Copy your access code:") is lifted
 * out so it can be copied. Typed step numbers are removed because the portal
 * renders the steps in an ordered list.
 */
function parseInstructions(text: string, kind: MaterialKind | null) {
  const lines = text
    .split(LINE_BREAKS)
    .map((line) => line.trim())
    .filter(Boolean);
  const code =
    kind === "keycode"
      ? lines.find(
          (line, index) =>
            index > 0 &&
            ACCESS_CODE.test(line) &&
            MENTIONS_CODE.test(lines.at(index - 1) ?? "")
        )
      : undefined;
  return {
    code,
    steps: lines
      .filter((line) => line !== code)
      .map((line) => line.replace(STEP_NUMBER, "")),
  };
}
function openLabel(kind: MaterialKind | null) {
  if (kind === "pdf") {
    return "Download PDF";
  }
  return kind === "keycode" ? "Open and redeem" : "Open material";
}

/** What is happening with a material that has nothing to open yet. */
function MaterialStatusNote({
  physical,
  state,
}: {
  physical: boolean;
  state: string;
}) {
  if (state === "canceled") {
    return null;
  }
  if (physical) {
    return (
      <p className="text-slate-500 text-sm">
        {state === "fulfilled"
          ? "Provided by your instructor."
          : "Your instructor will arrange pickup."}
      </p>
    );
  }
  if (state === "pending") {
    return (
      <p className="text-slate-500 text-sm">
        We’re preparing this for you. Contact us if it hasn’t arrived by class
        time.
      </p>
    );
  }
  return null;
}

function MaterialRow({
  material,
  onUnavailable,
}: {
  material: NonNullable<PortalRow["materials"]>[number];
  onUnavailable: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const kind = materialKind(material.kind);
  const Icon = kind ? KIND_ICON[kind] : FileText;
  const { code, steps } = parseInstructions(material.instructions ?? "", kind);
  const physical = kind === "physical";
  const canceled = material.state === "canceled";
  const ready = !physical && material.state === "ready";
  return (
    <li className="flex items-start gap-3 py-4 first:pt-1 last:pb-1">
      <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 p-1.5 text-slate-600">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium text-slate-900 text-sm">{material.title}</p>
          <StatusBadge status={material.state} />
          {kind ? (
            <span className="basis-full text-slate-500 text-xs">
              {KIND_LABEL[kind]}
            </span>
          ) : null}
        </div>
        {code && !canceled ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-slate-500 text-xs">Your access code</p>
              <p className="select-all break-all font-mono font-semibold text-base text-slate-900 tracking-wide">
                {code}
              </p>
            </div>
            <CopyButton label="Copy code" value={code} />
          </div>
        ) : null}
        {steps.length && !canceled ? (
          <div>
            <p className="font-medium text-slate-500 text-xs uppercase tracking-wider">
              {physical ? "Pickup details" : "How to redeem"}
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-slate-600 text-sm">
              {steps.map((step) => (
                <li className="pl-1" key={step}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {physical && steps.length ? null : (
          <MaterialStatusNote physical={physical} state={material.state} />
        )}
        {ready ? (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                trackRegistration("registration_material_open_requested", {
                  material_kind: kind,
                });
                const response = await fetch("/api/registration/portal", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ material: material.id }),
                });
                const data = await response.json();
                if (response.ok && data.url) {
                  trackRegistration("registration_material_opened", {
                    material_kind: kind,
                  });
                  window.location.assign(data.url);
                } else {
                  trackRegistration("registration_material_open_failed", {
                    material_kind: kind,
                  });
                  onUnavailable();
                }
              } catch {
                trackRegistration("registration_material_open_failed", {
                  material_kind: kind,
                });
                onUnavailable();
              } finally {
                setBusy(false);
              }
            }}
            size="sm"
            type="button"
            variant={code ? "secondary" : "primary"}
          >
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            {busy ? "Opening…" : openLabel(kind)}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function MeetingRow({
  meeting,
  timeZone,
}: {
  timeZone?: string;
  meeting: NonNullable<PortalRow["meetings"]>[number];
}) {
  const when = meeting.end
    ? formatMeeting({ start: meeting.start, end: meeting.end }, timeZone)
    : `${formatTime(meeting.start, timeZone)}`;
  return (
    <li className="space-y-1 py-2 text-sm">
      <p className="flex items-start gap-2 text-slate-900">
        <CalendarDays
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        {when} {timeZone ? shortZone(timeZone, meeting.start) : ""}
      </p>
      <p className="flex items-start gap-2 text-slate-600">
        <MapPin
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
        />
        {meeting.location || "Online"}
      </p>
      {meeting.instructions ? (
        <p className="whitespace-pre-line rounded-md bg-slate-50 px-3 py-2 text-slate-700 text-xs">
          {meeting.instructions}
        </p>
      ) : null}
      {meeting.onlineUrl ? (
        <a
          className="inline-flex items-center gap-1 font-medium text-primary text-xs underline-offset-2 hover:underline"
          href={meeting.onlineUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          Join online
        </a>
      ) : null}
    </li>
  );
}

function RegistrationCard({
  row,
  onMessage,
}: {
  row: PortalRow;
  onMessage: (message: Message) => void;
}) {
  return (
    <Card>
      <CardHeader className="sm:items-center">
        <CardTitle>{row.title}</CardTitle>
        {row.state ? <StatusBadge status={row.state} /> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {row.meetings?.length ? (
          <section>
            <h3 className="mb-1 font-semibold text-slate-500 text-xs uppercase tracking-wide">
              Schedule and joining info
            </h3>
            <ul className="list-none divide-y divide-slate-100 p-0">
              {row.meetings.map((m) => (
                <MeetingRow key={m.id} meeting={m} timeZone={row.timeZone} />
              ))}
            </ul>
            <a
              className="mt-2 inline-flex items-center gap-1.5 font-medium text-primary text-sm underline-offset-2 hover:underline"
              href={`/api/registration/portal?calendar=${encodeURIComponent(row.id)}`}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Download calendar
            </a>
          </section>
        ) : null}
        <section>
          <h3 className="mb-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Materials
          </h3>
          <MaterialList onMessage={onMessage} row={row} />
        </section>
      </CardContent>
    </Card>
  );
}

function OrderCard({ row }: { row: PortalRow }) {
  return (
    <Card>
      <CardHeader className="sm:items-center">
        <CardTitle>{row.title}</CardTitle>
        {row.status ? <StatusBadge status={row.status} /> : null}
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:block sm:space-y-2">
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">
              Subtotal before tax
            </dt>
            <dd className="font-semibold text-slate-900 tabular-nums">
              {formatMoney(row.total ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">
              Refunded
            </dt>
            <dd className="text-slate-900 tabular-nums">
              {formatMoney(row.refunded ?? 0)}
            </dd>
          </div>
          {row.tax === undefined ? null : (
            <>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Sales tax
                </dt>
                <dd className="text-slate-900 tabular-nums">
                  {formatMoney(row.tax)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Total charged
                </dt>
                <dd className="font-semibold text-slate-900 tabular-nums">
                  {formatMoney((row.total ?? 0) + row.tax)}
                </dd>
              </div>
            </>
          )}
        </dl>
        <div>
          <h3 className="mb-1 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Attendees
          </h3>
          <ul className="list-none space-y-1 p-0 text-sm">
            {row.attendees?.map((a) => (
              <li className="text-slate-800" key={a.email}>
                {a.name} <span className="text-slate-500">· {a.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function SignInCard() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Sign in to see your registrations</CardTitle>
          <CardDescription>
            Enter the email you registered with and we’ll send a one-time code.
            No password needed.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <SignInForm submitLabel="Open my registrations" />
      </CardContent>
    </Card>
  );
}

function RowList({
  view,
  rows,
  loading,
  onMessage,
}: {
  view: PortalView;
  rows: PortalRow[];
  loading: boolean;
  onMessage: (message: Message) => void;
}) {
  if (loading && !rows.length) {
    return (
      <div aria-busy="true" className="space-y-4" role="status">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <EmptyState
        action={
          <Button href="/classes" size="sm" variant="secondary">
            Browse classes
          </Button>
        }
        description={
          view === "orders"
            ? "Orders you purchased for yourself or others will appear here."
            : "Classes you’re registered for will appear here with materials and joining details."
        }
        title={view === "orders" ? "No orders yet" : "No registrations yet"}
      />
    );
  }
  return (
    <div className="space-y-4">
      {rows.map((row) =>
        view === "orders" ? (
          <OrderCard key={row.id} row={row} />
        ) : (
          <RegistrationCard key={row.id} onMessage={onMessage} row={row} />
        )
      )}
    </div>
  );
}

export function RegistrationPortal() {
  const { isAuthenticated, isLoading: checkingAuth } = useConvexAuth();
  const [message, setMessage] = useState<Message>(null);
  const [rows, setRows] = useState<PortalRow[]>([]);
  const [view, setView] = useState<PortalView>("registrations");
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bumped whenever the signed-in account changes, so a load that started
  // under the previous account can never write its rows into this one.
  const session = useRef(0);

  async function load(nextView: PortalView, nextCursor: string | null = null) {
    const started = session.current;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/registration/portal?view=${nextView}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""}`
      );
      const data = await response.json();
      if (started !== session.current) {
        return;
      }
      if (!response.ok) {
        trackRegistration("registration_portal_failed", {
          view: nextView,
          error_stage: "response",
        });
        setMessage({
          text:
            data.error ??
            "We couldn’t load your registrations. Sign in again and retry.",
          tone: "danger",
        });
        return;
      }
      trackRegistration("registration_portal_loaded", {
        view: nextView,
        result_count: data.page.length,
        is_more: Boolean(nextCursor),
      });
      setRows(nextCursor ? [...rows, ...data.page] : data.page);
      setView(nextView);
      setCursor(data.continueCursor);
      setMore(!data.isDone);
      setLoaded(true);
    } catch {
      if (started === session.current) {
        trackRegistration("registration_portal_failed", {
          view: nextView,
          error_stage: "network",
        });
        setMessage({
          text: "We couldn’t reach the portal. Check your connection and try again.",
          tone: "danger",
        });
      }
    } finally {
      if (started === session.current) {
        setLoading(false);
      }
    }
  }
  // The portal is whatever the signed-in email is registered for. Signing in
  // loads it; signing out (in this or another tab) clears it and retires any
  // request still in flight.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reacts to auth state only
  useEffect(() => {
    session.current += 1;
    setMessage(null);
    setRows([]);
    setLoaded(false);
    setCursor(null);
    setMore(false);
    setLoading(false);
    if (isAuthenticated) {
      load("registrations");
    }
  }, [isAuthenticated]);
  const probing = checkingAuth || (isAuthenticated && !loaded && loading);
  const ready = isAuthenticated && loaded;
  const failed =
    isAuthenticated && message !== null && !(loaded || loading || checkingAuth);
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <PageHeader
          description="Class schedules, joining instructions, course materials, and receipts in one place."
          eyebrow="Secure portal"
          title="Your registrations"
        />
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        {probing ? (
          <div aria-busy="true" className="space-y-4" role="status">
            <span className="sr-only">Checking your access…</span>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : null}
        {probing || isAuthenticated ? null : (
          <div className="mx-auto max-w-xl">
            <SignInCard />
          </div>
        )}
        {failed ? (
          <div className="flex justify-center">
            <Button
              onClick={() => load("registrations")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : null}
        {ready ? (
          <>
            <Tabs
              label="Portal sections"
              onChange={(next) => {
                setMessage(null);
                load(next);
              }}
              tabs={TABS}
              value={view}
            />
            {TABS.map((tab) => (
              <TabPanel active={view === tab.id} id={tab.id} key={tab.id}>
                <RowList
                  loading={loading}
                  onMessage={setMessage}
                  rows={rows}
                  view={tab.id}
                />
              </TabPanel>
            ))}
            {more ? (
              <div className="flex justify-center">
                <Button
                  disabled={loading}
                  onClick={() => load(view, cursor)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {loading ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        <p className="text-center text-slate-500 text-sm">
          For cancellations or changes, please{" "}
          <a
            className="font-medium text-primary underline-offset-2 hover:underline"
            href="/contact"
          >
            contact us
          </a>
          .
        </p>
      </div>
    </div>
  );
}
