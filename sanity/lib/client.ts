import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

export const client = createClient({
  apiVersion,
  dataset,
  projectId,
  useCdn: false,
});

let writeClient: ReturnType<typeof createClient> | null = null;

export const getWriteClient = () => {
  if (!writeClient) {
    writeClient = createClient({
      apiVersion,
      dataset,
      projectId,
      token: process.env.SANITY_API_WRITE_TOKEN,
      useCdn: false,
    });
  }

  return writeClient;
};

type SanityFetchOptions = {
  params?: Record<string, string>;
  tags?: string[];
};

const defaultRevalidateSeconds = 60;

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
