import { defineField, defineType } from "sanity";

const keywordMaxLength = 40;
const seoDescriptionMaxLength = 160;
const seoTitleMaxLength = 70;
const textAreaRows = 3;

export const postType = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: true,
      name: "sightAiId",
      readOnly: true,
      title: "Sight AI ID",
      type: "string",
    }),
    defineField({
      name: "slug",
      options: {
        maxLength: 96,
        source: "title",
      },
      title: "Slug",
      type: "slug",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      rows: textAreaRows,
      title: "Excerpt",
      type: "text",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: "Taylored Instruction",
      name: "author",
      title: "Author",
      type: "string",
    }),
    defineField({
      name: "categories",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      title: "Categories",
      type: "array",
    }),
    defineField({
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      name: "mainImage",
      options: {
        hotspot: true,
      },
      title: "Main image",
      type: "image",
    }),
    defineField({
      name: "body",
      of: [
        {
          marks: {
            annotations: [
              {
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
                name: "link",
                title: "Link",
                type: "object",
              },
            ],
          },
          type: "block",
        },
      ],
      title: "Body",
      type: "array",
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
      rows: textAreaRows,
      title: "SEO description",
      type: "text",
      validation: (rule) => rule.max(seoDescriptionMaxLength),
    }),
    defineField({
      name: "seoKeywords",
      of: [
        {
          type: "string",
          validation: (rule) => rule.max(keywordMaxLength),
        },
      ],
      options: {
        layout: "tags",
      },
      title: "SEO keywords",
      type: "array",
    }),
  ],
  name: "post",
  preview: {
    select: {
      media: "mainImage",
      subtitle: "publishedAt",
      title: "title",
    },
  },
  title: "Post",
  type: "document",
});
