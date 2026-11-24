"use client";

import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MyCertificationsCard } from "@/components/certifications/certifications";
import { errorText } from "@/components/registration/errors";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DescriptionList,
  Notice,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";
import { workspaceLinks } from "@/lib/workspace-navigation";

type QuickLink = { label: string; href: string };

function LinkList({ links }: { links: QuickLink[] }) {
  return (
    <ul className="list-none divide-y divide-slate-100 p-0">
      {links.map((link) => (
        <li key={link.href}>
          <a
            className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
            href={link.href}
            rel={
              link.href.startsWith("http") ? "noopener noreferrer" : undefined
            }
            target={link.href.startsWith("http") ? "_blank" : undefined}
          >
            <span>
              <span className="block font-medium text-slate-900">
                {link.label}
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-400">
              →
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function instructorStatus(
  isInstructor: boolean,
  isAligned: boolean,
  requested: boolean
) {
  if (isInstructor || isAligned) {
    return (
      <span className="flex flex-wrap gap-1">
        {isInstructor ? (
          <Badge tone="success">Teaches for Taylored Instruction</Badge>
        ) : null}
        {isAligned ? (
          <Badge tone="primary">Aligned with our Training Site</Badge>
        ) : null}
      </span>
    );
  }
  return requested ? (
    <Badge tone="warning">Not approved</Badge>
  ) : (
    <Badge tone="neutral">Not an instructor</Badge>
  );
}

function AcceptInvitation({
  teaches,
  courses,
}: {
  teaches: boolean;
  courses: string[];
}) {
  const acceptInvitation = useMutation(api.instructorInvitations.accept);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  return (
    <>
      <p className="text-slate-900 text-sm">
        {teaches
          ? "You’ve been invited to teach with Taylored Instruction. Accept to unlock instructor tools, eCard purchasing, and your assigned sessions."
          : "Your alignment with our Training Site is approved. Accept to schedule your own independent classes, keep their rosters, and export them for card issuing, plus eCard purchasing."}
      </p>
      {courses.length ? (
        <p className="text-slate-600 text-sm">
          {teaches
            ? "You’re also aligned with our Training Site for: "
            : "Aligned courses: "}
          {courses.join(", ")}
        </p>
      ) : null}
      {acceptError ? <Notice tone="danger">{acceptError}</Notice> : null}
      <Button
        disabled={accepting}
        onClick={async () => {
          setAccepting(true);
          setAcceptError(null);
          try {
            await acceptInvitation();
          } catch (error) {
            setAcceptError(
              errorText(
                error,
                "We couldn’t accept the invitation. Try again in a moment."
              )
            );
          } finally {
            setAccepting(false);
          }
        }}
        size="sm"
        type="button"
      >
        {accepting ? "Accepting…" : "Accept invitation"}
      </Button>
    </>
  );
}

export default function MyAccountPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const authToken = useAuthToken();
  const { profile, loading, isInstructor, isAligned, error, email } =
    useProfile();
  const isAdmin = isAdminEmail(email);
  const invitation = useQuery(api.instructorInvitations.mine);

  useEffect(() => {
    if (!loading && authToken === null) {
      router.push("/login");
    }
  }, [loading, authToken, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Notice tone="danger">We couldn’t load your account. {error}</Notice>
        <div className="mt-4">
          <Button onClick={() => window.location.reload()} type="button">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (loading || authToken === null) {
    return (
      <div
        aria-busy="true"
        className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6"
        role="status"
      >
        <span className="sr-only">Loading your account…</span>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const groups: { title: string; links: QuickLink[] }[] = [];
  for (const item of workspaceLinks(true, isInstructor, isAdmin, isAligned)) {
    if (item.type === "divider") {
      groups.push({ title: item.label, links: [] });
    } else if (item.href !== "/my-account" && groups.length) {
      groups.at(-1)?.links.push({ label: item.label, href: item.href });
    }
  }
  const linkGroups = groups.filter((group) => group.links.length > 0);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <PageHeader
          actions={
            <Button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Sign out
            </Button>
          }
          title="My account"
        />
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                { label: "Email", value: email || "Not available" },
                {
                  label: "Instructor status",
                  value: instructorStatus(
                    isInstructor,
                    isAligned,
                    Boolean(profile?.id)
                  ),
                },
              ]}
            />
          </CardContent>
          {invitation || !(isInstructor || isAligned) ? (
            <CardFooter className="flex flex-col items-start gap-3">
              {invitation ? (
                <AcceptInvitation
                  courses={invitation.courses}
                  teaches={invitation.teaches}
                />
              ) : (
                <p className="text-slate-600 text-sm">
                  Instructor access is by invitation. If you teach with Taylored
                  Instruction and haven’t received one, contact us. Students
                  don’t need this to see their registrations.
                </p>
              )}
            </CardFooter>
          ) : null}
        </Card>
        <MyCertificationsCard />
        {linkGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <LinkList links={group.links} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
