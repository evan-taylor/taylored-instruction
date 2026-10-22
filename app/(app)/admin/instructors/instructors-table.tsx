import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatLastLogin } from "./helpers";
import type { ProfileWithUser } from "./types";

interface InstructorsTableProps {
  onRejectUser: (profileId: string, userEmail: string | null) => void;
  onToggleStatus: (
    profileId: string,
    userId: string,
    currentStatus: boolean
  ) => void;
  profiles: ProfileWithUser[];
}

export function InstructorsTable({
  profiles,
  onToggleStatus,
  onRejectUser,
}: InstructorsTableProps) {
  if (profiles.length === 0) {
    return (
      <EmptyState
        description="Accounts appear here after someone signs in for the first time."
        title="No instructor accounts yet"
      />
    );
  }
  return (
    <Table>
      <THead>
        <tr>
          <TH>Email</TH>
          <TH>Status</TH>
          <TH>Last updated</TH>
          <TH>Last sign-in</TH>
          <TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {profiles.map((profile) => {
          const lastLoginInfo = formatLastLogin(profile.lastLogin);
          const email = profile.userEmail || "No email";
          return (
            <TR key={profile.id}>
              <TD>
                <span className="block font-medium text-slate-900">
                  {email}
                </span>
                <span className="block text-slate-500 text-xs">
                  {profile.shortId}
                </span>
              </TD>
              <TD>
                {profile.isInstructor ? (
                  <Badge tone="success">Approved instructor</Badge>
                ) : (
                  <Badge tone="warning">Awaiting approval</Badge>
                )}
              </TD>
              <TD className="whitespace-nowrap tabular-nums">
                {profile.updatedAt
                  ? new Date(profile.updatedAt).toLocaleDateString("en-US")
                  : "—"}
              </TD>
              <TD className="whitespace-nowrap">
                <span className={lastLoginInfo.className}>
                  {lastLoginInfo.text}
                </span>
              </TD>
              <TD className="whitespace-nowrap text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    aria-label={`${profile.isInstructor ? "Revoke approval for" : "Approve"} ${email}`}
                    onClick={() =>
                      onToggleStatus(
                        profile.id,
                        profile.userId,
                        profile.isInstructor
                      )
                    }
                    size="xs"
                    type="button"
                    variant={profile.isInstructor ? "secondary" : "primary"}
                  >
                    {profile.isInstructor ? "Revoke approval" : "Approve"}
                  </Button>
                  {profile.isInstructor ? null : (
                    <Button
                      aria-label={`Reject ${email}`}
                      onClick={() =>
                        onRejectUser(profile.id, profile.userEmail)
                      }
                      size="xs"
                      type="button"
                      variant="danger"
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
