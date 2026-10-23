"use client";
import { useQuery } from "convex/react";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCourses } from "@/components/registration/catalog";
import {
  formatDateTime,
  formatMeeting,
  pluralize,
  shortZone,
} from "@/components/registration/format";
import { InstructorRoster } from "@/components/registration/instructor";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DescriptionList,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { Meter } from "@/components/ui/stat";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SessionFiles } from "./session-files";
import { SessionKeycodes } from "./session-keycodes";

type DetailTab = "overview" | "roster" | "keycodes" | "files";
const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "roster", label: "Roster" },
  { id: "keycodes", label: "Keycodes" },
  { id: "files", label: "Files" },
];

function isTab(value: string | null): value is DetailTab {
  return TABS.some((t) => t.id === value);
}

/** One session, with its roster and files. Linked from the sessions list. */
export function SessionDetail({
  sessionId,
}: {
  sessionId: Id<"registrationSessions">;
}) {
  const session = useQuery(api.registrationOperations.sessionForStaff, {
    sessionId,
  });
  const courses = useCourses();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const tab: DetailTab = isTab(requested) ? requested : "overview";
  const go = (next: DetailTab) => {
    router.replace(next === "overview" ? pathname : `${pathname}?tab=${next}`, {
      scroll: false,
    });
  };
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  if (session === undefined) {
    return (
      <div aria-busy="true" className="space-y-6" role="status">
        <span className="sr-only">Loading session…</span>
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (session === null) {
    return (
      <EmptyState
        action={
          <Button href="/admin/sessions" size="sm">
            All sessions
          </Button>
        }
        description="It may have been removed, or you don’t have access to it."
        title="This session isn’t available."
      />
    );
  }
  const course = courses?.find((c) => c._id === session.courseId);
  const zone = session.timeZone;
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-primary text-sm underline-offset-2 hover:underline"
        href="/admin/sessions"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All sessions
      </Link>
      <PageHeader
        actions={
          <>
            <CopyButton
              label="Share link"
              value={`${origin}/s/${session.code}`}
            />
            <Button href={`/admin/sessions?session=${session._id}`} size="sm">
              Edit session
            </Button>
          </>
        }
        description={`${course?.title ?? "Course"} · ${pluralize(session.meetings.length, "meeting")} · ${formatDateTime(session.firstStart, zone)} ${shortZone(zone, session.firstStart)}`}
        eyebrow="Session"
        title={session.title}
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={session.state} />
        <StatusBadge status={session.publication} />
        <StatusBadge status={session.visibility} />
      </div>
      <Tabs label="Session sections" onChange={go} tabs={TABS} value={tab} />
      <TabPanel active={tab === "overview"} id="overview">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-none divide-y divide-slate-100 p-0">
                {session.meetings.map((m) => (
                  <li className="space-y-1 py-3 text-sm" key={m.id}>
                    <p className="flex items-start gap-2 text-slate-900">
                      <CalendarDays
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      />
                      {formatMeeting(m, zone)} {shortZone(zone, m.start)}
                    </p>
                    <p className="flex items-start gap-2 text-slate-600">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                      />
                      {m.location || "Online"}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Meter
                label={`${session.reserved} of ${session.capacity} seats reserved`}
                max={session.capacity}
                value={session.reserved}
              />
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Course", value: course?.title ?? "Unknown course" },
                  { label: "Code", value: session.code },
                  { label: "Time zone", value: zone },
                  {
                    label: "Instructors",
                    value: pluralize(session.instructors.length, "instructor"),
                  },
                  {
                    label: "Waitlist offer window",
                    value: `${session.offerMinutes} minutes`,
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </TabPanel>
      <TabPanel active={tab === "roster"} id="roster">
        <InstructorRoster embedded sessionId={sessionId} />
      </TabPanel>
      <TabPanel active={tab === "keycodes"} id="keycodes">
        <SessionKeycodes session={session} />
      </TabPanel>
      <TabPanel active={tab === "files"} id="files">
        <SessionFiles sessionId={sessionId} />
      </TabPanel>
    </div>
  );
}
