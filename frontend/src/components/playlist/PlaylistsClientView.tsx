'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import {
  ListMusic,
} from 'lucide-react';
import HomeButton from '@/components/HomeButton';
import { PlaylistCard, PlaylistFilters } from '@/components/playlist';
import { PlaylistSummary, PlaylistVideo, fetchPlaylistDetailsApi, fetchPlaylistsApi } from '@/lib/api';

const CATEGORIES = [
  'Anime/Manga',
  'Film/Cinéma',
  'Jeux Vidéo',
  'Série/TV',
  'Dessins Animés/Cartoons',
  'Streaming/VTuber',
  'Youtube',
] as const;

interface PlaylistsClientViewProps {
  initialPlaylists: {
    validated: PlaylistSummary[];
    community: PlaylistSummary[];
    categories?: string[];
  };
}

export default function PlaylistsClientView({ initialPlaylists }: PlaylistsClientViewProps) {
  const router = useRouter();
  const { createRoom, showBanner, categories, getPlaylistDetails } = useSocket();

  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [activeTab, setActiveTab] = useState<'validated' | 'community'>('validated');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side fallback fetch if initialPlaylists was empty (e.g., SSR network hiccup or cold boot)
  useEffect(() => {
    if (playlists.validated.length === 0 && playlists.community.length === 0) {
      fetchPlaylistsApi({ revalidate: false })
        .then((data) => {
          if (data && (data.validated.length > 0 || data.community.length > 0)) {
            setPlaylists({
              validated: data.validated,
              community: data.community,
              categories: data.categories,
            });
          }
        })
        .catch((err) => {
          console.warn('Client-side fallback fetch error:', err);
        });
    }
  }, []);

  // When categories update, remove deleted categories from local playlists state
  useEffect(() => {
    if (categories && categories.length > 0) {
      setPlaylists((prev) => ({
        ...prev,
        validated: prev.validated.map((p) => ({
          ...p,
          categories: Array.isArray(p.categories) ? p.categories.filter((c) => categories.includes(c)) : [],
        })),
        community: prev.community.map((p) => ({
          ...p,
          categories: Array.isArray(p.categories) ? p.categories.filter((c) => categories.includes(c)) : [],
        })),
      }));
    }
  }, [categories]);

  // Use dynamic categories from socket / initial props with fallback
  const allCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    if (initialPlaylists.categories && initialPlaylists.categories.length > 0) {
      return initialPlaylists.categories;
    }
    return Array.from(CATEGORIES);
  }, [categories, initialPlaylists.categories]);

  // If currently filtered category was deleted, reset filter to 'all'
  useEffect(() => {
    if (activeCategory !== 'all' && !allCategories.includes(activeCategory)) {
      setActiveCategory('all');
    }
  }, [allCategories, activeCategory]);

  // Expand / collapse tracks for playlists
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tracksCache, setTracksCache] = useState<{ [id: string]: PlaylistVideo[] }>({});
  const [loadingTracks, setLoadingTracks] = useState<{ [id: string]: boolean }>({});

  // Host launching state
  const [startingHostId, setStartingHostId] = useState<string | null>(null);

  // Progressive track rendering for instant accordion opening
  const [visibleTrackCounts, setVisibleTrackCounts] = useState<{ [id: string]: number }>({});

  // Toggle playlist accordion expand using cached REST API fetch
  const handleToggleExpand = async (playlistId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });

    // If tracks not cached yet, fetch them (HTTP with WebSocket fallback)
    if (!tracksCache[playlistId] && !loadingTracks[playlistId]) {
      setLoadingTracks((prev) => ({ ...prev, [playlistId]: true }));
      try {
        const details = await getPlaylistDetails(playlistId);
        setTracksCache((prev) => ({
          ...prev,
          [playlistId]: details.videos || [],
        }));
      } catch (err: any) {
        console.error('Failed to load tracks for playlist:', err);
        showBanner(err.message || 'Impossible de charger les morceaux de cette playlist', 'error');
      } finally {
        setLoadingTracks((prev) => ({ ...prev, [playlistId]: false }));
      }
    }
  };

  // Show more tracks progressively (50 tracks initially, 50 more on click)
  const handleShowMoreTracks = (playlistId: string) => {
    setVisibleTrackCounts((prev) => ({
      ...prev,
      [playlistId]: (prev[playlistId] || 50) + 50,
    }));
  };

  // Launch Host with pre-selected playlist
  const handleHostPlaylist = async (playlistId: string) => {
    setStartingHostId(playlistId);
    try {
      await createRoom();
      const allPlaylists = [...playlists.validated, ...playlists.community];
      const found = allPlaylists.find((p) => p.id === playlistId);
      const nameParam = found?.name ? `&playlistName=${encodeURIComponent(found.name)}` : '';
      router.push(`/host?playlistId=${playlistId}${nameParam}`);
    } catch (err: any) {
      console.error('Failed to launch room for playlist:', err);
      showBanner(err.message || 'Erreur lors du lancement de la salle', 'error');
      setStartingHostId(null);
    }
  };

  // Filter and sort playlists
  const displayedPlaylists = useMemo(() => {
    const list = activeTab === 'validated' ? playlists.validated : playlists.community;

    return list
      .filter((pl) => {
        // Filter by category
        if (activeCategory !== 'all') {
          if (!pl.categories || !Array.isArray(pl.categories) || !pl.categories.includes(activeCategory)) {
            return false;
          }
        }
        // Filter by text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = pl.name && pl.name.toLowerCase().includes(q);
          const matchDesc = pl.description && pl.description.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => (b.played_count || 0) - (a.played_count || 0));
  }, [playlists, activeTab, activeCategory, searchQuery]);

  return (
    <div className="relative flex flex-col flex-1 items-center bg-transparent px-3 sm:px-6 py-4 sm:py-8 font-sans w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl z-10 flex flex-col gap-6">
        {/* Top Header Navigation */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 pb-2 w-full">
          {/* Home Link / Logo Button */}
          <div className="flex justify-start items-center">
            <HomeButton sizeClassName="h-9 sm:h-14 md:h-18 lg:h-20" />
          </div>

          {/* Central Logo / Title */}
          <div className="flex justify-center items-center">
            <img
              src="/PLAYLIST/PlaylistText.png"
              alt="Playlists"
              className="h-12 sm:h-24 md:h-32 lg:h-36 object-contain pointer-events-none select-none"
            />
          </div>

          {/* Create New Playlist Shortcut */}
          <div className="flex justify-end items-center">
            <button
              type="button"
              onClick={() => router.push('/playlists/new')}
              className="group relative flex items-center justify-center bg-transparent border-none cursor-pointer outline-none transition-transform duration-200 hover:scale-108 active:scale-95 select-none focus:outline-none"
              title="Créer une playlist"
              aria-label="Créer une playlist"
            >
              <img
                src="/PLAYLIST/Créer.png"
                alt="Créer une playlist"
                className="h-9 sm:h-14 md:h-18 lg:h-20 w-auto object-contain pointer-events-none"
              />
            </button>
          </div>
        </header>

        {/* Layout Container: Desktop Sidebar + Main Content Column */}
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
          {/* Sidebar Filters (Desktop Sticky Sidebar & Mobile Controls) */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-6 z-40 lg:z-20">
            <PlaylistFilters
              categories={allCategories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              validatedCount={playlists.validated.length}
              communityCount={playlists.community.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </aside>

          {/* Main Playlists List Column */}
          <main className="flex-1 min-w-0 w-full flex flex-col gap-4">

            {/* Playlists List */}
            {displayedPlaylists.length === 0 ? (
              <div className="p-8 sm:p-12 info-card rounded-2xl text-center flex flex-col items-center justify-center gap-4 shadow-none">
                <h3 className="font-title text-xl font-black text-black">Aucune playlist trouvée</h3>
                <p className="text-xs font-bold text-slate-700 max-w-md">
                  {activeCategory !== 'all'
                    ? `Aucune playlist disponible dans la catégorie "${activeCategory}".`
                    : searchQuery
                    ? 'Aucune playlist ne correspond aux filtres sélectionnés.'
                    : 'Aucune playlist disponible pour le moment.'}
                </p>

                {/* Bouton Créer quand aucune playlist n'est trouvée dans une catégorie */}
                {activeCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/playlists/new?category=${encodeURIComponent(activeCategory)}`
                      )
                    }
                    className="group relative flex items-center justify-center bg-transparent border-none cursor-pointer outline-none transition-transform duration-200 hover:scale-108 active:scale-95 select-none focus:outline-none my-1"
                    title={`Créer une playlist dans la catégorie ${activeCategory}`}
                    aria-label="Créer une playlist"
                  >
                    <img
                      src="/PLAYLIST/Créer.png"
                      alt="Créer"
                      className="h-11 sm:h-14 md:h-16 w-auto object-contain pointer-events-none"
                    />
                  </button>
                )}

                {(searchQuery || activeCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="mt-1 px-4 py-2 bg-accent-red text-white border-2 border-black rounded-lg font-black text-xs uppercase transition hover:rotate-2 hover:scale-105 shadow-none"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full">
                {displayedPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    isExpanded={expandedIds.has(playlist.id)}
                    onToggleExpand={handleToggleExpand}
                    tracks={tracksCache[playlist.id] || []}
                    isLoadingTracks={Boolean(loadingTracks[playlist.id])}
                    onHost={handleHostPlaylist}
                    isStartingHost={startingHostId === playlist.id}
                    visibleCount={visibleTrackCounts[playlist.id] || 50}
                    onShowMoreTracks={handleShowMoreTracks}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
