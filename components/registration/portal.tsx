"use client";
import {
  CalendarDays,
  Download,
  ExternalLink,
  KeyRound,
  Mail,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { TabPanel, Tabs } from "@/components/ui/tabs";
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
  materials?: { id: string; title: string; state: string }[];
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
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
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
        <p className="m-0 text-slate-500 text-sm">
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

function MaterialRow({
  material,
  onUnavailable,
}: {
  material: NonNullable<PortalRow["materials"]>[number];
  onUnavailable: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="flex items-center gap-2 text-slate-800 text-sm">
        {material.title}
        <StatusBadge status={material.state} />
      </span>
      {material.state === "ready" ? (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const response = await fetch(
                `/api/registration/portal?material=${encodeURIComponent(material.id)}`
              );
              const data = await response.json();
              if (response.ok && data.url) {
                window.location.assign(data.url);
              } else {
                onUnavailable();
              }
            } finally {
              setBusy(false);
            }
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          {busy ? "Opening…" : "Open"}
        </Button>
      ) : (
        <span className="text-slate-500 text-xs">
          Please contact us for your missing material.
        </span>
      )}
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
      <p className="m-0 flex items-start gap-2 text-slate-900">
        <CalendarDays
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        {when} {timeZone ? shortZone(timeZone, meeting.start) : ""}
      </p>
      <p className="m-0 flex items-start gap-2 text-slate-600">
        <MapPin
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
        />
        {meeting.location || "Online"}
      </p>
      {meeting.instructions ? (
        <p className="m-0 whitespace-pre-line rounded-md bg-slate-50 px-3 py-2 text-slate-700 text-xs">
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
            <h3 className="m-0 mb-1 font-semibold text-slate-500 text-xs uppercase tracking-wide">
              Schedule and joining info
            </h3>
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
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
          <h3 className="m-0 mb-1 font-semibold text-slate-500 text-xs uppercase tracking-wide">
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
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:block sm:space-y-2">
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">
              Subtotal before tax
            </dt>
            <dd className="m-0 font-semibold text-slate-900 tabular-nums">
              {formatMoney(row.total ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">
              Refunded
            </dt>
            <dd className="m-0 text-slate-900 tabular-nums">
              {formatMoney(row.refunded ?? 0)}
            </dd>
          </div>
          {row.tax === undefined ? null : (
            <>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Sales tax
                </dt>
                <dd className="m-0 text-slate-900 tabular-nums">
                  {formatMoney(row.tax)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Total charged
                </dt>
                <dd className="m-0 font-semibold text-slate-900 tabular-nums">
                  {formatMoney((row.total ?? 0) + row.tax)}
                </dd>
              </div>
            </>
          )}
        </dl>
        <div>
          <h3 className="m-0 mb-1 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Attendees
          </h3>
          <ul className="m-0 list-none space-y-1 p-0 text-sm">
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

function AccessCard({
  onConfirm,
  busy,
}: {
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <KeyRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="m-0 font-semibold text-slate-900">
              Confirm access to your registrations
            </p>
            <p className="m-0 mt-0.5 text-slate-600 text-sm">
              Opening this page does not consume your email link. Confirm below
              to unlock your registrations on this device for 24 hours.
            </p>
          </div>
        </div>
        <Button disabled={busy} onClick={onConfirm} type="button">
          {busy ? "Working…" : "Confirm secure access"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RequestAccessCard({
  email,
  busy,
  onEmail,
  onSubmit,
}: {
  email: string;
  busy: boolean;
  onEmail: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Get a secure access link</CardTitle>
          <CardDescription>
            Enter the email you registered with and we’ll send a one-time link.
            No password needed.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Field label="Email address">
            {(props) => (
              <TextInput
                {...props}
                autoComplete="email"
                onChange={(e) => onEmail(e.target.value)}
                required
                type="email"
                value={email}
              />
            )}
          </Field>
          <Button
            className="w-full sm:w-auto"
            disabled={busy}
            type="submit"
            variant="secondary"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            {busy ? "Sending…" : "Email me a secure link"}
          </Button>
        </form>
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

export function RegistrationPortal({ access = false }: { access?: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [rows, setRows] = useState<PortalRow[]>([]);
  const [view, setView] = useState<PortalView>("registrations");
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post(body: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/registration/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setMessage({
        text:
          data.error ??
          data.message ??
          "Access confirmed. Open your registrations.",
        tone: response.ok ? "success" : "danger",
      });
      return response.ok;
    } catch {
      setMessage({
        text: "We couldn’t reach the portal. Check your connection and try again.",
        tone: "danger",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  /**
   * Loads a portal view. `silent` is used for the first automatic attempt:
   * a visitor without access just sees the request form, not an error.
   */
  async function load(
    nextView: PortalView,
    nextCursor: string | null = null,
    silent = false
  ) {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/registration/portal?view=${nextView}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""}`
      );
      const data = await response.json();
      if (!response.ok) {
        if (!silent) {
          setMessage({
            text:
              data.error ??
              "We couldn’t load your registrations. Request a new secure link.",
            tone: "danger",
          });
        }
        return;
      }
      setRows(nextCursor ? [...rows, ...data.page] : data.page);
      setView(nextView);
      setCursor(data.continueCursor);
      setMore(!data.isDone);
      setLoaded(true);
    } catch {
      if (!silent) {
        setMessage({
          text: "We couldn’t reach the portal. Check your connection and try again.",
          tone: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  }
  // Signed-in users and devices that already confirmed a link go straight in.
  const [probing, setProbing] = useState(!access);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount
  useEffect(() => {
    if (access) {
      return;
    }
    load("registrations", null, true).finally(() => setProbing(false));
  }, []);
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <PageHeader
          description="Class schedules, joining instructions, course materials, and receipts in one place."
          eyebrow="Secure portal"
          title="Your registrations"
        />
        {access ? (
          <AccessCard
            busy={busy}
            onConfirm={async () => {
              const token = window.location.hash.slice(1);
              if (await post({ token })) {
                window.history.replaceState(null, "", "/registrations/access");
                await load("registrations");
              }
            }}
          />
        ) : null}
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        {probing ? (
          <div aria-busy="true" className="space-y-4" role="status">
            <span className="sr-only">Checking your access…</span>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : null}
        {probing || loaded || access ? null : (
          <div className="mx-auto max-w-xl">
            <RequestAccessCard
              busy={busy}
              email={email}
              onEmail={setEmail}
              onSubmit={() => post({ email })}
            />
          </div>
        )}
        {loaded ? (
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
        <p className="m-0 text-center text-slate-500 text-sm">
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
