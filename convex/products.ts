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
      id: product._id,
      name: product.name,
      description: product.description,
      stripe_price_id: product.stripePriceId,
      image_urls: product.imageUrls,
      type: product.type,
      requires_instructor: product.requiresInstructor,
    }));
  },
});

export const getProducts = query({
  args: {
    type: v.optional(v.string()),
    requiresInstructor: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const products =
      args.type !== undefined
        ? await ctx.db
            .query("products")
            .withIndex("by_type", (q) => q.eq("type", args.type))
            .collect()
        : await ctx.db.query("products").collect();

    const filteredProducts =
      args.requiresInstructor !== undefined
        ? products.filter(
            (p) => p.requiresInstructor === args.requiresInstructor
          )
        : products;

    return filteredProducts.map((product) => ({
      id: product._id,
      name: product.name,
      description: product.description,
      stripe_price_id: product.stripePriceId,
      image_urls: product.imageUrls,
      type: product.type,
      requires_instructor: product.requiresInstructor,
      sku: product.sku,
      categories: product.categories,
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
      id: product._id,
      name: product.name,
      description: product.description,
      stripe_price_id: product.stripePriceId,
      image_urls: product.imageUrls,
      type: product.type,
      requires_instructor: product.requiresInstructor,
      sku: product.sku,
      categories: product.categories,
    };
  },
});
