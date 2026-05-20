import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

export const client = createClient({
  apiVersion,
  dataset,
  projectId,
  useCdn: process.env.NODE_ENV === "production",
});

type SanityFetchOptions = {
  params?: Record<string, string>;
  tags?: string[];
};

const defaultRevalidateSeconds = 3600;

export const sanityFetch = async <Response>(
  query: string,
  options: SanityFetchOptions = {}
) =>
  client.fetch<Response>(query, options.params ?? {}, {
    next: {
      revalidate: defaultRevalidateSeconds,
      tags: options.tags,
    },
  });
