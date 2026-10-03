import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Créer une Playlist Musicale Blind Test',
  description:
    'Créez votre propre playlist personnalisée pour vos quiz et blind tests : importez des vidéos YouTube, des listes MyAnimeList ou AniList, et jouez avec vos amis sur Rate It !',
  alternates: {
    canonical: '/playlists/new',
  },
  openGraph: {
    title: 'Créer une Playlist Musicale Blind Test | Rate It',
    description:
      'Créez votre propre playlist personnalisée pour vos quiz et blind tests sur Rate It !',
    url: '/playlists/new',
  },
};

export default function NewPlaylistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
