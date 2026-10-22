import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sendInstructorApprovalEmail } from "@/app/actions/send-instructor-approval-email";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DESTRUCTIVE,
  EXTERNAL,
  type McpContext,
  ok,
  READ,
  run,
  WRITE,
} from "../context";
import { email, id } from "../shapes";

export function registerPeopleTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "invite_instructor",
    {
      title: "Invite instructor",
      description:
        "Emails an instructor invitation. The person signs in with this email and accepts it on their account page, which grants instructor access. Inviting the same email again re-sends the pending invitation.",
      inputSchema: { email },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () =>
        ok({
          invitationId: await ctx.convex.mutation(
            api.instructorInvitations.invite,
            { email: args.email }
          ),
          email: args.email,
        })
      )
  );

  server.registerTool(
    "list_instructor_invitations",
    {
      title: "List instructor invitations",
      description:
        "Instructor invitations with status: pending, accepted, or revoked.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.query(api.instructorInvitations.list, {}))
      )
  );

  server.registerTool(
    "revoke_instructor_invitation",
    {
      title: "Revoke instructor invitation",
      description:
        "Cancels a pending instructor invitation so it cannot be accepted.",
      inputSchema: { invitationId: id },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.instructorInvitations.revoke, {
          id: args.invitationId as Id<"instructorInvitations">,
        });
        return ok({ revoked: args.invitationId });
      })
  );

  server.registerTool(
    "staff_directory",
    {
      title: "Approved instructors",
      description:
        "Active approved instructors (id and email) that can be assigned to sessions.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.staffDirectory, {})
        )
      )
  );

  server.registerTool(
    "list_instructor_profiles",
    {
      title: "List instructor profiles",
      description:
        "Every user profile with instructor approval status, last login, and email, as shown on the Instructors admin page.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.query(api.admin.getAllInstructors, {}))
      )
  );

  server.registerTool(
    "list_users",
    {
      title: "List users",
      description:
        "All sign-in accounts with email, name, and verification time.",
      annotations: READ,
    },
    () => run(async () => ok(await ctx.convex.query(api.admin.getAllUsers, {})))
  );

  server.registerTool(
    "set_instructor_approval",
    {
      title: "Approve or revoke instructor",
      description:
        "Grants or removes instructor access (eCard purchasing, teaching resources, session assignment). When approving, the approval email is sent unless sendEmail=false.",
      inputSchema: {
        userId: id,
        approve: z.boolean(),
        sendEmail: z.boolean().default(true),
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.profiles.approveInstructor, {
          userId: args.userId as Id<"users">,
          approve: args.approve,
        });
        let emailResult: string | null = null;
        if (args.approve && args.sendEmail) {
          const user = (await ctx.convex.query(api.mcp.record, {
            table: "users",
            id: args.userId,
          })) as { email?: string; name?: string } | null;
          if (user?.email) {
            const sent = await sendInstructorApprovalEmail(
              user.email,
              user.name || user.email.split("@")[0] || "there"
            );
            emailResult = sent.success
              ? "Approval email sent"
              : (sent.error ?? "Approval email failed");
          }
        }
        return ok({ userId: args.userId, approved: args.approve, emailResult });
      })
  );

  server.registerTool(
    "deactivate_user",
    {
      title: "Deactivate user",
      description:
        "Marks a user's profile deactivated so they lose instructor access without deleting the account.",
      inputSchema: { userId: id },
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.profiles.deactivateUser, {
          userId: args.userId as Id<"users">,
        });
        return ok({ deactivated: args.userId });
      })
  );

  server.registerTool(
    "delete_profile",
    {
      title: "Delete profile",
      description:
        "Deletes a user's profile record (the 'reject' action on the Instructors page). The sign-in account remains.",
      inputSchema: { profileId: id },
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.admin.deleteUserAndProfile, {
          profileId: args.profileId as Id<"profiles">,
        });
        return ok({ deleted: args.profileId });
      })
  );
}
