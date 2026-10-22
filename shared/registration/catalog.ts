/**
 * Which registration courses a marketing page is about. Slugs are exact; the
 * keyword fallback keeps the page useful when staff rename or re-slug a
 * course template in the admin, and `exclude` keeps "BLS" from also pulling
 * in "BLS Instructor".
 */
export type CourseMatch = {
  slugs: readonly string[];
  keywords: readonly string[];
  exclude?: readonly string[];
};

export function matchesCourse(
  course: { slug: string; title: string },
  match: CourseMatch
) {
  if (match.slugs.includes(course.slug)) {
    return true;
  }
  const title = course.title.toLowerCase();
  if (match.exclude?.some((word) => title.includes(word.toLowerCase()))) {
    return false;
  }
  return match.keywords.some((word) => title.includes(word.toLowerCase()));
}

/** "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682" → name and address. */
export function parsePlace(location: string) {
  const trimmed = location.trim();
  if (!trimmed) {
    return { name: "Online", address: "" };
  }
  const separator = trimmed.indexOf(":");
  if (separator === -1) {
    return { name: trimmed, address: "" };
  }
  return {
    name: trimmed.slice(0, separator).trim(),
    address: trimmed.slice(separator + 1).trim(),
  };
}
