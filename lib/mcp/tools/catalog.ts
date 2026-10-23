import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { recurrence } from "@/shared/registration/schedule";
import {
  DESTRUCTIVE,
  DESTRUCTIVE_EXTERNAL,
  EXTERNAL,
  fill,
  type McpContext,
  ok,
  operationKey,
  READ,
  requestKey,
  run,
  UPSERT,
  WRITE,
} from "../context";
import {
  emailBody,
  id,
  instant,
  meeting,
  overrideField,
  overrides,
  pagination,
  paginationOpts,
  publication,
  settingsPatch,
  toEpoch,
  visibility,
  withIds,
} from "../shapes";

const DEFAULT_OFFER_MINUTES = 1440;
const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const ROSTER_PAGE = 100;
const EMAIL_BATCH = 50;

type Course = Doc<"registrationCourses">;
type Session = Doc<"registrationSessions">;

function mergeSettings(
  previous: Course["settings"] | undefined,
  patch: z.infer<typeof settingsPatch> | undefined
): Course["settings"] {
  const base = previous ?? {
    tuition: 0,
    materials: [],
    questions: [],
    outcomes: [],
    emails: [],
    cutoffMinutes: 0,
  };
  if (!patch) {
    return base;
  }
  return {
    confirmationEmail: patch.confirmationEmail ?? base.confirmationEmail,
    tuition: patch.tuition ?? base.tuition,
    taxCode: patch.taxCode ?? base.taxCode,
    cutoffMinutes: patch.cutoffMinutes ?? base.cutoffMinutes,
    materials: patch.materials
      ? withIds(patch.materials, base.materials).map((m) => ({
          id: m.id,
          materialId: m.materialId as Id<"registrationMaterials">,
          title: m.title,
          policy: m.policy,
          cents: m.cents,
        }))
      : base.materials,
    questions: patch.questions
      ? withIds(patch.questions, base.questions)
      : base.questions,
    outcomes: patch.outcomes
      ? withIds(patch.outcomes, base.outcomes)
      : base.outcomes,
    emails: patch.emails
      ? withIds(patch.emails, base.emails).map(({ version, ...step }) => step)
      : base.emails,
  };
}

function mergeOverrides(
  previous: Session["overrides"] | undefined,
  patch: z.infer<typeof overrides> | undefined,
  clear: z.infer<typeof overrideField>[] = []
): Session["overrides"] {
  const base = { ...(previous ?? {}) };
  for (const field of clear) {
    base[field] = undefined;
  }
  if (!patch) {
    return base;
  }
  return {
    confirmationEmail: patch.confirmationEmail ?? base.confirmationEmail,
    tuition: patch.tuition ?? base.tuition,
    taxCode: patch.taxCode ?? base.taxCode,
    cutoffMinutes: patch.cutoffMinutes ?? base.cutoffMinutes,
    materials: patch.materials
      ? withIds(patch.materials, base.materials ?? []).map((m) => ({
          id: m.id,
          materialId: m.materialId as Id<"registrationMaterials">,
          title: m.title,
          policy: m.policy,
          cents: m.cents,
        }))
      : base.materials,
    questions: patch.questions
      ? withIds(patch.questions, base.questions ?? [])
      : base.questions,
    outcomes: patch.outcomes
      ? withIds(patch.outcomes, base.outcomes ?? [])
      : base.outcomes,
    emails: patch.emails
      ? withIds(patch.emails, base.emails ?? []).map(
          ({ version, ...step }) => step
        )
      : base.emails,
  };
}

function normalizeMeetings(
  input: z.infer<typeof meeting>[] | undefined,
  previous: Session | null
): Session["meetings"] {
  const meetings =
    input?.map((m, index) => ({
      id: m.id ?? crypto.randomUUID(),
      start: toEpoch(m.start, `meetings[${index}].start`),
      end: toEpoch(m.end, `meetings[${index}].end`),
      location: m.location,
      locationId: m.locationId as Id<"registrationLocations"> | undefined,
      onlineUrl: m.onlineUrl,
      instructions: m.instructions,
      sequence:
        previous?.meetings.find((old) => old.id === m.id)?.sequence ?? 0,
    })) ?? previous?.meetings;
  if (!meetings?.length) {
    throw new Error("At least one meeting is required");
  }
  return meetings;
}

