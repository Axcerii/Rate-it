'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import {
  CheckCircle2,
  Gamepad2,
  LogOut,
  BarChart2,
  Check,
  SkipForward,
  FastForward,
  Ghost,
  ThumbsUp,
  ListPlus,
  Sparkles,
  Crown,
  Star,
  Trophy,
  Home,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function PlayView() {
  const router = useRouter();
  const { session, isConnected, playerId, leaveRoom, submitVote, toggleSkip, showBanner } = useSocket();
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && session?.sessionId) {
      const url = `${window.location.origin}/?code=${session.sessionId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      showBanner('Lien de la salle copié dans le presse-papier !', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Redirect back to home only if there is no session to restore and connection is established
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const playerSessionId = localStorage.getItem('rate_it_player_session_id');
      if (!session && isConnected && !playerSessionId) {
        router.push('/');
      }
    }
  }, [session, isConnected, router]);

  const handleLeave = () => {
    leaveRoom();
    router.push('/');
  };

  const handleVote = async (voteValue: number) => {
    try {
      await submitVote(voteValue);
    } catch (error: any) {
      console.error('Failed to submit vote:', error);
      showBanner(error.message || 'Impossible d\'envoyer le vote', 'error');
    }
  };

  const handleToggleSkip = async () => {
    try {
      await toggleSkip();
    } catch (error: any) {
      console.error('Failed to toggle skip:', error);
      showBanner(error.message || 'Impossible de voter pour passer', 'error');
    }
  };

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-6 font-sans">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent mx-auto" />
          <h2 className="mt-6 text-xl font-black font-title uppercase text-black">Connexion à la salle...</h2>
          <p className="mt-2 text-xs font-bold text-slate-600">Redirection vers l'accueil si déconnexion.</p>
          <button
            onClick={handleLeave}
            className="mt-6 px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Retour à l'accueil</span>
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = session.players[playerId];

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-6 sm:py-12 font-sans justify-center items-center w-full max-w-full overflow-x-hidden">
        <div className="info-card w-full max-w-md md:max-w-3xl lg:max-w-4xl p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-6 md:gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left side in Lobby on Desktop */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3 border-b-2 md:border-b-0 md:border-r-2 border-black pb-6 md:pb-0 md:pr-6">
              <div className="px-3 py-1 border-2 border-black bg-emerald-400 text-black text-xs font-black uppercase rounded-lg inline-flex items-center gap-1.5">
                <span>CONNECTÉ</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <img
                src="/JOIN/JoinText.png"
                alt="Rejoindre"
                className="h-14 sm:h-20 md:h-24 w-auto object-contain max-w-full my-1"
              />
              <div className="flex flex-col items-center md:items-start gap-2 mt-1 w-full">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 border-2 border-black bg-[#DD4DCC] hover:bg-fuchsia-600 focus:bg-fuchsia-600 text-white font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Lien copié !' : 'Copier le lien de la salle'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>Code :</span>
                  <span className="font-mono font-black text-[#DD4DCC] text-sm tracking-wider">
                    {showCode ? session.sessionId : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="p-1 text-slate-500 hover:text-black focus:text-black transition"
                    title={showCode ? "Masquer le code" : "Afficher le code"}
                  >
                    {showCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right side in Lobby on Desktop */}
            <div className="flex flex-col gap-5 text-center md:text-left">
              <div className="p-4 rounded-xl bg-white border-2 border-black">
                <span className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase">Votre pseudo</span>
                <span className="block mt-1 text-2xl sm:text-3xl font-black text-black truncate px-1">
                  {currentPlayer?.name || 'Anonyme'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-300 flex flex-col items-center md:items-start text-center md:text-left gap-2">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6 text-purple-700 animate-bounce" />
                  <h4 className="text-base font-black font-title text-black uppercase">En attente de l'hôte</h4>
                </div>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  La partie commencera dès que l'hôte lancera la session. Préparez-vous !
                </p>
              </div>

              <button
                onClick={handleLeave}
                className="w-full py-3.5 px-6 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
              >
                <span>Quitter la salle</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PLAYING VIEW
  if (session.status === 'PLAYING') {
    const currentVideo = session.videos?.[session.currentVideoIndex];
    const currentVideoResult = currentVideo ? session.results?.[currentVideo.id] : null;
    const currentVote = currentPlayer?.vote;
    const isRevealPhase = session.phase === 'REVEAL';
    const hasSkipped = isRevealPhase ? !!session.revealSkips?.[playerId] : !!session.skips?.[playerId];
    const activeConnectedPlayers = Object.values(session.players || {}).filter(p => p.isConnected);
    const skipsCount = isRevealPhase
      ? Object.keys(session.revealSkips || {}).filter(id => session.players[id]?.isConnected && session.revealSkips?.[id]).length
      : Object.keys(session.skips || {}).filter(id => session.players[id]?.isConnected && session.skips?.[id]).length;

    const ratingOptions = [
      { value: 1, label: 'Skip, vite !', icon: <FastForward className="w-4 h-4 md:w-5 md:h-5 text-red-500" /> },
      { value: 2, label: 'Oubliable', icon: <Ghost className="w-4 h-4 md:w-5 md:h-5 text-orange-500" /> },
      { value: 3, label: 'Honnête', icon: <ThumbsUp className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" /> },
      { value: 4, label: 'Hop, dans ma playlist', icon: <ListPlus className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> },
      { value: 5, label: 'Aucun défaut', icon: <Crown className="w-4 h-4 md:w-5 md:h-5 text-amber-500" /> }
    ];

    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-4 sm:py-8 font-sans justify-center items-center w-full max-w-full overflow-x-hidden">
        <div className="info-card w-full max-w-md md:max-w-5xl lg:max-w-7xl xl:max-w-[1360px] p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-5 sm:gap-6">
          {/* Top Panel Bar */}
          <div className="flex justify-between items-center border-b-2 border-black pb-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase truncate max-w-[200px] sm:max-w-xs">
                Pseudo : {currentPlayer?.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[10px] sm:text-xs font-black text-black hover:text-[#DD4DCC] focus:text-[#DD4DCC] uppercase tracking-wider bg-white px-2.5 py-1 rounded-lg border border-black btn-action-hover inline-flex items-center gap-1.5"
                title="Copier le lien d'invitation"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#DD4DCC]" />}
                <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
              </button>
            </div>
          </div>

          {currentVideo ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Side: Video Player (Desktop & Large screens - 7/12 on md, 8/12 on lg) */}
              <div className="hidden md:flex md:col-span-7 lg:col-span-8 flex-col gap-4 text-left">
                <div className="w-full aspect-video rounded-none border-4 border-black bg-black overflow-hidden relative">
                  <iframe
                    key={currentVideo.youtubeId}
                    src={`https://www.youtube-nocookie.com/embed/${currentVideo.youtubeId}?autoplay=1&modestbranding=1&rel=0`}
                    title={currentVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="bg-white p-5 rounded-2xl border-2 border-black">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 py-1 px-3 rounded-lg border border-slate-200 inline-block mb-2">
                    Thème {session.currentVideoIndex + 1} sur {session.videos?.length}
                  </span>
                  <h3 className="text-2xl lg:text-3xl font-black font-title text-black leading-snug">
                    {currentVideo.title}
                  </h3>
                  <p className="text-sm font-bold text-fuchsia-950 mt-1">
                    Par {currentVideo.artistName || 'Artiste inconnu'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                  </p>
                </div>
              </div>

              {/* Right Side: Voting Controls & Actions (5/12 on md, 4/12 on lg) */}
              <div className="col-span-1 md:col-span-5 lg:col-span-4 flex flex-col gap-5">
                {/* On Mobile only: show video info header */}
                <div className="md:hidden flex flex-col gap-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 py-0.5 rounded border border-slate-200 inline-block mx-auto px-2">
                    Thème {session.currentVideoIndex + 1} sur {session.videos?.length}
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-xl sm:text-2xl font-black font-title text-black leading-tight border-b-2 border-black pb-2">
                      {currentVideo.title}
                    </h2>
                    <p className="text-xs font-bold text-fuchsia-950 mt-1">
                      Par {currentVideo.artistName || 'Artiste inconnu'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                    </p>
                  </div>
                </div>

                {isRevealPhase ? (
                  /* REVEAL PHASE PLAYER VIEW - Summary Card in Right Column */
                  <div className="mt-2 flex flex-col gap-4 py-4 bg-white p-5 rounded-2xl border-2 border-black text-center">
                    <span className="text-xs font-black text-fuchsia-950 uppercase flex items-center justify-center gap-1.5 tracking-wider">
                      <BarChart2 className="w-4 h-4 text-[#DD4DCC]" />
                      <span>Résultats en cours...</span>
                    </span>
                    <p className="text-xs font-bold text-slate-600">
                      Les résultats sont affichés dans la fenêtre pop-up ci-dessus.
                    </p>
                    <button
                      onClick={handleToggleSkip}
                      className={`w-full py-3.5 px-4 border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${hasSkipped
                          ? 'bg-purple-200 text-purple-950 border-dashed'
                          : 'bg-[#DD4DCC] text-white hover:bg-fuchsia-600 focus:bg-fuchsia-600'
                        }`}
                    >
                      {hasSkipped ? <Check className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                      <span>{hasSkipped ? 'Prêt pour la suite' : 'Passer la vidéo'}</span>
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono ml-auto">
                        {skipsCount} / {activeConnectedPlayers.length}
                      </span>
                    </button>
                  </div>
                ) : (
                  /* VOTING PHASE PLAYER VIEW */
                  <div className="mt-2 flex flex-col gap-5 sm:gap-6">
                    <div className="flex justify-between items-center px-1 gap-2 md:gap-3">
                      {ratingOptions.map((item) => {
                        const isSelected = currentVote === item.value;
                        const isAnySelected = currentVote !== undefined;

                        let btnStyle = "border-2 border-black bg-white text-black btn-action-hover hover:scale-105 active:scale-95";
                        if (isSelected) {
                          if (item.value === 1) btnStyle = "border-4 border-black bg-red-600 text-white scale-105 shadow-md";
                          else if (item.value === 2) btnStyle = "border-4 border-black bg-orange-500 text-white scale-105 shadow-md";
                          else if (item.value === 3) btnStyle = "border-4 border-black bg-yellow-400 text-black scale-105 shadow-md";
                          else if (item.value === 4) btnStyle = "border-4 border-black bg-emerald-500 text-white scale-105 shadow-md";
                          else if (item.value === 5) btnStyle = "border-4 border-black bg-[#DD4DCC] text-white scale-105 shadow-md";
                        } else if (isAnySelected) {
                          btnStyle = "border-2 border-slate-300 bg-slate-100 text-slate-400 opacity-40 hover:opacity-75 transition-opacity";
                        } else {
                          if (item.value === 1) btnStyle = "border-2 border-black bg-white hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white text-black btn-action-hover hover:scale-105 active:scale-95";
                          else if (item.value === 2) btnStyle = "border-2 border-black bg-white hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white text-black btn-action-hover hover:scale-105 active:scale-95";
                          else if (item.value === 3) btnStyle = "border-2 border-black bg-white hover:bg-yellow-400 hover:text-black focus:bg-yellow-400 text-black btn-action-hover hover:scale-105 active:scale-95";
                          else if (item.value === 4) btnStyle = "border-2 border-black bg-white hover:bg-emerald-500 hover:text-white focus:bg-emerald-500 focus:text-white text-black btn-action-hover hover:scale-105 active:scale-95";
                          else if (item.value === 5) btnStyle = "border-2 border-black bg-white hover:bg-[#DD4DCC] hover:text-white focus:bg-[#DD4DCC] focus:text-white text-black btn-action-hover hover:scale-105 active:scale-95";
                        }

                        return (
                          <button
                            key={item.value}
                            onClick={() => handleVote(item.value)}
                            className={`h-11 w-11 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-full text-base sm:text-xl lg:text-2xl font-black transition-all flex items-center justify-center cursor-pointer shrink-0 ${btnStyle}`}
                          >
                            {item.value}
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-7 flex items-center justify-center">
                      {currentVote !== undefined ? (
                        (() => {
                          const opt = ratingOptions.find(r => r.value === currentVote);
                          return (
                            <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                              <span>{opt?.label}</span>
                              {opt?.icon}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                          <span>Choisissez votre note</span>
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        </span>
                      )}
                    </div>

                    {/* Skip Button for Player */}
                    <button
                      onClick={handleToggleSkip}
                      className={`w-full py-3.5 px-4 border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 ${hasSkipped
                          ? 'bg-amber-200 text-amber-950 border-dashed'
                          : 'bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black'
                        }`}
                    >
                      {hasSkipped ? <Check className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                      <span>{hasSkipped ? 'Vous avez voté pour passer' : 'Voter pour passer la vidéo'}</span>
                      <span className="text-[10px] sm:text-xs bg-black text-white px-2.5 py-0.5 rounded font-mono ml-auto">
                        {skipsCount} / {activeConnectedPlayers.length}
                      </span>
                    </button>
                  </div>
                )}

                <button
                  onClick={handleLeave}
                  className="w-full mt-2 py-3.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
                >
                  <span>Quitter la partie</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-slate-500 font-bold text-xs">Chargement des infos de la vidéo...</div>
          )}
        </div>

        {/* Popup Modal Overlay during REVEAL Phase on Play Screen */}
        {isRevealPhase && currentVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white border-4 border-black p-5 sm:p-6 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-4 relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col items-center gap-1 border-b-2 border-black pb-3">
                <span className="text-xs font-black text-fuchsia-950 uppercase flex items-center justify-center gap-1.5 tracking-wider">
                  <BarChart2 className="w-5 h-5 text-[#DD4DCC]" />
                  <span>Résultats du thème</span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-black leading-tight mt-1 truncate max-w-full">
                  {currentVideo.title}
                </h3>
              </div>

              {/* Scores Grid */}
              {currentVideoResult ? (
                <div className="flex items-center justify-center gap-3 w-full">
                  <div className="flex flex-col items-center bg-fuchsia-50 border-2 border-black p-3 rounded-xl flex-1">
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Moyenne Joueurs</span>
                    <span className="text-3xl sm:text-4xl font-black text-black font-mono leading-none mt-1">
                      {currentVideoResult.average.toFixed(2)}<span className="text-xs text-slate-500 font-bold">/5</span>
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1">
                      ({currentVideoResult.votesCount} {currentVideoResult.votesCount === 1 ? 'vote' : 'votes'})
                    </span>
                  </div>

                  {session.twitchChannel && currentVideoResult.twitchVotesCount !== undefined && (
                    <div className="flex flex-col items-center bg-purple-50 border-2 border-black p-3 rounded-xl flex-1">
                      <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Chat Twitch</span>
                      <span className="text-3xl sm:text-4xl font-black text-purple-950 font-mono leading-none mt-1">
                        {currentVideoResult.twitchVotesCount > 0 ? (
                          <>{(currentVideoResult.twitchAverage ?? 0).toFixed(2)}<span className="text-xs text-purple-400 font-bold">/5</span></>
                        ) : (
                          <span className="text-base text-slate-400">N/A</span>
                        )}
                      </span>
                      <span className="text-[9px] font-bold text-purple-400 mt-1">
                        ({currentVideoResult.twitchVotesCount} {currentVideoResult.twitchVotesCount === 1 ? 'vote' : 'votes'})
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2 text-xs font-bold text-slate-500">
                  Résultats affichés sur l'écran principal !
                </div>
              )}

              {/* Personal Vote Info */}
              <div className="text-xs sm:text-sm font-black text-black flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600 uppercase text-[10px] font-bold">Votre note :</span>
                {currentVote !== undefined ? (
                  (() => {
                    const opt = ratingOptions.find(r => r.value === currentVote);
                    return (
                      <span className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-black">
                        <span>{currentVote}/5 ({opt?.label})</span>
                        {opt?.icon}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-slate-400 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded uppercase">Non voté</span>
                )}
              </div>

              {/* Action Button: Skip */}
              <button
                onClick={handleToggleSkip}
                className={`w-full py-3.5 px-4 border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover flex items-center justify-center gap-2 mt-1 ${hasSkipped
                    ? 'bg-purple-200 text-purple-950 border-dashed'
                    : 'bg-[#DD4DCC] text-white hover:bg-fuchsia-600 focus:bg-fuchsia-600'
                  }`}
              >
                {hasSkipped ? <Check className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                <span>{hasSkipped ? 'Prêt pour la suite' : 'Passer à la vidéo suivante'}</span>
                <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono ml-auto">
                  {skipsCount} / {activeConnectedPlayers.length}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. LEADERBOARD VIEW
  if (session.status === 'LEADERBOARD') {
    const resultsList = Object.values(session.results || {});
    // Sort from highest average to lowest average
    const sortedResults = [...resultsList].sort((a, b) => b.average - a.average);

    // Compute player personal summary
    const votedResults = sortedResults.filter(r => r.playerVotes?.[playerId] !== undefined);
    const playerVotesCount = votedResults.length;
    const playerAvg = playerVotesCount > 0
      ? (votedResults.reduce((acc, r) => acc + (r.playerVotes?.[playerId] || 0), 0) / playerVotesCount)
      : 0;
    const sessionAvg = sortedResults.length > 0
      ? (sortedResults.reduce((acc, r) => acc + r.average, 0) / sortedResults.length)
      : 0;
    const overallDiff = playerAvg - sessionAvg;

    let affinityLabel = "En parfait accord";
    let affinityBg = "bg-purple-100 text-purple-900 border-purple-300";
    if (playerVotesCount > 0) {
      if (overallDiff >= 0.25) {
        affinityLabel = "Plus généreux que la salle";
        affinityBg = "bg-emerald-100 text-emerald-900 border-emerald-400";
      } else if (overallDiff <= -0.25) {
        affinityLabel = "Plus exigeant que la salle";
        affinityBg = "bg-amber-100 text-amber-900 border-amber-400";
      }
    }

    const ratingBadges: Record<number, { label: string; bg: string }> = {
      1: { label: '1 - Skip, vite !', bg: 'bg-red-600 text-white' },
      2: { label: '2 - Oubliable', bg: 'bg-orange-500 text-white' },
      3: { label: '3 - Honnête', bg: 'bg-yellow-400 text-black' },
      4: { label: '4 - Hop, dans ma playlist', bg: 'bg-emerald-500 text-white' },
      5: { label: '5 - Aucun défaut', bg: 'bg-[#DD4DCC] text-white' },
    };

    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-6 py-6 sm:py-10 font-sans justify-center items-center w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-4xl flex flex-col gap-6">

          {/* Header Banner */}
          <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col items-center gap-4">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 animate-bounce" />
            <div>
              <h2 className="text-2xl sm:text-4xl font-black font-title text-black uppercase transform rotate-[-1deg]">
                Partie terminée !
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                Vos votes comparés à la moyenne finale de la session
              </p>
            </div>

            {/* Stats Overview */}
            {sortedResults.length > 0 && (
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                <div className="p-3 bg-white border-2 border-black rounded-xl text-center">
                  <span className="block text-[10px] font-black text-slate-500 uppercase">Mon vote moyen</span>
                  <span className="block text-xl sm:text-2xl font-black text-[#DD4DCC] font-mono mt-0.5">
                    {playerVotesCount > 0 ? `${playerAvg.toFixed(2)}/5` : 'N/A'}
                  </span>
                  <span className="block text-[9px] font-bold text-slate-400">
                    ({playerVotesCount}/{sortedResults.length} thèmes notés)
                  </span>
                </div>

                <div className="p-3 bg-white border-2 border-black rounded-xl text-center">
                  <span className="block text-[10px] font-black text-slate-500 uppercase">Moyenne Session</span>
                  <span className="block text-xl sm:text-2xl font-black text-black font-mono mt-0.5">
                    {sessionAvg.toFixed(2)}/5
                  </span>
                  <span className="block text-[9px] font-bold text-slate-400">
                    ({sortedResults.length} thèmes)
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 bg-white border-2 border-black rounded-xl text-center flex flex-col justify-center items-center">
                  <span className="block text-[10px] font-black text-slate-500 uppercase mb-1">Votre tendance</span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${affinityBg}`}>
                    {affinityLabel}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleLeave}
              className="w-full sm:w-auto px-6 py-3 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2 mt-2"
            >
              <Home className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </button>
          </div>

          {/* Songs Comparison List */}
          <div className="info-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col gap-4">
            <h3 className="text-sm font-black uppercase text-black border-b-2 border-black pb-2 flex items-center justify-between">
              <span>Classement & Comparaison des votes</span>
              <span className="text-xs font-mono text-slate-500">({sortedResults.length} thèmes)</span>
            </h3>

            {sortedResults.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-bold text-xs">
                Aucun résultat n'a été enregistré.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedResults.map((result, idx) => {
                  const playerVote = result.playerVotes?.[playerId];
                  const diff = playerVote !== undefined ? playerVote - result.average : null;

                  let cardStyle = "bg-white border-2 border-black";
                  if (idx === 0) {
                    cardStyle = "bg-amber-50 border-4 border-black";
                  }

                  return (
                    <div
                      key={result.id}
                      className={`p-4 rounded-xl ${cardStyle} flex flex-col gap-3`}
                    >
                      {/* Track info header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="h-8 w-8 rounded-lg bg-black text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-black text-sm leading-snug truncate">
                              {result.title}
                            </h4>
                            <p className="text-[11px] font-bold text-slate-600 truncate">
                              {result.artistName || 'Artiste inconnu'} {result.description ? `— ${result.description}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vote vs Session comparison row */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                        {/* Player Vote Box */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase">Votre vote</span>
                          {playerVote !== undefined ? (
                            <span className={`text-xs font-black px-2 py-0.5 rounded border border-black uppercase w-fit ${ratingBadges[playerVote]?.bg || 'bg-black text-white'}`}>
                              {ratingBadges[playerVote]?.label || `${playerVote}/5`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase w-fit">
                              Pas voté
                            </span>
                          )}
                        </div>

                        {/* Session Average Box */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase">Moyenne Session</span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black font-mono text-black">
                              {result.average.toFixed(2)} <span className="text-[10px] text-slate-500 font-bold">/5</span>
                            </span>

                            {diff !== null && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-black uppercase ${
                                diff > 0.05
                                  ? 'bg-emerald-200 text-emerald-950'
                                  : diff < -0.05
                                  ? 'bg-red-200 text-red-950'
                                  : 'bg-blue-100 text-blue-950'
                              }`}>
                                {diff > 0.05 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleLeave}
              className="w-full mt-3 py-3.5 px-6 bg-[#DD4DCC] text-white border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
