'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUp } from '@/components/icons';

// How far the page must be scrolled before the button shows up
const VISIBLE_AFTER_PX = 400;

// Floating "back to top" button, mostly for phones: long playlists and leaderboards scroll a lot.
// Bottom left: the bottom right corner belongs to the players panel of the host lobby, and the
// cookie notice sits at the very bottom on small screens.
export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > VISIBLE_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter tout en haut"
      title="Remonter tout en haut"
      tabIndex={isVisible ? 0 : -1}
      className={`fixed bottom-16 sm:bottom-4 left-3 sm:left-4 z-40 h-11 w-11 flex items-center justify-center bg-white hover:bg-slate-100 border-2 border-black rounded-full text-black cursor-pointer btn-action-hover transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <ArrowUp className="w-5 h-5 stroke-[3]" />
    </button>
  );
}
