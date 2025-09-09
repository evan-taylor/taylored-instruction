-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"is_instructor" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_csv_id" integer,
	"sku" text,
	"name" text NOT NULL,
	"description" text,
	"image_urls" text,
	"categories" text[],
	"type" text NOT NULL,
	"requires_instructor" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stripe_price_id" text,
	CONSTRAINT "products_original_csv_id_key" UNIQUE("original_csv_id"),
	CONSTRAINT "products_type_check" CHECK (type = ANY (ARRAY['digital'::text, 'aed'::text, 'ecard'::text]))
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"url" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"user_id" uuid,
	"ip_address" text,
	"city" text,
	"region" text,
	"country" text
);
--> statement-breakpoint
ALTER TABLE "analytics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Allow users to read their own profile" ON "profiles" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));--> statement-breakpoint
CREATE POLICY "Allow users to update their own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can read own profile" ON "profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can update own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "admin_read_all_profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "admin_update_all_profiles" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "Users can insert own profile" ON "profiles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "authenticated_users_access_policy" ON "products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((NOT requires_instructor) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_instructor = true))))));--> statement-breakpoint
CREATE POLICY "public_access_policy" ON "products" AS PERMISSIVE FOR SELECT TO "anon";--> statement-breakpoint
CREATE POLICY "Analytics insert" ON "analytics" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Analytics admin select" ON "analytics" AS PERMISSIVE FOR SELECT TO public;
*/