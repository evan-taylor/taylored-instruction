import type { RevnuPostSummary } from "@/lib/revnu";
import { SITE_URL } from "@/lib/seo";
import type { BlogPostSitemapEntry } from "@/sanity/types";

type Article = {
  url: string;
  title: string;
  description: string;
  publishedAt: number;
};

const header = `# Taylored Instruction

> Taylored Instruction teaches American Red Cross and American Heart Association safety courses in Vancouver, WA and San Luis Obispo, CA: CPR, BLS, First Aid, AED, Lifeguarding, Water Safety Instructor and instructor training, for individuals and on-site for workplace teams.

Taylored Instruction runs public classes, blended and online courses, and private group training. Class schedules and registration are at ${SITE_URL}/classes, and group training quotes at ${SITE_URL}/group-training.

## Key pages

- [Classes](${SITE_URL}/classes): Upcoming public classes and registration
- [Group training](${SITE_URL}/group-training): On-site and private training for teams
- [About](${SITE_URL}/about): Who teaches the courses and how
- [Contact](${SITE_URL}/contact): Questions about courses and certification
- [Blog](${SITE_URL}/blog): Articles on CPR, BLS, first aid, AEDs and lifeguarding
`;

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export const buildLlmsTxt = ({
  sanityPosts,
  revnuPosts,
}: {
  sanityPosts: BlogPostSitemapEntry[];
  revnuPosts: RevnuPostSummary[];
}) => {
  const sanityPaths = new Set(sanityPosts.map((post) => `/${post.slug}`));
  const articles: Article[] = [
    ...sanityPosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      title: post.title,
      description: post.excerpt,
      publishedAt: Date.parse(post.publishedAt),
    })),
    ...revnuPosts
      .filter((post) => !sanityPaths.has(post.canonicalPath))
      .map((post) => ({
        url: post.canonicalUrl,
        title: post.title,
        description: post.metaDescription,
        publishedAt: post.publishedAt,
      })),
  ].sort((a, b) => b.publishedAt - a.publishedAt);

  const articleLines = articles.map(
    (article) =>
      `- [${oneLine(article.title)}](${article.url}): ${oneLine(article.description)}`
  );

  return `${header}\n## Articles\n\n${articleLines.join("\n")}\n`;
};