async function resolveInstructors(
  ctx: McpContext,
  values: string[]
): Promise<Id<"users">[]> {
  if (values.length === 0) {
    return [];
  }
  const directory = await ctx.convex.query(
    api.registrationOperations.staffDirectory,
    {}
  );
  return values.map((value) => {
    const needle = value.trim().toLowerCase();
    const match = directory.find(
      (entry) => entry.id === value || entry.email.toLowerCase() === needle
    );
    if (!match) {
      throw new Error(
        `No approved instructor matches "${value}". Use staff_directory to list them.`
      );
    }
    return match.id;
  });
}

async function collectCsv(
  ctx: McpContext,
  sessionId: Id<"registrationSessions">,
  cursor: string | null,
  parts: string[]
): Promise<string> {
  const page = await ctx.convex.query(api.registrationOperations.exportRoster, {
    sessionId,
    paginationOpts: { cursor, numItems: ROSTER_PAGE },
  });
  // Every page carries the header row; keep only the first one.
  parts.push(cursor ? page.csv.slice(page.csv.indexOf("\n") + 1) : page.csv);
  if (page.isDone) {
    return parts.join("\r\n");
  }
  return collectCsv(ctx, sessionId, page.continueCursor, parts);
}

async function activeSeatIds(
  ctx: McpContext,
  sessionId: Id<"registrationSessions">,
  cursor: string | null,
  found: Id<"registrationSeats">[]
): Promise<Id<"registrationSeats">[]> {
  const page = await ctx.convex.query(api.registrationOperations.roster, {
    sessionId,
    paginationOpts: { cursor, numItems: ROSTER_PAGE },
  });
  for (const seat of page.page) {
    if (seat.state === "active") {
      found.push(seat._id);
    }
  }
  if (page.isDone || found.length >= EMAIL_BATCH) {
    return found.slice(0, EMAIL_BATCH);
  }
  return activeSeatIds(ctx, sessionId, page.continueCursor, found);
}

