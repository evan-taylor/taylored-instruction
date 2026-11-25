import type { Metadata } from "next";
import { describe, expect, it } from "vitest";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

type PageModule = {
  metadata?: Metadata;
  generateMetadata?: () => Promise<Metadata>;
};

const pages = Object.entries(
  import.meta.glob<PageModule>("../../app/**/page.tsx")
).filter(([path]) => path.includes("/(marketing)/") && !path.includes("["));

const pageMetadata = async (load: () => Promise<PageModule>) => {
  const page = await load();
  return page.metadata ?? (await page.generateMetadata?.());
};

describe("marketing page metadata", () => {
  it("finds the marketing pages", () => {
    expect(pages.length).toBeGreaterThan(15);
  });

  for (const [path, load] of pages) {
    it(`keeps ${path} within search snippet limits`, async () => {
      const metadata = await pageMetadata(load);
      const title = metadata?.title;
      const description = metadata?.description;
      if (typeof title !== "string" || typeof description !== "string") {
        throw new Error(`${path} needs a string title and description`);
      }
      expect(title.trim()).not.toBe("");
      expect(description.trim()).not.toBe("");
      expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
      expect(description.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
    });
  }
});
