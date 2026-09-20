'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

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
  const isCover = index === 0;

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-xl border border-black gap-2.5 transition-colors ${
        isCover ? 'bg-amber-50/80' : 'bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Track Order Number */}
        <span className="font-mono font-black text-xs w-6 text-center shrink-0 text-slate-500">
          #{index + 1}
        </span>

        {/* Video Thumbnail (ultra-lightweight default.jpg, lazy loaded) */}
        <div className="w-14 aspect-video rounded border border-black overflow-hidden bg-black shrink-0 relative">
          <img
            src={`https://img.youtube.com/vi/${track.youtubeId}/default.jpg`}
            alt={track.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Video Details */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-xs text-black truncate leading-tight">
              {track.title}
            </p>
            {isCover && (
              <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded border border-black shrink-0">
                Cover
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-600 truncate mt-0.5">
            par {track.artistName || 'Artiste inconnu'}
            {track.malTitle ? ` • ${track.malTitle}` : ''}
          </p>
        </div>
      </div>

      {/* YouTube Direct Link */}
      <a
        href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 bg-white hover:bg-slate-100 text-black border border-black rounded-lg transition shrink-0"
        title="Regarder sur YouTube"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
