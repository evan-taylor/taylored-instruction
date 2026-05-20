const defaultDataset = "production";

const optionalEnv = (value: string | undefined): string | undefined => {
  if (!value?.trim()) {
    return;
  }

  return value;
};

const requiredEnv = (key: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required Sanity environment variable: ${key}`);
  }

  return value;
};

export const apiVersion = "2024-01-01";
export const dataset =
  optionalEnv(process.env.NEXT_PUBLIC_SANITY_DATASET) ??
  optionalEnv(process.env.SANITY_DATASET) ??
  defaultDataset;
export const projectId = requiredEnv(
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  optionalEnv(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) ??
    optionalEnv(process.env.SANITY_PROJECT_ID)
);
