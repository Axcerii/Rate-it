'use client';

import React from 'react';
import { ExternalLink, Play } from 'lucide-react';

export interface PlaylistTrack {
  trackId?: string | number;
  id?: string | number;
  youtubeId: string;
  title: string;
  artistName?: string;
  malTitle?: string;
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
      title={`Ouvrir "${track.title}" sur YouTube`}
      className="group relative flex flex-col p-2 bg-white hover:bg-slate-50 border-2 border-black rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[3px_3px_0px_#000] active:translate-y-0 active:shadow-none select-none text-left overflow-hidden"
    >
      {/* 1. Video Thumbnail (Top) */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-black bg-black shrink-0">
        <img
          src={`https://img.youtube.com/vi/${track.youtubeId}/mqdefault.jpg`}
          alt={track.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Track Order Number Badge */}
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-white font-mono text-[10px] font-black leading-none backdrop-blur-xs">
          #{index + 1}
        </span>

        {/* Floating Tooltip / Badge "Ouvrir" on Hover */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black text-white text-[9px] font-black uppercase shadow-sm pointer-events-none z-10">
          <ExternalLink className="w-2.5 h-2.5 text-white" />
          <span>Ouvrir</span>
        </div>

        {/* Play Icon Overlay in center on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-white/90 border border-black flex items-center justify-center shadow-sm">
            <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Nom (Title) & 3. Artiste (Stacked Vertically) */}
      <div className="flex flex-col mt-2 min-w-0 flex-1">
        <h4
          className="font-black text-xs text-black line-clamp-2 leading-tight group-hover:text-[#BF1539] transition-colors"
          title={track.title}
        >
          {track.title}
        </h4>
        <p className="text-[10px] font-bold text-slate-600 truncate mt-1">
          {track.artistName || 'Artiste inconnu'}
        </p>
        {track.malTitle && (
          <p className="text-[9px] font-semibold text-slate-400 truncate mt-0.5">
            {track.malTitle}
          </p>
        )}
      </div>
    </a>
  );
}
