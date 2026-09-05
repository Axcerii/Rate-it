'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import gsap from 'gsap';

export interface UseLeaderboardAnimationOptions {
  results: any[];
  sortType?: 'players' | 'twitch';
  onComplete?: () => void;
}

export function useLeaderboardAnimation({
  results,
  sortType = 'players',
  onComplete,
}: UseLeaderboardAnimationOptions) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDarkAmbianceActive, setIsDarkAmbianceActive] = useState(false);
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false);
  const [showSidebars, setShowSidebars] = useState(false);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const cardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const registerCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cardRefs.current[id] = el;
  }, []);

  // Kill timeline on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  const handleSkipAnimation = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    setIsRevealing(false);
    setIsDarkAmbianceActive(false);
    setHasAnimatedOnce(true);
    setShowSidebars(true);

    Object.values(cardRefs.current).forEach((el) => {
      if (el) {
        gsap.set(el, {
          opacity: 1,
          visibility: 'visible',
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          clearProps: 'transform',
        });
      }
    });

    onComplete?.();
  }, [onComplete]);

  const triggerReveal = useCallback(() => {
    if (results.length === 0) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    setIsRevealing(true);
    setIsDarkAmbianceActive(false);
    setShowSidebars(false);

    // Compute player and twitch ranks
    const rankedP = [...results].sort((a: any, b: any) => (b.average || 0) - (a.average || 0));
    const pMap = new Map(rankedP.map((r: any, i) => [r.id, i + 1]));

    const rankedT = [...results].sort((a: any, b: any) => (b.twitchAverage || 0) - (a.twitchAverage || 0));
    const tMap = new Map(rankedT.map((r: any, i) => [r.id, i + 1]));

    // Sequence reveals from worst rank (#N at top) down to rank 1 (Winner at bottom)
    const revealList = [...results].sort((a: any, b: any) => {
      const rankA = sortType === 'twitch' ? (tMap.get(a.id) ?? 1) : (pMap.get(a.id) ?? 1);
      const rankB = sortType === 'twitch' ? (tMap.get(b.id) ?? 1) : (pMap.get(b.id) ?? 1);
      return rankB - rankA;
    });

    // Initially hide all cards
    Object.values(cardRefs.current).forEach((el) => {
      if (el) {
        gsap.set(el, { opacity: 0, visibility: 'hidden' });
      }
    });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsRevealing(false);
        setIsDarkAmbianceActive(false);
        setHasAnimatedOnce(true);
        setShowSidebars(true);
        onComplete?.();
      },
    });

    timelineRef.current = tl;

    // Small starting delay
    tl.to({}, { duration: 0.2 });

    revealList.forEach((result: any, index: number) => {
      const el = cardRefs.current[result.id];
      if (!el) return;

      const rank = sortType === 'twitch' ? (tMap.get(result.id) ?? 1) : (pMap.get(result.id) ?? 1);
      const isWinner = rank === 1;
      const isTop2 = rank === 2;
      const isTop3 = rank === 3;

      const isEven = index % 2 === 0;
      const startX = isEven ? -40 : 40;
      const startRot = isEven ? -2 : 2;

      if (isWinner) {
        // Dramatic build-up before the winner
        tl.to({}, { duration: 0.3 });

        tl.call(() => {
          setIsDarkAmbianceActive(true);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        tl.to({}, { duration: 0.4 });

        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, scale: 0.7, y: 50, rotation: -3 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            rotation: 0.5,
            duration: 0.75,
            ease: 'back.out(1.4)',
          }
        );

        tl.to({}, { duration: 1.2 });

        tl.call(() => {
          setIsDarkAmbianceActive(false);
          setShowSidebars(true);
        });

        tl.to({}, { duration: 0.3 });
      } else if (isTop2) {
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
            duration: 0.54,
            ease: 'power3.out',
          }
        );

        tl.to({}, { duration: 0.12 });
      } else {
        // Ranks 4+: quick reveal
        tl.call(() => {
          gsap.set(el, { visibility: 'visible' });
        });

        tl.fromTo(
          el,
          { opacity: 0, x: startX, y: 8, rotation: startRot * 0.5, scale: 0.98 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.28,
            ease: 'power2.out',
          }
        );

        tl.to({}, { duration: 0.08 });
      }
    });
  }, [results, sortType, onComplete]);

  return {
    isRevealing,
    isDarkAmbianceActive,
    hasAnimatedOnce,
    showSidebars,
    cardRefs,
    registerCardRef,
    triggerReveal,
    handleSkipAnimation,
    setIsRevealing,
    setIsDarkAmbianceActive,
    setHasAnimatedOnce,
    setShowSidebars,
  };
}
