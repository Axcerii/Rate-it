'use client';

import React from 'react';

export interface RatingNumberButtonProps {
  value: number; // 1 | 2 | 3 | 4 | 5
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  sizeClassName?: string;
}

export const DODECAGON_CONFIG: Record<
  number,
  { fill: string; stroke: string; label: string }
> = {
  1: {
    fill: 'var(--accent-red, #990000)',
    stroke: '#000000',
    label: 'accent-red',
  },
  2: {
    fill: 'var(--bg-play, #DD4DCC)',
    stroke: '#000000',
    label: 'bg-play',
  },
  3: {
    fill: 'var(--bg-cream, #FAF6EB)',
    stroke: '#000000',
    label: 'bg-cream',
  },
  4: {
    fill: 'var(--bg-host, #24B3F1)',
    stroke: '#000000',
    label: 'bg-host',
  },
  5: {
    fill: 'var(--bg-create, #2fc355)',
    stroke: '#000000',
    label: 'bg-create',
  },
};

export const RatingNumberButton: React.FC<RatingNumberButtonProps> = ({
  value,
  isSelected,
  onClick,
  disabled = false,
  sizeClassName = 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
}) => {
  const config = DODECAGON_CONFIG[value] || DODECAGON_CONFIG[1];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center justify-center cursor-pointer select-none transition-transform duration-200 outline-none focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${sizeClassName}`}
      title={`Note ${value}/5`}
      aria-label={`Attribuer la note ${value} sur 5`}
      aria-pressed={isSelected}
    >
      {/* Dodécagone (12 côtés) rotatif en arrière-plan avec rotation smooth */}
      <div
        className={`absolute inset-[-14%] pointer-events-none transition-all duration-300 ease-out z-0 ${
          isSelected
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full animate-dodecagon-spin drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        >
          <polygon
            points="92.50,61.39 81.11,81.11 61.39,92.50 38.61,92.50 18.89,81.11 7.50,61.39 7.50,38.61 18.89,18.89 38.61,7.50 61.39,7.50 81.11,18.89 92.50,38.61"
            fill={config.fill}
            stroke={config.stroke}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Image du chiffre (1.png à 5.png) toujours visible et qui scale au hover */}
      <div className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-115 group-active:scale-95">
        <img
          src={`/LOGOS/${value}.png`}
          alt={`Note ${value}`}
          draggable={false}
          className={`w-[85%] h-[85%] object-contain select-none pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] transition-all duration-200 ${
            isSelected ? 'scale-105' : 'scale-100'
          }`}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('/HOST/')) {
              target.src = `/HOST/${value}.png`;
            }
          }}
        />
      </div>
    </button>
  );
};

export default RatingNumberButton;
