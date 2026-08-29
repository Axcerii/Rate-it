'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/lib/useSocket';
import HostButton from '@/components/HostButton';
import JoinCard from '@/components/JoinCard';
import CreatePlaylistButton from '@/components/CreatePlaylistButton';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, session, isHost, showBanner } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hasUrlCode, setHasUrlCode] = useState(false);

  // Redirect to active session if restored
  useEffect(() => {
    if (session) {
      if (isHost) {
        router.push('/host');
      } else {
        router.push('/play');
      }
    }
  }, [session, isHost, router]);

  // Load previous player name and check URL query params for room code on mount
  useEffect(() => {
    const savedName = localStorage.getItem('rate_it_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        setRoomCode(code.toUpperCase());
        setHasUrlCode(true);
      }
    }
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createRoom();
      router.push('/host');
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Échec de la création de la salle', 'error');
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      showBanner('Veuillez entrer un pseudonyme valide', 'warning');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      showBanner('Veuillez entrer un code de salle valide', 'warning');
      return;
    }

    setIsJoining(true);

    try {
      localStorage.setItem('rate_it_player_name', playerName.trim());
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      router.push('/play');
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Salle introuvable, veuillez vérifier le code de la salle.', 'error');
      setIsJoining(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center bg-transparent px-3 sm:px-6 py-4 sm:py-8 font-sans w-full max-w-full overflow-x-hidden">

      {/* Main Card Container */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center justify-center gap-4 sm:gap-6 px-1 sm:px-0">

        {/* Header Logo */}
        <div className="flex justify-center items-center">
          <img
            src="/LOGOS/RateItLogo.png"
            alt="Rate It Logo"
            className="w-auto h-28 sm:h-48 xl:h-64 object-contain max-w-full transition-transform duration-300"
          />
        </div>

        {/* Action Panel Grid */}
        <div className="grid w-full gap-8 md:grid-cols-2">
          {hasUrlCode ? (
            <>
              {/* Join Card first if URL contains code */}
              <div className="flex items-center justify-center">
                <JoinCard
                  playerName={playerName}
                  setPlayerName={setPlayerName}
                  roomCode={roomCode}
                  setRoomCode={setRoomCode}
                  onSubmit={handleJoin}
                  disabled={isCreating || isJoining}
                  loading={isJoining}
                />
              </div>

              {/* Host Button second */}
              <div className="flex items-center justify-center">
                <HostButton
                  onClick={handleCreate}
                  disabled={isCreating || isJoining}
                  loading={isCreating}
                />
              </div>
            </>
          ) : (
            <>
              {/* Host Button first */}
              <div className="flex items-center justify-center">
                <HostButton
                  onClick={handleCreate}
                  disabled={isCreating || isJoining}
                  loading={isCreating}
                />
              </div>

              {/* Join Card second */}
              <div className="flex items-center justify-center">
                <JoinCard
                  playerName={playerName}
                  setPlayerName={setPlayerName}
                  roomCode={roomCode}
                  setRoomCode={setRoomCode}
                  onSubmit={handleJoin}
                  disabled={isCreating || isJoining}
                  loading={isJoining}
                />
              </div>
            </>
          )}
        </div>

        {/* Create Playlist Button (Spans full length under the two main buttons) */}
        <div className="w-full mt-4 mb-2 flex items-center justify-center">
          <CreatePlaylistButton
            onClick={() => router.push('/playlists/new')}
            disabled={isCreating || isJoining}
          />
        </div>

        {/* Footer Link: CGU & Crédits */}
        <footer className="mt-6 mb-2 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-slate-800 select-none">
          <Link
            href="/cgu"
            className="hover:text-black focus:text-black underline underline-offset-4 decoration-slate-400 hover:decoration-black transition-colors"
          >
            Conditions Générales d'Utilisation & Crédits
          </Link>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">Rate It © {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
