import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type OgImageParams = {
  title: string;
  description?: string;
  type?: "default" | "bls" | "heartsaver" | "aha" | "lifeguarding" | "swimming";
};

export function generateOgImageUrl(params: OgImageParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set("title", params.title);
  if (params.description) {
    searchParams.set("description", params.description);
  }
  if (params.type) {
    searchParams.set("type", params.type);
  }
  return `/api/og?${searchParams.toString()}`;
}
