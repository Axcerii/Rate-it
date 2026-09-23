'use client';

import React from 'react';
import { Play } from 'lucide-react';

export interface PlaylistTrack {
  trackId?: string | number;
  id?: string | number;
  youtubeId: string;
  title: string;
  artistName?: string | null;
  malTitle?: string | null;
}

export interface PlaylistTrackCardProps {
  track: PlaylistTrack;
  index: number;
}

export default function PlaylistTrackCard({ track, index }: PlaylistTrackCardProps) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`${track.title} - ${track.artistName || 'Artiste inconnu'}${track.malTitle ? ` (${track.malTitle})` : ''} — Ouvrir sur YouTube`}
      className="group relative w-full aspect-[500/410] select-none text-left transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 block bg-transparent"
    >
      {/* 1. Miniature vidéo dans l'encadré central transparent de Film.png */}
      <div className="absolute left-[14%] right-[14%] top-[21%] bottom-[20.5%] overflow-hidden bg-black flex items-center justify-center">
        <img
          src={`https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`}
          alt={track.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('mqdefault')) {
              target.src = `https://img.youtube.com/vi/${track.youtubeId}/mqdefault.jpg`;
            }
          }}
        />

        {/* Numéro de la piste en badge vintage */}
        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[9px] font-black leading-none z-10 border border-white/20">
          #{index + 1}
        </span>

        {/* Bouton Play au survol de la miniature */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-white/95 border-2 border-black flex items-center justify-center transition-transform group-hover:scale-110">
            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Image du cadre de Film (Film.png avec perforations 35mm et bandes noires) */}
      <img
        src="/PLAYLIST/Film.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10 select-none"
      />

      {/* 3. Titre en blanc sur la bande noire du dessus */}
      <div className="absolute top-0 left-[14%] right-[14%] h-[21%] z-20 flex items-center justify-center px-1.5 text-center pointer-events-none">
        <h4
          className="text-white font-black text-[11px] sm:text-xs leading-tight truncate w-full group-hover:text-[#FEEC66] transition-colors tracking-tight"
          title={track.title}
        >
          {track.title}
        </h4>
      </div>

      {/* 4. Artiste en blanc sur la bande noire du dessous */}
      <div className="absolute bottom-0 left-[14%] right-[14%] h-[20.5%] z-20 flex items-center justify-center px-1.5 text-center pointer-events-none">
        <p
          className="text-white/90 font-bold text-[10px] sm:text-[11px] leading-tight truncate w-full"
          title={track.artistName || 'Artiste inconnu'}
        >
          {track.artistName || 'Artiste inconnu'}
        </p>
      </div>
    </a>
  );
}
