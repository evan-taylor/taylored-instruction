import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pageId: requestedPageId } = req.query;
    const pageId = requestedPageId || process.env.NOTION_INSTRUCTOR_PAGE_ID;
    
    if (!pageId) {
      return res.status(500).json({ error: 'Notion page ID not configured' });
    }

    // Get the page content
    const page = await notion.pages.retrieve({ page_id: pageId.toString() });
    
    // Get the page blocks (content)
    const blocks = await notion.blocks.children.list({
      block_id: pageId.toString(),
      page_size: 100,
    });

    // Helper function to extract page title
    const extractPageTitle = (pageData: any): string => {
      if (pageData.properties) {
        // Try different title property names
        if (pageData.properties.title?.title?.[0]?.plain_text) {
          return pageData.properties.title.title[0].plain_text;
        }
        if (pageData.properties.Name?.title?.[0]?.plain_text) {
          return pageData.properties.Name.title[0].plain_text;
        }
        // Try other common property names
        for (const [key, value] of Object.entries(pageData.properties)) {
          if (value && typeof value === 'object' && 'title' in value && Array.isArray(value.title) && value.title[0]?.plain_text) {
            return value.title[0].plain_text;
          }
        }
      }
      
      // Fallback to child_page title if available
      if (pageData.child_page?.title) {
        return pageData.child_page.title;
      }
      
      return '';
    };

    // Process blocks recursively to handle nested content
    const processBlocks = async (blockList: any[]): Promise<any[]> => {
      return Promise.all(
        blockList.map(async (block: any) => {
          // For child pages in the main view, only get metadata, not full content
          if (block.type === 'child_page' && !requestedPageId) {
            return {
              id: block.id,
              type: 'child_page',
              title: block.child_page?.title || 'Untitled',
              // Don't fetch content for overview
            };
          }
          
          // Handle link_to_page blocks by fetching the linked page title
          if (block.type === 'link_to_page' && block.link_to_page?.type === 'page_id') {
            try {
              const linkedPage = await notion.pages.retrieve({ 
                page_id: block.link_to_page.page_id 
              });
              const linkedPageTitle = extractPageTitle(linkedPage);
              block.linked_page_title = linkedPageTitle;
            } catch (error) {
              console.error('Error fetching linked page:', error);
              block.linked_page_title = 'Linked Page';
            }
          }
          
          // Handle blocks with children
          if (block.has_children) {
            const childBlocks = await notion.blocks.children.list({
              block_id: block.id,
              page_size: 100,
            });
            block.children = await processBlocks(childBlocks.results);
          }
          
          return block;
        })
      );
    };

    const processedContent = await processBlocks(blocks.results);

    const extractedTitle = extractPageTitle(page);
    
    // Debug logging
    console.log('Page ID:', pageId);
    console.log('Page object:', JSON.stringify(page, null, 2));
    console.log('Extracted title:', extractedTitle);
    
    res.status(200).json({
      page,
      content: processedContent,
      isChildPage: !!requestedPageId,
      title: extractedTitle,
    });
  } catch (error) {
    console.error('Error fetching Notion content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
}