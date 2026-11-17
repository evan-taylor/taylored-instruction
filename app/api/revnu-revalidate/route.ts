import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { REVNU_CACHE_TAG } from "@/lib/revnu";

const isAuthorized = (request: Request) => {
  const expected = process.env.REVNU_REVALIDATE_KEY;
  const provided = new URL(request.url).searchParams.get("key");
  if (!(expected && provided)) {
    return false;
  }
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
};

export function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  revalidateTag(REVNU_CACHE_TAG, { expire: 0 });
  revalidatePath("/blog", "layout");

  return Response.json({ revalidated: true });
}
