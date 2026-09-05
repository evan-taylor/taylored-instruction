const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function isValidPostHogHost(host: string | undefined): host is string {
  return Boolean(host?.startsWith("http"));
}

export function getPostHogEnv() {
  const projectToken =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const host = isValidPostHogHost(configuredHost)
    ? configuredHost
    : DEFAULT_POSTHOG_HOST;

  return { host, projectToken };
}

export function getMissingPostHogEnvVariable() {
  const { projectToken } = getPostHogEnv();

  if (!projectToken) {
    return "NEXT_PUBLIC_POSTHOG_KEY";
  }

  return "NEXT_PUBLIC_POSTHOG_HOST";
}
