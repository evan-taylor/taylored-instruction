import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

interface NotionPage {
  id: string;
  title: string;
  markdown: string;
  subPages: NotionPage[];
}

// Helper function to get the title of a page
async function getPageTitle(pageId: string): Promise<string> {
  try {
    const response = await notion.pages.retrieve({ page_id: pageId });
    // Type assertion as Notion API types can be complex
    const titleProperty = (response as any).properties.title;
    if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
      return titleProperty.title[0].plain_text;
    }
    return 'Untitled';
  } catch (error) {
    console.error(`Error fetching title for page ${pageId}:`, error);
    return 'Untitled';
  }
}

export async function getNotionPageContent(pageId: string): Promise<NotionPage | null> {
  try {
    const title = await getPageTitle(pageId);
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const markdown = n2m.toMarkdownString(mdblocks);

    const children = await notion.blocks.children.list({ block_id: pageId });
    const subPages: NotionPage[] = [];

    for (const block of children.results) {
      if ((block as any).type === 'child_page') {
        const subPageId = block.id;
        // To avoid fetching the same page again if it was linked,
        // we'll fetch its content recursively.
        // For very deep structures, you might want to limit recursion depth.
        const subPageContent = await getNotionPageContent(subPageId);
        if (subPageContent) {
          subPages.push(subPageContent);
        }
      }
    }

    return {
      id: pageId,
      title,
      markdown: markdown.parent, // notion-to-md returns an object with parent key
      subPages,
    };
  } catch (error) {
    console.error(`Error fetching page content for ${pageId}:`, error);
    return null;
  }
} 