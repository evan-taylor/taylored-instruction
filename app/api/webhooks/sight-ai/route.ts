import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  type HTMLElement,
  type Node as HtmlNode,
  parse,
} from "node-html-parser";
import { getWriteClient } from "@/sanity/lib/client";

const replayWindowMinutes = 5;
const secondsPerMinute = 60;
const millisecondsPerSecond = 1000;
const replayWindowMs =
  replayWindowMinutes * secondsPerMinute * millisecondsPerSecond;
const sanityKeyLength = 12;
const signaturePrefix = "sha256=";
const defaultAuthor = "Taylored Instruction";
const fallbackExcerptLength = 320;

interface PortableTextSpan {
  _key: string;
  _type: "span";
  marks: string[];
  text: string;
}

interface PortableTextMarkDef {
  _key: string;
  _type: "link";
  href: string;
}

interface PortableTextBlock {
  _key: string;
  _type: "block";
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
  style: "blockquote" | "h2" | "h3" | "normal";
}

interface SightAiArticle {
  article_type?: string;
  author_name?: string | null;
  category?: string | null;
  content?: string;
  created_at?: string;
  id?: string;
  is_featured?: boolean;
  main_image_url?: string | null;
  published_at?: string | null;
  read_time_minutes?: number | null;
  seo_meta_description?: string | null;
  seo_title?: string | null;
  slug?: string;
  summary?: string | null;
  target_keyword?: string | null;
  thumbnail_image_url?: string | null;
  title?: string;
  updated_at?: string;
}

interface SightAiWebhookPayload {
  article?: SightAiArticle;
  event?: string;
  event_id?: string;
  site?: { host?: string; id?: string; name?: string };
  test?: boolean;
  timestamp?: string;
}

interface ExistingPost {
  _id: string;
  mainImage?: unknown;
}

interface SanityImage {
  _type: "image";
  alt: string;
  asset: {
    _ref: string;
    _type: "reference";
  };
}

type RequiredSightAiArticle = SightAiArticle & {
  content: string;
  id: string;
  slug: string;
  title: string;
};

