export type RelatedCourse = {
  name: string;
  href: string;
};

const RULES: { pattern: RegExp; course: RelatedCourse }[] = [
  {
    pattern: /\b(bls|basic life support)\b/,
    course: { name: "AHA BLS certification", href: "/bls" },
  },
  {
    pattern: /\blifeguard/,
    course: { name: "Red Cross Lifeguarding", href: "/lifeguarding" },
  },
  {
    pattern: /(?<!\bcpr )\baeds?\b/,
    course: { name: "AED sales and distribution", href: "/aeds" },
  },
  {
    pattern: /\b(group|corporate|compan(y|ies)|workplace|on ?site)\b/,
    course: { name: "Corporate CPR training", href: "/corporate-training" },
  },
];

const NON_WORD = /[^a-z0-9]+/g;

export const ALL_CLASSES: RelatedCourse = {
  name: "Upcoming CPR and first aid classes",
  href: "/classes",
};

/** Picks the service page a blog post should send readers to, from its slug and title. */
export const relatedCourseForPost = (post: { slug: string; title: string }) => {
  const text = ` ${post.slug} ${post.title} `
    .toLowerCase()
    .replace(NON_WORD, " ");
  return RULES.find((rule) => rule.pattern.test(text))?.course ?? ALL_CLASSES;
};
