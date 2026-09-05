import { PostHog } from "posthog-node";
import {
  getMissingPostHogEnvVariable,
  getPostHogEnv,
} from "@/lib/posthog-env";

export default function PostHogClient() {
  const { host, projectToken } = getPostHogEnv();

  if (!(projectToken && host)) {
    if (process.env.NODE_ENV !== "production") {
      const missingVariable = getMissingPostHogEnvVariable();

      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
      );
    }
    return null;
  }

  return new PostHog(projectToken, {
    host,
    enableExceptionAutocapture: true,
    flushAt: 1,
    flushInterval: 0,
  });
}
