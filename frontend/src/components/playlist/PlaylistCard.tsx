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
          Uniquement le blanc de l'étiquette avec un léger contour équilibré.
          - Le premier film est visible à gauche dans son cadre Film.png
          - Le titre et la description au centre
          - Les catégories et le nombre de vidéos
          - Indication Dérouler : sur mobile en haut à droite, sur desktop au centre au survol
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
          className="group relative w-full bg-white hover:bg-slate-50 border-[12px] sm:border-[24px] md:border-36 border-[#1b1b1b] rounded-xl sm:rounded-md p-3 sm:p-4 select-none cursor-pointer transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-3.5"
          title={`Dérouler la cassette ${playlist.name}`}
        >
          {/* Indication Dérouler : sur mobile en haut à droite pour ne jamais gêner le titre, sur desktop au centre en hover */}
          <span className="pointer-events-none absolute -top-3.5 right-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-20 inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 rounded-lg bg-play text-black font-black text-[11px] sm:text-[16px] rotate-2 sm:rotate-2 uppercase opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 shadow-none">
            <span>Dérouler</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
          </span>

          {/* Côté gauche : Premier film visible dès l'affichage des playlists + Titre/Description */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* Premier Film visible au format Film.png */}
            {firstTrack && (
              <div className="w-20 sm:w-28 md:w-32 aspect-[500/410] shrink-0 relative select-none -rotate-2 sm:-rotate-4 group-hover:rotate-0 transition-transform duration-200">
                <PlaylistTrackCard track={firstTrack} index={0} />
              </div>
            )}

            {/* Titre & Description inscrits sur le blanc de l'étiquette */}
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <h3
                className="font-title text-black font-black text-xs sm:text-base md:text-lg leading-tight line-clamp-2 sm:truncate tracking-tight"
                title={playlist.name}
              >
                {playlist.name}
              </h3>
              {playlist.description ? (
                <p
                  className="text-[11px] sm:text-sm font-bold text-slate-700 leading-tight mt-1 line-clamp-2"
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
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-100 sm:border-0">
            {/* Catégories */}
            <div className="flex flex-wrap sm:flex-col items-center gap-1">
              {Array.isArray(playlist.categories) &&
                playlist.categories.slice(0, 2).map((cat: string, catIdx: number) => {
                  const rotations = ['rotate-[-2deg]', 'rotate-[2deg]'];
                  const rot = rotations[catIdx % rotations.length];
                  return (
                    <span
                      key={cat}
                      className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-menu text-black font-black text-[9px] sm:text-xs uppercase ${rot} group-hover:rotate-0 transition-transform shadow-none truncate max-w-[120px] sm:max-w-none`}
                    >
                      {cat}
                    </span>
                  );
                })}
            </div>

            {/* Nombre de vidéos */}
            <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-[#FAF0CA] font-black text-[9px] sm:text-xs text-black uppercase rotate-[1deg] group-hover:rotate-0 transition-transform shadow-none shrink-0">
              <Film className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{playlist.video_count || 0} vidéos</span>
            </span>
          </div>
        </div>
      ) : (
        /* 2. ÉTAT DÉPLOYÉ (DÉROULÉ) :
            - DESKTOP (sm:block) : Conserve STRICTEMENT à 100% la DA Desktop actuelle (CassetteRecadrée.png, aspect-ratio, etc.).
            - MOBILE (sm:hidden) : Cassette Mixtape responsive ingénieuse, tactile et ergonomique.
        */
        <div
          className={`w-full flex flex-col select-none shadow-none origin-top ${isClosing ? 'animate-cassette-fold' : 'animate-cassette-unfold'
            }`}
        >
          {/* ========================================================================= */}
          {/* A. VERSION DESKTOP (sm:block) - STRICTEMENT INTROUVABLEMENT INTACTE       */}
          {/* ========================================================================= */}
          <div
            className="hidden sm:block relative w-full overflow-hidden select-none bg-[url('/PLAYLIST/CassetteRecadrée.png')] bg-cover"
            style={{ aspectRatio: '945 / 692' }}
          >
            {/* Bande blanche de Cassette.png (Titre, Description & Catégories) */}
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

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF0CA] font-black text-[9px] sm:text-[10px] text-black uppercase rotate-[1deg] shadow-none">
                  <Film className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{playlist.video_count || 0} vidéos</span>
                </span>
              </div>
            </div>

            {/* PARTIE COLORÉE VERTE DE CASSETTE.PNG */}
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

            {/* Bas de la cassette : Bouton "HOST" */}
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

          {/* ========================================================================= */}
          {/* B. VERSION MOBILE (< sm) - CASSETTE MIXTAPE INGÉNIEUSE & TACTILE          */}
          {/* ========================================================================= */}
          <div className="sm:hidden w-full flex flex-col bg-[#1b1b1b] border-4 border-[#111111] rounded-2xl shadow-2xl overflow-hidden relative select-none">
            {/* Détails du boîtier cassette (Vis d'angle et stries supérieures) */}
            <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[#555]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#333] border border-[#555] flex items-center justify-center text-[7px] font-mono leading-none select-none">
                +
              </span>
              <div className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-[#333] rounded-full" />
                <span className="w-6 h-0.5 bg-[#333] rounded-full" />
                <span className="w-4 h-0.5 bg-[#333] rounded-full" />
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#333] border border-[#555] flex items-center justify-center text-[7px] font-mono leading-none select-none">
                +
              </span>
            </div>

            {/* 1. ÉTIQUETTE BLANCHE MIXTAPE */}
            <div className="bg-[#FAF9F5] border border-black/20 rounded-xl p-3 mx-2 select-none flex flex-col gap-2 shadow-xs">
              {/* En-tête étiquette : Badge FACE A et bouton Replier */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono font-black text-[9px] text-slate-600 uppercase tracking-wider">
                  FACE A • MIXTAPE
                </span>
                <button
                  type="button"
                  onClick={handleCollapse}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-play hover:brightness-105 active:scale-95 text-black font-black text-[10px] uppercase shadow-none transition-all cursor-pointer"
                  title="Replier la cassette"
                >
                  <span>Replier</span>
                  <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {/* Titre & Description */}
              <div className="flex flex-col">
                <h3
                  className="font-title text-black font-black text-sm leading-tight break-words"
                  title={playlist.name}
                >
                  {playlist.name}
                </h3>
                {playlist.description ? (
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug mt-1 break-words">
                    {playlist.description}
                  </p>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 italic mt-0.5">Rate-it Mixtape</span>
                )}
              </div>

              {/* Catégories & Nombre de vidéos */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-1">
                  {Array.isArray(playlist.categories) &&
                    playlist.categories.slice(0, 2).map((cat: string) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded bg-menu text-black font-black text-[9px] uppercase truncate max-w-[120px]"
                      >
                        {cat}
                      </span>
                    ))}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF0CA] font-black text-[9px] text-black uppercase">
                  <Film className="w-2.5 h-2.5" />
                  <span>{playlist.video_count || 0} vidéos</span>
                </span>
              </div>
            </div>

            {/* 2. COMPARTIMENT VERT ET BOBINES DE LA CASSETTE */}
            <div className="bg-[#2fc355] border-2 border-black/30 rounded-xl mx-2 my-2 p-2 flex flex-col gap-2 relative shadow-inner overflow-hidden">
              {/* Bobines rotatives animées de la bande magnétique */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/45 backdrop-blur-xs rounded-lg border border-white/20 text-white">
                {/* Bobine gauche */}
                <div className="w-6 h-6 rounded-full border-2 border-black bg-white flex items-center justify-center animate-reel-spin shrink-0">
                  <div className="w-2 h-2 rounded-full bg-black flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-white" />
                  </div>
                </div>

                {/* Compteur de bande centrale */}
                <div className="flex flex-col items-center justify-center">
                  <span className="font-mono text-[8px] tracking-widest text-white/90 font-bold uppercase">
                    [ MORCEAUX • {tracks.length} TITRES ]
                  </span>
                </div>

                {/* Bobine droite */}
                <div className="w-6 h-6 rounded-full border-2 border-black bg-white flex items-center justify-center animate-reel-spin shrink-0">
                  <div className="w-2 h-2 rounded-full bg-black flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>

              {/* Affichage des pistes dans le boîtier vert */}
              {isLoadingTracks ? (
                <div className="flex items-center justify-center py-10 gap-2 text-xs font-black text-white">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Chargement des films de la cassette...</span>
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-xs font-black text-white/80">
                  Aucune vidéo trouvée dans cette playlist.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Grille 2 colonnes parfaitement dimensionnée pour mobile */}
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[300px] p-1 scrollbar-thin">
                    {displayedTracks.map((track, idx) => (
                      <div
                        key={track.trackId || track.id || idx}
                        className="w-full aspect-[500/410]"
                      >
                        <PlaylistTrackCard
                          track={track}
                          index={idx}
                        />
                      </div>
                    ))}
                  </div>

                  {remainingCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowMoreTracks(playlist.id);
                      }}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-black border-2 border-black rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-[0.98] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>
                        Afficher plus ({remainingCount} restant{remainingCount > 1 ? 's' : ''})
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. TÊTE DE LECTURE INFÉRIEURE ET BOUTON HOST DÉDIÉ */}
            <div className="mx-2 mb-2 p-2.5 bg-[#4a4c50] border-2 border-[#333] rounded-xl flex flex-col items-center justify-center gap-2">
              {/* Guides métalliques de tête de lecture */}
              <div className="flex items-center justify-center gap-4 pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-white/70 border border-black/40" />
                <div className="w-2 h-2 rounded-xs bg-white/50 border border-black/40" />
                <div className="w-3 h-3 rounded-full bg-white/80 border border-black/40" />
                <div className="w-2 h-2 rounded-xs bg-white/50 border border-black/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/70 border border-black/40" />
              </div>

              {/* Bouton HOST principal sans chevauchement */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onHost(playlist.id);
                }}
                disabled={isStartingHost}
                className="group relative flex items-center justify-center bg-transparent border-none cursor-pointer outline-none transition-transform duration-200 hover:scale-108 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed select-none focus:outline-none"
                title="Lancer une partie avec cette playlist (HOST)"
                aria-label="Lancer la partie (HOST)"
              >
                {isStartingHost ? (
                  <div className="flex items-center gap-2 bg-black/85 backdrop-blur-sm px-4 py-2 rounded-xl text-white font-black text-xs uppercase border border-white/20">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Lancement...</span>
                  </div>
                ) : (
                  <img
                    src="/HOST/HostText.png"
                    alt="HOST"
                    className="h-11 w-auto object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] pointer-events-none"
                  />
                )}
              </button>
            </div>

            {/* Vis inférieures du boîtier */}
            <div className="flex items-center justify-between px-3 pb-2 text-[#555]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#333] border border-[#555] flex items-center justify-center text-[7px] font-mono leading-none select-none">
                +
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#333] border border-[#555] flex items-center justify-center text-[7px] font-mono leading-none select-none">
                +
              </span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

