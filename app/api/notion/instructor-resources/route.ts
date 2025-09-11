import { Client } from "@notionhq/client";
import { type NextRequest, NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        { error: "Notion API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedPageId = searchParams.get("pageId");
    const pageId = requestedPageId || process.env.NOTION_INSTRUCTOR_PAGE_ID;

    if (!pageId) {
      return NextResponse.json(
        { error: "Notion page ID not configured" },
        { status: 500 }
      );
    }

    let page: unknown;
    try {
      page = await notion.pages.retrieve({ page_id: pageId.toString() });
    } catch (pageError: unknown) {
      const pErr = pageError as { message?: string; code?: string };
      return NextResponse.json(
        {
          error: "Failed to retrieve page",
          details: pErr.message,
          code: pErr.code,
        },
        { status: 500 }
      );
    }

    let blocks: { results: unknown[] };
    try {
      blocks = await notion.blocks.children.list({
        block_id: pageId.toString(),
        page_size: 100,
      });
    } catch (blocksError: unknown) {
      const bErr = blocksError as { message?: string; code?: string };
      return NextResponse.json(
        {
          error: "Failed to retrieve blocks",
          details: bErr.message,
          code: bErr.code,
        },
        { status: 500 }
      );
    }

    const extractPageTitle = (pageData: unknown): string => {
      if (pageData && typeof pageData === "object") {
        const pd = pageData as Record<string, unknown>;
        const properties = pd.properties as Record<string, unknown> | undefined;
        const childPage = pd.child_page as { title?: string } | undefined;
        if (properties && typeof properties === "object") {
          const title = (properties as any).title?.title?.[0]?.plain_text;
          if (typeof title === "string") return title;
          const name = (properties as any).Name?.title?.[0]?.plain_text;
          if (typeof name === "string") return name;
          for (const value of Object.values(properties)) {
            if (
              value &&
              typeof value === "object" &&
              "title" in value &&
              Array.isArray((value as any).title) &&
              (value as any).title[0]?.plain_text
            ) {
              return (value as any).title[0].plain_text as string;
            }
          }
        }
        if (childPage?.title) return childPage.title;
      }
      return "";
    };

    const processBlocks = (
      blockList: unknown[],
      depth = 0
    ): Promise<unknown[]> => {
      const MAX_DEPTH = 3;

      return Promise.all(
        blockList.map(async (blockUnknown: unknown) => {
          const block = blockUnknown as any;
          try {
            if (block.type === "child_page" && !requestedPageId) {
              return {
                id: block.id,
                type: "child_page",
                title: block.child_page?.title || "Untitled",
              };
            }

            if (
              block.type === "link_to_page" &&
              block.link_to_page?.type === "page_id"
            ) {
              try {
                const linkedPage = await notion.pages.retrieve({
                  page_id: block.link_to_page.page_id,
                });
                const linkedPageTitle = extractPageTitle(linkedPage);
                block.linked_page_title = linkedPageTitle;
              } catch (_error) {
                block.linked_page_title = "Linked Page";
              }
            }

            if (block.has_children && depth < MAX_DEPTH) {
              try {
                const childBlocks = await notion.blocks.children.list({
                  block_id: block.id,
                  page_size: 100,
                });
                block.children = await processBlocks(
                  childBlocks.results,
                  depth + 1
                );
              } catch (_childError) {
                block.children = [];
              }
            }

            return block;
          } catch (_blockError) {
            return block;
          }
        })
      );
    };

    const processedContent = await processBlocks(blocks.results);
    const extractedTitle = extractPageTitle(page);

    return NextResponse.json({
      page,
      content: processedContent,
      isChildPage: !!requestedPageId,
      title: extractedTitle,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
