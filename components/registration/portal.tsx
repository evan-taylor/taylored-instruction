"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";

type PortalRow = {
  id: string;
  title: string;
  state?: string;
  status?: string;
  total?: number;
  refunded?: number;
  materials?: { id: string; title: string; state: string }[];
  meetings?: {
    id: string;
    start: number;
    location: string;
    onlineUrl?: string;
    instructions: string;
  }[];
  attendees?: { name: string; email: string }[];
};
export function RegistrationPortal({ access = false }: { access?: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<PortalRow[]>([]);
  const [view, setView] = useState("registrations");
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  async function post(body: object) {
    const response = await fetch("/api/registration/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setMessage(
      data.error ?? data.message ?? "Access confirmed. Open your registrations."
    );
    return response.ok;
  }
  async function load(nextView: string, nextCursor: string | null = null) {
    const response = await fetch(
      `/api/registration/portal?view=${nextView}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""}`
    );
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error);
      return;
    }
    setRows(nextCursor ? [...rows, ...data.page] : data.page);
    setView(nextView);
    setCursor(data.continueCursor);
    setMore(!data.isDone);
  }
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-12">
      <h1 className="font-bold text-3xl">Your registrations</h1>
      {access ? (
        <>
          <p>
            Confirm access to your registrations. Opening this page does not
            consume your email link.
          </p>
          <Button
            onClick={async () => {
              const token = window.location.hash.slice(1);
              if (await post({ token })) {
                window.history.replaceState(null, "", "/registrations/access");
              }
            }}
            type="button"
          >
            Confirm secure access
          </Button>
        </>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          post({ email });
        }}
      >
        <label className="block">
          Email address
          <Input
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <Button type="submit">Email me secure access</Button>
      </form>
      <div className="flex gap-3">
        <Button onClick={() => load("registrations")} type="button">
          My registrations and materials
        </Button>
        <Button onClick={() => load("orders")} type="button" variant="outline">
          My purchaser orders
        </Button>
      </div>
      {message ? <p role="status">{message}</p> : null}
      {rows.map((row) => (
        <article
          className="space-y-3 rounded border border-slate-400 p-5"
          key={row.id}
        >
          <h2 className="font-semibold text-2xl">{row.title}</h2>
          <p>{row.state ?? row.status}</p>
          {row.total === undefined ? null : (
            <p>
              Paid total: ${(row.total / 100).toFixed(2)} · Refunded: $
              {((row.refunded ?? 0) / 100).toFixed(2)}
            </p>
          )}
          {row.attendees?.map((a) => (
            <p key={a.email}>
              {a.name} · {a.email}
            </p>
          ))}
          {row.meetings?.map((m) => (
            <div key={m.id}>
              <p>
                {new Date(m.start).toLocaleString()} · {m.location}
              </p>
              <p>{m.instructions}</p>
              {m.onlineUrl ? (
                <a className="underline" href={m.onlineUrl} rel="noreferrer">
                  Join online
                </a>
              ) : null}
            </div>
          ))}
          {row.meetings?.length ? (
            <a
              className="block underline"
              href={`/api/registration/portal?calendar=${encodeURIComponent(row.id)}`}
            >
              Download calendar
            </a>
          ) : null}
          {row.materials?.map((m) => (
            <div key={m.id}>
              {m.title} · {m.state}
              {m.state === "ready" ? (
                <Button
                  onClick={async () => {
                    const response = await fetch(
                      `/api/registration/portal?material=${encodeURIComponent(m.id)}`
                    );
                    const data = await response.json();
                    if (response.ok && data.url) {
                      window.open(data.url, "_blank", "noopener,noreferrer");
                    } else {
                      setMessage("Material unavailable");
                    }
                  }}
                  type="button"
                  variant="outline"
                >
                  Open material
                </Button>
              ) : (
                <p>Please contact us for your missing material.</p>
              )}
            </div>
          ))}
        </article>
      ))}
      {more ? (
        <Button onClick={() => load(view, cursor)} type="button">
          Load more
        </Button>
      ) : null}
      <p>
        For cancellations or changes, please{" "}
        <a className="underline" href="/contact">
          contact us
        </a>
        .
      </p>
    </section>
  );
}
