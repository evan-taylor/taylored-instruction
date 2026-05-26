import { defineField, defineType } from "sanity";

const excerptMaxLength = 180;
const keywordMaxLength = 40;
const seoDescriptionMaxLength = 160;
const seoTitleMaxLength = 70;
const textAreaRows = 3;

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sightAiId",
      title: "Sight AI ID",
      type: "string",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        maxLength: 96,
        source: "title",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: textAreaRows,
      validation: (rule) => rule.required().max(excerptMaxLength),
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
      initialValue: "Taylored Instruction",
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "mainImage",
      title: "Main image",
      type: "image",
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (rule) =>
                      rule.uri({
                        allowRelative: true,
                        scheme: ["http", "https", "mailto", "tel"],
                      }),
                  }),
                ],
              },
            ],
          },
        },
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      validation: (rule) => rule.max(seoTitleMaxLength),
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: textAreaRows,
      validation: (rule) => rule.max(seoDescriptionMaxLength),
    }),
    defineField({
      name: "seoKeywords",
      title: "SEO keywords",
      type: "array",
      of: [
        {
          type: "string",
          validation: (rule) => rule.max(keywordMaxLength),
        },
      ],
      options: {
        layout: "tags",
      },
    }),
  ],
  preview: {
    select: {
      media: "mainImage",
      subtitle: "publishedAt",
      title: "title",
    },
  },
});
