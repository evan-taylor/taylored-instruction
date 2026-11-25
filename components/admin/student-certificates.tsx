"use client";
import { useConvex, usePaginatedQuery, useQuery } from "convex/react";
import { Award, Download } from "lucide-react";
import { useState } from "react";
import {
  type CertificateRow,
  CertificateTable,
  StudentCertificates,
} from "@/components/registration/certificates";
import { errorText } from "@/components/registration/errors";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select, TextInput, Toggle } from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { csv } from "@/shared/registration/domain";
import {
  AGENCY_LABELS,
  type CertificateAgency,
  certificateCourseTitle,
  certificateLinks,
} from "@/shared/registration/student-certificates";

const PAGE = 50;
const EXPORT_PAGE = 200;
const WINDOWS = [
  { value: "", label: "Any expiry date" },
  { value: "30", label: "Expiring in 30 days" },
  { value: "60", label: "Expiring in 60 days" },
  { value: "90", label: "Expiring in 90 days" },
  { value: "180", label: "Expiring in 6 months" },
];

const CSV_HEADER = [
  "First name",
  "Last name",
  "Email",
  "Agency",
  "Certificate",
  "Certificate ID",
  "Issued",
  "Expires",
  "Instructor",
  "Training site",
  "Session",
  "Renewed",
  "View link",
];

function csvRow(row: CertificateRow) {
  return [
    row.firstName,
    row.lastName,
    row.email,
    row.agency.toUpperCase(),
    certificateCourseTitle(row.course),
    row.certificateId,
    row.issuedOn,
    row.expiresOn,
    row.instructor ?? "",
    row.trainingSite ?? "",
    row.sessionTitle ?? "",
    row.supersededBy ? "yes" : "no",
    certificateLinks(row.agency, row.certificateId).view.url,
  ];
}

type Page = { page: CertificateRow[]; continueCursor: string; isDone: boolean };

/** Every page of the filtered report, following each page's cursor. */
async function collectRows(
  fetchPage: (cursor: string | null) => Promise<Page>,
  cursor: string | null = null,
  rows: string[][] = []
): Promise<string[][]> {
  const result = await fetchPage(cursor);
  rows.push(...result.page.map(csvRow));
  return result.isDone
    ? rows
    : collectRows(fetchPage, result.continueCursor, rows);
}

/** Staff report of the certificates we issued, with CSV export. */
export function StudentCertificatesAdmin() {
  const convex = useConvex();
  const types = useQuery(api.studentCertificates.types);
  const [agency, setAgency] = useState<"" | CertificateAgency>("");
  const [typeKey, setTypeKey] = useState("");
  const [window, setWindow] = useState("");
  const [includeExpired, setIncludeExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const filters = {
    agency: agency || undefined,
    typeKey: typeKey || undefined,
    expiringWithinDays: window ? Number(window) : undefined,
    includeExpired,
  };
  const student = email.trim().includes("@") ? email.trim().toLowerCase() : "";
  const rows = usePaginatedQuery(
    api.studentCertificates.list,
    student ? "skip" : { filters },
    { initialNumItems: PAGE }
  );

  const exportCsv = async () => {
    setExporting(true);
    setMessage("");
    try {
      const lines = [
        CSV_HEADER,
        ...(await collectRows((cursor) =>
          convex.query(api.studentCertificates.list, {
            filters,
            paginationOpts: { numItems: EXPORT_PAGE, cursor },
          })
        )),
      ];
      const blob = new Blob([`${csv(lines)}\r\n`], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `student-certificates-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      setMessage(errorText(error, "The export failed. Try again."));
    } finally {
      setExporting(false);
    }
  };

  let body: React.ReactNode;
  if (student) {
    body = (
      <div className="p-5">
        <StudentCertificates email={student} />
      </div>
    );
  } else if (rows.status === "LoadingFirstPage") {
    body = <Skeleton className="m-5 h-40" />;
  } else if (rows.results.length === 0) {
    body = (
      <div className="p-5">
        <EmptyState
          description="Certificates appear here after staff upload an agency file on a session’s Certificates tab."
          icon={<Award aria-hidden="true" className="h-6 w-6" />}
          title="No certificates match"
        />
      </div>
    );
  } else {
    body = <CertificateTable rows={rows.results} showSession />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            disabled={exporting || Boolean(student)}
            onClick={exportCsv}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
        description="Certificates issued to students, soonest expiry first. Students get reminders 60 and 30 days before expiry and on the day."
        title="Student certificates"
      />
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Student email">
            {(props) => (
              <TextInput
                {...props}
                autoComplete="off"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            )}
          </Field>
          <Field label="Agency">
            {(props) => (
              <Select
                {...props}
                onChange={(event) => {
                  const next = event.target.value as "" | CertificateAgency;
                  setAgency(next);
                  const current = types?.find((t) => t.typeKey === typeKey);
                  if (next && current && current.agency !== next) {
                    setTypeKey("");
                  }
                }}
                value={agency}
              >
                <option value="">All agencies</option>
                {(Object.keys(AGENCY_LABELS) as CertificateAgency[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {AGENCY_LABELS[key]}
                    </option>
                  )
                )}
              </Select>
            )}
          </Field>
          <Field label="Certificate type">
            {(props) => (
              <Select
                {...props}
                onChange={(event) => setTypeKey(event.target.value)}
                value={typeKey}
              >
                <option value="">All types</option>
                {(types ?? [])
                  .filter((type) => !agency || type.agency === agency)
                  .map((type) => (
                    <option key={type.typeKey} value={type.typeKey}>
                      {type.course} ({type.agency.toUpperCase()})
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field label="Expiring">
            {(props) => (
              <Select
                {...props}
                onChange={(event) => setWindow(event.target.value)}
                value={window}
              >
                {WINDOWS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Toggle
            checked={includeExpired}
            className="sm:col-span-2"
            label="Include expired certificates"
            onChange={setIncludeExpired}
          />
        </CardContent>
      </Card>
      <ResultNotice message={message} tone="danger" />
      <Card>
        <CardContent className="p-0">{body}</CardContent>
        {!student &&
        (rows.status === "CanLoadMore" || rows.status === "LoadingMore") ? (
          <div className="border-slate-100 border-t px-5 py-3">
            <Button
              disabled={rows.status === "LoadingMore"}
              onClick={() => rows.loadMore(PAGE)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Load more
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
