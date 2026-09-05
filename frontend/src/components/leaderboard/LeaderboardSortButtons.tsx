'use client';

import React from 'react';
import { Users, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export interface LeaderboardSortButtonsProps {
  layout: 'vertical' | 'horizontal';
  sortType: 'players' | 'twitch';
  sortDir: 'asc' | 'desc';
  onSort: (type: 'players' | 'twitch') => void;
  isTwitchLinked: boolean;
  className?: string;
}

export function LeaderboardSortButtons({
  layout,
  sortType,
  sortDir,
  onSort,
  isTwitchLinked,
  className = '',
}: LeaderboardSortButtonsProps) {
  const isVertical = layout === 'vertical';

  const containerClasses = isVertical
    ? `flex flex-col gap-3 items-end ${className}`
    : `flex items-center justify-center gap-3 ${className}`;

  const tooltipPositionClasses = isVertical
    ? 'right-full top-1/2 -translate-y-1/2 mr-3.5'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-2.5';

  const tooltipArrowClasses = isVertical
    ? 'top-1/2 -translate-y-1/2 left-full -ml-[1px] border-4 border-transparent border-l-black'
    : 'top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-black';

  return (
    <div className={containerClasses}>
      {/* 1. Player Sort Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => onSort('players')}
          aria-label="Trier par les votes des joueurs"
          title={
            sortType === 'players'
              ? sortDir === 'desc'
                ? 'Trier par les joueurs : Meilleur au Pire (cliquer pour inverser)'
                : 'Trier par les joueurs : Pire au Meilleur (cliquer pour inverser)'
              : 'Trier par les votes des joueurs'
          }
          className={`w-14 h-14 border-2 border-black rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer select-none btn-action-hover shadow-none ${
            sortType === 'players'
              ? 'bg-menu text-black'
              : 'bg-white text-black hover:bg-slate-100 focus:bg-slate-100'
          }`}
        >
          <Users className="w-5 h-5 shrink-0 stroke-[2.2]" />
          {sortType === 'players' ? (
            sortDir === 'desc' ? (
              <ArrowDown className="w-4 h-4 shrink-0 stroke-[2.5]" />
            ) : (
              <ArrowUp className="w-4 h-4 shrink-0 stroke-[2.5]" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 shrink-0 opacity-40" />
          )}
        </button>

        {/* Tooltip */}
        <div
          className={`pointer-events-none absolute ${tooltipPositionClasses} flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 flex-col p-2.5 bg-black text-white rounded-xl border-2 border-black z-50 whitespace-nowrap shadow-none`}
        >
          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-menu">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Votes des Joueurs</span>
          </div>
          <p className="text-[11px] font-bold text-slate-200 mt-1">
            {sortType === 'players'
              ? sortDir === 'desc'
                ? 'Ordre : Meilleur au Pire'
                : 'Ordre : Pire au Meilleur'
              : 'Cliquer pour trier par les joueurs'}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {sortType === 'players' ? "Cliquer pour inverser l'ordre" : 'Pire au Meilleur'}
          </p>
          <div className={`absolute ${tooltipArrowClasses}`} />
        </div>
      </div>

      {/* 2. Twitch Sort Button */}
      {isTwitchLinked && (
        <div className="relative group">
          <button
            type="button"
            onClick={() => onSort('twitch')}
            aria-label="Trier par les votes du chat Twitch"
            title={
              sortType === 'twitch'
                ? sortDir === 'desc'
                  ? 'Trier par Twitch : Meilleur au Pire (cliquer pour inverser)'
                  : 'Trier par Twitch : Pire au Meilleur (cliquer pour inverser)'
                : 'Trier par les votes Twitch'
            }
            className={`w-14 h-14 border-2 border-black rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer select-none btn-action-hover shadow-none ${
              sortType === 'twitch'
                ? 'bg-twitch text-white'
                : 'bg-white text-black hover:bg-slate-100 focus:bg-slate-100'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-5 h-5 shrink-0 fill-current ${
                sortType === 'twitch' ? 'text-white' : 'text-twitch'
              }`}
            >
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            {sortType === 'twitch' ? (
              sortDir === 'desc' ? (
                <ArrowDown className="w-4 h-4 shrink-0 stroke-[2.5]" />
              ) : (
                <ArrowUp className="w-4 h-4 shrink-0 stroke-[2.5]" />
              )
            ) : (
              <ArrowUpDown className="w-4 h-4 shrink-0 opacity-40" />
            )}
          </button>

          {/* Tooltip */}
          <div
            className={`pointer-events-none absolute ${tooltipPositionClasses} flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 flex-col p-2.5 bg-black text-white rounded-xl border-2 border-black z-50 whitespace-nowrap shadow-none`}
          >
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-purple-400">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-purple-400 shrink-0">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
              </svg>
              <span>Votes Twitch</span>
            </div>
            <p className="text-[11px] font-bold text-slate-200 mt-1">
              {sortType === 'twitch'
                ? sortDir === 'desc'
                  ? 'Ordre : Meilleur au Pire'
                  : 'Ordre : Pire au Meilleur'
                : 'Cliquer pour trier par Twitch'}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {sortType === 'twitch' ? "Cliquer pour inverser l'ordre" : 'Pire au Meilleur'}
            </p>
            <div className={`absolute ${tooltipArrowClasses}`} />
          </div>
        </div>
      )}
    </div>
  );
}
