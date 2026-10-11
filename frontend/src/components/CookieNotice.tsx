'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import CloseButton from '@/components/CloseButton';

const DISMISSED_KEY = 'rate_it_cookie_notice_closed';

const subscribe = () => () => {};
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

// One-line notice about third-party cookies (YouTube player). Purely informative: closing it is remembered.
export default function CookieNotice() {
  // localStorage does not exist during server rendering: the notice is hidden there and shows up after hydration
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [closed, setClosed] = useState(false);

  if (dismissed || closed) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private browsing without storage: the notice simply comes back on the next page
    }
    setClosed(true);
  };

  return (
    <div
      role="region"
      aria-label="Information sur les cookies"
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100%-1rem)] bg-admin text-white border-2 border-black rounded-xl pl-3 pr-1 py-1 flex items-center gap-1.5 font-sans"
    >
      <p className="text-xs font-bold leading-snug">
        Rate It ne dépose aucun cookie. Les vidéos passent par YouTube, qui peut déposer les siens.{' '}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-menu whitespace-nowrap">
          En savoir plus
        </Link>
      </p>
      <CloseButton onClick={close} title="Fermer" className="!p-1" sizeClassName="w-5 h-5" />
    </div>
  );
}
