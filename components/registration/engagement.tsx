"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function countLabel(count: number | undefined, label: string) {
  return count ? ` · ${count} recorded ${label}` : "";
}

function time(value: number | undefined) {
  return value === undefined
    ? "No recorded activity"
    : new Date(value).toLocaleString();
}

export function RegistrationEngagement({
  seatId,
}: {
  seatId: Id<"registrationSeats">;
}) {
  const history = useQuery(api.registrationEngagement.history, { seatId });
  return (
    <section className="space-y-3">
      <h4 className="font-semibold text-slate-900 text-sm">
        Email and material activity
      </h4>
      <p className="text-slate-500 text-xs">
        Opens and clicks are signals from the email provider and may include
        automated activity. Material access means a signed-in attendee requested
        a material link in the portal; it does not confirm download, redemption,
        or course completion.
      </p>
      {history ? (
        <>
          {history.truncated ? (
            <p role="status">
              This registration has more history than can be displayed here.
            </p>
          ) : null}
          <h5 className="font-medium text-sm">Emails</h5>
          <p className="text-slate-500 text-xs">
            Attendee messages and billing emails for the registration’s order.
            Earlier tracking may be unavailable.
          </p>
          {history.emails.length ? (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {history.emails.map(({ job, tracking }) => (
                <li className="space-y-2 p-3 text-sm" key={job._id}>
                  <p className="font-medium">{job.subject}</p>
                  <p className="break-all text-slate-500">
                    To: {job.deliveredTo ?? job.recipient}
                  </p>
                  {job.deliveredTo && job.deliveredTo !== job.recipient ? (
                    <p>Intended recipient: {job.recipient} (test redirect)</p>
                  ) : null}
                  <dl className="grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Send status</dt>
                      <dd>
                        {job.state} ·{" "}
                        {job.sentAt
                          ? time(job.sentAt)
                          : `Created ${time(job._creationTime)}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Delivery status</dt>
                      <dd>
                        {tracking?.status
                          .replace("email.", "")
                          .replaceAll("_", " ") ?? "No recorded delivery event"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">First opened</dt>
                      <dd>
                        {time(tracking?.openedAt)}
                        {countLabel(tracking?.opens, "opens")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">First clicked</dt>
                      <dd>
                        {time(tracking?.clickedAt)}
                        {countLabel(tracking?.clicks, "clicks")}
                      </dd>
                    </div>
                  </dl>
                  {job.error ? (
                    <p className="text-red-700">{job.error}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm">
              No registration emails recorded.
            </p>
          )}
          <h5 className="font-medium text-sm">Material access</h5>
          <ul className="space-y-2 text-sm">
            {history.materials.map((material) => (
              <li key={material.id}>
                <p className="font-medium">{material.title}</p>
                <p className="text-slate-500 text-xs">
                  {material.accessCount
                    ? `First access: ${time(material.firstAccessedAt)} · Last access: ${time(material.lastAccessedAt)} · ${material.accessCount} requests`
                    : "No recorded portal access"}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p role="status">Loading activity…</p>
      )}
    </section>
  );
}
