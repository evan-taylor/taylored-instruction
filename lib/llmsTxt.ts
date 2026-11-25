import {
  ACCREDITATION_PHRASE,
  BUSINESS,
  formatBusinessAddress,
} from "@/lib/business";
import type { RevnuPostSummary } from "@/lib/revnu";
import { SITE_URL } from "@/lib/seo";

type Article = {
  url: string;
  title: string;
  description: string;
  publishedAt: number;
};

export type LlmsCourse = {
  slug: string;
  title: string;
  description: string;
};

const servicePages = [
  {
    path: "/bls",
    name: "AHA BLS Certification",
    description:
      "American Heart Association BLS certification for healthcare professionals, with in-person and blended options.",
  },
  {
    path: "/basic-life-support",
    name: "Red Cross Basic Life Support (BLS)",
    description:
      "American Red Cross Basic Life Support (BLS) certification for healthcare providers.",
  },
  {
    path: "/heartsaver",
    name: "AHA Heartsaver First Aid CPR AED",
    description:
      "American Heart Association Heartsaver First Aid CPR AED certification for workplace teams and community learners.",
  },
  {
    path: "/first-aid-cpr-aed",
    name: "Red Cross First Aid/CPR/AED",
    description:
      "American Red Cross First Aid, CPR, and AED certification classes with blended and in-person options.",
  },
  {
    path: "/lifeguarding",
    name: "Red Cross Lifeguarding",
    description: "American Red Cross Lifeguarding certification training.",
  },
  {
    path: "/water-safety-instructor",
    name: "Red Cross Water Safety Instructor",
    description:
      "American Red Cross Water Safety Instructor course for people who want to teach swimming and water safety.",
  },
  {
    path: "/lifeguarding-instructor",
    name: "Red Cross Lifeguarding Instructor",
    description:
      "American Red Cross Lifeguarding Instructor course with blended and in-person training.",
  },
  {
    path: "/lifeguarding-instructor-trainer",
    name: "Red Cross Lifeguarding Instructor Trainer",
    description:
      "On-site Red Cross Lifeguarding Instructor Trainer services for aquatic facilities, schools, and organizations.",
  },
  {
    path: "/fa-cpr-aed-instructor",
    name: "Red Cross First Aid/CPR/AED Instructor",
    description: "American Red Cross First Aid/CPR/AED Instructor course.",
  },
  {
    path: "/aha-instructor-training",
    name: "AHA Instructor Training",
    description:
      "Become an American Heart Association BLS or Heartsaver instructor.",
  },
  {
    path: "/corporate-training",
    name: "Corporate CPR Training",
    description:
      "On-site CPR, BLS, and First Aid training for businesses, schools, and organizations.",
  },
  {
    path: "/aeds",
    name: "AED Sales",
    description:
      "AED sales with product guidance, training integration, and implementation support.",
  },
  {
    path: "/alignment",
    name: "Instructor Alignment",
    description:
      "Support for independent CPR, First Aid, BLS, and Lifeguard instructors who align with Taylored Instruction.",
  },
];

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

const { address, hours, phone } = BUSINESS;

const facts = `## Facts

- Founded in ${BUSINESS.foundingYear} by ${BUSINESS.founder.name} and based in ${address.locality}, Washington.
- Teaches classes seasonally in San Luis Obispo, CA on the Central Coast.
- ${ACCREDITATION_PHRASE}.
- Serves ${BUSINESS.serviceArea.map((area) => area.name).join("; ")} and surrounding areas.
- Address: ${formatBusinessAddress()} (${address.placeName})
- Hours: ${hours.display}
- Phone: ${phone.display}
- Email: ${BUSINESS.email}
- Register for public classes at ${SITE_URL}/classes.
`;

const SENTENCE_END = /(?<=[.!?])\s/;

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

const firstSentence = (value: string) =>
  oneLine(value).split(SENTENCE_END)[0] ?? "";

const courseLine = (course: LlmsCourse) => {
  const link = `- [${oneLine(course.title)}](${SITE_URL}/courses/${course.slug})`;
  const summary = firstSentence(course.description);
  return summary && summary !== oneLine(course.title)
    ? `${link}: ${summary}`
    : link;
};

export const buildLlmsTxt = (
  revnuPosts: RevnuPostSummary[],
  courses: LlmsCourse[]
) => {
  const articles: Article[] = revnuPosts
    .map((post) => ({
      url: post.canonicalUrl,
      title: post.title,
      description: post.metaDescription,
      publishedAt: post.publishedAt,
    }))
    .sort((a, b) => b.publishedAt - a.publishedAt);

  const courseLines = [
    ...servicePages.map(
      (page) => `- [${page.name}](${SITE_URL}${page.path}): ${page.description}`
    ),
    ...courses.map(courseLine),
  ];

  const articleLines = articles.map(
    (article) =>
      `- [${oneLine(article.title)}](${article.url}): ${oneLine(article.description)}`
  );

  return `${header}\n## Courses\n\n${courseLines.join("\n")}\n\n${facts}\n## Articles\n\n${articleLines.join("\n")}\n`;
};
