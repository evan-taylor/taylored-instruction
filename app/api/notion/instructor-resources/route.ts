import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY) {
      console.error("NOTION_API_KEY is not set");
      return NextResponse.json(
        { error: "Notion API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedPageId = searchParams.get('pageId');
    const pageId = requestedPageId || process.env.NOTION_INSTRUCTOR_PAGE_ID;

    if (!pageId) {
      console.error("No page ID available");
      return NextResponse.json(
        { error: "Notion page ID not configured" },
        { status: 500 }
      );
    }

    let page;
    try {
      page = await notion.pages.retrieve({ page_id: pageId.toString() });
    } catch (pageError: any) {
      console.error("Error retrieving page:", pageError);
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
      console.error("Error retrieving blocks:", blocksError);
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
        for (const [key, value] of Object.entries(pageData.properties)) {
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
              } catch (error) {
                console.error("Error fetching linked page:", error);
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
              } catch (childError) {
                console.error("Error fetching child blocks:", childError);
                block.children = [];
              }
            }

            return block;
          } catch (blockError) {
            console.error("Error processing block:", blockError);
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
    console.error("Unexpected error in Notion API:", error);
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