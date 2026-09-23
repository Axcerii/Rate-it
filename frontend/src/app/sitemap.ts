import type { MetadataRoute } from 'next';
import { fetchPlaylistsApi } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rate-it.fr';
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/playlists`,
      lastModified,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/playlists/new`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cgu`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  try {
    const { validated } = await fetchPlaylistsApi({ revalidate: 3600 });
    const dynamicRoutes: MetadataRoute.Sitemap = validated.map((pl) => ({
      url: `${baseUrl}/playlists/${pl.id}`,
      lastModified: pl.created_at ? new Date(pl.created_at) : lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...dynamicRoutes];
  } catch (err) {
    console.warn('Could not generate dynamic sitemap entries for playlists:', err);
    return staticRoutes;
  }
}
