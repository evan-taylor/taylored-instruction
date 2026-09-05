import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

export const getEcardProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile?.isInstructor) {
      throw new Error("Forbidden: Instructor access required");
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_type", (q) => q.eq("type", "ecard"))
      .collect();

    return products.map((product) => ({
      description: product.description,
      id: product._id,
      image_urls: product.imageUrls,
      name: product.name,
      requires_instructor: product.requiresInstructor,
      stripe_price_id: product.stripePriceId,
      type: product.type,
    }));
  },
});

export const getProducts = query({
  args: {
    requiresInstructor: v.optional(v.boolean()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const products =
      args.type === undefined
        ? await ctx.db.query("products").collect()
        : await ctx.db
            .query("products")
            .withIndex("by_type", (q) => q.eq("type", args.type as string))
            .collect();

    const filteredProducts =
      args.requiresInstructor === undefined
        ? products
        : products.filter(
            (p) => p.requiresInstructor === args.requiresInstructor
          );

    return filteredProducts.map((product) => ({
      categories: product.categories,
      description: product.description,
      id: product._id,
      image_urls: product.imageUrls,
      name: product.name,
      requires_instructor: product.requiresInstructor,
      sku: product.sku,
      stripe_price_id: product.stripePriceId,
      type: product.type,
    }));
  },
});

export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      return null;
    }

    return {
      categories: product.categories,
      description: product.description,
      id: product._id,
      image_urls: product.imageUrls,
      name: product.name,
      requires_instructor: product.requiresInstructor,
      sku: product.sku,
      stripe_price_id: product.stripePriceId,
      type: product.type,
    };
  },
});
