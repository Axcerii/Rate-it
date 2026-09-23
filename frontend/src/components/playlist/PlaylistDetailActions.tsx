'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { Play, Share2, FileEdit, Check, Loader2 } from 'lucide-react';

interface PlaylistDetailActionsProps {
  playlistId: string;
  isValidated: boolean;
}

export default function PlaylistDetailActions({ playlistId, isValidated }: PlaylistDetailActionsProps) {
  const router = useRouter();
  const { createRoom, showBanner } = useSocket();
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLaunch = async () => {
    setIsStarting(true);
    try {
      await createRoom();
      router.push(`/host?playlistId=${playlistId}`);
    } catch (err: any) {
      console.error('Failed to launch room:', err);
      showBanner(err.message || 'Erreur lors du lancement de la salle', 'error');
      setIsStarting(false);
    }
  };

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showBanner('Lien de la playlist copié dans le presse-papier !', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Launch game button */}
      <button
        type="button"
        onClick={handleLaunch}
        disabled={isStarting}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#BF1539] text-white border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-[#d41c44] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 shadow-none cursor-pointer"
      >
        {isStarting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Création du salon...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Lancer une partie</span>
          </>
        )}
      </button>

      {/* Share button */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-black border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-none cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span>Copié !</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span>Partager</span>
          </>
        )}
      </button>

      {/* Edit with secret button (if custom and not validated) */}
      {!isValidated && (
        <button
          type="button"
          onClick={() => router.push(`/playlists/new?clone=${playlistId}`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2fc355] text-black border-2 border-black rounded-xl font-black text-xs uppercase hover:bg-[#34d15d] active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-none cursor-pointer"
        >
          <FileEdit className="w-4 h-4" />
          <span>Cloner / Modifier</span>
        </button>
      )}
    </div>
  );
}
