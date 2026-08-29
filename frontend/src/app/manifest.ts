import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rate It - Jeu de Notation Musicale en Direct',
    short_name: 'Rate It',
    description: 'Notez et votez en direct sur les musiques et génériques d\'animés, de films et de séries entre amis !',
    start_url: '/',
    display: 'standalone',
    background_color: '#24B3F1',
    theme_color: '#24B3F1',
    icons: [
      {
        src: '/LOGOS/Favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/LOGOS/RateItLogo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
