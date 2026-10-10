'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { BarChart2, Crown, Home, SkipForward } from 'lucide-react';
import { LeaderboardCard, LeaderboardSortButtons } from '@/components/leaderboard';
import type { GameSession } from '../../../../shared/types';

interface HostLeaderboardViewProps {
  session: GameSession;
  hostCustomName: string;
  onBackToHome: () => void;
}

// Final screen of the host: progressive reveal of the results (GSAP), sorting and vote averages
export default function HostLeaderboardView({ session, hostCustomName, onBackToHome }: HostLeaderboardViewProps) {
  // Leaderboard sorting state
  const [leaderboardSortType, setLeaderboardSortType] = useState<'players' | 'twitch'>('players');
  const [leaderboardSortDir, setLeaderboardSortDir] = useState<'desc' | 'asc'>('asc');

  // GSAP Progressive reveal animation states
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDarkAmbianceActive, setIsDarkAmbianceActive] = useState(false);
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false);
  const [showSidebars, setShowSidebars] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const cardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  // Cleanup GSAP timeline on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  const triggerLeaderboardReveal = () => {
    // Ensure the display is always worst at top and best at bottom for the reveal animation
    setLeaderboardSortDir('asc');

    const rawResults = Object.values(session?.results || {});

    if (rawResults.length === 0) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    setIsRevealing(true);
    setIsDarkAmbianceActive(false);
    setShowSidebars(false);

    // Compute player and twitch ranks for reveal order
    const rankedP = [...rawResults].sort((a: any, b: any) => (b.average || 0) - (a.average || 0));
    const pMap = new Map(rankedP.map((r: any, i) => [r.id, i + 1]));

    const rankedT = [...rawResults].sort((a: any, b: any) => (b.twitchAverage || 0) - (a.twitchAverage || 0));
    const tMap = new Map(rankedT.map((r: any, i) => [r.id, i + 1]));

    // Sequence reveals from worst rank (#N at top) down to rank 1 (Winner at bottom)
    const revealList = [...rawResults].sort((a: any, b: any) => {
      const rankA = leaderboardSortType === 'twitch' ? (tMap.get(a.id) ?? 1) : (pMap.get(a.id) ?? 1);
      const rankB = leaderboardSortType === 'twitch' ? (tMap.get(b.id) ?? 1) : (pMap.get(b.id) ?? 1);
      return rankB - rankA; // highest rank number (worst) first, rank 1 last
    });

    const cardElements = revealList
      .map((r: any) => cardRefs.current[r.id])
      .filter(Boolean) as HTMLElement[];

    // Ensure all cards are hidden initially
    gsap.set(cardElements, { opacity: 0, visibility: 'hidden', x: 0, y: 0, rotation: 0, scale: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsRevealing(false);
        setIsDarkAmbianceActive(false);
        setShowSidebars(true);
        setHasAnimatedOnce(true);
        gsap.set(cardElements, { opacity: 1, visibility: 'visible', x: 0, y: 0, rotation: 0, scale: 1, clearProps: 'all' });
      },
    });

    timelineRef.current = tl;

    // Small initial delay
    tl.to({}, { duration: 0.3 });

    // Start at top of the leaderboard
    if (cardElements.length > 0) {
      tl.call(() => {
        cardElements[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    revealList.forEach((result: any, idx) => {
      const el = cardRefs.current[result.id];
      if (!el) return;

      const rank = leaderboardSortType === 'twitch'
        ? (tMap.get(result.id) ?? 1)
        : (pMap.get(result.id) ?? 1);

      const isTop1 = rank === 1;
      const isTop2 = rank === 2;
      const isTop3 = rank === 3;
      const isFirstCard = idx === 0;

      // Alternating roundy entrance:
      // Even index: comes from right/down with positive tilt
      // Odd index: comes from left/down with negative tilt
      const startX = idx % 2 === 0 ? 80 : -80;
      const startY = 25; // arced curve
      const startRot = idx % 2 === 0 ? 2 : -2; // dynamic roundy tilt

      if (isTop1) {
        // Rank 1: The Grand Finale at the bottom - punchy, smooth slide & spotlight
        tl.to({}, { duration: 0.2 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        // Dark ambiance spotlight turns ON
        tl.call(() => {
          setIsDarkAmbianceActive(true);
        });

        tl.to({}, { duration: 0.2 });

        // Make visible and zoom/slide in with backlash
        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, scale: 0.35, rotation: -2, y: 30, x: 0 },
          {
            opacity: 1,
            scale: 1,
            rotation: 0,
            y: 0,
            x: 0,
            duration: 0.75,
            ease: 'back.out(1.4)',
          }
        );

        // Winner basks in spotlight
        tl.to({}, { duration: 1.2 });

        // Turn dark ambiance OFF and fade sidebars in after #1 is shown
        tl.call(() => {
          setIsDarkAmbianceActive(false);
          setShowSidebars(true);
        });

        tl.to({}, { duration: 0.3 });
      } else if (isTop2) {
        // Rank 2: Smooth, brisk slide
        tl.to({}, { duration: 0.18 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX * 1.2, y: 15, rotation: startRot, scale: 0.95 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.58,
            ease: 'power3.out',
          }
        );

        tl.to({}, { duration: 0.15 });
      } else if (isTop3) {
        // Rank 3: Smooth, brisk slide
        tl.to({}, { duration: 0.15 });

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX * 1.2, y: 15, rotation: startRot, scale: 0.96 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.55,
            ease: 'power3.out',
          }
        );

        tl.to({}, { duration: 0.12 });
      } else if (isFirstCard) {
        // First card: Keep original comfortable speed so the audience catches the start
        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: startY, rotation: startRot, scale: 0.97 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.75,
            ease: 'back.out(1.35)',
          }
        );

        tl.to({}, { duration: 0.25 });
      } else {
        // Middle cards: Progressive acceleration building up rapid momentum
        const nonPodiumTotal = Math.max(1, revealList.length - 4);
        const middleIdx = Math.max(0, idx - 1);
        const progress = Math.min(1, middleIdx / nonPodiumTotal);

        // Progressively accelerates from 0.46s down to 0.26s
        const cardDuration = 0.46 - (progress * 0.20);
        // Delay between cards compresses from 0.10s down to 0.04s
        const cardGap = 0.10 - (progress * 0.06);

        tl.call(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: startY, rotation: startRot, scale: 0.97 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: cardDuration,
            ease: 'back.out(1.2)',
          }
        );

        tl.to({}, { duration: cardGap });
      }
    });
  };

  const handleSkipAnimation = () => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    setIsDarkAmbianceActive(false);
    setIsRevealing(false);
    setShowSidebars(true);
    setHasAnimatedOnce(true);
    const cardElements = Object.values(cardRefs.current).filter(Boolean) as HTMLElement[];
    gsap.set(cardElements, { opacity: 1, visibility: 'visible', x: 0, y: 0, rotation: 0, scale: 1, clearProps: 'all' });
  };

  const handleReplayAnimation = () => {
    setLeaderboardSortDir('asc');
    setHasAnimatedOnce(false);
    setShowSidebars(false);
    setTimeout(() => {
      triggerLeaderboardReveal();
    }, 50);
  };

  // Auto-trigger reveal animation when entering LEADERBOARD
  useEffect(() => {
    if (session?.status === 'LEADERBOARD' && !hasAnimatedOnce && !isRevealing) {
      const resultsToUse = Object.values(session?.results || {});

      if (resultsToUse.length > 0) {
        const timer = setTimeout(() => {
          triggerLeaderboardReveal();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.status]);

  const isTwitchLinked = Boolean(
    session.twitchChannel ||
    Object.values(session.results || {}).some(r => r.twitchVotesCount && r.twitchVotesCount > 0)
  );

  const resultsArray = Object.values(session.results || {});

  // Compute vote statistics
  const sessionAvg = resultsArray.length > 0
    ? (resultsArray.reduce((acc, r) => acc + (r.average || 0), 0) / resultsArray.length)
    : 0;

  const hostId = session.hostPlayerId || '';
  const hostRatedResults = resultsArray.filter(r => r.playerVotes?.[hostId] !== undefined);
  const hostVotesCount = hostRatedResults.length;
  const hostAvg = hostVotesCount > 0
    ? (hostRatedResults.reduce((acc, r) => acc + (r.playerVotes?.[hostId] || 0), 0) / hostVotesCount)
    : 0;
  const hostDisplayName = session.players?.[hostId]?.name || hostCustomName.trim() || 'HOST';

  const allPlayersList = Object.values(session.players || {});
  const playersStats = allPlayersList.map(p => {
    const pRated = resultsArray.filter(r => r.playerVotes?.[p.id] !== undefined);
    const count = pRated.length;
    const avg = count > 0 ? (pRated.reduce((acc, r) => acc + (r.playerVotes?.[p.id] || 0), 0) / count) : 0;
    return {
      ...p,
      ratedCount: count,
      avg,
    };
  });

  const twitchRated = resultsArray.filter(r => (r.twitchVotesCount ?? 0) > 0);
  const twitchCount = twitchRated.length;
  const twitchAvg = twitchCount > 0
    ? (twitchRated.reduce((acc, r) => acc + (r.twitchAverage || 0), 0) / twitchCount)
    : 0;

  // Precalculate absolute ranks
  const rankedByPlayers = [...resultsArray].sort((a, b) => (b.average || 0) - (a.average || 0));
  const playerRankMap = new Map(rankedByPlayers.map((r, i) => [r.id, i + 1]));

  const rankedByTwitch = [...resultsArray].sort((a, b) => (b.twitchAverage || 0) - (a.twitchAverage || 0));
  const twitchRankMap = new Map(rankedByTwitch.map((r, i) => [r.id, i + 1]));

  // Sort according to active selection
  const sortedResults = [...resultsArray].sort((a, b) => {
    const valA = leaderboardSortType === 'twitch' ? (a.twitchAverage ?? 0) : (a.average ?? 0);
    const valB = leaderboardSortType === 'twitch' ? (b.twitchAverage ?? 0) : (b.average ?? 0);

    if (valA !== valB) {
      return leaderboardSortDir === 'desc' ? valB - valA : valA - valB;
    }
    const fallbackA = leaderboardSortType === 'twitch' ? (a.average ?? 0) : (a.twitchAverage ?? 0);
    const fallbackB = leaderboardSortType === 'twitch' ? (b.average ?? 0) : (b.twitchAverage ?? 0);
    if (fallbackA !== fallbackB) {
      return leaderboardSortDir === 'desc' ? fallbackB - fallbackA : fallbackA - fallbackB;
    }
    const rankA = leaderboardSortType === 'twitch' ? (twitchRankMap.get(a.id) ?? 1) : (playerRankMap.get(a.id) ?? 1);
    const rankB = leaderboardSortType === 'twitch' ? (twitchRankMap.get(b.id) ?? 1) : (playerRankMap.get(b.id) ?? 1);
    if (rankA !== rankB) {
      return leaderboardSortDir === 'desc' ? rankA - rankB : rankB - rankA;
    }
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  const handleSortClick = (type: 'players' | 'twitch') => {
    if (isRevealing) {
      handleSkipAnimation();
    }
    if (type === 'players') {
      if (leaderboardSortType !== 'players') {
        setLeaderboardSortType('players');
        setLeaderboardSortDir('desc');
      } else {
        setLeaderboardSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
      }
    } else {
      if (leaderboardSortType !== 'twitch') {
        setLeaderboardSortType('twitch');
        setLeaderboardSortDir('desc');
      } else {
        setLeaderboardSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
      }
    }
  };

  const isSidebarVisible = showSidebars || (hasAnimatedOnce && !isRevealing);

  return (
    <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-6 sm:py-10 font-sans w-full max-w-full overflow-x-clip">
      {/* Dark Ambiance Backdrop Overlay for Winner #1 Reveal */}
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-30 pointer-events-none transition-opacity duration-700 ${isDarkAmbianceActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      />

      <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 gap-6 sm:gap-8 justify-center items-center">
        {/* Header with Resultat.png */}
        <div className="flex flex-col items-center justify-center text-center w-full">
          <img
            src="/HOST/Resultat.png"
            alt="Résultats"
            className="h-20 sm:h-32 md:h-44 lg:h-52 xl:h-60 w-auto object-contain max-w-full"
          />
          {isRevealing && (
            <div className="flex items-center justify-center mt-3 z-20">
              <button
                type="button"
                onClick={handleSkipAnimation}
                className="px-4 py-2 border-2 border-black bg-white text-black hover:bg-slate-100 focus:bg-slate-100 text-xs font-black uppercase rounded-xl inline-flex items-center gap-2 btn-action-hover cursor-pointer"
                title="Passer l'animation et afficher tous les résultats immédiatement"
              >
                <SkipForward className="w-4 h-4" />
                <span>Passer l'animation</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content: Left Wing (Desktop) + Center Leaderboard + Right Wing (Desktop) */}
        <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-4 xl:gap-6">
          {/* Left Side (Desktop): Rounded Square Sorting Buttons with Tooltips */}
          <div className={`hidden lg:flex flex-col items-end w-52 xl:w-60 shrink-0 sticky top-8 self-start gap-3 z-20 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <LeaderboardSortButtons
              layout="vertical"
              sortType={leaderboardSortType}
              sortDir={leaderboardSortDir}
              onSort={handleSortClick}
              isTwitchLinked={isTwitchLinked}
            />
          </div>

          {/* Center: Leaderboard Cards */}
          <div className="info-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 w-full max-w-4xl !overflow-visible !z-auto">
            {/* Mobile / Tablet Sorting Toolbar (< lg only) */}
            <div className={`flex lg:hidden items-center justify-center gap-4 border-b-2 border-black pb-4 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <LeaderboardSortButtons
                layout="horizontal"
                sortType={leaderboardSortType}
                sortDir={leaderboardSortDir}
                onSort={handleSortClick}
                isTwitchLinked={isTwitchLinked}
              />
            </div>

            {/* Mobile Stats Summary (< lg only) */}
            <div className={`flex lg:hidden flex-col gap-2.5 p-3.5 bg-white border-2 border-black rounded-2xl transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex items-center gap-1.5 border-b border-black/20 pb-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-host shrink-0" />
                <span className="text-[11px] font-black uppercase text-black">Moyennes des votes</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col p-2 bg-slate-50 border border-black rounded-xl text-center">
                  <span className="text-[9px] font-black uppercase text-slate-500">Moyenne Session</span>
                  <span className="text-lg font-black text-black font-mono">
                    {sessionAvg.toFixed(2)}<span className="text-[10px] text-slate-400 font-bold">/5</span>
                  </span>
                </div>
                {session.isHostPlayer !== false ? (
                  <div className="flex flex-col p-2 bg-amber-50 border border-black rounded-xl text-center">
                    <span className="text-[9px] font-black uppercase text-amber-900 truncate">Moyenne {hostDisplayName}</span>
                    <span className="text-lg font-black text-amber-950 font-mono">
                      {hostVotesCount > 0 ? `${hostAvg.toFixed(2)}/5` : 'Non voté'}
                    </span>
                  </div>
                ) : isTwitchLinked && twitchCount > 0 ? (
                  <div className="flex flex-col p-2 bg-purple-50 border border-black rounded-xl text-center">
                    <span className="text-[9px] font-black uppercase text-purple-700">Chat Twitch</span>
                    <span className="text-lg font-black text-purple-950 font-mono">
                      {twitchAvg.toFixed(2)}<span className="text-[10px] text-purple-400 font-bold">/5</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {sortedResults.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4 text-slate-500 font-bold text-xs sm:text-sm">
                <p>Aucun vote n'a été enregistré pour le moment.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative !z-auto">
                {sortedResults.map((result) => {
                  const rank = leaderboardSortType === 'twitch'
                    ? (twitchRankMap.get(result.id) ?? 1)
                    : (playerRankMap.get(result.id) ?? 1);

                  return (
                    <LeaderboardCard
                      key={result.id}
                      result={result}
                      rank={rank}
                      totalItems={resultsArray.length}
                      isDarkAmbianceActive={isDarkAmbianceActive}
                      hasAnimatedOnce={hasAnimatedOnce}
                      isTwitchLinked={isTwitchLinked}
                      cardRef={(el) => { cardRefs.current[result.id] = el; }}
                      playerVote={result.playerVotes?.[session.hostPlayerId || '']}
                      showPlayerVoteBadge={session.isHostPlayer !== false}
                    />
                  );
                })}
              </div>
            )}

            {/* Mobile Back Button */}
            <div className={`flex lg:hidden justify-center border-t-2 border-black pt-6 mt-2 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <button
                onClick={onBackToHome}
                className="px-8 py-3.5 bg-host border-2 border-black text-black font-black text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Retour à l'accueil</span>
              </button>
            </div>
          </div>

          {/* Right Side (Desktop): Vote Averages Sidebar + Home Button */}
          <div className={`hidden lg:flex flex-col items-start w-52 xl:w-60 shrink-0 sticky top-8 self-start gap-4 z-20 transition-opacity duration-700 ${isSidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Vote Averages Card - NO BOX SHADOW */}
            <div className="w-full bg-white border-2 border-black rounded-2xl p-3.5 xl:p-4 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b-2 border-black pb-2">
                <BarChart2 className="w-4 h-4 text-host shrink-0" />
                <span className="text-xs font-black uppercase text-black">Moyennes des votes</span>
              </div>

              {/* Session General Average */}
              <div className="flex flex-col bg-slate-50 border-2 border-black rounded-xl p-2.5">
                <span className="text-[10px] font-black uppercase text-slate-500">Moyenne Session</span>
                <span className="text-2xl font-black text-black font-mono leading-tight mt-0.5">
                  {sessionAvg.toFixed(2)}<span className="text-xs text-slate-500 font-bold">/5</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  ({resultsArray.length} {resultsArray.length === 1 ? 'thème' : 'thèmes'})
                </span>
              </div>

              {/* Host's Own Average (if Host is a player) */}
              {session.isHostPlayer !== false && (
                <div className="flex flex-col bg-amber-50 border-2 border-black rounded-xl p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase text-amber-950 flex items-center gap-1 truncate">
                      <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">Moyenne {hostDisplayName}</span>
                    </span>
                    <span className="text-[9px] font-black bg-amber-200 text-amber-900 border border-black px-1.5 py-0.2 rounded shrink-0">
                      Host
                    </span>
                  </div>
                  <span className="text-2xl font-black text-amber-950 font-mono leading-tight mt-0.5">
                    {hostVotesCount > 0 ? (
                      <>{hostAvg.toFixed(2)}<span className="text-xs text-amber-700 font-bold">/5</span></>
                    ) : (
                      <span className="text-xs text-slate-400 font-sans font-bold">Non voté</span>
                    )}
                  </span>
                  <span className="text-[9px] font-bold text-amber-800">
                    ({hostVotesCount}/{resultsArray.length} notés)
                  </span>
                </div>
              )}

              {/* Twitch Average if linked */}
              {isTwitchLinked && twitchCount > 0 && (
                <div className="flex flex-col bg-purple-50 border-2 border-black rounded-xl p-2.5">
                  <span className="text-[10px] font-black uppercase text-purple-700">Chat Twitch</span>
                  <span className="text-xl font-black text-purple-950 font-mono leading-tight mt-0.5">
                    {twitchAvg.toFixed(2)}<span className="text-xs text-purple-400 font-bold">/5</span>
                  </span>
                  <span className="text-[9px] font-bold text-purple-500">
                    ({twitchCount} {twitchCount === 1 ? 'thème noté' : 'thèmes notés'})
                  </span>
                </div>
              )}

              {/* Breakdown by other players */}
              {playersStats.filter(p => !p.isHost).length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-black/15">
                  <span className="text-[10px] font-black uppercase text-slate-500">Par joueur :</span>
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {playersStats
                      .filter(p => !p.isHost)
                      .map(p => (
                        <div key={p.id} className="flex items-center justify-between p-1.5 bg-slate-50 border border-black rounded-lg text-xs">
                          <span className="font-bold text-black truncate max-w-[90px]" title={p.name}>{p.name}</span>
                          <span className="font-mono font-black text-black">
                            {p.ratedCount > 0 ? `${p.avg.toFixed(2)}/5` : '—'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Back to Home Button */}
            <button
              onClick={onBackToHome}
              className="w-full py-3 px-3 bg-white border-2 border-black text-black hover:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
              title="Quitter la session et revenir à l'accueil"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Retour à l'accueil</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
