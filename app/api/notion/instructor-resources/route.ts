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

    let page;
    try {
      page = await notion.pages.retrieve({ page_id: pageId.toString() });
    } catch (pageError: any) {
      return NextResponse.json(
        {
          error: "Failed to retrieve page",
          details: pageError.message,
          code: pageError.code,
        },
        { status: 500 }
      );
    }

    let blocks;
    try {
      blocks = await notion.blocks.children.list({
        block_id: pageId.toString(),
        page_size: 100,
      });
    } catch (blocksError: any) {
      return NextResponse.json(
        {
          error: "Failed to retrieve blocks",
          details: blocksError.message,
          code: blocksError.code,
        },
        { status: 500 }
      );
    }

    const extractPageTitle = (pageData: any): string => {
      if (pageData.properties) {
        if (pageData.properties.title?.title?.[0]?.plain_text) {
          return pageData.properties.title.title[0].plain_text;
        }
        if (pageData.properties.Name?.title?.[0]?.plain_text) {
          return pageData.properties.Name.title[0].plain_text;
        }
        for (const [_key, value] of Object.entries(pageData.properties)) {
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
      }

      if (pageData.child_page?.title) {
        return pageData.child_page.title;
      }

      return "";
    };

    const processBlocks = async (
      blockList: any[],
      depth = 0
    ): Promise<any[]> => {
      const MAX_DEPTH = 3;

      return Promise.all(
        blockList.map(async (block: any) => {
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
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
