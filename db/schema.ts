import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Define minimal auth schema users table reference for FKs
const auth = pgSchema("auth");
export const usersInAuth = auth.table("users", {
  id: uuid("id").primaryKey().notNull(),
  email: text("email"),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: "string" }),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    isInstructor: boolean("is_instructor").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [usersInAuth.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Allow users to read their own profile", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`(auth.uid() = id)`,
    }),
    pgPolicy("Allow users to update their own profile", {
      as: "permissive",
      for: "update",
      to: ["public"],
    }),
    pgPolicy("Users can read own profile", {
      as: "permissive",
      for: "select",
      to: ["public"],
    }),
    pgPolicy("Users can update own profile", {
      as: "permissive",
      for: "update",
      to: ["public"],
    }),
    pgPolicy("admin_read_all_profiles", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
    }),
    pgPolicy("admin_update_all_profiles", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("Users can insert own profile", {
      as: "permissive",
      for: "insert",
      to: ["public"],
    }),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    originalCsvId: integer("original_csv_id"),
    sku: text(),
    name: text().notNull(),
    description: text(),
    imageUrls: text("image_urls"),
    categories: text().array(),
    type: text().notNull(),
    requiresInstructor: boolean("requires_instructor").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    stripePriceId: text("stripe_price_id"),
  },
  (table) => [
    unique("products_original_csv_id_key").on(table.originalCsvId),
    pgPolicy("authenticated_users_access_policy", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`((NOT requires_instructor) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_instructor = true)))))`,
    }),
    pgPolicy("public_access_policy", {
      as: "permissive",
      for: "select",
      to: ["anon"],
    }),
    check(
      "products_type_check",
      sql`type = ANY (ARRAY['digital'::text, 'aed'::text, 'ecard'::text])`
    ),
  ]
);

export const analytics = pgTable(
  "analytics",
  {
    id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    url: text(),
    referrer: text(),
    userId: uuid("user_id"),
    ipAddress: text("ip_address"),
    city: text(),
    region: text(),
    country: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "analytics_user_id_fkey",
    }),
    pgPolicy("Analytics insert", {
      as: "permissive",
      for: "insert",
      to: ["public"],
      withCheck: sql`true`,
    }),
    pgPolicy("Analytics admin select", {
      as: "permissive",
      for: "select",
      to: ["public"],
    }),
  ]
);
