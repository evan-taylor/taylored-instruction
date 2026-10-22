import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import {
  DESTRUCTIVE,
  type McpContext,
  ok,
  READ,
  run,
  UPSERT,
  WRITE,
} from "../context";

const section = z.object({
  heading: z.string(),
  paragraphs: z.array(z.string()),
  bullets: z.array(z.string()).optional(),
});
const faq = z.object({ question: z.string(), answer: z.string() });

export function registerContentTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_seo_pages",
    {
      title: "List SEO pages",
      description:
        "Programmatic local SEO landing pages (published and drafts) served under /resources.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.query(api.seoContent.listPagesForAdmin, {}))
      )
  );

  server.registerTool(
    "get_seo_page",
    {
      title: "Get SEO page",
      description:
        "Full content of one SEO page by slug, in any publication state.",
      inputSchema: { slug: z.string().min(1) },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(await ctx.convex.query(api.mcp.seoPage, { slug: args.slug }))
      )
  );

  server.registerTool(
    "upsert_seo_page",
    {
      title: "Create or update SEO page",
      description:
        "Writes a complete SEO page by slug (creates or replaces). Read the existing page first when editing.",
      inputSchema: {
        slug: z.string().min(1),
        title: z.string().min(1),
        metaTitle: z.string(),
        metaDescription: z.string(),
        excerpt: z.string(),
        primaryKeyword: z.string(),
        secondaryKeywords: z.array(z.string()).default([]),
        locationLabel: z.string(),
        locationCity: z.string(),
        locationRegion: z.string(),
        locationState: z.string(),
        serviceLine: z.string(),
        audience: z.string(),
        readingTimeMinutes: z.number().int().min(1),
        sections: z.array(section),
        faqItems: z.array(faq).default([]),
        ctaLabel: z.string(),
        ctaHref: z.string(),
        ctaText: z.string(),
        researchNotes: z.array(z.string()).default([]),
        published: z.boolean(),
      },
      annotations: UPSERT,
    },
    (args) =>
      run(async () =>
        ok(await ctx.convex.mutation(api.seoContent.upsertPage, { page: args }))
      )
  );

  server.registerTool(
    "delete_seo_page",
    {
      title: "Delete SEO page",
      description: "Deletes an SEO page by slug.",
      inputSchema: { slug: z.string().min(1) },
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.mutation(api.seoContent.deletePage, {
            slug: args.slug,
          })
        )
      )
  );

  server.registerTool(
    "generate_seo_pages",
    {
      title: "Generate SEO page batch",
      description:
        "Runs the built-in generator for the next batch of location/service pages, the same as the 'Generate' button on the SEO content page.",
      inputSchema: {
        overwriteExisting: z.boolean().default(false),
        offset: z.number().int().min(0).optional(),
        batchSize: z.number().int().min(1).max(50).optional(),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.mutation(
            api.seoContent.generateSeoContentBatch,
            args
          )
        )
      )
  );
}
