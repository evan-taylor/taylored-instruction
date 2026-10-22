"use client";

import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";
import { workspaceLinks } from "@/lib/workspace-navigation";

type QuickLink = { label: string; href: string };

function LinkList({ links }: { links: QuickLink[] }) {
  return (
    <ul className="m-0 list-none divide-y divide-slate-100 p-0">
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

export default function MyAccountPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const authToken = useAuthToken();
  const { profile, loading, isInstructor, error, email } = useProfile();
  const isAdmin = isAdminEmail(email);

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
  for (const item of workspaceLinks(true, isInstructor, isAdmin)) {
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
                  value: isInstructor ? (
                    <Badge tone="success">Approved instructor</Badge>
                  ) : (
                    <Badge tone="warning">Awaiting approval</Badge>
                  ),
                },
              ]}
            />
          </CardContent>
          {!isInstructor && profile ? (
            <CardFooter>
              <p className="m-0 text-slate-600 text-sm">
                An administrator reviews new instructor accounts. You’ll get
                access to instructor tools once approved.
              </p>
            </CardFooter>
          ) : null}
        </Card>
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
