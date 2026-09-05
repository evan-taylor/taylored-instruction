export function getPostHogEnv() {
  const projectToken =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  return { host, projectToken };
}

export function getMissingPostHogEnvVariable() {
  const { host, projectToken } = getPostHogEnv();

  if (!projectToken) {
    return "NEXT_PUBLIC_POSTHOG_KEY";
  }

  return "NEXT_PUBLIC_POSTHOG_HOST";
}
