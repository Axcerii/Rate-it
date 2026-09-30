'use client';

import React from 'react';

interface PlaylistsButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}

export default function PlaylistsButton({
  onClick,
  disabled = false,
  className = '',
  loading = false,
}: PlaylistsButtonProps) {
  const ariaText = loading ? 'Chargement des playlists...' : 'Consulter les playlists';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaText}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      className={`group relative z-40 w-full cursor-pointer select-none text-left focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {/* Visually Hidden Text for Screen Readers */}
      <span className="sr-only">{ariaText}</span>

      {/* Main Card Container in Playlist Color (var(--bg-catalog)), strictly NO box shadow */}
      <div className="relative w-full aspect-[4/1.2] sm:aspect-[4/1] rounded-3xl bg-catalog border-4 border-black ring-0 ring-transparent transition-all duration-300 ease-out group-hover:scale-[1.02] group-focus:scale-[1.02] group-focus-visible:scale-[1.02] group-hover:ring-4 group-focus:ring-4 group-focus-visible:ring-4 group-hover:ring-catalog/60 group-focus:ring-catalog/60 group-focus-visible:ring-catalog/60 group-hover:brightness-105 group-focus:brightness-105 group-focus-visible:brightness-105 group-active:scale-[0.99] group-active:translate-x-0.5 group-active:translate-y-0.5 overflow-visible flex items-center justify-center">

        {/* Subtle inner gradient overlay */}
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/20 via-transparent to-black/15 pointer-events-none z-0 overflow-hidden" />

        {/* 1. LinkBG.png - Constellation / network lines background */}
        <img
          src="/PLAYLIST/LinkBG.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-[92%] h-auto mx-auto object-contain pointer-events-none z-5 opacity-40 transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* 3. Parchemin.png - Scroll in the center-top */}
        <img
          src="/PLAYLIST/Parchemin.png"
          alt=""
          aria-hidden="true"
          className="absolute left-[42%] top-[-25%] w-[22%] h-auto object-contain pointer-events-none z-51 transition-transform duration-300 ease-out origin-bottom group-hover:-translate-y-2.5 group-focus:-translate-y-2.5 group-hover:scale-108 group-focus:scale-108 group-hover:rotate-[5deg] group-focus:rotate-[5deg]"
        />

        {/* 2. Video.png - Video cards on the left */}
        <img
          src="/PLAYLIST/Video.png"
          alt=""
          aria-hidden="true"
          className="absolute left-[8%] top-[0%] w-[38%] h-auto object-contain pointer-events-none z-51 -rotate-[0deg] transition-transform duration-300 ease-out origin-bottom-left group-hover:-translate-x-1.5 group-focus:-translate-x-1.5 group-hover:-translate-y-2 group-focus:-translate-y-2 group-hover:-rotate-[6deg] group-focus:-rotate-[6deg] group-hover:scale-102 group-focus:scale-102"
        />


        {/* 4. disk.png - Vinyl disk on the right */}
        <img
          src="/PLAYLIST/disk.png"
          alt=""
          aria-hidden="true"
          className="absolute right-[10%] top-[-15%] w-[30%] h-auto object-contain pointer-events-none z-51 transition-transform duration-500 ease-out origin-center group-hover:rotate-[45deg] group-focus:rotate-[45deg] group-hover:scale-108 group-focus:scale-108 group-hover:-translate-y-1.5 group-focus:-translate-y-1.5"
        />

        {/* 5. PlaylistText.png - Front 'Playlists' logo */}
        <img
          src="/PLAYLIST/PlaylistText.png"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-[77%] -translate-x-1/2 -translate-y-1/2 z-60 w-[84%] sm:w-[72%] md:w-[65%] max-w-none h-auto object-contain pointer-events-none transition-transform duration-300 ease-out origin-center group-hover:scale-108 group-focus:scale-108 group-hover:-translate-y-[62%] group-focus:-translate-y-[62%]"
        />

        {/* Loading Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[20px] bg-black/40 backdrop-blur-xs">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}
      </div>
    </button>
  );
}
