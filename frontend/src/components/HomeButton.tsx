'use client';

import React from 'react';
import Link from 'next/link';

interface HomeButtonProps {
  className?: string;
  sizeClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  title?: string;
  ariaLabel?: string;
}

export default function HomeButton({
  className = '',
  sizeClassName = 'h-9 sm:h-14 md:h-18 lg:h-20',
  onClick,
  title = "Retourner à l'accueil",
  ariaLabel = "Accueil - Retourner à la page d'accueil de Rate It",
}: HomeButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <Link
      href="/"
      rel="home"
      aria-label={ariaLabel}
      title={title}
      onClick={handleClick}
      className={`group relative inline-flex items-center justify-center bg-transparent border-none cursor-pointer outline-none transition-transform duration-200 hover:scale-110 active:scale-95 select-none focus:outline-none shrink-0 ${className}`}
    >
      <img
        src="/LOGOS/Accueil.png"
        alt="Accueil Rate It - Retour à la page d'accueil"
        className={`${sizeClassName} w-auto aspect-square object-contain pointer-events-none select-none`}
        loading="eager"
        decoding="async"
      />
      {/* Texte sémantique pour les robots d'indexation (SEO Google) et l'accessibilité */}
      <span className="sr-only">Accueil Rate It</span>
    </Link>
  );
}
