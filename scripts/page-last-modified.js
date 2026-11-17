const { execFileSync } = require("node:child_process");
const { existsSync, readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const marketingDir = path.join("app", "(marketing)");

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

const lastCommit = (source, shallowBoundary) => {
  const [hash, date] = git([
    "log",
    "-1",
    "--format=%H %cI",
    "--",
    source,
  ]).split(" ");
  return hash && date && !shallowBoundary.has(hash) ? date : null;
};

/**
 * Last git commit date of each marketing page's source folder, keyed by route.
 * Pages without a trustworthy date are left out.
 */
const readPageLastModified = () => {
  if (!existsSync(marketingDir)) {
    return {};
  }
  const shallowBoundary = readShallowBoundary();
  const sources = [["/", path.join(marketingDir, "page.tsx")]];
  for (const entry of readdirSync(marketingDir, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      existsSync(path.join(marketingDir, entry.name, "page.tsx"))
    ) {
      sources.push([`/${entry.name}`, path.join(marketingDir, entry.name)]);
    }
  }

  const lastModified = {};
  for (const [route, source] of sources) {
    const date = lastCommit(source, shallowBoundary);
    if (date) {
      lastModified[route] = date;
    }
  }
  return lastModified;
};

module.exports = { readPageLastModified };
