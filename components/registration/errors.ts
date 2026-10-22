import { ConvexError } from "convex/values";

export const GENERIC_ERROR = "Something went wrong. Please try again.";
const ERROR_PREFIX = /^(Error|ConvexError):\s*/u;

/**
 * User-facing text for a failed Convex call. Only `ConvexError` data survives
 * production redaction; everything else becomes the fallback.
 */
export function errorText(error: unknown, fallback = GENERIC_ERROR) {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  if (error instanceof Error && !error.message.includes("Server Error")) {
    return error.message.replace(ERROR_PREFIX, "");
  }
  return fallback;
}
