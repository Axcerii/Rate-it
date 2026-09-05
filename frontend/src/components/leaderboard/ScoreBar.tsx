'use client';

import React from 'react';

export interface ScoreBarProps {
  type: 'players' | 'twitch';
  average: number;
  votesCount: number;
  showLabel?: boolean;
  className?: string;
}

export function ScoreBar({
  type,
  average,
  votesCount,
  showLabel = true,
  className = '',
}: ScoreBarProps) {
  const percent = Math.min(100, Math.max(0, (average / 5) * 100));
  const isTwitch = type === 'twitch';

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase">
          {isTwitch ? (
            <>
              <span className="h-2 w-2 rounded-full bg-twitch shrink-0" />
              <span className="text-purple-950">Twitch</span>
            </>
          ) : (
            <span className="text-slate-800">Joueurs</span>
          )}
        </div>
      )}

      {/* Progress track */}
      <div className="w-full bg-cream border-2 border-black rounded-full h-3.5 overflow-hidden">
        <div
          className={`h-full ${isTwitch ? 'bg-twitch' : 'bg-host'} border-r-2 border-black rounded-full transition-all duration-1000`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Numerical score & vote count under the bar */}
      <div className="flex items-center justify-between font-mono font-bold">
        <div className={`flex items-baseline gap-0.5 ${isTwitch ? 'text-purple-950' : 'text-black'}`}>
          <span className="text-base sm:text-lg font-black leading-none">
            {average.toFixed(2)}
          </span>
          <span className={`text-xs ${isTwitch ? 'text-purple-700' : 'text-slate-700'} font-bold`}>
            /5
          </span>
        </div>
        <span className={`text-[11px] font-bold ${isTwitch ? 'text-purple-900' : 'text-slate-800'}`}>
          ({votesCount} {votesCount === 1 ? 'vote' : 'votes'})
        </span>
      </div>
    </div>
  );
}