export function registerCatalogTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_courses",
    {
      title: "List course templates",
      description:
        "Course templates (scheduled or self-paced) with their settings: tuition, materials, questions, outcomes, and automated emails. Sessions are created from scheduled templates.",
      inputSchema: pagination,
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registration.courses, {
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "get_course",
    {
      title: "Get course template",
      description:
        "One course template by id, including material/question/outcome ids needed for enrollment and session overrides.",
      inputSchema: { id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.mcp.record, {
            table: "registrationCourses",
            id: args.id,
          })
        )
      )
  );

  server.registerTool(
    "save_course",
    {
      title: "Create or update course template",
      description:
        "Creates a template when id is omitted; otherwise merges the given fields into the existing template. Edit the automatic confirmation with settings.confirmationEmail (subject and Markdown body), and scheduled messages with settings.emails. Settings are merged field by field; arrays replace the stored array (keep item ids to preserve history). Saving bumps the revision, propagates settings to sessions, and advances waitlists. Delivery type cannot change after creation.",
      inputSchema: {
        id: id.optional(),
        slug: z.string().optional().describe("URL slug, unique"),
        title: z.string().optional(),
        description: z.string().optional(),
        delivery: z.enum(["scheduled", "self-paced"]).optional(),
        publication: publication.optional(),
        enrollmentOpen: z.boolean().optional(),
        settings: settingsPatch.optional(),
      },
      annotations: UPSERT,
    },
    (args) =>
      run(async () => {
        const previous = args.id
          ? ((await ctx.convex.query(api.mcp.record, {
              table: "registrationCourses",
              id: args.id,
            })) as Course | null)
          : null;
        if (args.id && !previous) {
          throw new Error("Course template not found");
        }
        const value = fill(
          {
            slug: "",
            title: "",
            description: "",
            delivery: "scheduled" as Course["delivery"],
            publication: "draft" as Course["publication"],
            enrollmentOpen: true,
          },
          previous,
          args
        );
        if (!(value.slug && value.title)) {
          throw new Error("New templates need a slug and a title");
        }
        const saved = await ctx.convex.mutation(api.registration.saveCourse, {
          id: previous?._id,
          hovnId: previous?.hovnId,
          sourceData: previous?.sourceData,
          ...value,
          settings: mergeSettings(previous?.settings, args.settings),
          revision: previous?.revision ?? 0,
        });
        const course = await ctx.convex.query(api.mcp.record, {
          table: "registrationCourses",
          id: saved,
        });
        return ok(course, previous ? "Template updated" : "Template created");
      })
  );

  server.registerTool(
    "duplicate_course",
    {
      title: "Duplicate course template",
      description:
        "Copies a template's settings into a new draft template, optionally with a different delivery type.",
      inputSchema: {
        id,
        slug: z.string(),
        title: z.string(),
        delivery: z.enum(["scheduled", "self-paced"]).optional(),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        const source = (await ctx.convex.query(api.mcp.record, {
          table: "registrationCourses",
          id: args.id,
        })) as Course | null;
        if (!source) {
          throw new Error("Course template not found");
        }
        const saved = await ctx.convex.mutation(api.registration.saveCourse, {
          slug: args.slug,
          title: args.title,
          description: source.description,
          delivery: args.delivery ?? source.delivery,
          publication: "draft",
          enrollmentOpen: source.enrollmentOpen,
          settings: source.settings,
          revision: 0,
        });
        return ok({ id: saved }, "Template duplicated as a draft");
      })
  );

  server.registerTool(
    "delete_course",
    {
      title: "Delete course template",
      description:
        "Permanently deletes a template that has no sessions, orders, seats, or coupons. Archive instead to keep history.",
      inputSchema: { id },
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registration.deleteCourse, {
          id: args.id as Id<"registrationCourses">,
        });
        return ok({ deleted: args.id });
      })
  );

  server.registerTool(
    "list_sessions",
    {
      title: "List sessions",
      description:
        "Scheduled class sessions, newest first, optionally for one course template. Each includes meetings, capacity, reserved seats, state, visibility, and instructors.",
      inputSchema: { courseId: id.optional(), ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registration.sessions, {
            courseId: args.courseId as Id<"registrationCourses"> | undefined,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "session_overview",
    {
      title: "Session overview",
      description:
        "A session with its course template, seat counts, availability, waitlist, instructors, and attached files. Use session_roster for attendees.",
      inputSchema: { sessionId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.mcp.sessionOverview, {
            sessionId: args.sessionId as Id<"registrationSessions">,
          })
        )
      )
  );

  server.registerTool(
    "plan_meetings",
    {
      title: "Plan recurring meetings",
      description:
        "Expands a recurrence rule into candidate sessions, each with meetings ready to pass to save_session. Weekdays use ISO numbering (1 = Monday … 7 = Sunday). dayOffset lets multi-day classes add meetings on following days. No data is written.",
      inputSchema: {
        startDate: z.string().describe("YYYY-MM-DD"),
        endDate: z.string().describe("YYYY-MM-DD, at most one year later"),
        weekdays: z.array(z.number().int().min(1).max(7)).min(1),
        timeZone: z.string().default(DEFAULT_TIME_ZONE),
        meetings: z
          .array(
            z.object({
              dayOffset: z.number().int().min(0).default(0),
              endDayOffset: z.number().int().min(0).optional(),
              startTime: z.string().describe("HH:MM"),
              endTime: z.string().describe("HH:MM"),
            })
          )
          .min(1),
        location: z.string(),
        locationId: id.optional(),
        onlineUrl: z.string().url().optional(),
        instructions: z.string().default(""),
      },
      annotations: READ,
    },
    (args) =>
      run(async () => {
        const plan = recurrence(args).map((meetings) => ({
          meetings: meetings.map((m) => ({
            id: crypto.randomUUID(),
            start: m.start,
            end: m.end,
            location: args.location,
            locationId: args.locationId,
            onlineUrl: args.onlineUrl,
            instructions: args.instructions,
          })),
        }));
        return await Promise.resolve(
          ok({ timeZone: args.timeZone, sessions: plan })
        );
      })
  );

  server.registerTool(
    "save_session",
    {
      title: "Create or update session",
      description:
        "Creates a session for a scheduled course template, or merges the given fields into an existing session. Meetings replace the stored list (reuse meeting ids to preserve attendance). Overrides merge field by field; list fields in clearOverrides to fall back to the template. Instructors may be given as user ids or approved-instructor emails. Set notify=true to email instructors about schedule changes; attendees are notified of changed meetings automatically. Capacity cannot drop below reserved seats.",
      inputSchema: {
        id: id.optional(),
        courseId: id.optional().describe("Required when creating"),
        title: z.string().optional(),
        publication: publication.optional(),
        visibility: visibility.optional(),
        capacity: z.number().int().min(1).optional(),
        timeZone: z.string().optional(),
        meetings: z.array(meeting).min(1).max(20).optional(),
        overrides: overrides.optional(),
        clearOverrides: z
          .array(overrideField)
          .optional()
          .describe(
            "Override fields to remove so the session follows the course template again"
          ),
        instructors: z.array(z.string()).optional(),
        offerMinutes: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("How long a waitlist offer stays open; default 1440"),
        notify: z.boolean().default(false),
      },
      annotations: { ...UPSERT, openWorldHint: true },
    },
    (args) =>
      run(async () => {
        const previous = args.id
          ? ((await ctx.convex.query(api.mcp.record, {
              table: "registrationSessions",
              id: args.id,
            })) as Session | null)
          : null;
        if (args.id && !previous) {
          throw new Error("Session not found");
        }
        const meetings = normalizeMeetings(args.meetings, previous);
        const value = fill(
          {
            courseId: "" as Id<"registrationCourses">,
            title: "",
            publication: "draft" as Session["publication"],
            visibility: "public" as Session["visibility"],
            capacity: 1,
            timeZone: DEFAULT_TIME_ZONE,
            offerMinutes: DEFAULT_OFFER_MINUTES,
          },
          previous,
          {
            courseId: args.courseId as Id<"registrationCourses"> | undefined,
            title: args.title,
            publication: args.publication,
            visibility: args.visibility,
            capacity: args.capacity,
            timeZone: args.timeZone,
            offerMinutes: args.offerMinutes,
          }
        );
        if (!(value.courseId && value.title)) {
          throw new Error("courseId and title are required when creating");
        }
        const instructors = args.instructors
          ? await resolveInstructors(ctx, args.instructors)
          : (previous?.instructors ?? []);
        const saved = await ctx.convex.mutation(api.registration.saveSession, {
          id: previous?._id,
          ...value,
          meetings,
          overrides: mergeOverrides(
            previous?.overrides,
            args.overrides,
            args.clearOverrides
          ),
          instructors,
          notify: args.notify,
        });
        const session = (await ctx.convex.query(api.mcp.record, {
          table: "registrationSessions",
          id: saved,
        })) as Session;
        return ok(
          {
            session,
            publicUrl: `${ctx.siteUrl}/s/${session.code}`,
          },
          previous ? "Session updated" : "Session created"
        );
      })
  );

  server.registerTool(
    "cancel_session",
    {
      title: "Cancel session",
      description:
        "Cancels a session, releases every seat, cancels scheduled emails, and optionally notifies attendees. Refund paid orders separately with refund_order.",
      inputSchema: {
        sessionId: id,
        reason: z.string().min(1),
        notify: z.boolean().default(true),
      },
      annotations: DESTRUCTIVE_EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.cancelSession, {
          sessionId: args.sessionId as Id<"registrationSessions">,
          reason: args.reason,
          notify: args.notify,
        });
        return ok({ canceled: args.sessionId });
      })
  );

  server.registerTool(
    "session_roster",
    {
      title: "Session roster",
      description:
        "Attendees of a session with seat state, snapshot (answers, materials, pricing), outcome definitions, and completion status.",
      inputSchema: { sessionId: id, ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.roster, {
            sessionId: args.sessionId as Id<"registrationSessions">,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "export_roster_csv",
    {
      title: "Export roster CSV",
      description: "The full roster of a session as CSV text.",
      inputSchema: { sessionId: id },
      annotations: READ,
    },
    (args) =>
      run(async () => {
        const csv = await collectCsv(
          ctx,
          args.sessionId as Id<"registrationSessions">,
          null,
          []
        );
        return { content: [{ type: "text", text: csv }] };
      })
  );

  server.registerTool(
    "email_attendees",
    {
      title: "Email attendees",
      description:
        "Queues a formatted Markdown email to selected seats of a session (default: every active seat, up to 50). Test mode redirects mail to the configured tester mailbox.",
      inputSchema: {
        sessionId: id,
        seatIds: z.array(id).max(50).optional(),
        subject: z.string().min(1),
        body: emailBody,
        operationKey,
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        const sessionId = args.sessionId as Id<"registrationSessions">;
        const seats = args.seatIds
          ? (args.seatIds as Id<"registrationSeats">[])
          : (await activeSeatIds(ctx, sessionId, null, [])).slice(0, 50);
        if (seats.length === 0) {
          throw new Error("No active seats to email");
        }
        await ctx.convex.mutation(api.registrationOperations.selectedEmail, {
          sessionId,
          seats,
          subject: args.subject,
          body: args.body,
          requestKey: args.operationKey ?? requestKey(),
        });
        return ok({ queued: seats.length, seats });
      })
  );

  server.registerTool(
    "list_session_files",
    {
      title: "List session files",
      description:
        "Staff uploads attached to a session (rosters, sign-in sheets, handouts) with temporary download URLs.",
      inputSchema: { sessionId: id, ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.sessionFiles, {
            sessionId: args.sessionId as Id<"registrationSessions">,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "upload_session_file",
    {
      title: "Upload session file",
      description:
        "Attaches a file (base64 content, up to 25 MB) to a session for staff and instructors.",
      inputSchema: {
        sessionId: id,
        name: z.string().min(1),
        contentType: z.string().default("application/octet-stream"),
        base64: z.string().min(1),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        const sessionId = args.sessionId as Id<"registrationSessions">;
        const bytes = Buffer.from(args.base64, "base64");
        const url = await ctx.convex.mutation(
          api.registrationOperations.fileUploadUrl,
          { sessionId, name: args.name, size: bytes.byteLength }
        );
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": args.contentType },
          body: bytes,
        });
        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        const fileId = await ctx.convex.mutation(
          api.registrationOperations.attachFile,
          {
            sessionId,
            storageId,
            name: args.name,
            type: args.contentType,
            size: bytes.byteLength,
          }
        );
        return ok({ fileId, size: bytes.byteLength }, "File attached");
      })
  );

  server.registerTool(
    "remove_session_file",
    {
      title: "Remove session file",
      description: "Deletes an uploaded session file.",
      inputSchema: { fileId: id },
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.removeFile, {
          id: args.fileId as Id<"registrationSessionFiles">,
        });
        return ok({ removed: args.fileId });
      })
  );

  server.registerTool(
    "list_locations",
    {
      title: "List locations",
      description:
        "Saved training locations (name, address, arrival instructions) for reuse in session meetings.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.query(api.registrationOperations.locations, {}))
      )
  );

  server.registerTool(
    "save_location",
    {
      title: "Create or update location",
      description: "Creates a location or updates one by id.",
      inputSchema: {
        id: id.optional(),
        name: z.string().min(1),
        address: z.string().default(""),
        instructions: z.string().default(""),
        archived: z.boolean().default(false),
      },
      annotations: UPSERT,
    },
    (args) =>
      run(async () => {
        const saved = await ctx.convex.mutation(
          api.registrationOperations.saveLocation,
          {
            id: args.id as Id<"registrationLocations"> | undefined,
            name: args.name,
            address: args.address,
            instructions: args.instructions,
            archived: args.archived,
          }
        );
        return ok({ id: saved });
      })
  );

  server.registerTool(
    "search_offerings",
    {
      title: "Search public offerings",
      description:
        "What customers see on /classes: published public sessions and self-paced courses, with availability. Filter by text or a date window for the first meeting.",
      inputSchema: {
        search: z.string().optional(),
        dayStart: instant.optional(),
        dayEnd: instant.optional(),
        ...pagination,
      },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registration.discover, {
            search: args.search,
            dayStart:
              args.dayStart === undefined ? undefined : toEpoch(args.dayStart),
            dayEnd:
              args.dayEnd === undefined ? undefined : toEpoch(args.dayEnd),
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );
}
