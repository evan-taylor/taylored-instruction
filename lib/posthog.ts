import { PostHog } from "posthog-node";
import { getPostHogEnv } from "@/lib/posthog-env";

export default function PostHogClient() {
  const { host, projectToken } = getPostHogEnv();

  if (!(projectToken && host)) {
    return null;
  }

  return new PostHog(projectToken, {
    host,
    enableExceptionAutocapture: true,
    flushAt: 1,
    flushInterval: 0,
  });
}
