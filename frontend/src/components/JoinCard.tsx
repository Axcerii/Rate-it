'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface JoinCardProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function JoinCard({
  playerName,
  setPlayerName,
  roomCode,
  setRoomCode,
  onSubmit,
  disabled = false,
  loading = false,
  className = '',
}: JoinCardProps) {
  const [isJoinHovered, setIsJoinHovered] = useState(false);
  const [isJoinFocused, setIsJoinFocused] = useState(false);
  const [showRoomCode, setShowRoomCode] = useState(false);

  const isActive = isJoinHovered || isJoinFocused;

  return (
    <div className={`relative w-full select-none text-left ${className}`}>
      {/* Background Card Container (styled matching Join.png with exact dark purple #7d0c52) */}
      <form
        onSubmit={onSubmit}
        className={`relative w-full aspect-auto sm:aspect-[1.5/1] min-h-[260px] sm:min-h-0 rounded-3xl bg-[#D936C5] border-4 border-[#7d0c52] transition-all duration-300 ease-out p-4 sm:p-5 flex flex-col justify-between overflow-hidden sm:overflow-visible ${isActive
          ? 'scale-[1.02] shadow-[8px_8px_0px_0px_#7d0c52] ring-6 ring-[#A855F7] bg-[#E442D0]'
          : 'scale-100 shadow-none ring-0 ring-transparent'
          }`}
      >
        {/* Subtle inner halftone/gradient overlay */}
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/20 via-transparent to-black/20 pointer-events-none z-0" />

        {/* 1. BG_join.png (Crew Silhouettes Layer) */}
        <img
          src="/JOIN/BG_join.png"
          alt=""
          aria-hidden="true"
          className={`absolute left-0 bottom-1/4 w-full h-[65%] object-cover opacity-45 mix-blend-multiply pointer-events-none z-0 rounded-b-[20px] transition-transform duration-300 ease-out ${isActive ? 'scale-105' : 'scale-100'
            }`}
        />

        {/* Dark Horizontal Stripe near bottom (matching Join.png in #7d0c52) */}
        <div className="absolute bottom-[16%] left-0 w-full h-8 sm:h-10 bg-[#7d0c52] z-10 pointer-events-none opacity-90" />

        {/* 2. Join_chain.png (Diagonal Chain Layer extending to top right) */}
        <img
          src="/JOIN/Join_chain.png"
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-15 opacity-90 transition-transform duration-300 ease-out ${isActive
            ? 'translate-x-2 -translate-y-1 rotate-1 scale-150'
            : 'translate-x-0 translate-y-0 rotate-0 scale-140'
            }`}
        />

        {/* Form Inputs Container (Relative Z-20 over background layers) */}
        <div className="relative z-20 flex flex-col gap-2 max-w-[90%] sm:max-w-[78%] mx-auto w-full pt-0.5 pb-8 sm:pb-0">
          {/* Nickname Field ("Nom") */}
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="playerName"
              className="text-white font-black text-xs sm:text-sm tracking-wide drop-shadow-[0_2px_0_#7d0c52] [text-shadow:-1.5px_-1.5px_0_#7d0c52,1.5px_-1.5px_0_#7d0c52,-1.5px_1.5px_0_#7d0c52,1.5px_1.5px_0_#7d0c52]"
            >
              Nom
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Monkey. D. Luffy"
              maxLength={16}
              disabled={disabled || loading}
              className="w-full bg-white border-3 border-[#7d0c52] rounded-xl px-3 py-1.5 sm:py-2 text-slate-900 font-bold text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-3 focus:ring-[#7A1FA2] shadow-inner transition-all disabled:opacity-50"
            />
          </div>

          {/* Room Code Field ("Code") */}
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="roomCode"
              className="text-white font-black text-xs sm:text-sm tracking-wide drop-shadow-[0_2px_0_#7d0c52] [text-shadow:-1.5px_-1.5px_0_#7d0c52,1.5px_-1.5px_0_#7d0c52,-1.5px_1.5px_0_#7d0c52,1.5px_1.5px_0_#7d0c52]"
            >
              Code
            </label>
            <div className="relative w-full">
              <input
                type={showRoomCode ? 'text' : 'password'}
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                disabled={disabled || loading}
                className="w-full bg-white border-3 border-[#7d0c52] rounded-xl pl-3 pr-10 py-1.5 sm:py-2 text-center text-slate-900 font-black text-sm sm:text-base tracking-widest uppercase placeholder-slate-300 focus:outline-none focus:ring-3 focus:ring-[#7A1FA2] shadow-inner transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowRoomCode(!showRoomCode)}
                tabIndex={-1}
                title={showRoomCode ? 'Hide Code' : 'Show Code'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1 rounded focus:outline-none flex items-center justify-center"
              >
                {showRoomCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3. JOIN Submit Button (Sits slightly higher at bottom-[-3%] matching HostText) */}
        <button
          type="submit"
          disabled={disabled || loading}
          aria-label={loading ? 'Joining game lobby...' : 'Join game lobby'}
          aria-busy={loading}
          onMouseEnter={() => setIsJoinHovered(true)}
          onMouseLeave={() => setIsJoinHovered(false)}
          onFocus={() => setIsJoinFocused(true)}
          onBlur={() => setIsJoinFocused(false)}
          className="absolute left-1/2 bottom-[-3%] -translate-x-1/2 z-30 cursor-pointer focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed group/btn"
        >
          <img
            src="/JOIN/JoinText.png"
            alt="JOIN"
            className={`w-48 sm:w-52 h-auto transition-transform duration-300 ease-out origin-center ${isActive
              ? 'scale-130 -translate-y-2 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]'
              : 'scale-120 translate-y-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]'
              }`}
          />
        </button>

        {/* Loading Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[20px] bg-black/40 backdrop-blur-xs">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}
      </form>
    </div>
  );
}
