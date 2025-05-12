import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

// TODO: Replace with your actual domain
const baseUrl = 'https://tayloredinstruction.com';

// Directories/segments to exclude from the sitemap
const excludedSegments = [
  'api', // Exclude API routes
  '(auth)', // Example: Exclude routes in an auth group
  'opengraph-image', // Exclude opengraph image generation files
  'twitter-image', // Exclude twitter image generation files
  'icon', // Exclude icon generation files
  'apple-icon', // Exclude apple-icon generation files
  'sitemap', // Exclude the sitemap itself
  'robots', // Exclude robots.txt generation
];

// Function to recursively find page files
function getPagePaths(dir: string, baseDir: string = dir): string[] {
  let paths: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    // Skip excluded segments
    if (excludedSegments.some(segment => relativePath.includes(segment))) {
      continue;
    }

    if (entry.isDirectory()) {
      // Exclude directories that are route groups like (dashboard) or (marketing)
      // or internal Next.js folders like __DEFAULT__
      if (!entry.name.startsWith('(') && !entry.name.startsWith('_')) {
        paths = paths.concat(getPagePaths(fullPath, baseDir));
      } else if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        // Include pages within route groups, but don't include the group itself in the path
         paths = paths.concat(getPagePaths(fullPath, baseDir));
      }
    } else if (entry.isFile() && (entry.name.startsWith('page.tsx') || entry.name.startsWith('page.jsx') || entry.name.startsWith('page.ts') || entry.name.startsWith('page.js'))) {
      // Construct the URL path from the file path
      let routePath = path.dirname(relativePath).replace(/\\\\/g, '/'); // Normalize windows paths
      
      // Remove (group) segments from the path
      routePath = routePath
        .split('/')
        .filter(segment => !(segment.startsWith('(') && segment.endsWith(')')))
        .join('/');

      if (routePath === '.' || routePath === '') {
        routePath = '/';
      } else if (!routePath.startsWith('/')) {
        routePath = '/' + routePath;
      }
      
      // Avoid duplicate root path if already added
      if (routePath === '/' && paths.includes('/')) {
        continue;
      }
      paths.push(routePath);
    }
  }
  return paths;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const appDirPath = path.join(process.cwd(), 'app');
  const pageRoutes = getPagePaths(appDirPath);

  const sitemapEntries: MetadataRoute.Sitemap = pageRoutes.map((route) => ({
    url: `${baseUrl}${route === '/' ? '' : route}`, // Handle root path correctly
    lastModified: new Date(),
    changeFrequency: 'weekly', // Default, can be adjusted per route
    priority: route === '/' ? 1 : 0.8, // Higher priority for homepage
  }));

  // Ensure the root path is included if not already
  if (!sitemapEntries.some(entry => entry.url === baseUrl)) {
    sitemapEntries.unshift({
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 1,
    });
  }
  
  // Deduplicate entries just in case (e.g. if '/' was added manually and also found)
  const uniqueEntries = Array.from(new Set(sitemapEntries.map(e => e.url)))
    .map(url => {
      return sitemapEntries.find(e => e.url === url)!;
    });

  return uniqueEntries;
} 