import { revalidatePath, revalidateTag } from "next/cache";

const secretHeaderName = "x-sanity-revalidate-secret";

interface SanityWebhookPayload {
  _type?: string;
  slug?: {
    current?: string;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readPayload = async (request: Request): Promise<SanityWebhookPayload> => {
  const payload: unknown = await request.json().catch(() => ({}));
  if (!isRecord(payload)) {
    return {};
  }

  const slug = payload.slug;

  return {
    _type: typeof payload._type === "string" ? payload._type : undefined,
    slug: isRecord(slug)
      ? {
          current: typeof slug.current === "string" ? slug.current : undefined,
        }
      : undefined,
  };
};

const getRequestSecret = (request: Request) => {
  const url = new URL(request.url);

  return (
    request.headers.get(secretHeaderName) ??
    url.searchParams.get("secret") ??
    ""
  );
};

export async function POST(request: Request) {
  const expectedSecret = process.env.SANITY_REVALIDATE_SECRET;

  if (!expectedSecret || getRequestSecret(request) !== expectedSecret) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  const payload = await readPayload(request);
  const slug = payload.slug?.current;

  revalidateTag("post", "max");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/rss.xml");

  if (slug) {
    revalidateTag(`post:${slug}`, "max");
    revalidatePath(`/blog/${slug}`);
  }

  return Response.json({
    revalidated: true,
    slug,
    type: payload._type,
  });
}
