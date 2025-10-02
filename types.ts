// Product type matches Supabase database schema which uses snake_case
export type Product = {
  id: string; // uuid
  // biome-ignore lint/style/useNamingConvention: Database column uses snake_case
  original_csv_id: number | null;
  sku: string | null;
  name: string;
  description: string | null;
  price: number; // Stored as decimal, represented as number in JS/TS
  // biome-ignore lint/style/useNamingConvention: Database column uses snake_case
  image_urls: string[] | null;
  categories: string[] | null;
  type: "digital" | "aed" | "ecard";
  // biome-ignore lint/style/useNamingConvention: Database column uses snake_case
  requires_instructor: boolean;
  // biome-ignore lint/style/useNamingConvention: Database column uses snake_case
  created_at: string; // timestamp with time zone (string representation)
};

// You might add other shared types here later
