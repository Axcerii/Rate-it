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
      className="relative min-h-screen w-full max-w-full flex flex-col font-sans transition-colors duration-700 ease-in-out overflow-x-clip"
      style={{ backgroundColor: bgColor, '--bg-main-color': bgColor } as React.CSSProperties}
    >
      {/* Moving animated pattern layer */}
      <div 
        className="fixed inset-0 w-full h-full pointer-events-none z-0 background-pattern" 
        style={{
          backgroundImage: `url("data:image/svg+xml,<svg id='patternId' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' patternUnits='userSpaceOnUse' width='50' height='29.442' patternTransform='scale(4) rotate(0)'><rect x='0' y='0' width='100%' height='100%' fill='%232b2b3100'/><path d='M35.569-17.373 22.959 4.468l-12.61-21.841Zm0 29.442-12.61 21.84-12.61-21.84Zm25-14.721-12.61 21.841-12.61-21.841zm0 29.441-12.61 21.842-12.61-21.842Zm-33.478 0L39.7 4.95l12.61 21.84zM10.569-2.652l-12.61 21.841-12.61-21.841Zm0 29.441-12.61 21.842-12.61-21.842Zm-33.478 0L-10.3 4.95l12.61 21.84zm25-14.72L14.7-9.773l12.61 21.842zm0 29.441L14.7 19.67l12.61 21.841z'  stroke-width='1' stroke='%23ffffff' fill='none'/></pattern></defs><rect width='800%' height='800%' transform='translate(0,-235.536)' fill='url(%23a)'/></svg>")`,
          backgroundSize: '200px 117.768px'
        }}
      />

      {/* Central Circle Mask Overlay (solid main color in center sphere, transparent outside) */}
      <div 
        className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-all duration-700 ease-in-out"
        style={{
          background: `radial-gradient(circle at center, ${bgColor} 0%, ${bgColor} 25%, transparent 75%)`
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-full overflow-x-clip">
        {children}
      </div>
    </div>
  );
}
