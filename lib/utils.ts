import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export function generateOgImageUrl(title: string, eyebrow?: string): string {
  const searchParams = new URLSearchParams({ title });
  if (eyebrow) {
    searchParams.set("eyebrow", eyebrow);
  }
  return `/api/og?${searchParams.toString()}`;
}
