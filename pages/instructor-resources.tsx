import { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { useProfile } from "../hooks/useProfile";

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

const InstructorResourcesPage: NextPage = () => {
  const router = useRouter();
  const { isInstructor, loading, session, error } = useProfile();
  const [notionContent, setNotionContent] = useState<NotionContent | null>(
    null
  );
  const [contentLoading, setContentLoading] = useState(true);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string>("");

  // Loading timeout fallback
  useEffect(() => {
    // Fallback timeout in case loading gets stuck
    if (loading) {
      const timeout = setTimeout(() => {
        // Timeout reached - authentication might be stuck
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [loading, session, isInstructor, error]);

  useEffect(() => {
    if (loading) return; // Wait for loading to complete

    if (!session) {
      router.push("/login");
    } else if (!isInstructor) {
      router.push("/my-account");
    }
    // If session exists and isInstructor is true, do nothing and allow page to render
  }, [loading, session, isInstructor, router]);

  // Handle URL query parameters for direct links
  useEffect(() => {
    if (router.isReady && router.query.page) {
      setCurrentPageId(router.query.page as string);
    }
  }, [router.isReady, router.query.page]);

  // Fetch Notion content when user is authenticated and is instructor
  useEffect(() => {
    const fetchNotionContent = async (pageId?: string) => {
      // Always set loading to false if conditions aren't met
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
          // Use the title from API response which has better extraction logic
          setPageTitle(data.title || "");
        } else {
          // Failed to fetch Notion content
        }
      } catch (error) {
        // Error fetching Notion content
      } finally {
        setContentLoading(false);
      }
    };

    // Only fetch if not in loading state
    if (!loading) {
      fetchNotionContent(currentPageId || undefined);
    }
  }, [session, isInstructor, currentPageId, loading]);

  const navigateToPage = (pageId: string, title: string) => {
    // Update URL with query parameter for shareable links
    router.push(`/instructor-resources?page=${pageId}`, undefined, {
      shallow: true,
    });
    setCurrentPageId(pageId);
    setPageTitle(title);
  };

  const navigateBack = () => {
    router.push("/instructor-resources", undefined, { shallow: true });
    setCurrentPageId(null);
    setPageTitle("");
  };

  const navigateToRoot = () => {
    router.push("/instructor-resources", undefined, { shallow: true });
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

    // Block types that should reset numbering
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
        // If we're not in a numbered list or the previous numbered item was too far back
        if (!inNumberedList) {
          currentListNumber = 1;
          inNumberedList = true;
        } else {
          currentListNumber++;
        }
        return renderNotionBlock(block, currentListNumber);
      } else if (listBreakingBlocks.includes(block.type)) {
        // These block types break the list
        currentListNumber = 0;
        inNumberedList = false;
        return renderNotionBlock(block);
      } else {
        // Other blocks (like paragraphs) don't break the list numbering
        return renderNotionBlock(block);
      }
    });
  };

  const renderNotionBlock = (block: NotionBlock, listNumber?: number) => {
    switch (block.type) {
      case "child_page":
        const pageTitle =
          block.child_page?.title || block.title || "Untitled Page";
        return (
          <div
            key={block.id}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden mb-4"
            onClick={() => navigateToPage(block.id, pageTitle)}
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/50 dark:group-hover:from-blue-900/10 dark:group-hover:to-indigo-900/10 transition-all duration-300" />

            <div className="relative p-6">
              <div className="flex items-start gap-4">
                {/* Icon Container */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 mb-1">
                    {pageTitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-base">
                    Explore this instructor resource
                  </p>
                </div>

                {/* Arrow */}
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
      case "bulleted_list_item":
        return (
          <div key={block.id} className="flex items-start space-x-4 mb-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
            <div className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed flex-1">
              {renderRichText(block.bulleted_list_item?.rich_text || [])}
              {block.children && (
                <div className="ml-6 mt-3 space-y-2">
                  {renderBlocksWithNumbering(block.children)}
                </div>
              )}
            </div>
          </div>
        );
      case "numbered_list_item":
        return (
          <div key={block.id} className="flex items-start space-x-4 mb-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {listNumber || 1}
              </span>
            </div>
            <div className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed flex-1">
              {renderRichText(block.numbered_list_item?.rich_text || [])}
              {block.children && (
                <div className="ml-6 mt-3 space-y-2">
                  {renderBlocksWithNumbering(block.children)}
                </div>
              )}
            </div>
          </div>
        );
      case "embed":
        const embedUrl = block.embed?.url;
        if (embedUrl?.includes("loom.com")) {
          // Extract Loom video ID from URL
          const loomMatch = embedUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
          if (loomMatch) {
            const videoId = loomMatch[1];
            return (
              <div key={block.id} className="mb-8">
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                  <iframe
                    src={`https://www.loom.com/embed/${videoId}`}
                    className="absolute top-0 left-0 w-full h-full"
                    allowFullScreen
                  />
                </div>
              </div>
            );
          }
        }
        // Fallback for other embeds
        return (
          <div key={block.id} className="mb-8">
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg">
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        );
      case "video":
        if (block.video?.type === "external") {
          const videoUrl = block.video.external?.url;
          if (videoUrl?.includes("loom.com")) {
            const loomMatch = videoUrl.match(
              /loom\.com\/share\/([a-zA-Z0-9]+)/
            );
            if (loomMatch) {
              const videoId = loomMatch[1];
              return (
                <div key={block.id} className="mb-8">
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <iframe
                      src={`https://www.loom.com/embed/${videoId}`}
                      className="absolute top-0 left-0 w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            }
          }
        }
        return null;
      case "divider":
        return (
          <hr
            key={block.id}
            className="my-12 border-gray-200 dark:border-gray-700"
          />
        );
      case "quote":
        return (
          <blockquote
            key={block.id}
            className="border-l-4 border-blue-500 pl-6 py-4 mb-8 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg"
          >
            <div className="text-lg italic text-gray-700 dark:text-gray-300 leading-relaxed">
              {renderRichText(block.quote?.rich_text || [])}
            </div>
          </blockquote>
        );
      case "callout":
        return (
          <div
            key={block.id}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 shadow-sm"
          >
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-2xl">
                  {block.callout?.icon?.emoji || "💡"}
                </span>
              </div>
              <div className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed flex-1">
                {renderRichText(block.callout?.rich_text || [])}
              </div>
            </div>
          </div>
        );
      case "link_to_page":
        if (block.link_to_page?.type === "page_id") {
          const linkedPageId = block.link_to_page.page_id;
          const linkedPageTitle = block.linked_page_title || "Linked Page";
          return (
            <div
              key={block.id}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 cursor-pointer overflow-hidden mb-4"
              onClick={() => navigateToPage(linkedPageId, linkedPageTitle)}
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/0 to-emerald-50/0 group-hover:from-emerald-50/50 group-hover:to-green-50/50 dark:group-hover:from-emerald-900/10 dark:group-hover:to-green-900/10 transition-all duration-300" />

              <div className="relative p-6">
                <div className="flex items-start gap-4">
                  {/* Icon Container */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
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
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200 mb-1">
                      {linkedPageTitle}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-base">
                      View linked resource
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 flex items-center justify-center transition-all duration-300">
                      <svg
                        className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200 transform group-hover:translate-x-0.5"
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
        }
        return null;
      case "bookmark":
        const bookmarkUrl = block.bookmark?.url;
        const bookmarkCaption = block.bookmark?.caption?.[0]?.plain_text;
        return (
          <div
            key={block.id}
            className="group border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 transform hover:-translate-y-1"
          >
            <a
              href={bookmarkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-200 dark:from-purple-900 dark:to-violet-800 rounded-xl flex items-center justify-center group-hover:from-purple-200 group-hover:to-violet-300 dark:group-hover:from-purple-800 dark:group-hover:to-violet-700 transition-all duration-300 shadow-sm">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200 leading-tight">
                    {bookmarkCaption || "External Link"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {bookmarkUrl}
                  </div>
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200 transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </div>
            </a>
          </div>
        );
      case "button":
        const buttonText = block.button?.rich_text?.[0]?.plain_text || "Button";
        const buttonUrl = block.button?.url;
        return (
          <div key={block.id} className="mb-8">
            {buttonUrl ? (
              <a
                href={buttonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {buttonText}
                <svg
                  className="w-5 h-5 ml-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ) : (
              <button className="inline-flex items-center px-8 py-4 bg-gray-400 text-white font-semibold rounded-xl cursor-not-allowed opacity-50">
                {buttonText}
              </button>
            )}
          </div>
        );
      case "unsupported":
        // Some Notion blocks might show up as unsupported - let's show a placeholder
        return (
          <div
            key={block.id}
            className="mb-6 p-6 border border-orange-200 dark:border-orange-800 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 shadow-sm"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <svg
                  className="w-5 h-5 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-orange-800 dark:text-orange-200 font-medium text-lg leading-relaxed">
                  Unsupported Content Block
                </p>
                <p className="text-orange-600 dark:text-orange-300 text-sm mt-1 leading-relaxed">
                  This content may contain interactive elements that need to be
                  viewed in Notion
                </p>
              </div>
            </div>
          </div>
        );
      case "column_list":
        return (
          <div key={block.id} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700">
              {block.children && renderBlocksWithNumbering(block.children)}
            </div>
          </div>
        );
      case "column":
        return (
          <div
            key={block.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-600 space-y-4"
          >
            {block.children && renderBlocksWithNumbering(block.children)}
          </div>
        );
      default:
        // Unknown block type
        return null;
    }
  };

  // Show loading UI while checking auth status
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Loading instructor resources...</p>
            {error && (
              <p className="text-red-500 text-sm mt-2">Error: {error}</p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // After loading, if conditions for access are not met, show appropriate message
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Access Denied. Redirecting to login...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">
              Access Denied. Instructor status required. Redirecting to My
              Account...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If all checks pass, render the page content
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
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
              {/* Main page: organize subpages in a grid */}
              {!currentPageId ? (
                <div className="space-y-8">
                  {/* Render all content in original order to preserve grouping */}
                  {renderBlocksWithNumbering(notionContent.content)}
                </div>
              ) : (
                /* Subpage: render all blocks normally */
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
      </main>
      <Footer />
    </div>
  );
};

export default InstructorResourcesPage;
