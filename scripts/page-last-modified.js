const { execFileSync } = require("node:child_process");
const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const path = require("node:path");

const marketingDir = path.join("app", "(marketing)");
const importPattern = /(?:from|import)\s*["']([^"']+)["']/g;
const sourceExtensions = [".tsx", ".ts", ".jsx", ".js"];
// Shared chrome changes every page's look, not what a page says.
// Dynamic route groups whose copy lives in a config file rather than a page.
const pageConfigFiles = {
  "cpr-classes": path.join("lib", "locations.ts"),
};
const sharedComponentDirs = [
  path.join("components", "ui"),
  path.join("components", "layout"),
];

const git = (args) => {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

// In a shallow clone (Vercel clones 10 commits deep), a file untouched since the
// oldest fetched commit reports that commit, which is not when it last changed.
const readShallowBoundary = () => {
  const shallowFile = git(["rev-parse", "--git-path", "shallow"]);
  if (!(shallowFile && existsSync(shallowFile))) {
    return new Set();
  }
  return new Set(readFileSync(shallowFile, "utf8").split("\n").filter(Boolean));
};

const resolveImport = (specifier, fromFile) => {
  let base = null;
  if (specifier.startsWith("@/")) {
    base = specifier.slice(2);
  } else if (specifier.startsWith(".")) {
    base = path.join(path.dirname(fromFile), specifier);
  }
  if (!base) {
    return null;
  }
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) =>
      path.join(base, `index${extension}`)
    ),
  ];
  return (
    candidates.find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile()
    ) ?? null
  );
};

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });

const isPageContent = (file, pageDir) =>
  file.startsWith(`${pageDir}${path.sep}`) ||
  (file.startsWith(`components${path.sep}`) &&
    !sharedComponentDirs.some((dir) => file.startsWith(`${dir}${path.sep}`)));

// The page's own files plus the components they render, followed through
// imports, so an edit to a page's content component dates that page.
const collectContentFiles = (pageDir, entryFiles) => {
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    for (const [, specifier] of readFileSync(file, "utf8").matchAll(
      importPattern
    )) {
      const resolved = resolveImport(specifier, file);
      if (resolved && isPageContent(resolved, pageDir)) {
        queue.push(resolved);
      }
    }
  }
  return [...seen];
};

const lastCommit = (files, shallowBoundary) => {
  const [hash, date] = git([
    "log",
    "-1",
    "--format=%H %cI",
    "--",
    ...files,
  ]).split(" ");
  return hash && date && !shallowBoundary.has(hash) ? date : null;
};

/** Source files that make up each marketing page's content, keyed by route. */
const readPageContentFiles = () => {
  if (!existsSync(marketingDir)) {
    return {};
  }
  const pages = [["/", marketingDir, [path.join(marketingDir, "page.tsx")]]];
  for (const entry of readdirSync(marketingDir, { withFileTypes: true })) {
    const pageDir = path.join(marketingDir, entry.name);
    const config = pageConfigFiles[entry.name];
    if (
      entry.isDirectory() &&
      (config || existsSync(path.join(pageDir, "page.tsx")))
    ) {
      pages.push([
        `/${entry.name}`,
        pageDir,
        config ? [...listFiles(pageDir), config] : listFiles(pageDir),
      ]);
    }
  }

  const contentFiles = {};
  for (const [route, pageDir, entryFiles] of pages) {
    contentFiles[route] = collectContentFiles(
      route === "/" ? path.join(marketingDir, "page.tsx") : pageDir,
      entryFiles
    );
  }
  return contentFiles;
};

/**
 * Last git commit date of each marketing page's content, keyed by route.
 * Pages without a trustworthy date are left out.
 */
const readPageLastModified = () => {
  const shallowBoundary = readShallowBoundary();
  const lastModified = {};
  for (const [route, files] of Object.entries(readPageContentFiles())) {
    const date = lastCommit(files, shallowBoundary);
    if (date) {
      lastModified[route] = date;
    }
  }
  return lastModified;
};

module.exports = { readPageContentFiles, readPageLastModified };
