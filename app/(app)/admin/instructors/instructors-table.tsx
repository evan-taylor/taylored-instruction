"use client";

import { Search, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { TextInput } from "@/components/ui/field";
import { MenuItem, RowMenu } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { formatLastLogin } from "./helpers";
import type { ProfileWithUser } from "./types";

type InstructorsTableProps = {
  profiles: ProfileWithUser[];
  onToggleStatus: (
    profileId: string,
    userId: string,
    currentStatus: boolean
  ) => void;
  onRejectUser: (profileId: string, userEmail: string | null) => void;
};
type StatusFilter = "all" | "approved" | "pending";

export function InstructorsTable({
  profiles,
  onToggleStatus,
  onRejectUser,
}: InstructorsTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  if (profiles.length === 0) {
    return (
      <EmptyState
        description="Instructors appear here once they accept an invitation."
        title="No instructor accounts yet"
      />
    );
  }
  const approved = profiles.filter((profile) => profile.isInstructor).length;
  const needle = search.trim().toLowerCase();
  const rows = profiles.filter((profile) => {
    if (status !== "all" && profile.isInstructor !== (status === "approved")) {
      return false;
    }
    return (
      !needle ||
      profile.userEmail?.toLowerCase().includes(needle) ||
      profile.userName?.toLowerCase().includes(needle)
    );
  });
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-slate-100 border-b px-4 pt-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          className="border-b-0"
          label="Instructor status"
          onChange={setStatus}
          tabs={[
            { id: "all", label: "All", count: profiles.length },
            { id: "approved", label: "Approved", count: approved },
            {
              id: "pending",
              label: "Not approved",
              count: profiles.length - approved,
            },
          ]}
          value={status}
        />
        <div className="relative pb-3 sm:w-72">
          <label className="sr-only" htmlFor="instructor-search">
            Search instructors by name or email
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
          />
          <TextInput
            className="pl-9"
            id="instructor-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            type="search"
            value={search}
          />
        </div>
      </div>
      <TabPanel active className="pt-0" id={status}>
        {rows.length === 0 ? (
          <EmptyState
            className="rounded-none border-0"
            description="Try a different name, email, or status."
            title="No instructors match"
          />
        ) : (
          <Table wrapperClassName="rounded-none border-0">
            <THead>
              <tr>
                <TH>Instructor</TH>
                <TH>Status</TH>
                <TH>Last sign-in</TH>
                <TH className="text-right">
                  <span className="sr-only">Actions</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((profile) => {
                const email = profile.userEmail || "No email";
                const lastLogin = formatLastLogin(profile.lastLogin).text;
                return (
                  <TR key={profile.id}>
                    <TD>
                      <span className="block font-medium text-slate-900">
                        {profile.userName || email}
                      </span>
                      {profile.userName ? (
                        <span className="block text-slate-500 text-xs">
                          {email}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      {profile.isInstructor ? (
                        <Badge tone="success">Approved</Badge>
                      ) : (
                        <Badge tone="warning">Not approved</Badge>
                      )}
                    </TD>
                    <TD
                      className={
                        profile.lastLogin
                          ? "whitespace-nowrap"
                          : "whitespace-nowrap text-slate-400"
                      }
                    >
                      {lastLogin}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {profile.isInstructor ? null : (
                          <Button
                            aria-label={`Approve ${email}`}
                            onClick={() =>
                              onToggleStatus(profile.id, profile.userId, false)
                            }
                            size="xs"
                            type="button"
                            variant="secondary"
                          >
                            Approve
                          </Button>
                        )}
                        <RowMenu label={`More actions for ${email}`}>
                          {profile.isInstructor ? (
                            <MenuItem
                              danger
                              icon={UserMinus}
                              onSelect={() =>
                                onToggleStatus(profile.id, profile.userId, true)
                              }
                            >
                              Revoke approval
                            </MenuItem>
                          ) : (
                            <MenuItem
                              danger
                              icon={Trash2}
                              onSelect={() =>
                                onRejectUser(profile.id, profile.userEmail)
                              }
                            >
                              Reject and delete account
                            </MenuItem>
                          )}
                        </RowMenu>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </TabPanel>
    </div>
  );
}
