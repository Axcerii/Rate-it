'use client';

import React from 'react';

interface CreatePlaylistButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}

export default function CreatePlaylistButton({
  onClick,
  disabled = false,
  className = '',
  loading = false,
}: CreatePlaylistButtonProps) {
  const ariaText = loading ? 'Création de la playlist...' : 'Créer une playlist';

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

      {/* Main Card Container: Uses --bg-create (#2fc355) variable, strictly NO box-shadow */}
      <div className="relative w-full aspect-[4/1.2] sm:aspect-[4/1] rounded-3xl bg-[var(--bg-create,#2fc355)] border-4 border-[#0a631e] shadow-none ring-0 ring-transparent transition-all duration-300 ease-out group-hover:scale-[1.02] group-focus:scale-[1.02] group-focus-visible:scale-[1.02] group-hover:ring-4 group-focus:ring-4 group-focus-visible:ring-4 group-hover:ring-[var(--bg-create,#2fc355)]/60 group-focus:ring-[var(--bg-create,#2fc355)]/60 group-focus-visible:ring-[var(--bg-create,#2fc355)]/60 group-hover:bg-[#34d15d] group-focus:bg-[#34d15d] group-focus-visible:bg-[#34d15d] group-active:scale-[0.99] group-active:translate-x-0.5 group-active:translate-y-0.5 overflow-visible flex items-center justify-center">

        {/* Subtle inner halftone / gradient overlay */}
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/25 via-transparent to-black/15 pointer-events-none z-0 overflow-hidden" />

        {/* 1. Background Graphic Layer (CréerBackground.png) - Pops out top & sides */}
        <img
          src="/CREATE/Cr%C3%A9erBackground.png"
          alt=""
          aria-hidden="true"
          className="absolute -top-[12%] -bottom-[12%] w-full sm:w-[104%] h-[124%] max-w-full sm:max-w-none object-contain pointer-events-none z-10 transition-transform duration-300 ease-out group-hover:scale-105 group-focus:scale-105 group-focus-visible:scale-105 group-hover:-translate-y-1 group-focus:-translate-y-1 group-focus-visible:-translate-y-1"
        />

        {/* 2. Text Graphic Layer (CréerText.png) - Bigger text that pops out bottom & top */}
        <img
          src="/CREATE/Cr%C3%A9erText.png"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-6/7 -translate-x-1/2 -translate-y-1/2 z-20 w-[95%] sm:w-[92%] md:w-[90%] max-w-none h-auto object-contain pointer-events-none transition-transform duration-300 ease-out origin-center group-hover:scale-108 group-focus:scale-108 group-focus-visible:scale-108 group-hover:-translate-y-[55%] group-focus:-translate-y-[55%] group-focus-visible:-translate-y-[55%]"
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
