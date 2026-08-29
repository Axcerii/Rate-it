'use client';

import React from 'react';

interface HostButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}

export default function HostButton({
  onClick,
  disabled = false,
  className = '',
  loading = false,
}: HostButtonProps) {
  const ariaText = loading ? 'Création de la salle...' : 'Créer une salle de jeu';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaText}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      className={`group relative w-full cursor-pointer select-none text-left focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {/* Visually Hidden Text for Screen Readers */}
      <span className="sr-only">{ariaText}</span>

      {/* Background Rectangle with Purple Contouring (shown on hover and focus) */}
      <div className="relative w-full aspect-[1.5/1] rounded-3xl bg-[#009EE3] border-4 border-[#072648] shadow-none ring-0 ring-transparent transition-all duration-300 ease-out group-hover:scale-[1.02] group-focus:scale-[1.02] group-focus-visible:scale-[1.02] group-hover:shadow-[8px_8px_0px_0px_#6A0DAD] group-focus:shadow-[8px_8px_0px_0px_#6A0DAD] group-focus-visible:shadow-[8px_8px_0px_0px_#6A0DAD] group-hover:ring-6 group-focus:ring-6 group-focus-visible:ring-6 group-hover:ring-[#7A1FA2] group-focus:ring-[#7A1FA2] group-focus-visible:ring-[#7A1FA2] group-hover:bg-[#00A6EF] group-focus:bg-[#00A6EF] group-focus-visible:bg-[#00A6EF] group-active:scale-[0.99] group-active:translate-x-1 group-active:translate-y-1 overflow-visible">

        {/* Subtle inner halftone/gradient overlay on the rectangle */}
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />

        {/* 1. Vidéo_Logo.png (Bottom Left) - Decorative layer */}
        <img
          src="/HOST/Vid%C3%A9o_Logo.png"
          alt=""
          aria-hidden="true"
          className="absolute left-0 sm:left-[-2%] bottom-0 sm:bottom-[-2%] w-[59%] h-auto z-10 pointer-events-none transition-transform duration-300 ease-out origin-bottom-left -rotate-[4deg] group-hover:-translate-x-3 group-focus:-translate-x-3 group-focus-visible:-translate-x-3 group-hover:-translate-y-2 group-focus:-translate-y-2 group-focus-visible:-translate-y-2 group-hover:-rotate-[9deg] group-focus:-rotate-[9deg] group-focus-visible:-rotate-[9deg] group-hover:scale-105 group-focus:scale-105 group-focus-visible:scale-105"
        />

        {/* 2. Grade_Logo.png (Top Right) - Decorative layer */}
        <img
          src="/HOST/Grade_Logo.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 sm:right-[-2%] top-0 sm:top-[-2%] w-[42%] h-auto z-10 pointer-events-none transition-transform duration-300 ease-out origin-top-right rotate-[6deg] group-hover:translate-x-3 group-focus:translate-x-3 group-focus-visible:translate-x-3 group-hover:-translate-y-2 group-focus:-translate-y-2 group-focus-visible:-translate-y-2 group-hover:rotate-[12deg] group-focus:rotate-[12deg] group-focus-visible:rotate-[12deg] group-hover:scale-105 group-focus:scale-105 group-focus-visible:scale-105"
        />

        {/* 3. Luffy's Hat.png (Top Center / Overlap) - Decorative layer */}
        <img
          src="/HOST/Luffy's%20Hat.png"
          alt=""
          aria-hidden="true"
          className="absolute left-[14%] top-[-16%] w-[71%] h-auto z-20 pointer-events-none transition-transform duration-300 ease-out origin-center -rotate-[3deg] group-hover:-translate-y-4 group-focus:-translate-y-4 group-focus-visible:-translate-y-4 group-hover:-rotate-[6deg] group-focus:-rotate-[6deg] group-focus-visible:-rotate-[6deg] group-hover:scale-108 group-focus:scale-108 group-focus-visible:scale-108 group-hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] group-focus:drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] group-focus-visible:drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]"
        />

        {/* 4. HostText.png (Foreground Bottom Right) - Decorative layer */}
        <img
          src="/HOST/HostText.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 sm:right-[-1%] bottom-0 sm:bottom-[-5%] w-[64%] h-auto z-30 pointer-events-none transition-transform duration-300 ease-out origin-bottom-right group-hover:-translate-y-2 group-focus:-translate-y-2 group-focus-visible:-translate-y-2 group-hover:scale-110 group-focus:scale-110 group-focus-visible:scale-110 group-hover:drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)] group-focus:drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)] group-focus-visible:drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)]"
        />

        {/* Loading Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[20px] bg-black/40 backdrop-blur-xs">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}
      </div>
    </button>
  );
}
