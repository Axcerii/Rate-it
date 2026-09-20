'use client';

import React from 'react';
import {
  Play,
  Film,
  ListMusic,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import PlaylistTrackCard, { PlaylistTrack } from './PlaylistTrackCard';

export interface PlaylistData {
  id: string;
  name: string;
  description?: string;
  first_video_youtube_id?: string;
  played_count?: number;
  video_count?: number;
  categories?: string[];
}

export interface PlaylistCardProps {
  playlist: PlaylistData;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  tracks: PlaylistTrack[];
  isLoadingTracks: boolean;
  onHost: (id: string) => void;
  isStartingHost: boolean;
  visibleCount: number;
  onShowMoreTracks: (id: string) => void;
}

export default function PlaylistCard({
  playlist,
  isExpanded,
  onToggleExpand,
  tracks,
  isLoadingTracks,
  onHost,
  isStartingHost,
  visibleCount,
  onShowMoreTracks,
}: PlaylistCardProps) {
  const displayedTracks = tracks.slice(0, visibleCount);
  const remainingCount = tracks.length - visibleCount;

  return (
    <article className="bg-white border-4 border-black rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-transform hover:scale-[1.005] shadow-none">
      {/* Playlist Card Header / Main Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          {/* Thumbnail: 16:9 of 1st video */}
          <div className="relative w-28 sm:w-40 aspect-video rounded-xl border-2 border-black overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center">
            {playlist.first_video_youtube_id ? (
              <img
                src={`https://img.youtube.com/vi/${playlist.first_video_youtube_id}/mqdefault.jpg`}
                alt={playlist.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white/50 p-2">
                <ListMusic className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Text details */}
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-title text-base sm:text-lg font-black text-black leading-tight truncate max-w-full">
                {playlist.name}
              </h3>
            </div>

            {playlist.description && (
              <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-2">
                {playlist.description}
              </p>
            )}

            {/* Badges: Times Played, Video Count, Categories */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Times Played */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-black bg-[#FEEC66] font-black text-[10px] text-black uppercase">
                <Play className="w-2.5 h-2.5 fill-black" />
                <span>
                  {playlist.played_count || 0} partie{(playlist.played_count || 0) > 1 ? 's' : ''}
                </span>
              </span>

              {/* Video Count */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-black bg-slate-100 font-black text-[10px] text-black uppercase">
                <Film className="w-2.5 h-2.5" />
                <span>
                  {playlist.video_count || 0} vidéo{(playlist.video_count || 0) > 1 ? 's' : ''}
                </span>
              </span>

              {/* Categories */}
              {Array.isArray(playlist.categories) &&
                playlist.categories.map((cat: string) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 rounded-lg border border-black bg-rose-100 text-rose-950 font-black text-[10px] uppercase"
                  >
                    {cat}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Actions (HOST Button & Accordion Toggle) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* HOST Button using /HOST/HostText.png */}
          <button
            type="button"
            onClick={() => onHost(playlist.id)}
            disabled={isStartingHost}
            aria-label={`Lancer un host avec la playlist ${playlist.name}`}
            className="flex-1 sm:flex-none px-4 py-2 bg-[#009EE3] hover:bg-[#24B3F1] active:translate-x-0.5 active:translate-y-0.5 text-white border-3 border-black rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 shadow-none"
          >
            {isStartingHost ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Lancement...</span>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <img
                  src="/HOST/HostText.png"
                  alt="HOST"
                  className="h-5 sm:h-6 w-auto object-contain pointer-events-none"
                />
              </div>
            )}
          </button>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => onToggleExpand(playlist.id)}
            aria-expanded={isExpanded}
            className="px-3 py-2 bg-white hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 text-black border-2 border-black rounded-xl font-black text-xs uppercase flex items-center gap-1 transition-all shrink-0 shadow-none"
          >
            <span>{isExpanded ? 'Masquer' : 'Morceaux'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Accordion: Video List Dropdown */}
      {isExpanded && (
        <div className="border-t-2 border-black pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-600 px-1">
            <span>Pistes de la playlist ({tracks.length || playlist.video_count || 0})</span>
            {playlist.first_video_youtube_id && (
              <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                <span>⭐ Piste 1 = miniature</span>
              </span>
            )}
          </div>

          {isLoadingTracks ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs font-bold text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Chargement des vidéos...</span>
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-3 text-center">
              Aucune vidéo trouvée dans cette playlist.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {displayedTracks.map((track, idx) => (
                <PlaylistTrackCard
                  key={track.trackId || track.id || idx}
                  track={track}
                  index={idx}
                />
              ))}

              {remainingCount > 0 && (
                <button
                  type="button"
                  onClick={() => onShowMoreTracks(playlist.id)}
                  className="w-full py-2 mt-1 bg-slate-100 hover:bg-slate-200 active:translate-x-0.5 active:translate-y-0.5 text-black border-2 border-black rounded-xl font-black text-xs uppercase transition text-center shadow-none"
                >
                  + Afficher les morceaux suivants ({remainingCount} restants)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
