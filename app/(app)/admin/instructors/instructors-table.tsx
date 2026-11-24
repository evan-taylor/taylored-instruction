"use client";

import { ClipboardList, Search, Trash2, Unlink, UserMinus } from "lucide-react";
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
  /** Marks or clears "aligned with our Training Site" on the record. */
  onSetAlignment: (profile: ProfileWithUser, aligned: boolean) => void;
  onShowSessions: (userId: string) => void;
  /** Users who own independent sessions, aligned now or not. */
  sessionOwners: Set<string>;
};
type StatusFilter = "all" | "teaches" | "aligned" | "none";

function matches(profile: ProfileWithUser, status: StatusFilter) {
  switch (status) {
    case "teaches":
      return profile.isInstructor;
    case "aligned":
      return profile.alignment !== null;
    case "none":
      return !(profile.isInstructor || profile.alignment);
    default:
      return true;
  }
}

export function InstructorsTable({
  profiles,
  onToggleStatus,
  onRejectUser,
  onSetAlignment,
  onShowSessions,
  sessionOwners,
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
  const count = (filter: StatusFilter) =>
    profiles.filter((profile) => matches(profile, filter)).length;
  const needle = search.trim().toLowerCase();
  const rows = profiles.filter((profile) => {
    if (!matches(profile, status)) {
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
            { id: "teaches", label: "Teach for us", count: count("teaches") },
            { id: "aligned", label: "Aligned", count: count("aligned") },
            { id: "none", label: "No access", count: count("none") },
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
                <TH>Teaches for us</TH>
                <TH>Aligned with our Training Site</TH>
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
                        <Badge tone="success">Teaches for us</Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">No</span>
                      )}
                    </TD>
                    <AlignmentCell
                      email={email}
                      onSetAlignment={onSetAlignment}
                      profile={profile}
                    />
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
                            aria-label={`Approve ${email} to teach for us`}
                            onClick={() =>
                              onToggleStatus(profile.id, profile.userId, false)
                            }
                            size="xs"
                            type="button"
                            variant="secondary"
                          >
                            Approve to teach
                          </Button>
                        )}
                        <MoreActions
                          email={email}
                          onRejectUser={onRejectUser}
                          onSetAlignment={onSetAlignment}
                          onShowSessions={onShowSessions}
                          onToggleStatus={onToggleStatus}
                          ownsSessions={sessionOwners.has(profile.userId)}
                          profile={profile}
                        />
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

function AlignmentCell({
  profile,
  email,
  onSetAlignment,
}: {
  profile: ProfileWithUser;
  email: string;
  onSetAlignment: InstructorsTableProps["onSetAlignment"];
}) {
  return (
    <TD>
      {profile.alignment ? (
        <Badge tone="primary">Aligned</Badge>
      ) : (
        <Button
          aria-label={`Mark ${email} aligned`}
          onClick={() => onSetAlignment(profile, true)}
          size="xs"
          type="button"
          variant="ghost"
        >
          Mark aligned
        </Button>
      )}
    </TD>
  );
}

function MoreActions({
  profile,
  email,
  onToggleStatus,
  onRejectUser,
  onShowSessions,
  onSetAlignment,
  ownsSessions,
}: Pick<
  InstructorsTableProps,
  "onToggleStatus" | "onRejectUser" | "onShowSessions" | "onSetAlignment"
> & { profile: ProfileWithUser; email: string; ownsSessions: boolean }) {
  return (
    <RowMenu label={`More actions for ${email}`}>
      {profile.alignment || ownsSessions ? (
        <MenuItem
          icon={ClipboardList}
          onSelect={() => onShowSessions(profile.userId)}
        >
          Independent sessions
        </MenuItem>
      ) : null}
      {profile.alignment ? (
        <MenuItem
          danger
          icon={Unlink}
          onSelect={() => onSetAlignment(profile, false)}
        >
          Remove alignment
        </MenuItem>
      ) : null}
      {profile.isInstructor ? (
        <MenuItem
          danger
          icon={UserMinus}
          onSelect={() => onToggleStatus(profile.id, profile.userId, true)}
        >
          Stop teaching for us
        </MenuItem>
      ) : null}
      {profile.isInstructor || profile.alignment ? null : (
        <MenuItem
          danger
          icon={Trash2}
          onSelect={() => onRejectUser(profile.id, profile.userEmail)}
        >
          Reject and delete account
        </MenuItem>
      )}
    </RowMenu>
  );
}
