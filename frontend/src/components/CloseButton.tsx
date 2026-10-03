'use client';

import React from 'react';

interface CloseButtonProps {
  className?: string;
  sizeClassName?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  ariaLabel?: string;
}

export default function CloseButton({
  className = '',
  sizeClassName = 'w-7 h-7 sm:w-8 sm:h-8',
  onClick,
  title = 'Fermer',
  ariaLabel = 'Fermer',
}: CloseButtonProps) {
  const isAbsolute = className.includes('absolute');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      style={isAbsolute ? { zIndex: 50 } : undefined}
      className={`group ${isAbsolute ? 'z-50' : 'relative'} inline-flex items-center justify-center p-2.5 sm:p-3 bg-transparent border-none cursor-pointer outline-none select-none focus:outline-none shrink-0 ${className}`}
    >
      <img
        src="/LOGOS/cross.png"
        alt={title}
        className={`${sizeClassName} aspect-square object-contain pointer-events-none select-none transition-transform duration-150 group-hover:scale-110 group-active:scale-95`}
        loading="eager"
        decoding="async"
      />
    </button>
  );
}
