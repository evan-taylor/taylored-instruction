'use client'

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "../../hooks/useProfile";

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: any;
}

interface NotionContent {
  page: any;
  content: NotionBlock[];
  isChildPage?: boolean;
  title?: string;
}

function InstructorResourcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isInstructor, loading, session, error } = useProfile();
  const [notionContent, setNotionContent] = useState<NotionContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string>("");

  // Loading timeout fallback
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        // Timeout reached - authentication might be stuck
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [loading, session, isInstructor, error]);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.push("/login");
    } else if (!isInstructor) {
      router.push("/my-account");
    }
  }, [loading, session, isInstructor, router]);

  // Handle URL query parameters for direct links
  useEffect(() => {
    const page = searchParams?.get('page');
    if (page) {
      setCurrentPageId(page);
    }
  }, [searchParams]);

  // Scroll to top when currentPageId changes or when content loads
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentPageId, notionContent]);

  // Fetch Notion content when user is authenticated and is instructor
  useEffect(() => {
    const fetchNotionContent = async (pageId?: string) => {
      if (!session || !isInstructor) {
        setContentLoading(false);
        return;
      }

      setContentLoading(true);

      try {
        const url = pageId
          ? `/api/notion/instructor-resources?pageId=${pageId}`
          : "/api/notion/instructor-resources";
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setNotionContent(data);
          setPageTitle(data.title || "");
        }
      } catch (error) {
        // Error fetching Notion content
      } finally {
        setContentLoading(false);
      }
    };

    if (!loading) {
      fetchNotionContent(currentPageId || undefined);
    }
  }, [session, isInstructor, currentPageId, loading]);

  const navigateToPage = (pageId: string, title: string) => {
    router.push(`/instructor-resources?page=${pageId}`, { scroll: false });
    setCurrentPageId(pageId);
    setPageTitle(title);
  };

  const navigateBack = () => {
    router.push("/instructor-resources", { scroll: false });
    setCurrentPageId(null);
    setPageTitle("");
  };

  const navigateToRoot = () => {
    router.push("/instructor-resources", { scroll: false });
    setCurrentPageId(null);
    setPageTitle("");
  };

  const renderRichText = (richTextArray: any[]) => {
    if (!richTextArray || richTextArray.length === 0) return "";

    return richTextArray.map((text, index) => {
      let content = text.plain_text;

      if (text.href) {
        return (
          <a
            key={index}
            href={text.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {content}
          </a>
        );
      }

      if (text.annotations?.bold) {
        content = <strong key={index}>{content}</strong>;
      }
      if (text.annotations?.italic) {
        content = <em key={index}>{content}</em>;
      }
      if (text.annotations?.underline) {
        content = <u key={index}>{content}</u>;
      }
      if (text.annotations?.code) {
        content = (
          <code
            key={index}
            className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm"
          >
            {content}
          </code>
        );
      }

      return <span key={index}>{content}</span>;
    });
  };

  const renderBlocksWithNumbering = (blocks: NotionBlock[]) => {
    let currentListNumber = 0;
    let inNumberedList = false;

    const listBreakingBlocks = [
      "heading_1",
      "heading_2", 
      "heading_3",
      "divider",
      "column_list",
      "quote",
      "callout",
      "child_page",
      "link_to_page",
    ];

    return blocks.map((block, index) => {
      if (block.type === "numbered_list_item") {
        if (!inNumberedList) {
          currentListNumber = 1;
          inNumberedList = true;
        } else {
          currentListNumber++;
        }
        return renderNotionBlock(block, currentListNumber);
      } else if (listBreakingBlocks.includes(block.type)) {
        currentListNumber = 0;
        inNumberedList = false;
        return renderNotionBlock(block);
      } else {
        return renderNotionBlock(block);
      }
    });
  };

  const renderNotionBlock = (block: NotionBlock, listNumber?: number) => {
    switch (block.type) {
      case "child_page":
        const pageTitle = block.child_page?.title || block.title || "Untitled Page";
        return (
          <div
            key={block.id}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden mb-4"
            onClick={() => navigateToPage(block.id, pageTitle)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/50 dark:group-hover:from-blue-900/10 dark:group-hover:to-indigo-900/10 transition-all duration-300" />

            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 mb-1">
                    {pageTitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-base">
                    Explore this instructor resource
                  </p>
                </div>

                <div className="flex-shrink-0 self-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-all duration-300">
                    <svg
                      className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 transform group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "heading_1":
        return (
          <h1
            key={block.id}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-8 mt-8 leading-tight"
          >
            {renderRichText(block.heading_1?.rich_text || [])}
          </h1>
        );
      case "heading_2":
        return (
          <h2
            key={block.id}
            className="text-3xl font-semibold text-gray-900 dark:text-white mb-6 mt-8 leading-tight"
          >
            {renderRichText(block.heading_2?.rich_text || [])}
          </h2>
        );
      case "heading_3":
        return (
          <h3
            key={block.id}
            className="text-2xl font-medium text-gray-900 dark:text-white mb-4 mt-6 leading-tight"
          >
            {renderRichText(block.heading_3?.rich_text || [])}
          </h3>
        );
      case "paragraph":
        const content = renderRichText(block.paragraph?.rich_text || []);
        return content ? (
          <p
            key={block.id}
            className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed text-lg"
          >
            {content}
          </p>
        ) : (
          <div key={block.id} className="mb-4"></div>
        );
      // Add other block types as needed...
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading instructor resources...</p>
          {error && (
            <p className="text-red-500 text-sm mt-2">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Access Denied. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">
            Access Denied. Instructor status required. Redirecting to My Account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation breadcrumbs */}
        {currentPageId && (
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 mb-6">
            <button
              onClick={navigateToRoot}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Instructor Resources
            </button>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">
              {pageTitle || "Current Page"}
            </span>
          </nav>
        )}

        {/* Back button for subpages */}
        {currentPageId && (
          <button
            onClick={navigateBack}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline mb-6"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>
        )}

        {/* Only show heading for subpages */}
        {currentPageId && (
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-12 leading-tight">
            {pageTitle || "Page Content"}
          </h1>
        )}

        {contentLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Loading resources...
              </p>
            </div>
          </div>
        ) : notionContent ? (
          <div className={currentPageId ? "space-y-8" : ""}>
            {!currentPageId ? (
              <div className="space-y-8">
                {renderBlocksWithNumbering(notionContent.content)}
              </div>
            ) : (
              <div className="space-y-8">
                {renderBlocksWithNumbering(notionContent.content)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Unable to load resources. Please try again later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstructorResourcesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    }>
      <InstructorResourcesContent />
    </Suspense>
  );
}