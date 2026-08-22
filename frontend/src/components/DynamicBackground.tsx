'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export const SECTION_COLORS = {
  MENU: '#FEEC66',     // Main Menu
  HOST: '#24B3F1',     // Hosting & Hosting playing
  PLAYLIST: '#4BD66F', // Creating a Playlist
  PLAY: '#DD4DCC',     // Joining & Rating
  ADMIN: '#BF1539',    // Admin
} as const;

export default function DynamicBackground({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  let bgColor: string = SECTION_COLORS.MENU;

  if (pathname.startsWith('/host')) {
    bgColor = SECTION_COLORS.HOST;
  } else if (pathname.startsWith('/playlists')) {
    bgColor = SECTION_COLORS.PLAYLIST;
  } else if (pathname.startsWith('/play')) {
    bgColor = SECTION_COLORS.PLAY;
  } else if (pathname.startsWith('/admin')) {
    bgColor = SECTION_COLORS.ADMIN;
  } else {
    bgColor = SECTION_COLORS.MENU;
  }

  return (
    <div 
      className="relative min-h-screen flex flex-col font-sans transition-colors duration-700 ease-in-out"
      style={{ backgroundColor: bgColor, '--bg-main-color': bgColor } as React.CSSProperties}
    >
      {/* Moving pattern layer (white pattern on transparent background) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 background-pattern" 
      />

      {/* Central Circle Mask Overlay (solid main color in center sphere, transparent outside) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-700 ease-in-out"
        style={{
          background: `radial-gradient(circle at center, ${bgColor} 0%, ${bgColor} 25%, transparent 75%)`
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
