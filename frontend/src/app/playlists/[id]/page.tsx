import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPlaylistDetailsApi } from '@/lib/api';
import PlaylistDetailActions from '@/components/playlist/PlaylistDetailActions';
import { ChevronLeft, Music2, CheckCircle2, User, Layers, Calendar, ExternalLink } from 'lucide-react';

export const revalidate = 300; // 5 minutes ISR cache

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { playlist, videos } = await fetchPlaylistDetailsApi(id, { revalidate: 300 });
    const firstYt = videos[0]?.youtubeId;
    const ogImage = firstYt
      ? `https://img.youtube.com/vi/${firstYt}/hqdefault.jpg`
      : '/LOGOS/RateItLogo.png';

    const trackPreview = videos.slice(0, 3).map((v) => v.title).join(', ');
    const desc = playlist.description
      ? `${playlist.description} (${videos.length} titres : ${trackPreview}...)`
      : `Playlist musicale "${playlist.name}" avec ${videos.length} titres (${trackPreview}...). Jouez et notez en direct sur Rate It !`;

    return {
      title: `${playlist.name} - Playlist Blind Test (${videos.length} titres) | Rate It`,
      description: desc,
      alternates: {
        canonical: `/playlists/${id}`,
      },
      openGraph: {
        type: 'music.playlist',
        locale: 'fr_FR',
        url: `/playlists/${id}`,
        title: `${playlist.name} - Playlist Blind Test | Rate It`,
        description: desc,
        images: [
          {
            url: ogImage,
            width: 480,
            height: 360,
            alt: playlist.name,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${playlist.name} | Rate It`,
        description: desc,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: 'Playlist introuvable | Rate It',
      description: 'Cette playlist est introuvable ou a été supprimée.',
    };
  }
}

export default async function PlaylistDetailPage({ params }: PageProps) {
  const { id } = await params;

  let playlistData;
  try {
    playlistData = await fetchPlaylistDetailsApi(id, { revalidate: 300 });
  } catch {
    notFound();
  }

  const { playlist, videos } = playlistData;

  // Schema.org structured data for SEO (MusicPlaylist with individual tracks)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    name: playlist.name,
    description: playlist.description || `Playlist ${playlist.name}`,
    numTracks: videos.length,
    url: `https://rate-it.fr/playlists/${playlist.id}`,
    track: videos.map((v, index) => ({
      '@type': 'MusicRecording',
      name: v.title,
      byArtist: {
        '@type': 'MusicGroup',
        name: v.artistName || 'Artiste inconnu',
      },
      position: index + 1,
      url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
    })),
  };

  const formattedDate = playlist.created_at
    ? new Date(playlist.created_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="relative flex flex-col flex-1 items-center bg-transparent px-3 sm:px-6 py-4 sm:py-8 font-sans w-full max-w-full overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="w-full max-w-5xl z-10 flex flex-col gap-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Toutes les playlists</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-100 shadow-none"
          >
            <span>Accueil</span>
          </Link>
        </div>

        {/* Hero Banner Header of the Playlist */}
        <div className="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-none">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-2xl">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {playlist.is_validated ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 text-black border-2 border-black rounded-full text-xs font-black uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Officielle & Validée
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-200 text-purple-900 border-2 border-black rounded-full text-xs font-black uppercase">
                    <User className="w-3.5 h-3.5" />
                    Communautaire
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-black border-2 border-black rounded-full text-xs font-black">
                  <Layers className="w-3.5 h-3.5" />
                  {videos.length} morceau{videos.length > 1 ? 'x' : ''}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold">
                  ID : {playlist.id}
                </span>
              </div>

              {/* Title & Description */}
              <h1 className="font-title text-2xl sm:text-4xl font-black text-black leading-tight">
                {playlist.name}
              </h1>

              {playlist.description && (
                <p className="text-sm sm:text-base font-medium text-slate-700 whitespace-pre-line leading-relaxed">
                  {playlist.description}
                </p>
              )}

              {/* Categories */}
              {Array.isArray(playlist.categories) && playlist.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {playlist.categories.map((cat: string) => (
                    <span
                      key={cat}
                      className="px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-700"
                    >
                      #{cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta Date */}
              {formattedDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold pt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Créée le {formattedDate}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
              <PlaylistDetailActions playlistId={playlist.id} isValidated={playlist.is_validated} />
            </div>
          </div>
        </div>

        {/* Tracklist Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-title text-xl font-black text-black uppercase flex items-center gap-2">
              <Music2 className="w-5 h-5 text-[#BF1539]" />
              <span>Liste des pistes ({videos.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {videos.map((track, idx) => (
              <div
                key={track.id || idx}
                className="flex items-center justify-between gap-3 bg-white border-2 border-black rounded-2xl p-3 sm:p-4 hover:border-[#BF1539] transition-colors shadow-none"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* Track number */}
                  <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-black text-slate-400 font-mono">
                    #{idx + 1}
                  </span>

                  {/* YouTube Thumbnail */}
                  <div className="w-14 h-10 sm:w-16 sm:h-12 bg-black rounded-xl overflow-hidden shrink-0 border border-black relative">
                    <img
                      src={`https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Title & Artist & Tags */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className="font-black text-xs sm:text-sm text-black truncate leading-tight">
                      {track.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">
                      {track.artistName || 'Artiste inconnu'}
                    </p>
                    {track.malTitle && (
                      <span className="text-[10px] font-bold text-blue-600 truncate">
                        Anime : {track.malTitle}
                      </span>
                    )}
                  </div>
                </div>

                {/* External YouTube link */}
                <a
                  href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-colors"
                  title="Ouvrir sur YouTube"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
