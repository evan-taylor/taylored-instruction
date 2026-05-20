import { defineQuery } from "next-sanity";

const postFields = `{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  author,
  categories,
  mainImage,
  seoTitle,
  seoDescription,
  seoKeywords
}`;

export const POSTS_QUERY = defineQuery(
  `*[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now()
  ] | order(publishedAt desc)[0...12] ${postFields}`
);

export const POST_SLUGS_QUERY = defineQuery(
  `*[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now()
  ] | order(publishedAt desc){
    "slug": slug.current
  }`
);

export const POSTS_SITEMAP_QUERY = defineQuery(
  `*[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now()
  ] | order(publishedAt desc){
    "slug": slug.current,
    _updatedAt,
    publishedAt
  }`
);

export const POST_QUERY = defineQuery(
  `*[
    _type == "post" &&
    slug.current == $slug &&
    defined(publishedAt) &&
    publishedAt <= now()
  ][0]{
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    _updatedAt,
    author,
    categories,
    mainImage,
    body,
    seoTitle,
    seoDescription,
    seoKeywords
  }`
);