interface SanityPostInput {
  _type: "post";
  author: string;
  body: PortableTextBlock[];
  categories?: string[];
  excerpt: string;
  mainImage?: SanityImage;
  publishedAt: string;
  seoDescription?: string;
  seoKeywords?: string[];
  seoTitle?: string;
  sightAiId: string;
  slug: {
    _type: "slug";
    current: string;
  };
  title: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getWebhookSecret = () =>
  process.env.SIGHT_AI_WEBHOOK_SECRET ??
  process.env.SIGHTAI_WEBHOOK_SECRET ??
  process.env.NVS_WEBHOOK_SECRET;

const hasWebhookConfiguration = (
  secret?: string,
  token?: string
): secret is string => Boolean(secret && token);

const makeKey = () =>
  randomUUID().replaceAll("-", "").slice(0, sanityKeyLength);

const isElement = (node: HtmlNode): node is HTMLElement =>
  "tagName" in node && typeof node.tagName === "string";

const getNodeText = (node: HtmlNode): string => {
  if (isElement(node)) {
    return node.text;
  }

  return node.rawText;
};

const createSpan = (
  text: string,
  marks: string[] = [],
  options: { trim?: boolean } = {}
) => {
  const normalizedText = text.replace(/\s+/g, " ");
  const spanText = options.trim ? normalizedText.trim() : normalizedText;

  if (!spanText) {
    return null;
  }

  return {
    _key: makeKey(),
    _type: "span",
    marks,
    text: spanText,
  } satisfies PortableTextSpan;
};

const normalizePlainText = (text: string) => text.replace(/\s+/g, " ").trim();

const truncateAtWordBoundary = (text: string, maxLength: number) => {
  const normalizedText = normalizePlainText(text);
  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  const truncatedText = normalizedText.slice(0, maxLength);
  const lastSpaceIndex = truncatedText.lastIndexOf(" ");

  if (lastSpaceIndex > 0) {
    return `${truncatedText.slice(0, lastSpaceIndex)}...`;
  }

  return `${truncatedText}...`;
};

const createTextBlock = (
  text: string,
  style: PortableTextBlock["style"] = "normal"
): PortableTextBlock | null => {
  const span = createSpan(text, [], { trim: true });
  if (!span) {
    return null;
  }

  return {
    _key: makeKey(),
    _type: "block",
    children: [span],
    markDefs: [],
    style,
  };
};

const styleForTag = (tagName: string): PortableTextBlock["style"] => {
  const normalizedTag = tagName.toLowerCase();
  if (normalizedTag === "blockquote") {
    return "blockquote";
  }
  if (normalizedTag === "h2") {
    return "h2";
  }
  if (normalizedTag === "h3" || normalizedTag === "h1") {
    return "h3";
  }
  return "normal";
};

const decoratorForTag = (tagName: string) => {
  const normalizedTag = tagName.toLowerCase();
  if (normalizedTag === "strong" || normalizedTag === "b") {
    return "strong";
  }
  if (normalizedTag === "em" || normalizedTag === "i") {
    return "em";
  }
  if (normalizedTag === "code") {
    return "code";
  }
  return null;
};

const marksForElement = (
  node: HTMLElement,
  marks: string[],
  markDefs: PortableTextMarkDef[]
) => {
  const tagName = node.tagName.toLowerCase();
  const href = tagName === "a" ? node.getAttribute("href")?.trim() : "";
  const decorator = decoratorForTag(tagName);
  const nextMarks = [...marks];

  if (href) {
    const linkKey = makeKey();
    markDefs.push({ _key: linkKey, _type: "link", href });
    nextMarks.push(linkKey);
  }

  if (decorator) {
    nextMarks.push(decorator);
  }

  return nextMarks;
};

const collectInlineSpans = (
  nodes: HtmlNode[],
  marks: string[],
  markDefs: PortableTextMarkDef[]
): PortableTextSpan[] => {
  const spans: PortableTextSpan[] = [];

  for (const node of nodes) {
    if (isElement(node)) {
      const nextMarks = marksForElement(node, marks, markDefs);
      spans.push(...collectInlineSpans(node.childNodes, nextMarks, markDefs));
    } else {
      const span = createSpan(node.rawText, marks);
      if (span) {
        spans.push(span);
      }
    }
  }

  return spans;
};

const createBlockFromElement = (node: HTMLElement) => {
  const markDefs: PortableTextMarkDef[] = [];
  const children = collectInlineSpans(node.childNodes, [], markDefs);

  if (children.length === 0) {
    return null;
  }

  return {
    _key: makeKey(),
    _type: "block",
    children,
    markDefs,
    style: styleForTag(node.tagName),
  } satisfies PortableTextBlock;
};

const htmlToPortableText = (html: string): PortableTextBlock[] => {
  const root = parse(html);
  const blockNodes = root.querySelectorAll("h1,h2,h3,p,li,blockquote");
  const blocks = blockNodes
    .map((node) => createBlockFromElement(node))
    .filter((block): block is PortableTextBlock => block !== null);

  if (blocks.length > 0) {
    return blocks;
  }

  const fallbackBlock = createTextBlock(getNodeText(root));
  return fallbackBlock ? [fallbackBlock] : [];
};

const makeExcerpt = (article: RequiredSightAiArticle) => {
  const summary = article.summary ? normalizePlainText(article.summary) : "";
  if (summary) {
    return summary;
  }

  const firstBlock = htmlToPortableText(article.content).at(0);
  const fallbackText =
    firstBlock?.children.map((child) => child.text).join(" ") || article.title;

  return truncateAtWordBoundary(fallbackText, fallbackExcerptLength);
};

const verifySignature = (
  rawBody: string,
  signatureHeader: string,
  secret: string
) => {
  if (!signatureHeader.startsWith(signaturePrefix)) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const provided = signatureHeader.slice(signaturePrefix.length);

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(provided, "hex")
  );
};

const hasRecentTimestamp = (request: Request) => {
  const timestampHeader = request.headers.get("x-sightai-timestamp");
  const timestamp = Number(timestampHeader);

  return (
    Number.isFinite(timestamp) &&
    Math.abs(Date.now() - timestamp) <= replayWindowMs
  );
};

