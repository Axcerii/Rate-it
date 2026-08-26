'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import {
  CheckCircle2,
  Gamepad2,
  LogOut,
  BarChart2,
  Check,
  SkipForward,
  Frown,
  Meh as MehIcon,
  Smile,
  Sparkles,
  Crown,
  Star,
  Trophy,
  Home
} from 'lucide-react';

export default function PlayView() {
  const router = useRouter();
  const { session, isConnected, playerId, leaveRoom, submitVote, toggleSkip, showBanner } = useSocket();

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
      showBanner(error.message || 'Failed to submit vote', 'error');
    }
  };

  const handleToggleSkip = async () => {
    try {
      await toggleSkip();
    } catch (error: any) {
      console.error('Failed to toggle skip:', error);
      showBanner(error.message || 'Failed to skip', 'error');
    }
  };

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-6 font-sans">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent mx-auto" />
          <h2 className="mt-6 text-xl font-black font-title uppercase text-black">Connecting to Lobby...</h2>
          <p className="mt-2 text-xs font-bold text-slate-600">Redirecting to home if offline.</p>
          <button
            onClick={handleLeave}
            className="mt-6 px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go Back Home</span>
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = session.players[playerId];

  // 1. LOBBY VIEW
  if (session.status === 'LOBBY') {
    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-4 py-6 sm:py-8 font-sans justify-center items-center w-full max-w-full overflow-x-hidden">
        <div className="info-card w-full max-w-md p-5 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="px-3 py-1 border-2 border-black bg-emerald-400 text-black text-xs font-black uppercase rounded-lg inline-flex items-center gap-1.5">
              <span>CONNECTED</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <img
              src="/JOIN/JoinText.png"
              alt="Join"
              className="h-14 sm:h-20 w-auto object-contain max-w-full my-2"
            />
            <p className="text-xs font-bold text-slate-700">
              Room Code: <span className="font-mono font-black text-[#DD4DCC] tracking-wider">{session.sessionId}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border-2 border-black">
            <span className="block text-[10px] font-black text-slate-500 uppercase">Your Nickname</span>
            <span className="block mt-1 text-2xl font-black text-black truncate px-2">
              {currentPlayer?.name || 'Anonymous'}
            </span>
          </div>

          <div className="py-4 flex flex-col items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-black animate-bounce mb-2" />
            <h4 className="text-lg font-black font-title text-black uppercase">Waiting for Host</h4>
            <p className="mt-2 text-xs font-bold text-slate-600 max-w-[240px] leading-relaxed mx-auto">
              The game will start as soon as the host launches the session. Get ready!
            </p>
          </div>

          <button
            onClick={handleLeave}
            className="w-full py-3.5 px-6 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl transition inline-flex items-center justify-center gap-2"
          >
            <span>Leave Room</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. PLAYING VIEW
  if (session.status === 'PLAYING') {
    const currentVideo = session.videos?.[session.currentVideoIndex];
    const currentVote = currentPlayer?.vote;
    const isRevealPhase = session.phase === 'REVEAL';
    const hasSkipped = isRevealPhase ? !!session.revealSkips?.[playerId] : !!session.skips?.[playerId];
    const activeConnectedPlayers = Object.values(session.players || {}).filter(p => p.isConnected);
    const skipsCount = isRevealPhase
      ? Object.keys(session.revealSkips || {}).filter(id => session.players[id]?.isConnected && session.revealSkips?.[id]).length
      : Object.keys(session.skips || {}).filter(id => session.players[id]?.isConnected && session.skips?.[id]).length;

    const ratingOptions = [
      { value: 1, label: 'Awful', icon: <Frown className="w-4 h-4" /> },
      { value: 2, label: 'Meh', icon: <MehIcon className="w-4 h-4" /> },
      { value: 3, label: 'Good', icon: <Smile className="w-4 h-4" /> },
      { value: 4, label: 'Great!', icon: <Sparkles className="w-4 h-4 text-emerald-500" /> },
      { value: 5, label: 'Masterpiece!', icon: <Crown className="w-4 h-4 text-amber-500" /> }
    ];

    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-3 sm:px-4 py-4 sm:py-8 font-sans justify-center items-center w-full max-w-full overflow-x-hidden">
        <div className="info-card w-full max-w-md p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col gap-5 sm:gap-6">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-black pb-3">
            <span className="text-[10px] font-black text-slate-600 uppercase truncate max-w-[140px]">
              Name: {currentPlayer?.name}
            </span>
            <span className="text-[10px] font-black text-[#DD4DCC] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-black">
              Room {session.sessionId}
            </span>
          </div>

          {currentVideo ? (
            <div className="flex flex-col gap-4 py-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 py-0.5 rounded border border-slate-200 inline-block mx-auto px-2">
                Theme {session.currentVideoIndex + 1} of {session.videos?.length}
              </span>

              <div className="flex flex-col gap-1.5 mt-2">
                <h2 className="text-xl sm:text-2xl font-black font-title text-black leading-tight border-b-2 border-black pb-2">
                  {currentVideo.title}
                </h2>
                <p className="text-xs font-bold text-fuchsia-950 mt-1">
                  By {currentVideo.artistName || 'Unknown Artist'} {currentVideo.description ? `— ${currentVideo.description}` : ''}
                </p>
              </div>

              {isRevealPhase ? (
                /* REVEAL PHASE PLAYER VIEW */
                <div className="mt-4 flex flex-col gap-4 py-3 bg-white p-5 rounded-2xl border-2 border-black shadow-[2px_2px_0px_#000]">
                  <span className="text-xs font-black text-fuchsia-900 uppercase flex items-center justify-center gap-1.5">
                    <BarChart2 className="w-4 h-4" />
                    <span>Vote Results Revealed on Main Screen!</span>
                  </span>
                  <div className="text-xs font-black text-black">
                    {currentVote !== undefined ? (
                      <span>Your vote: <strong className="text-base font-mono text-[#DD4DCC]">{currentVote}/5</strong></span>
                    ) : (
                      <span className="text-slate-500">You didn't submit a vote this round</span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleSkip}
                    className={`w-full py-3 px-4 border-2 border-black font-black text-xs uppercase rounded-xl transition shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 ${hasSkipped
                        ? 'bg-purple-200 text-purple-950 border-dashed'
                        : 'bg-[#DD4DCC] text-white hover:bg-fuchsia-600'
                      }`}
                  >
                    {hasSkipped ? <Check className="w-3.5 h-3.5" /> : <SkipForward className="w-3.5 h-3.5" />}
                    <span>{hasSkipped ? 'Ready for Next Video' : 'Skip to Next Track'}</span>
                    <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded font-mono ml-auto">
                      {skipsCount} / {activeConnectedPlayers.length}
                    </span>
                  </button>
                </div>
              ) : (
                /* VOTING PHASE PLAYER VIEW */
                <div className="mt-4 flex flex-col gap-5 sm:gap-6">
                  <div className="flex justify-between items-center px-1 gap-1.5 sm:gap-2">
                    {ratingOptions.map((item) => {
                      const isSelected = currentVote === item.value;
                      const isAnySelected = currentVote !== undefined;

                      let btnStyle = "border-2 border-black bg-white text-black hover:-translate-y-0.5 active:translate-y-0.5";
                      if (isSelected) {
                        if (item.value === 1) btnStyle = "border-4 border-black bg-red-600 text-white shadow-[2px_2px_0px_#000]";
                        else if (item.value === 2) btnStyle = "border-4 border-black bg-orange-500 text-white shadow-[2px_2px_0px_#000]";
                        else if (item.value === 3) btnStyle = "border-4 border-black bg-yellow-400 text-black shadow-[2px_2px_0px_#000]";
                        else if (item.value === 4) btnStyle = "border-4 border-black bg-emerald-500 text-white shadow-[2px_2px_0px_#000]";
                        else if (item.value === 5) btnStyle = "border-4 border-black bg-[#DD4DCC] text-white shadow-[2px_2px_0px_#000]";
                      } else if (isAnySelected) {
                        btnStyle = "border-2 border-slate-300 bg-slate-100 text-slate-400 opacity-40";
                      } else {
                        if (item.value === 1) btnStyle = "border-2 border-black bg-white hover:bg-red-50 text-black";
                        else if (item.value === 2) btnStyle = "border-2 border-black bg-white hover:bg-orange-50 text-black";
                        else if (item.value === 3) btnStyle = "border-2 border-black bg-white hover:bg-yellow-50 text-black";
                        else if (item.value === 4) btnStyle = "border-2 border-black bg-white hover:bg-emerald-50 text-black";
                        else if (item.value === 5) btnStyle = "border-2 border-black bg-white hover:bg-blue-50 text-black";
                      }

                      return (
                        <button
                          key={item.value}
                          onClick={() => handleVote(item.value)}
                          className={`h-11 w-11 sm:h-14 sm:w-14 rounded-full text-base sm:text-xl font-black transition-all flex items-center justify-center cursor-pointer shrink-0 ${btnStyle}`}
                        >
                          {item.value}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-6 flex items-center justify-center">
                    {currentVote !== undefined ? (
                      (() => {
                        const opt = ratingOptions.find(r => r.value === currentVote);
                        return (
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <span>{opt?.label}</span>
                            {opt?.icon}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span>Select your rating</span>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      </span>
                    )}
                  </div>

                  {/* Skip Button for Player */}
                  <button
                    onClick={handleToggleSkip}
                    className={`w-full py-3 px-4 border-2 border-black font-black text-xs uppercase rounded-xl transition shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 ${hasSkipped
                        ? 'bg-amber-200 text-amber-950 border-dashed'
                        : 'bg-white hover:bg-slate-100 text-black'
                      }`}
                  >
                    {hasSkipped ? <Check className="w-3.5 h-3.5" /> : <SkipForward className="w-3.5 h-3.5" />}
                    <span>{hasSkipped ? 'You Voted to Skip Video' : 'Vote to Skip Video'}</span>
                    <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded font-mono ml-auto">
                      {skipsCount} / {activeConnectedPlayers.length}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-slate-500 font-bold text-xs">Loading video metadata...</div>
          )}

          <button
            onClick={handleLeave}
            className="w-full mt-2 py-3 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl transition shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 inline-flex items-center justify-center gap-2"
          >
            <span>Leave Game</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. LEADERBOARD VIEW
  if (session.status === 'LEADERBOARD') {
    return (
      <div className="relative flex flex-col flex-1 bg-transparent px-4 py-8 font-sans justify-center items-center">
        <div className="info-card w-full max-w-md p-8 rounded-3xl text-center flex flex-col gap-6">
          <Trophy className="w-14 h-14 text-amber-500 mx-auto animate-bounce" />
          <h2 className="text-3xl font-black font-title text-black uppercase transform rotate-[-1deg]">Game Finished!</h2>
          <p className="text-xs font-bold text-slate-700 leading-relaxed max-w-xs mx-auto">
            All themes have been rated! Look at the Host screen to see who won and what the final rankings are.
          </p>

          <button
            onClick={handleLeave}
            className="w-full mt-4 py-3.5 px-6 bg-[#DD4DCC] text-white border-2 border-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Back to Homepage</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
