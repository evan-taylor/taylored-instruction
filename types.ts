// Product type matches Supabase database schema which uses snake_case
export interface Product {
  categories: string[] | null;
  created_at: string; // timestamp with time zone (string representation)
  description: string | null;
  id: string; // uuid
  image_urls: string[] | null;
  name: string;
  original_csv_id: number | null;
  price: number; // Stored as decimal, represented as number in JS/TS
  requires_instructor: boolean;
  sku: string | null;
  type: "digital" | "aed" | "ecard";
}

// You might add other shared types here later
