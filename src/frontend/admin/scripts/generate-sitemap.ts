/**
 * Generate sitemap.xml for SunnySeat
 * Run with: tsx scripts/generate-sitemap.ts
 */

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const SITE_URL = 'https://sunnyseat.com';

/**
 * Static routes that should be in sitemap
 */
const staticRoutes: SitemapUrl[] = [
  {
    loc: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    loc: '/about',
    changefreq: 'monthly',
    priority: 0.5,
  },
];

/**
 * Generate XML sitemap content
 */
function generateSitemap(urls: SitemapUrl[]): string {
  const lastmod = new Date().toISOString().split('T')[0];
  
  const urlElements = urls.map(url => {
    return `  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    <lastmod>${url.lastmod || lastmod}</lastmod>
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

/**
 * Fetch venue slugs from API to generate dynamic routes
 * In a real implementation, this would call the actual API
 */
async function fetchVenueSlugs(): Promise<string[]> {
  // TODO: Replace with actual API call when backend is ready
  // For now, return empty array - sitemap will only contain static routes
  // Example implementation:
  // const response = await fetch(`${API_URL}/api/venues`);
  // const venues = await response.json();
  // return venues.map(v => v.slug);
  
  console.log('⚠️  Warning: Venue API not configured. Generating sitemap with static routes only.');
  console.log('   To include venue pages, configure API_URL environment variable and implement fetchVenueSlugs().');
  
  return [];
}

/**
 * Main function to generate sitemap
 */
async function main() {
  try {
    console.log('🗺️  Generating sitemap.xml...');
    
    // Get dynamic venue routes
    const venueSlugs = await fetchVenueSlugs();
    const venueUrls: SitemapUrl[] = venueSlugs.map(slug => ({
      loc: `/v/${slug}`,
      changefreq: 'daily' as const,
      priority: 0.8,
    }));
    
    // Combine static and dynamic routes
    const allUrls = [...staticRoutes, ...venueUrls];
    
    // Generate XML
    const sitemap = generateSitemap(allUrls);
    
    // Write to public directory
    const publicDir = join(__dirname, '..', 'public');
    const sitemapPath = join(publicDir, 'sitemap.xml');
    
    await writeFile(sitemapPath, sitemap, 'utf-8');
    
    console.log(`✅ Sitemap generated successfully!`);
    console.log(`   Location: ${sitemapPath}`);
    console.log(`   URLs included: ${allUrls.length} (${staticRoutes.length} static, ${venueUrls.length} venues)`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

main();