const parsePayload = (rawBody: string): SightAiWebhookPayload | null => {
  try {
    const payload: unknown = JSON.parse(rawBody);
    return isRecord(payload) ? (payload as SightAiWebhookPayload) : null;
  } catch {
    return null;
  }
};

const isAuthorizedRequest = (
  rawBody: string,
  signature: string,
  secret: string,
  request: Request
) => verifySignature(rawBody, signature, secret) && hasRecentTimestamp(request);

const hasRequiredArticleFields = (
  article: SightAiArticle | undefined
): article is RequiredSightAiArticle =>
  Boolean(article?.id && article.slug && article.title && article.content);

const getExistingPost = (sightAiId: string) =>
  getWriteClient().fetch<ExistingPost | null>(
    `*[_type == "post" && sightAiId == $id][0]{
      _id,
      mainImage
    }`,
    { id: sightAiId }
  );

const getImageFilename = (imageUrl: string) => {
  try {
    return new URL(imageUrl).pathname.split("/").at(-1) ?? "featured-image";
  } catch {
    return "featured-image";
  }
};

const resolveMainImage = async (
  existingPost: ExistingPost | null,
  article: RequiredSightAiArticle
): Promise<SanityImage | undefined> => {
  if (existingPost?.mainImage || !article.main_image_url) {
    return;
  }

  const response = await fetch(article.main_image_url);
  if (!response.ok) {
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = getImageFilename(article.main_image_url);
  const asset = await getWriteClient().assets.upload("image", buffer, {
    filename,
  });

  return {
    _type: "image",
    alt: article.title,
    asset: {
      _ref: asset._id,
      _type: "reference",
    },
  };
};

const resolveBody = (article: RequiredSightAiArticle) => {
  const body = htmlToPortableText(article.content);
  if (body.length > 0) {
    return body;
  }

  const fallbackBody = createTextBlock(article.title);
  return fallbackBody ? [fallbackBody] : [];
};

const buildPostInput = async (
  existingPost: ExistingPost | null,
  article: RequiredSightAiArticle
): Promise<SanityPostInput> => {
  const mainImage = await resolveMainImage(existingPost, article);
  const publishedAt =
    article.published_at ??
    article.updated_at ??
    article.created_at ??
    new Date().toISOString();

  return {
    _type: "post",
    author: article.author_name ?? defaultAuthor,
    body: resolveBody(article),
    categories: article.category ? [article.category] : undefined,
    excerpt: makeExcerpt(article),
    mainImage,
    publishedAt,
    seoDescription: article.seo_meta_description ?? undefined,
    seoKeywords: article.target_keyword ? [article.target_keyword] : undefined,
    seoTitle: article.seo_title ?? undefined,
    sightAiId: article.id,
    slug: { _type: "slug", current: article.slug },
    title: article.title,
  };
};

const revalidateBlog = (slug: string) => {
  revalidateTag("post", "max");
  revalidateTag(`post:${slug}`, "max");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/rss.xml");
};

export function GET() {
  return NextResponse.json({ endpoint: "sight-ai", status: "ok" });
}

export async function POST(request: Request) {
  const secret = getWebhookSecret();
  const token = process.env.SANITY_API_WRITE_TOKEN;

  if (!hasWebhookConfiguration(secret, token)) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-sightai-signature") ?? "";

  if (!isAuthorizedRequest(rawBody, signature, secret, request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = parsePayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.test === true) {
    return NextResponse.json({ ok: true, test: true });
  }

  const article = payload.article;
  if (!hasRequiredArticleFields(article)) {
    return NextResponse.json(
      { error: "Missing required article fields" },
      { status: 400 }
    );
  }

  const existingPost = await getExistingPost(article.id);
  const document = await buildPostInput(existingPost, article);

  const result = existingPost
    ? await getWriteClient().patch(existingPost._id).set(document).commit()
    : await getWriteClient().create(document);

  revalidateBlog(article.slug);

  return NextResponse.json({
    event_id: payload.event_id,
    ok: true,
    operation: existingPost ? "updated" : "created",
    sanityId: result._id,
    sightAiId: article.id,
  });
}
