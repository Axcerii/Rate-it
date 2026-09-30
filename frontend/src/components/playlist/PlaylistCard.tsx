'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Film,
  Loader2,
  Plus,
} from 'lucide-react';
import PlaylistTrackCard, { PlaylistTrack } from './PlaylistTrackCard';

export interface PlaylistData {
  id: string;
  name: string;
  description?: string | null;
  first_video_youtube_id?: string | null;
  first_video_title?: string | null;
  first_video_artist_name?: string | null;
  first_video_mal_title?: string | null;
  played_count?: number;
  video_count?: number;
  categories?: string[];
  is_custom?: boolean;
  is_validated?: boolean;
  created_at?: string;
  last_played?: string | null;
  secretCode?: string;
}

export interface PlaylistCardProps {
  playlist: PlaylistData;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  tracks: PlaylistTrack[];
  isLoadingTracks: boolean;
  onHost: (id: string) => void;
  isStartingHost: boolean;
  visibleCount?: number;
  onShowMoreTracks: (id: string) => void;
}

export default function PlaylistCard({
  playlist,
  isExpanded,
  onToggleExpand,
  tracks,
  isLoadingTracks,
  onHost,
  isStartingHost = false,
  visibleCount = 50,
  onShowMoreTracks,
}: PlaylistCardProps) {
  const displayedTracks = tracks.slice(0, visibleCount);
  const remainingCount = tracks.length - visibleCount;

  // État local pour gérer l'animation de repliement fluide avant démontage
  const [isClosing, setIsClosing] = useState(false);

  // Recadrage fluide du scroll au niveau de la cassette qui vient de s'ouvrir
  const articleRef = useRef<HTMLElement>(null);
  const wasExpandedRef = useRef(isExpanded);

  useEffect(() => {
    if (!wasExpandedRef.current && isExpanded) {
      const timer = setTimeout(() => {
        if (articleRef.current) {
          const rect = articleRef.current.getBoundingClientRect();
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          // Recadre smoothly avec une marge agréable de 28px au-dessus
          const targetY = Math.max(0, rect.top + scrollTop - 28);
          window.scrollTo({
            top: targetY,
            behavior: 'smooth',
          });
        }
      }, 70);
      return () => clearTimeout(timer);
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const handleCollapse = () => {
    setIsClosing(true);
    setTimeout(() => {
      onToggleExpand(playlist.id);
      setIsClosing(false);
    }, 220);
  };

  // Données de la première piste pour affichage dès le chargement des playlists
  const firstTrack: PlaylistTrack | null = playlist.first_video_youtube_id
    ? {
      youtubeId: playlist.first_video_youtube_id,
      title: tracks[0]?.title || playlist.first_video_title || 'Titre inconnu',
      artistName: tracks[0]?.artistName || playlist.first_video_artist_name || 'Artiste inconnu',
      malTitle: tracks[0]?.malTitle || playlist.first_video_mal_title,
    }
    : null;

  return (
    <article ref={articleRef} className="w-full flex flex-col shadow-none">
      {/* 1. ÉTAT NON DÉPLOYÉ (AVANT LE DÉROULÉ) :
          Uniquement le blanc de l'étiquette avec un léger contour équilibré (border-2 border-black).
          - Le premier film est visible à gauche dans son cadre Film.png
          - Le titre et la description au centre
          - Les catégories (style étiquettes jaune cassé) et le nombre de vidéos sur le côté blanc à droite
          - L'indication Dérouler en absolute au sommet pour libérer un maximum d'espace
      */}
      {!isExpanded ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleExpand(playlist.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand(playlist.id);
            }
          }}
          className="group relative w-full bg-white hover:bg-slate-50 border-36 border-[#1b1b1b] rounded-md sm:p-4 select-none cursor-pointer transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
          title={`Dérouler la cassette ${playlist.name}`}
        >
          {/* Indication Dérouler en absolute en haut */}
          <span className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 px-3 py-0.5 rounded-lg bg-play text-black font-black text-[12px] sm:text-[16px] rotate-2 uppercase opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 shadow-none">
            <span>Dérouler</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
          </span>

          {/* Côté gauche : Premier film visible dès l'affichage des playlists + Titre/Description */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Premier Film visible au format Film.png */}
            {firstTrack && (
              <div className="w-24 sm:w-28 md:w-32 aspect-[500/410] shrink-0 relative select-none -rotate-4 group-hover:rotate-0 transition-transform duration-200">
                <PlaylistTrackCard track={firstTrack} index={0} />
              </div>
            )}

            {/* Titre & Description inscrits sur le blanc de l'étiquette */}
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <h3
                className="font-title text-black font-black text-sm sm:text-base md:text-lg leading-tight truncate tracking-tight"
                title={playlist.name}
              >
                {playlist.name}
              </h3>
              {playlist.description ? (
                <p
                  className="text-xs sm:text-sm font-bold text-slate-700 leading-tight mt-1"
                  title={playlist.description}
                >
                  {playlist.description}
                </p>
              ) : (
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 italic mt-0.5">Rate-it Mixtape</span>
              )}
            </div>
          </div>

          {/* Côté droit sur le blanc : Catégories style étiquettes jaune cassé & nombre de vidéos */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Catégories */}
            <div className="flex flex-col items-center gap-1">
              {Array.isArray(playlist.categories) &&
                playlist.categories.slice(0, 3).map((cat: string, catIdx: number) => {
                  const rotations = ['rotate-[-2deg]', 'rotate-[2deg]', 'rotate-[-2deg]'];
                  const rot = rotations[catIdx % rotations.length];
                  return (
                    <span
                      key={cat}
                      className={`px-2.5 py-1 rounded-lg bg-menu text-black font-black text-[10px] sm:text-xs uppercase ${rot} group-hover:rotate-0 transition-transform shadow-none`}
                    >
                      {cat}
                    </span>
                  );
                })}
            </div>

            {/* Nombre de vidéos */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF0CA] font-black text-[10px] sm:text-xs text-black uppercase rotate-[1deg] group-hover:rotate-0 transition-transform shadow-none">
              <Film className="w-3 h-3" />
              <span>{playlist.video_count || 0} vidéos</span>
            </span>
          </div>
        </div>
      ) : (
        /* 2. ÉTAT DÉPLOYÉ (DÉROULÉ) :
            Utilise CassetteRecadrée.png.
            - Aucun rounded ajouté au conteneur (l'image possède le bon rounded d'origine).
            - Aucun bg-black (évite toute bande noire sur le côté droit).
            - Conteneur des films remonté avec un blur translucide doux.
            - Animation propre de déroulement / repliement de la cassette.
        */
        <div
          className={`w-full flex flex-col select-none shadow-none origin-top ${isClosing ? 'animate-cassette-fold' : 'animate-cassette-unfold'
            }`}
        >
          {/* Conteneur de la cassette sans border ni rounded parasites */}
          <div
            className="relative w-full overflow-hidden select-none bg-[url('/PLAYLIST/CassetteRecadrée.png')] bg-cover"
            style={{ aspectRatio: '945 / 692' }}
          >
            {/* A. Bande blanche de Cassette.png (Titre, Description & Catégories) */}
            <div
              onClick={handleCollapse}
              className="z-20 my-[7%] px-[8%] flex items-center justify-between cursor-pointer overflow-hidden"
              title="Cliquer pour replier la cassette"
            >
              {/* Titre & Description */}
              <div className="flex flex-col justify-center min-w-0 flex-1 pr-3">
                <h3
                  className="font-title text-black font-black text-xs sm:text-base md:text-lg lg:text-xl leading-tight truncate tracking-tight"
                  title={playlist.name}
                >
                  {playlist.name}
                </h3>
                {playlist.description ? (
                  <p
                    className="text-[10px] sm:text-xs font-bold text-slate-800 leading-tight mt-0.5"
                    title={playlist.description}
                  >
                    {playlist.description}
                  </p>
                ) : (
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 italic">Rate-it Mixtape</span>
                )}
              </div>

              {/* Catégories et nombre de vidéos sur la bande blanche */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Catégories sur la bande blanche */}
                <div className="flex items-center gap-1.5 shrink-0 flex-col">
                  {Array.isArray(playlist.categories) &&
                    playlist.categories.slice(0, 2).map((cat: string, catIdx: number) => {
                      const rotations = ['rotate-[-1.5deg]', 'rotate-[1.5deg]'];
                      const rot = rotations[catIdx % rotations.length];
                      return (
                        <span
                          key={cat}
                          className={`px-2 py-0.5 rounded-lg bg-menu text-black font-black text-[9px] sm:text-[10px] uppercase ${rot} shadow-none truncate max-w-[110px]`}
                        >
                          {cat}
                        </span>
                      );
                    })}
                </div>

                {/* Nombre de vidéos */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF0CA] font-black text-[9px] sm:text-[10px] text-black uppercase rotate-[1deg] shadow-none">
                  <Film className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{playlist.video_count || 0} vidéos</span>
                </span>
              </div>
            </div>

            {/* B. PARTIE COLORÉE VERTE DE CASSETTE.PNG :
                - Zone blur parfaitement centrée sur la zone verte (left: 11%, right: 11%, top: 24.5%, bottom: 24.5%)
                - Les films commencent en haut à droite du conteneur (items-start justify-end)
            */}
            <div
              className="z-20 w-4/5 h-3/5 m-auto flex flex-col overflow-hidden backdrop-blur-md bg-black/20 border border-white/25 rounded-2xl sm:p-3.5 shadow-none"
            >
              {isLoadingTracks ? (
                <div className="flex items-center justify-center flex-1 gap-2 text-xs sm:text-sm font-black text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span>Chargement des films de la cassette...</span>
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex items-center justify-center flex-1 text-xs sm:text-sm font-black text-white/80">
                  Aucune vidéo trouvée dans cette playlist.
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3 p-1.5 overflow-y-auto scrollbar-thin h-full w-full">
                  {displayedTracks.map((track, idx) => (
                    <div
                      key={track.trackId || track.id || idx}
                      className="w-[28%] sm:w-[22%] md:w-[18%] min-w-[120px] max-w-[175px] aspect-[500/410] shrink-0"
                    >
                      <PlaylistTrackCard
                        track={track}
                        index={idx}
                      />
                    </div>
                  ))}

                  {remainingCount > 0 && (
                    <div className="w-full pt-2 pb-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowMoreTracks(playlist.id);
                        }}
                        className="w-full py-2.5 sm:py-3 px-4 bg-white hover:bg-slate-100 text-black border-2 border-black rounded-xl font-black text-xs sm:text-sm uppercase flex items-center justify-center gap-2 cursor-pointer shadow-none active:scale-[0.99] transition-all"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>
                          Afficher plus de morceaux ({remainingCount} restant{remainingCount > 1 ? 's' : ''})
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* C. Bas de la cassette : Bouton "HOST" centré sans fond avec agrandissement à l'hover */}
            <div
              className="absolute z-20 flex items-center justify-center pointer-events-auto"
              style={{
                bottom: '2.5%',
                left: '0',
                right: '0',
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onHost(playlist.id);
                }}
                disabled={isStartingHost}
                className="group relative flex items-center justify-center bg-transparent border-none cursor-pointer outline-none transition-transform duration-200 hover:scale-115 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed select-none focus:outline-none"
                title="Lancer une partie avec cette playlist (HOST)"
                aria-label="Lancer la partie (HOST)"
              >
                {isStartingHost ? (
                  <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm px-4 py-1.5 rounded-xl text-white font-black text-xs uppercase border border-white/20">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Lancement...</span>
                  </div>
                ) : (
                  <img
                    src="/HOST/HostText.png"
                    alt="HOST"
                    className="h-10 sm:h-14 md:h-20 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] pointer-events-none"
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

