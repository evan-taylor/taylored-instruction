const defaultDataset = "production";

const optionalEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value?.trim()) {
    return;
  }

  return value;
};

const requiredEnv = (key: string, fallbackKey?: string): string => {
  const value =
    optionalEnv(key) ?? (fallbackKey ? optionalEnv(fallbackKey) : "");
  if (!value) {
    throw new Error(`Missing required Sanity environment variable: ${key}`);
  }

  return value;
};

export const apiVersion = "2024-01-01";
export const dataset =
  optionalEnv("NEXT_PUBLIC_SANITY_DATASET") ??
  optionalEnv("SANITY_DATASET") ??
  defaultDataset;
export const projectId = requiredEnv(
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "SANITY_PROJECT_ID"
);
