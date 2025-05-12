// Define the structure of your Product based on the Supabase table
export interface Product {
  id: string; // uuid
  original_csv_id: number | null;
  sku: string | null;
  name: string;
  description: string | null;
  price: number; // Stored as decimal, represented as number in JS/TS
  image_urls: string[] | null;
  categories: string[] | null;
  type: 'digital' | 'aed' | 'ecard';
  requires_instructor: boolean;
  created_at: string; // timestamp with time zone (string representation)
}

// You might add other shared types here later 