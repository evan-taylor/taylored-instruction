const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required Sanity environment variable: ${key}`);
  }

  return value;
};

export const apiVersion = "2024-01-01";
export const dataset = requiredEnv("NEXT_PUBLIC_SANITY_DATASET");
export const projectId = requiredEnv("NEXT_PUBLIC_SANITY_PROJECT_ID");
