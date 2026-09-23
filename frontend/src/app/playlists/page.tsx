import React from 'react';
import type { Metadata } from 'next';
import { fetchPlaylistsApi, PlaylistSummary } from '@/lib/api';
import PlaylistsClientView from '@/components/playlist/PlaylistsClientView';

// Revalidate playlists list every 60 seconds (Incremental Static Regeneration / SSR Cache)
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Playlists Musicales & Quiz Blind Test | Rate It',
  description:
    'Découvrez et notez les meilleures playlists musicales : génériques d\'animés, musiques de films, séries TV, K-Pop, J-Pop et jeux vidéo. Lancez une partie blind test ou créez votre propre playlist !',
  keywords: [
    'Playlists anime',
    'Blind test anime',
    'Quiz musical film',
    'Playlist blind test jeux vidéo',
    'Rate It playlists',
    'Créer playlist blind test',
    'Générique anime',
    'Notation musique multijoueur',
  ],
  alternates: {
    canonical: '/playlists',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/playlists',
    title: 'Playlists Musicales & Quiz Blind Test | Rate It',
    description:
      'Parcourez et jouez avec des dizaines de playlists d\'animés, films et jeux vidéo. Créez vos sélections et notez les musiques en direct !',
    images: [
      {
        url: '/LOGOS/RateItLogo.png',
        width: 1200,
        height: 630,
        alt: 'Playlists Rate It - Notation Musicale & Quiz',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Playlists Musicales & Blind Test | Rate It',
    description: 'Toutes les playlists pour vos blind tests musicaux animés, séries et jeux vidéo !',
    images: ['/LOGOS/RateItLogo.png'],
  },
};

export default async function PlaylistsPage() {
  let initialPlaylists: { validated: PlaylistSummary[]; community: PlaylistSummary[] } = {
    validated: [],
    community: [],
  };

  try {
    initialPlaylists = await fetchPlaylistsApi({ revalidate: 60 });
  } catch (error) {
    console.error('Erreur SSR lors du chargement des playlists:', error);
  }

  // Schema.org structured data for SEO (ItemList of playlists)
  const allPlaylists = [...initialPlaylists.validated, ...initialPlaylists.community];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Playlists Musicales Rate It',
    description: 'Liste des playlists de vote et blind test musical disponibles sur Rate It.',
    itemListElement: allPlaylists.slice(0, 20).map((pl, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'MusicPlaylist',
        name: pl.name,
        description: pl.description || `Playlist ${pl.name} contenant ${pl.video_count} titres`,
        numTracks: pl.video_count,
        url: `https://rate-it.fr/playlists/${pl.id}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PlaylistsClientView initialPlaylists={initialPlaylists} />
    </>
  );
}
