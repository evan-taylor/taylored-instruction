"use client";

import { useConvex } from "convex/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import { ResultNotice } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  type AgencyAttendee,
  agencyCourseDate,
  ahaRosterXls,
  arcRosterCsv,
  collectAgencyAttendees,
} from "@/shared/registration/agency-roster";
import { errorText } from "./errors";

const COLUMNS = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Last name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "Phone", type: "tel", required: false },
] as const;

const ARC_COLUMNS = [
  { key: "evaluation", label: "Evaluation", type: "text", required: false },
  { key: "reason", label: "Reason", type: "text", required: false },
  {
    key: "additionalInformation",
    label: "Additional information",
    type: "text",
    required: false,
  },
] as const;

export function AgencyRosterExport({
  session,
}: {
  session: Doc<"registrationSessions">;
}) {
  const convex = useConvex();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [format, setFormat] = useState("arc");
  const [attendees, setAttendees] = useState<AgencyAttendee[]>([]);
  const [courseDate, setCourseDate] = useState("");
  const columns = format === "arc" ? [...COLUMNS, ...ARC_COLUMNS] : COLUMNS;

  async function prepare() {
    setOpen(true);
    setBusy(true);
    setMessage("");
    setAttendees([]);
    const end = Math.max(
      session.firstStart,
      ...session.meetings.map((meeting) => meeting.end)
    );
    setCourseDate(agencyCourseDate(end, session.timeZone));
    try {
      setAttendees(
        await collectAgencyAttendees((cursor) =>
          convex.query(api.registrationOperations.roster, {
            sessionId: session._id,
            paginationOpts: { numItems: 100, cursor },
          })
        )
      );
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setMessage("");
    try {
      const blob =
        format === "arc"
          ? new Blob([arcRosterCsv(attendees)], {
              type: "text/csv;charset=utf-8",
            })
          : new Blob([await ahaRosterXls(attendees, courseDate)], {
              type: "application/vnd.ms-excel",
            });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${format}-roster-${session._id}.${format === "arc" ? "csv" : "xls"}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        `Exported ${attendees.length} attendees. ${format === "arc" ? "Fill in evaluation and any required reason using the portal’s allowed values before uploading." : "Review the workbook before uploading to AHA."}`
      );
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        disabled={busy}
        onClick={prepare}
        size="sm"
        type="button"
        variant="primary"
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        Export agency roster
      </Button>
      <Modal
        description="Includes all active attendees, regardless of table selection or search. Held, cancelled, and transferred seats are excluded."
        onClose={() => setOpen(false)}
        open={open}
        size="xl"
        title="Export agency roster"
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await download();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Agency format">
              {(props) => (
                <Select
                  {...props}
                  disabled={busy}
                  onChange={(event) => setFormat(event.target.value)}
                  value={format}
                >
                  <option value="arc">American Red Cross (.csv)</option>
                  <option value="aha">American Heart Association (.xls)</option>
                </Select>
              )}
            </Field>
            {format === "aha" ? (
              <Field
                hint="Defaults to the final meeting date in the session’s time zone."
                label="Course date"
              >
                {(props) => (
                  <TextInput
                    {...props}
                    disabled={busy}
                    onChange={(event) => setCourseDate(event.target.value)}
                    required
                    type="date"
                    value={courseDate}
                  />
                )}
              </Field>
            ) : null}
          </div>
          <p className="text-slate-600 text-sm">
            Review names before exporting, especially compound surnames. Older
            registrations have names split at the first space. Changes here
            apply only to this download.
          </p>
          {format === "arc" ? (
            <p className="text-slate-600 text-sm">
              Evaluation and reason start blank because the template does not
              include the allowed values. Enter the exact values from ARC’s
              instructions here, or complete them in the CSV before uploading.
            </p>
          ) : null}
          {busy ? <p role="status">Preparing export…</p> : null}
          <Table>
            <THead>
              <TR>
                {columns.map((column) => (
                  <TH key={column.key}>{column.label}</TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {attendees.map((attendee, index) => (
                <TR key={attendee.id}>
                  {columns.map((column) => (
                    <TD key={column.key}>
                      <TextInput
                        aria-label={`${column.label} for attendee ${index + 1}`}
                        className="min-w-40"
                        disabled={busy}
                        onChange={(event) =>
                          setAttendees((current) =>
                            current.map((row) =>
                              row.id === attendee.id
                                ? { ...row, [column.key]: event.target.value }
                                : row
                            )
                          )
                        }
                        required={column.required}
                        type={column.type}
                        value={attendee[column.key] ?? ""}
                      />
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
          {busy || attendees.length ? null : (
            <p>No active attendees to export.</p>
          )}
          <ResultNotice message={message} />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="secondary"
            >
              Close
            </Button>
            <Button disabled={busy || !attendees.length} type="submit">
              Download {format === "arc" ? "ARC CSV" : "AHA XLS"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
