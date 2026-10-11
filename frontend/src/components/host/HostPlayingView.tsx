'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, BarChart2, Check, Copy, Eye, EyeOff, LayoutList, LogOut, MonitorPlay, SkipForward, Star, Users } from '@/components/icons';
import { useSocket } from '@/lib/useSocket';
import RatingNumberButton from '@/components/RatingNumberButton';
import YoutubeNotice from '@/components/YoutubeNotice';
import { getRoomStats } from './roomStats';
import type { GameSession } from '../../../../shared/types';

interface HostPlayingViewProps {
  session: GameSession;
  hostCustomName: string;
  showRoomCode: boolean;
  onShowRoomCodeChange: (visible: boolean) => void;
  copiedLink: boolean;
  onCopyLink: () => void;
  onBackToHome: () => void;
}

// Rating that counts up to its value: gives the reveal of a round its moment of suspense
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef({ value: 0 });

  useEffect(() => {
    const tween = gsap.to(shown.current, {
      value,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = shown.current.value.toFixed(2);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value]);

  return <span ref={ref}>0.00</span>;
}

const VIEW_MODE_KEY = 'rate_it_host_view_mode';

// Delay between the end of a video and the results of its round
const AUTO_REVEAL_SECONDS = 10;

// Host screen while a game is running: YouTube player, live votes, skip status and round results
export default function HostPlayingView({
  session,
  hostCustomName,
  showRoomCode,
  onShowRoomCodeChange,
  copiedLink,
  onCopyLink,
  onBackToHome,
}: HostPlayingViewProps) {
  const { showResults, nextVideo, previousVideo, toggleSkip, submitVote, showBanner } = useSocket();
  const playerRef = useRef<any>(null);

  // 'detailed': the full list of players and their status. 'clean': bigger title and one chip per
  // player, readable from a couch or on a stream. The choice of the host is remembered.
  const [viewMode, setViewMode] = useState<'detailed' | 'clean'>('detailed');
  useEffect(() => {
    if (localStorage.getItem(VIEW_MODE_KEY) === 'clean') setViewMode('clean');
  }, []);
  const chooseViewMode = (mode: 'detailed' | 'clean') => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };
  const isCleanView = viewMode === 'clean';

  // End of a video: the results are no longer shown at once. The host gets a countdown, and can
  // show them right away or cancel it. Seconds left, or null when no countdown is running.
  const [autoRevealIn, setAutoRevealIn] = useState<number | null>(null);
  const phaseRef = useRef(session.phase);
  useEffect(() => {
    phaseRef.current = session.phase;
  }, [session.phase]);

  useEffect(() => {
    setAutoRevealIn(null);
  }, [session.currentVideoIndex, session.phase]);

  useEffect(() => {
    if (autoRevealIn === null) return;
    if (autoRevealIn <= 0) {
      setAutoRevealIn(null);
      showResults().catch(err => console.error('Failed to reveal results after the countdown:', err));
      return;
    }
    const timer = setTimeout(() => setAutoRevealIn((left) => (left === null ? null : left - 1)), 1000);
    return () => clearTimeout(timer);
  }, [autoRevealIn]);

  // Round results: the votes of the players drop in one after the other
  const revealVotesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (session.phase !== 'REVEAL' || !revealVotesRef.current) return;
    const cards = revealVotesRef.current.querySelectorAll('[data-reveal-vote]');
    if (cards.length === 0) return;
    const tween = gsap.from(cards, { opacity: 0, y: -16, duration: 0.3, ease: 'back.out(2)', stagger: 0.08, delay: 0.5 });
    return () => {
      tween.kill();
      gsap.set(cards, { clearProps: 'opacity,transform' });
    };
  }, [session.phase, session.currentVideoIndex]);

  // YouTube API Player setup
  useEffect(() => {
    if (!session || session.status !== 'PLAYING') return;

    const currentVideo = session.videos?.[session.currentVideoIndex];
    if (!currentVideo) return;

    let ytPlayer: any = null;

    const initializePlayer = () => {
      const container = document.getElementById('youtube-player-container');
      if (container) {
        container.innerHTML = '<div id="youtube-player"></div>';
      }

      // @ts-ignore
      ytPlayer = new window.YT.Player('youtube-player', {
        // Privacy-enhanced mode, like the players' embed (not in the IFrame API reference, but honoured by it)
        host: 'https://www.youtube-nocookie.com',
        videoId: currentVideo.youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
        },
        events: {
          onStateChange: (event: any) => {
            // @ts-ignore
            if (event.data === window.YT.PlayerState.ENDED) {
              // Unloads the video: no end screen, no suggested or auto-played video after it
              try {
                event.target.stopVideo();
              } catch (e) {
                console.error(e);
              }
              if (phaseRef.current !== 'REVEAL') setAutoRevealIn(AUTO_REVEAL_SECONDS);
            }
          },
          onError: (err: any) => {
            console.error('YouTube Player Error:', err);
          }
        },
      });
      playerRef.current = ytPlayer;
    };

    // Load YouTube Iframe API script dynamically if not present
    // @ts-ignore
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // @ts-ignore
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        playerRef.current = null;
      }
    };
  }, [session?.status, session?.currentVideoIndex]);

  const handleShowResults = async () => {
    try {
      await showResults();
    } catch (error) {
      console.error('Erreur lors de l\'affichage des résultats:', error);
    }
  };

  const handleProceedAfterReveal = async () => {
    try {
      await nextVideo();
    } catch (error) {
      console.error('Erreur lors du passage à la vidéo suivante:', error);
    }
  };

  const handleToggleSkip = async () => {
    try {
      await toggleSkip();
    } catch (error: any) {
      console.error('Erreur lors du vote de skip:', error);
      showBanner(error.message || 'Impossible de voter pour passer', 'error');
    }
  };

  const handlePrev = async () => {
    try {
      await previousVideo();
    } catch (error) {
      console.error('Erreur lors du retour à la vidéo précédente:', error);
    }
  };

  const { playersList, activeConnectedPlayers, skipsCount, revealSkipsCount, hostHasSkipped } = getRoomStats(session);

  const currentVideo = session.videos?.[session.currentVideoIndex];
  if (!currentVideo) return null;

  const currentRoundRes = session.results?.[currentVideo.id];
  const playerVotesList = Object.values(session.votes || {});
  const pAvg = currentRoundRes?.average ?? (
    playerVotesList.length > 0
      ? parseFloat((playerVotesList.reduce((a, b) => a + b, 0) / playerVotesList.length).toFixed(2))
      : 0
  );
  const pCount = currentRoundRes?.votesCount ?? playerVotesList.length;

  const twitchVotesList = Object.values(session.twitchVotes || {});
  const tAvg = currentRoundRes?.twitchAverage ?? (
    twitchVotesList.length > 0
      ? parseFloat((twitchVotesList.reduce((a, b) => a + b, 0) / twitchVotesList.length).toFixed(2))
      : 0
  );
  const tCount = currentRoundRes?.twitchVotesCount ?? twitchVotesList.length;

  return (
    <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-4 sm:py-6 font-sans w-full max-w-full overflow-x-hidden">
      <div className={`z-10 w-full mx-auto flex flex-col flex-1 gap-6 ${isCleanView ? 'max-w-[1900px]' : 'max-w-7xl'}`}>
        {/* Top Panel bar */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 sm:pb-4 gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <span>Code de la salle :</span>
              <span className="font-mono font-black text-black">
                {showRoomCode ? session.sessionId : '••••••'}
              </span>
              <button
                type="button"
                onClick={() => onShowRoomCodeChange(!showRoomCode)}
                className="btn-action-hover text-xs"
                title={showRoomCode ? 'Cacher le code' : 'Afficher le code'}
              >
                {showRoomCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </span>

            <button
              type="button"
              onClick={onCopyLink}
              className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Lien copié !</span>
                </>
              )}
            </button>
          </div>

          <div
            className="ml-auto flex items-center border-2 border-black rounded-xl overflow-hidden bg-white font-black text-xs uppercase shrink-0"
            role="group"
            aria-label="Affichage de l'écran de jeu"
          >
            <button
              type="button"
              onClick={() => chooseViewMode('detailed')}
              aria-pressed={!isCleanView}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer transition-colors ${!isCleanView ? 'bg-host text-black' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              title="Liste complète des joueurs et de leur statut"
            >
              <LayoutList className="w-3.5 h-3.5 shrink-0" />
              <span>Détaillée</span>
            </button>
            <button
              type="button"
              onClick={() => chooseViewMode('clean')}
              aria-pressed={isCleanView}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 border-l-2 border-black cursor-pointer transition-colors ${isCleanView ? 'bg-host text-black' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              title="Vidéo en grand, affichage simplifié et lisible de loin"
            >
              <MonitorPlay className="w-3.5 h-3.5 shrink-0" />
              <span>Épurée</span>
            </button>
          </div>

          <button
            onClick={onBackToHome}
            className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 shrink-0"
          >
            <span>Quitter la partie</span>
            <LogOut className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        <div className={`grid gap-6 flex-1 items-stretch lg:grid-cols-3 ${isCleanView ? 'xl:grid-cols-4' : ''}`}>
          {/* Video Player Box (2/3, or 3/4 in the clean view) */}
          <div className={`flex flex-col gap-4 lg:col-span-2 ${isCleanView ? 'xl:col-span-3' : ''}`}>
            <div
              className="aspect-video w-full mx-auto rounded-2xl border-2 border-black bg-black overflow-hidden relative"
              // As wide as possible, but never taller than what is left of the screen under the top bar
              style={isCleanView ? { maxWidth: 'calc((100vh - 230px) * 16 / 9)' } : undefined}
            >
              <div id="youtube-player-container" className="w-full h-full" />

              {/* Countdown between the end of the video and the results */}
              {autoRevealIn !== null && (
                <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center gap-4 p-4 text-center">
                  <span className="text-sm sm:text-base font-black uppercase text-white tracking-wide">Vidéo terminée · résultats dans</span>
                  <span className="text-6xl sm:text-7xl font-black font-mono text-[#FEEC66] leading-none">{autoRevealIn}</span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoRevealIn(0)}
                      className="px-4 py-2.5 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <BarChart2 className="w-4 h-4 shrink-0" />
                      <span>Afficher maintenant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoRevealIn(null)}
                      className="px-4 py-2.5 bg-white border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover cursor-pointer"
                      title="Laisser le vote ouvert : les résultats s'afficheront avec le bouton Résultats"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
            <YoutubeNotice className="-mt-2 px-2 py-1 bg-white/90 border-2 border-black rounded-lg self-start" />

            {/* Navigation controls */}
            <div className="flex flex-wrap justify-between items-center bg-menu border-10 border-white  p-3 sm:p-4 rounded-2xl gap-2">
              <button
                onClick={handlePrev}
                disabled={session.currentVideoIndex === 0}
                className="px-3 sm:px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Précédent</span>
              </button>

              <span className="text-xs font-black text-black">
                Vidéo {session.currentVideoIndex + 1} / {session.videos?.length}
              </span>

              {session.phase === 'REVEAL' ? (
                <div className="flex items-center gap-2">
                  {session.isHostPlayer !== false && (
                    <button
                      onClick={handleToggleSkip}
                      className={`px-3 sm:px-4 py-2.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 ${hostHasSkipped
                        ? 'bg-purple-200 text-purple-950 border-dashed'
                        : 'bg-white text-black hover:bg-slate-100'
                        }`}
                      title="Proposer de passer à la suite (vote volontaire sans forcer)"
                    >
                      {hostHasSkipped ? <Check className="w-4 h-4 shrink-0" /> : <SkipForward className="w-4 h-4 shrink-0" />}
                      <span>{hostHasSkipped ? 'Prêt' : 'Prêt (skip)'}</span>
                      <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded font-mono">
                        {revealSkipsCount}/{activeConnectedPlayers.length}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={handleProceedAfterReveal}
                    className="px-4 sm:px-5 py-2.5 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
                    title="Forcer la suite pour tous"
                  >
                    <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Afficher les résultats' : 'Vidéo suivante'}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {session.isHostPlayer !== false && (
                    <button
                      onClick={handleToggleSkip}
                      className={`px-3 sm:px-4 py-2.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 ${hostHasSkipped
                        ? 'bg-amber-200 text-amber-950 border-dashed'
                        : 'bg-white text-black hover:bg-slate-100'
                        }`}
                      title="Proposer de passer la vidéo (vote volontaire sans forcer)"
                    >
                      {hostHasSkipped ? <Check className="w-4 h-4 shrink-0" /> : <SkipForward className="w-4 h-4 shrink-0" />}
                      <span>{hostHasSkipped ? 'Voté skip' : 'Voter skip'}</span>
                      <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded font-mono">
                        {skipsCount}/{activeConnectedPlayers.length}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={handleShowResults}
                    className="px-4 sm:px-5 py-2.5 bg-host border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5"
                    title="Forcer l'affichage des résultats pour tous"
                  >
                    <BarChart2 className="w-4 h-4 shrink-0" />
                    <span>Résultats</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Side info & live votes status (1/3) */}
          <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6 min-h-0">
            {/* Currently Playing details */}
            <div className="info-card border-2 border-black p-4 sm:p-6 rounded-2xl shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Actuellement en cours</span>
              <h2 className={`mt-2 text-black leading-tight border-b-2 border-black pb-2 mb-2 font-black ${isCleanView ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
                {currentVideo.title}
              </h2>
              <p className={`font-bold text-cyan-950 ${isCleanView ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
                par {currentVideo.artistName || 'Artiste Non-renseigné'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
              </p>
            </div>

            {/* Mon Vote (Hôte) Voting Widget */}
            {session.isHostPlayer !== false && (
              <div className="info-card border-2 border-black p-4 sm:p-5 rounded-2xl flex flex-col gap-3 bg-white shrink-0">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-black flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>Mon Vote ({session.players?.[session.hostPlayerId || '']?.name || hostCustomName.trim() || 'HOST'})</span>
                  </h3>
                  {session.votes?.[session.hostPlayerId || ''] !== undefined && (
                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 border-2 border-black px-2 py-0.5 rounded">
                      Voté : {session.votes[session.hostPlayerId || '']}/5
                    </span>
                  )}
                </div>

                {session.phase === 'REVEAL' ? (
                  <div className="flex flex-col gap-2 py-1">
                    <p className="text-xs font-bold text-slate-600 text-center">
                      Résultats affichés pour cette vidéo
                    </p>
                    <button
                      onClick={handleToggleSkip}
                      className={`w-full py-2.5 px-3 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${hostHasSkipped
                        ? 'bg-purple-200 text-purple-950 border-dashed'
                        : 'bg-[#DD4DCC] text-white hover:bg-fuchsia-600'
                        }`}
                    >
                      {hostHasSkipped ? <Check className="w-3.5 h-3.5 shrink-0" /> : <SkipForward className="w-3.5 h-3.5 shrink-0" />}
                      <span>{hostHasSkipped ? 'Prêt pour la suite' : 'Voter pour passer à la suite'}</span>
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono ml-auto whitespace-nowrap shrink-0">
                        {revealSkipsCount} / {activeConnectedPlayers.length}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex justify-between items-center gap-1.5 sm:gap-2 px-1 py-1">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const hostVote = session.votes?.[session.hostPlayerId || ''];
                        const isSelected = hostVote === val;
                        return (
                          <RatingNumberButton
                            key={val}
                            value={val}
                            isSelected={isSelected}
                            onClick={async () => {
                              try {
                                await submitVote(val);
                              } catch (err: any) {
                                showBanner(err.message || 'Erreur lors du vote', 'error');
                              }
                            }}
                            sizeClassName="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12"
                          />
                        );
                      })}
                    </div>
                    <button
                      onClick={handleToggleSkip}
                      className={`w-full mt-1 py-2.5 px-3 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${hostHasSkipped
                        ? 'bg-amber-200 text-amber-950 border-dashed'
                        : 'bg-white hover:bg-slate-100 text-black'
                        }`}
                    >
                      {hostHasSkipped ? <Check className="w-3.5 h-3.5 shrink-0" /> : <SkipForward className="w-3.5 h-3.5 shrink-0" />}
                      <span>{hostHasSkipped ? 'Vous avez voté pour passer' : 'Voter pour passer la vidéo'}</span>
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono ml-auto whitespace-nowrap shrink-0">
                        {skipsCount} / {activeConnectedPlayers.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Twitch Live votes tracking */}
            {session.twitchChannel && (
              <div className="info-card border-2 border-black p-4 sm:p-5 rounded-2xl flex flex-col gap-2 shrink-0">
                <h3 className="text-xs font-black uppercase text-purple-700 flex items-center gap-1.5 border-b border-purple-200 pb-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse border-2 border-black" />
                  Votes Twitch
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-700 font-bold">Votes reçus :</span>
                  <span className="text-lg font-black text-black font-mono">
                    {Object.keys(session.twitchVotes || {}).length}
                  </span>
                </div>
              </div>
            )}

            {/* Live Players Voting details */}
            <div className="flex-1 min-h-0 info-card border-2 border-black p-4 sm:p-6 rounded-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-black pb-2 mb-3 shrink-0">
                <h3 className="text-xs sm:text-sm font-black uppercase text-black">
                  Joueurs actifs ({Object.keys(session.votes || {}).length} / {playersList.length})
                </h3>
                {session.phase === 'REVEAL' ? (
                  <span className="text-xs bg-purple-100 text-purple-800 border-2 border-black font-black px-2.5 py-1 rounded-lg">
                    Prêt : {revealSkipsCount}/{activeConnectedPlayers.length}
                  </span>
                ) : (
                  <span className="text-xs bg-blue-100 text-blue-800 border-2 border-black font-black px-2.5 py-1 rounded-lg">
                    Skip : {skipsCount}/{activeConnectedPlayers.length}
                  </span>
                )}
              </div>

              {isCleanView ? (
                /* One chip per player: it lights up once the player has voted */
                <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] lg:max-h-none flex flex-wrap content-start gap-2 pr-1 scrollbar-thin">
                  {playersList.map((player) => {
                    const hasVoted = session.votes?.[player.id] !== undefined;
                    const hasSkipped = session.phase === 'REVEAL'
                      ? session.revealSkips?.[player.id]
                      : session.skips?.[player.id];
                    return (
                      <span
                        key={player.id}
                        title={hasVoted ? `${player.name} a voté` : `${player.name} n'a pas encore voté`}
                        className={`inline-flex items-center gap-1.5 max-w-full px-3 py-1.5 rounded-lg border-2 border-black text-sm font-black text-black transition-colors duration-300 ${hasVoted ? 'bg-emerald-400' : 'bg-white'} ${player.isConnected ? '' : 'opacity-50'}`}
                      >
                        {hasVoted && <Check className="w-4 h-4 shrink-0 stroke-[3]" />}
                        <span className="truncate">{player.name}</span>
                        {hasSkipped && <SkipForward className="w-3.5 h-3.5 shrink-0" />}
                      </span>
                    );
                  })}
                </div>
              ) : (
              <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] lg:max-h-none flex flex-col gap-2.5 pr-1 scrollbar-thin">
                {playersList.map((player) => {
                  const hasVoted = session.votes?.[player.id] !== undefined;
                  const hasSkipped = session.phase === 'REVEAL'
                    ? session.revealSkips?.[player.id]
                    : session.skips?.[player.id];

                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 border-2 border-black bg-white rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${player.isConnected ? 'bg-emerald-500 border-2 border-black' : 'bg-slate-500'}`} />
                        <span className="font-black text-xs sm:text-sm text-black truncate max-w-[110px] sm:max-w-[140px]">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasSkipped && (
                          <span className="px-2 py-1 border-2 border-black rounded bg-slate-200 text-slate-800 text-xs font-black uppercase flex items-center gap-1">
                            <SkipForward className="w-3 h-3" />
                          </span>
                        )}
                        {hasVoted ? (
                          <span className="px-2.5 py-1 border-2 border-black rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black uppercase animate-pulse flex items-center gap-1">
                            <span>Voté</span>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 border-2 border-black rounded-lg bg-amber-100 text-amber-700 text-xs font-black uppercase">
                            Vote en cours...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WarioWare-styled Reveal Modal */}
      {session.phase === 'REVEAL' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 p-2 sm:p-4">
          <div className="w-full max-w-3xl info-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-4 sm:gap-6 relative overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs uppercase font-black text-slate-600 tracking-wider">Résultats de la vidéo</span>
              <h2 className="text-xl sm:text-3xl font-black text-black leading-tight border-b-2 border-black pb-2 mb-1">
                {currentVideo.title}
              </h2>
              <p className="text-xs sm:text-sm font-black text-cyan-950">
                Par {currentVideo.artistName || 'Artiste Non-renseigné'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
              </p>
            </div>

            <div className={`grid gap-4 sm:gap-6 mt-1 z-10 ${session.twitchChannel ? 'sm:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto w-full'}`}>
              {/* Players Rating Card */}
              <div className="rounded-2xl border-2 border-black bg-white p-4 sm:p-5 flex flex-col items-center justify-center gap-2">
                <span className="text-xs uppercase font-black text-cyan-950 tracking-wider">Moyenne des joueurs</span>
                <span className="text-4xl sm:text-5xl font-black text-black font-mono leading-none">
                  <CountUp value={pAvg} />
                </span>
                <span className="text-xs text-slate-500 font-bold mt-1">
                  {pCount} {pCount === 1 ? 'votant' : 'votants'}
                </span>
              </div>

              {/* Twitch Rating Card - Only shown when Twitch is associated */}
              {session.twitchChannel && (
                <div className="rounded-2xl border-2 border-black bg-white p-4 sm:p-5 flex flex-col items-center justify-center gap-2">
                  <span className="text-xs uppercase font-black text-purple-700 tracking-wider">Moyenne du chat</span>
                  {tCount > 0 ? (
                    <>
                      <span className="text-4xl sm:text-5xl font-black text-black font-mono leading-none">
                        <CountUp value={tAvg} />
                      </span>
                      <span className="text-xs text-slate-500 font-bold mt-1">
                        par {tCount} {tCount === 1 ? 'vote du chat' : 'votes du chat'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-slate-400 font-mono py-2 mt-1">
                        N/A
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Pas de votes du chat
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Requirement 2: Individual Player Votes Breakdown */}
            <div className="rounded-2xl border-2 border-black bg-white p-3.5 sm:p-4 text-left z-10">
              <h4 className="text-xs sm:text-sm font-black uppercase text-black border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-host" />
                  <span>Notes mises par les joueurs</span>
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">({playersList.length} joueurs)</span>
              </h4>
              {playersList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Pas de joueurs connectés</p>
              ) : (
                <div ref={revealVotesRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {playersList.map((player) => {
                    const playerVote = session.votes?.[player.id];
                    let voteBadge = (
                      <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 uppercase">
                        Pas de vote
                      </span>
                    );
                    if (playerVote !== undefined) {
                      const labels: Record<number, { text: string; bg: string }> = {
                        1: { text: '1', bg: 'bg-[var(--accent-red)] text-white' },
                        2: { text: '2', bg: 'bg-[var(--bg-play)] text-white' },
                        3: { text: '3', bg: 'bg-[var(--bg-cream)] text-black border-2 border-black' },
                        4: { text: '4', bg: 'bg-[var(--bg-host)] text-black' },
                        5: { text: '5', bg: 'bg-[var(--bg-create)] text-black' },
                      };
                      const l = labels[playerVote] || { text: `${playerVote}`, bg: 'bg-black text-white' };
                      voteBadge = (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded border-2 border-black uppercase ${l.bg}`}>
                          {l.text}
                        </span>
                      );
                    }
                    return (
                      <div key={player.id} data-reveal-vote className="flex items-center justify-between p-2.5 border-2 border-black rounded-xl bg-slate-50">
                        <span className="text-xs sm:text-sm font-black text-black truncate max-w-[100px] sm:max-w-[120px]">{player.name}</span>
                        {voteBadge}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap justify-center items-center gap-3 z-10">
              {session.isHostPlayer !== false && (
                <button
                  onClick={handleToggleSkip}
                  className={`px-5 sm:px-6 py-3 border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 ${hostHasSkipped
                    ? 'bg-purple-200 text-purple-950 border-dashed'
                    : 'bg-white text-black hover:bg-slate-100'
                    }`}
                  title="Proposer de passer à la suite (ne force pas)"
                >
                  {hostHasSkipped ? <Check className="w-4 h-4 shrink-0" /> : <SkipForward className="w-4 h-4 shrink-0" />}
                  <span>{hostHasSkipped ? 'Prêt pour la suite' : 'Voter pour passer'}</span>
                  <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono">
                    {revealSkipsCount} / {activeConnectedPlayers.length}
                  </span>
                </button>
              )}
              <button
                onClick={handleProceedAfterReveal}
                className="px-6 sm:px-8 py-3 bg-host text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
                title="Forcer la suite pour tous"
              >
                <span>{session.currentVideoIndex + 1 === session.videos?.length ? 'Voir le classement' : 'Vidéo suivante'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
