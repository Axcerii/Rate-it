'use client';

import React from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { ScoreBar } from './ScoreBar';

export interface LeaderboardCardResult {
  id: string;
  title: string;
  artistName?: string;
  description?: string;
  youtubeId: string;
  average: number;
  votesCount: number;
  twitchAverage?: number;
  twitchVotesCount?: number;
  playerVotes?: Record<string, number>;
}

export interface LeaderboardCardProps {
  result: LeaderboardCardResult;
  rank: number;
  totalItems: number;
  isDarkAmbianceActive?: boolean;
  hasAnimatedOnce?: boolean;
  isTwitchLinked?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  // Optional player-specific props for /play page reuse
  playerVote?: number;
  showPlayerVoteBadge?: boolean;
  className?: string;
}

export function LeaderboardCard({
  result,
  rank,
  totalItems,
  isDarkAmbianceActive = false,
  hasAnimatedOnce = true,
  isTwitchLinked = false,
  cardRef,
  playerVote,
  showPlayerVoteBadge = false,
  className = '',
}: LeaderboardCardProps) {
  const isTop3 = rank <= 3;
  const isWinner = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  const isLast = totalItems > 1 && rank === totalItems;

  const diskImage = isWinner
    ? '/HOST/DiskOr.png'
    : isSecond
      ? '/HOST/DiskArgent.png'
      : isThird
        ? '/HOST/DiskBronze.png'
        : null;

  // Background and border styling for podium & standard ranks
  let cardBg = 'bg-white';
  let borderStyle = 'border-2 border-black';

  if (isWinner) {
    cardBg = 'bg-podium-gold';
    borderStyle = 'border-4 border-black transform sm:rotate-[0.5deg]';
  } else if (isSecond) {
    cardBg = 'bg-podium-silver';
    borderStyle = 'border-2 sm:border-3 border-black';
  } else if (isThird) {
    cardBg = 'bg-podium-bronze';
    borderStyle = 'border-2 sm:border-3 border-black';
  } else if (isLast) {
    cardBg = 'bg-red-50';
  }

  // Card z-index and highlight styling
  const winnerSpotlight = isWinner
    ? isDarkAmbianceActive
      ? 'relative !z-50 ring-4 ring-amber-400 shadow-[0_0_60px_rgba(250,204,21,0.9)]'
      : 'relative !z-40'
    : isTop3
      ? 'relative z-20'
      : 'relative z-10 hover:z-25';

  const animationStyle: React.CSSProperties = {
    opacity: hasAnimatedOnce ? 1 : 0,
    visibility: hasAnimatedOnce ? 'visible' : 'hidden',
  };

  // 1. RENDER TOP 3: PODIUM CARD WITH ROTATING DISK & FULL THUMBNAIL
  if (isTop3) {
    return (
      <div
        ref={cardRef}
        style={animationStyle}
        className={`p-4 sm:p-5 md:p-6 pb-20 sm:pb-24 md:pb-6 rounded-3xl ${cardBg} ${borderStyle} ${winnerSpotlight} flex flex-col md:flex-row items-stretch md:items-center gap-4 sm:gap-5 transition-all relative overflow-hidden ${className}`}
      >
        {/* BackgroundDisk layer covering the whole card, concentric with the disk center */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
          <div className="absolute -right-8 -bottom-8 md:-right-8 md:-bottom-8 w-30 h-30 md:w-38 md:h-38 transform rotate-[45deg]">
            <img
              src="/HOST/BackgroundDisk.png"
              alt=""
              className="absolute pointer-events-none select-none opacity-85"
              style={{
                width: '1400px',
                height: '1400px',
                maxWidth: 'none',
                maxHeight: 'none',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                filter: isSecond ? 'invert(0.5)' : 'none',
              }}
            />
          </div>
        </div>

        {/* Left: Visible YouTube Thumbnail Preview */}
        <div className="relative w-full md:w-44 lg:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-black bg-black shrink-0 group/thumb z-10">
          <img
            src={`https://img.youtube.com/vi/${result.youtubeId}/mqdefault.jpg`}
            alt={result.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
            loading="lazy"
          />
          {/* Red play button shown ONLY when hovering */}
          <a
            href={`https://www.youtube.com/watch?v=${result.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 cursor-pointer opacity-0 group-hover/thumb:opacity-100"
            title="Regarder sur YouTube (nouvel onglet)"
          >
            <div className="w-11 h-11 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white transform transition-transform group-hover/thumb:scale-110">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <span className="sr-only">Ouvrir sur YouTube</span>
          </a>
          <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/20 pointer-events-none">
            <ExternalLink className="w-2.5 h-2.5" />
            <span>YouTube</span>
          </div>
        </div>

        {/* Center: Rank Badge, Podium Tag, Title & Artist */}
        <div className="flex-1 min-w-0 flex flex-col justify-center text-left z-10 py-1">
          <div className="flex items-center gap-2 mb-1.5 flex-nowrap">
            {/* Rank badge */}
            <div
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-2 border-black flex items-center justify-center font-black text-base sm:text-lg shrink-0 relative bg-black text-cream`}
            >
              #{rank}
              {isWinner && (
                <span className="absolute -top-3.5 -right-3 pointer-events-none select-none">
                  <img
                    src="/HOST/Couronne.png"
                    alt="Couronne"
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain transform rotate-[15deg]"
                  />
                </span>
              )}
            </div>

            {/* Podium Tag */}
            <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border border-black shrink-0 bg-white/95 text-black">
              {isWinner ? '1ère Place' : isSecond ? '2ème Place' : '3ème Place'}
            </span>
          </div>

          {/* Clickable Title redirecting to YouTube */}
          <a
            href={`https://www.youtube.com/watch?v=${result.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-black text-black text-base sm:text-lg leading-snug hover:text-admin hover:underline transition-colors max-w-full group/title"
            title="Ouvrir la vidéo sur YouTube"
          >
            <span className="truncate">{result.title}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/title:opacity-100 shrink-0 text-slate-700 group-hover/title:text-admin" />
          </a>

          <p className="text-xs font-bold text-slate-800 mt-0.5 leading-relaxed truncate">
            par <span className="text-black font-black">{result.artistName || 'Artiste Non-Renseigné'}</span>
            {result.description ? ` — ${result.description}` : ''}
          </p>
        </div>

        {/* Right: Scores & Progress Bars (No separator border) */}
        <div className="flex flex-col gap-2.5 w-full md:w-48 lg:w-56 shrink-0 justify-center relative z-10 md:mr-20 lg:mr-24">
          <ScoreBar
            type="players"
            average={result.average}
            votesCount={result.votesCount}
            showLabel={isTwitchLinked}
          />

          {result.twitchVotesCount !== undefined && result.twitchVotesCount > 0 && (
            <ScoreBar
              type="twitch"
              average={result.twitchAverage ?? 0}
              votesCount={result.twitchVotesCount}
              showLabel={true}
              className="pt-1"
            />
          )}

          {/* Player's individual vote underneath the music score */}
          {showPlayerVoteBadge && (
            <div className="flex items-center justify-between font-mono font-bold text-xs pt-1">
              <span className="text-[11px] font-black uppercase text-slate-800 font-sans">Votre vote</span>
              {playerVote !== undefined ? (
                <div className="flex items-baseline gap-0.5 text-black">
                  <span className="text-sm sm:text-base font-black leading-none bg-menu text-black px-1.5 py-0.5 rounded border border-black">
                    {playerVote}
                  </span>
                  <span className="text-xs text-slate-700 font-bold">/5</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 font-sans italic">Non voté</span>
              )}
            </div>
          )}
        </div>

        {/* End Bottom Right: Disk Box with respective Vinyl Disk, cut off by card edge & rotated */}
        {diskImage && (
          <div className="absolute -right-8 -bottom-8 md:-right-8 md:-bottom-8 w-30 h-30 md:w-38 md:h-38 shrink-0 z-20 pointer-events-none select-none transform rotate-[45deg]">
            {/* Spinning Vinyl Disk centered */}
            <img
              src={diskImage}
              alt={isWinner ? "Disque d'Or" : isSecond ? "Disque d'Argent" : 'Disque de Bronze'}
              className="absolute top-1/2 left-1/2 w-[94%] h-[94%] object-contain animate-spin-disk"
            />
            {/* Turntable Box centered & fixed over spinning disk */}
            <img
              src="/HOST/DiskBox.png"
              alt="Boîte de Disque"
              className="absolute inset-0 w-full h-full object-contain hidden"
            />
          </div>
        )}
      </div>
    );
  }

  // 2. RENDER RANKS 4+: COMPACT CARD WITH HOVER PREVIEW POPOVER
  return (
    <div
      ref={cardRef}
      style={animationStyle}
      className={`p-4 sm:p-5 rounded-2xl ${cardBg} ${borderStyle} ${winnerSpotlight} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all !overflow-visible ${className}`}
    >
      {/* Left: Rank badge & Title info with hover preview and click redirect */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border-2 border-black bg-black text-cream flex items-center justify-center font-black text-base sm:text-lg shrink-0 relative">
          #{rank}
        </div>

        <div className="min-w-0 flex-1 text-left">
          {/* Title with hover thumbnail preview and click redirect to YouTube */}
          <div className="relative group/title inline-block max-w-full">
            <a
              href={`https://www.youtube.com/watch?v=${result.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-black text-black text-sm sm:text-base leading-snug hover:text-admin hover:underline transition-colors max-w-full"
              title="Ouvrir la vidéo sur YouTube"
            >
              <span className="truncate">{result.title}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/title:opacity-100 shrink-0 text-slate-700 group-hover/title:text-admin" />
            </a>

            {/* Floating hover preview popover */}
            <div className="pointer-events-none absolute bottom-full left-0 mb-3 hidden group-hover/title:flex flex-col w-60 sm:w-68 p-2.5 bg-white border-2 border-black rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-black mb-2">
                <img
                  src={`https://img.youtube.com/vi/${result.youtubeId}/mqdefault.jpg`}
                  alt={result.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>
              <p className="font-black text-xs text-black truncate">{result.title}</p>
              <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">
                par {result.artistName || 'Artiste inconnu'}
              </p>
              <span className="text-[10px] font-black text-admin uppercase mt-1.5 flex items-center gap-1 border-t border-slate-100 pt-1.5">
                <span>Cliquer pour ouvrir sur YouTube</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </span>
              {/* Bottom arrow */}
              <div className="absolute top-full left-6 -mt-[1px] border-4 border-transparent border-t-black" />
            </div>
          </div>

          <p className="text-xs font-bold text-slate-600 leading-relaxed truncate mt-0.5">
            par <span className="text-black">{result.artistName || 'Artiste Non-Renseigné'}</span>
            {result.description ? ` — ${result.description}` : ''}
          </p>
        </div>
      </div>

      {/* Right: Score Metrics & Progress Bars (No separator border) */}
      <div className="flex flex-col gap-2.5 w-full md:w-56 lg:w-64 shrink-0 justify-center">
        <ScoreBar
          type="players"
          average={result.average}
          votesCount={result.votesCount}
          showLabel={isTwitchLinked}
        />

        {result.twitchVotesCount !== undefined && result.twitchVotesCount > 0 && (
          <ScoreBar
            type="twitch"
            average={result.twitchAverage ?? 0}
            votesCount={result.twitchVotesCount}
            showLabel={true}
            className="pt-1"
          />
        )}

        {/* Player's individual vote underneath the music score */}
        {showPlayerVoteBadge && (
          <div className="flex items-center justify-between font-mono font-bold text-xs pt-1">
            <span className="text-[11px] font-black uppercase text-slate-700 font-sans">Votre vote</span>
            {playerVote !== undefined ? (
              <div className="flex items-baseline gap-0.5 text-black">
                <span className="text-sm sm:text-base font-black leading-none bg-menu text-black px-1.5 py-0.5 rounded border border-black">
                  {playerVote}
                </span>
                <span className="text-xs text-slate-700 font-bold">/5</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 font-sans italic">Non voté</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
