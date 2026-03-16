import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sunnyseat.se';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic venue pages — replace with Supabase query when venues are in DB
  const venues = [
    'cafe-magasinet',
    'haga-kaffebar',
    'linne-terrassen',
    'majorna-sol',
    'vasagatan-uteservering',
  ];
  const venuePages: MetadataRoute.Sitemap = venues.map((slug) => ({
    url: `${baseUrl}/v/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticPages, ...venuePages];
}
