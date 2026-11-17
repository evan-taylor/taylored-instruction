import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RevnuPostArticle } from "@/components/blog/RevnuPostArticle";
import { resolveRevnuFallback } from "@/lib/blogRouting";
import { buildRevnuPostMetadata, getRevnuPostHref } from "@/lib/revnu";

export const getRevnuPostMetadata = async (
  canonicalPath: string
): Promise<Metadata | null> => {
  const resolution = await resolveRevnuFallback(canonicalPath);
  return resolution?.kind === "post"
    ? buildRevnuPostMetadata(resolution.data)
    : null;
};

export const renderRevnuPost = async (canonicalPath: string) => {
  const resolution = await resolveRevnuFallback(canonicalPath);
  if (!resolution) {
    notFound();
  }
  if (resolution.kind === "redirect") {
    permanentRedirect(getRevnuPostHref(resolution.canonicalPath));
  }
  return <RevnuPostArticle data={resolution.data} />;
};
