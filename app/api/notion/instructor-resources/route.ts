import { Client } from "@notionhq/client";
import { cacheLife, cacheTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function fetchNotionPageCached(pageId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("notion-instructor");

  return await notion.pages.retrieve({ page_id: pageId });
}

async function fetchNotionBlocksCached(pageId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("notion-instructor");

  return await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });
}

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
    let blocks: { results: unknown[] };

    try {
      if (requestedPageId) {
        page = await notion.pages.retrieve({ page_id: pageId.toString() });
        blocks = await notion.blocks.children.list({
          block_id: pageId.toString(),
          page_size: 100,
        });
      } else {
        page = await fetchNotionPageCached(pageId.toString());
        blocks = await fetchNotionBlocksCached(pageId.toString());
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return NextResponse.json(
        {
          error: "Failed to retrieve page or blocks",
          details: err.message,
          code: err.code,
        },
        { status: 500 }
      );
    }

    type NotionProperties = Record<
      string,
      {
        title?: Array<{ plain_text?: string }>;
      }
    >;

    const getTitleFromProperties = (
      properties: NotionProperties
    ): string | null => {
      const titleProp = properties.title;
      if (titleProp?.title?.[0]?.plain_text) {
        return titleProp.title[0].plain_text;
      }

      const nameProp = properties.Name;
      if (nameProp?.title?.[0]?.plain_text) {
        return nameProp.title[0].plain_text;
      }

      for (const value of Object.values(properties)) {
        if (
          value &&
          typeof value === "object" &&
          "title" in value &&
          Array.isArray(value.title) &&
          value.title[0]?.plain_text
        ) {
          return value.title[0].plain_text;
        }
      }

      return null;
    };

    const extractPageTitle = (pageData: unknown): string => {
      if (pageData && typeof pageData === "object") {
        const pd = pageData as Record<string, unknown>;
        const properties = pd.properties as NotionProperties | undefined;
        const childPage = pd.child_page as { title?: string } | undefined;

        if (properties && typeof properties === "object") {
          const title = getTitleFromProperties(properties);
          if (title) {
            return title;
          }
        }
        if (childPage?.title) {
          return childPage.title;
        }
      }
      return "";
    };

    const handleLinkedPage = async (block: {
      link_to_page?: { type: string; page_id?: string };
    }) => {
      if (
        block.link_to_page?.type === "page_id" &&
        block.link_to_page?.page_id
      ) {
        try {
          const linkedPage = await notion.pages.retrieve({
            page_id: block.link_to_page.page_id,
          });
          const linkedPageTitle = extractPageTitle(linkedPage);
          return { ...block, linked_page_title: linkedPageTitle };
        } catch (_error) {
          return { ...block, linked_page_title: "Linked Page" };
        }
      }
      return block;
    };

    const processBlock = async (
      blockUnknown: unknown,
      depth: number,
      MaxDepth: number,
      pageIdFilter: string | null
    ): Promise<unknown> => {
      const block = blockUnknown as {
        id: string;
        type: string;
        child_page?: { title?: string };
        link_to_page?: { type: string; page_id?: string };
        has_children?: boolean;
      };

      if (block.type === "child_page" && !pageIdFilter) {
        return {
          id: block.id,
          type: "child_page",
          title: block.child_page?.title || "Untitled",
        };
      }

      if (block.type === "link_to_page") {
        return handleLinkedPage(block);
      }

      if (block.has_children && depth < MaxDepth) {
        try {
          const childBlocks = await notion.blocks.children.list({
            block_id: block.id,
            page_size: 100,
          });
          const children = await processBlocks(childBlocks.results, depth + 1);
          return { ...block, children };
        } catch (_childError) {
          return { ...block, children: [] };
        }
      }

      return block;
    };

    const processBlocks = (
      blockList: unknown[],
      depth = 0
    ): Promise<unknown[]> => {
      const MaxDepth = 3;
      return Promise.all(
        blockList.map((block) =>
          processBlock(block, depth, MaxDepth, requestedPageId)
        )
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
