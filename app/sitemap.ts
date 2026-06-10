import type { MetadataRoute } from 'next';
import { TEAMS, SEASONS } from '@/lib/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,       lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/teams`,  lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/season`, lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
  ];

  const teamPages: MetadataRoute.Sitemap = TEAMS.map(t => ({
    url: `${SITE_URL}/team/${t.id}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const seasonPages: MetadataRoute.Sitemap = SEASONS.map(s => ({
    url: `${SITE_URL}/season?season=${s}`,
    lastModified: now,
    changeFrequency: s === SEASONS[0] ? ('daily' as const) : ('yearly' as const),
    priority: s === SEASONS[0] ? 0.9 : 0.5,
  }));

  return [...staticPages, ...teamPages, ...seasonPages];
}
