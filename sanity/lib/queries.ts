import { defineQuery } from "next-sanity";

const postFields = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage,
  seoTitle,
  seoDescription
}`;

export const POSTS_QUERY = defineQuery(
  `*[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now()
  ] | order(publishedAt desc)[0...12] ${postFields}`
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
    mainImage,
    body,
    seoTitle,
    seoDescription
  }`
);
