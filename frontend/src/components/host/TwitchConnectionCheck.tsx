'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Check, X } from '@/components/icons';

interface TwitchConnectionCheckProps {
  channel: string;
  // Chat votes received since the channel was linked (username -> rating)
  votes: Record<string, number>;
  onClose: () => void;
  compact?: boolean;
  className?: string;
}

// Lobby card shown once a Twitch channel is linked: the chat rates the streamer from 1 to 5 and the
// average moves live, which proves that the votes come through before the game starts
export default function TwitchConnectionCheck({ channel, votes, onClose, compact = false, className = '' }: TwitchConnectionCheckProps) {
  const ratings = Object.values(votes);
  const count = ratings.length;
  const average = count > 0 ? ratings.reduce((acc, v) => acc + v, 0) / count : 0;
  const distribution = [1, 2, 3, 4, 5].map((value) => ratings.filter((v) => v === value).length);
  const highest = Math.max(1, ...distribution);

  // Small bump of the rating every time a vote moves it
  const averageRef = useRef<HTMLSpanElement>(null);
  const signature = `${count}:${average.toFixed(2)}`;
  useEffect(() => {
    if (count === 0 || !averageRef.current) return;
    gsap.fromTo(averageRef.current, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
  }, [signature, count]);

  return (
    <div className={`bg-white border-2 border-twitch rounded-2xl shadow-2xl flex flex-col gap-2 ${compact ? 'p-2.5' : 'p-3'} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0 text-xs font-black uppercase text-purple-900">
          <span className={`w-2 h-2 rounded-full shrink-0 ${count > 0 ? 'bg-emerald-500' : 'bg-twitch animate-pulse'}`} />
          <span className="truncate">Test du chat #{channel}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 text-slate-500 hover:text-black cursor-pointer shrink-0"
          title="Masquer le test du chat"
          aria-label="Masquer le test du chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className={`font-bold text-slate-700 leading-snug ${compact ? 'text-xs' : 'text-xs'}`}>
        Notez votre streamer de <span className="font-black text-black">1 à 5</span> dans le chat pour vérifier que la connexion est bonne.
      </p>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="flex items-baseline gap-0.5 font-mono text-purple-950">
            <span ref={averageRef} className={`inline-block font-black leading-none origin-left ${compact ? 'text-2xl' : 'text-3xl'}`}>
              {count > 0 ? average.toFixed(2) : '–'}
            </span>
            <span className="text-xs font-bold text-purple-700">/5</span>
          </span>
          <span className="text-xs font-black mt-1 flex items-center gap-1">
            {count > 0 ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-700">
                  {count} {count === 1 ? 'vote reçu' : 'votes reçus'}
                </span>
              </>
            ) : (
              <span className="text-slate-500">En attente d&apos;un vote...</span>
            )}
          </span>
        </div>

        {/* How many viewers gave each rating */}
        {!compact && (
          <div className="flex items-end gap-1 h-11" aria-hidden="true">
            {distribution.map((amount, i) => (
              <div key={i} className="flex flex-col items-center justify-end gap-0.5 h-full w-4">
                <div
                  className="w-full bg-twitch border-2 border-black rounded-sm transition-all duration-300"
                  style={{ height: `${amount > 0 ? Math.max(4, (amount / highest) * 30) : 0}px`, opacity: amount > 0 ? 1 : 0 }}
                />
                <span className="text-xs font-black text-slate-500 leading-none">{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
