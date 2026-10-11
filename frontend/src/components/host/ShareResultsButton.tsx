'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, ImageIcon, Loader2, Share2 } from '@/components/icons';
import CloseButton from '@/components/CloseButton';
import { useSocket } from '@/lib/useSocket';
import { buildShareCardData, renderShareCard } from './shareCard';
import type { GameSession } from '../../../../shared/types';

interface ShareResultsButtonProps {
  session: GameSession;
  hostCustomName: string;
  className?: string;
}

const FILE_NAME = 'rate-it-resultats.png';

// Button of the leaderboard opening the shareable picture of the results (preview, download, share, copy)
export default function ShareResultsButton({ session, hostCustomName, className = '' }: ShareResultsButtonProps) {
  const { showBanner } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => buildShareCardData(session, hostCustomName), [session, hostCustomName]);

  // The picture is only drawn when asked for, and again if the results changed since
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let url: string | null = null;

    renderShareCard(data)
      .then((canvas) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')))
      .then((blob) => {
        if (cancelled) return;
        if (!blob) throw new Error('Export impossible');
        url = URL.createObjectURL(blob);
        setError(null);
        setImage({ blob, url });
      })
      .catch((err) => {
        console.error('Failed to render the share card:', err);
        if (!cancelled) setError("Impossible de générer l'image sur ce navigateur.");
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setImage(null);
    };
  }, [isOpen, data]);

  const file = useMemo(() => (image ? new File([image.blob], FILE_NAME, { type: 'image/png' }) : null), [image]);
  const canShareFile = Boolean(file && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] }));
  const canCopyImage = typeof window !== 'undefined' && 'ClipboardItem' in window && Boolean(navigator.clipboard?.write);

  const handleShare = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'Mes résultats Rate It', text: 'Mes résultats sur Rate It !' });
    } catch (err) {
      // The user closing the share sheet is not an error
      if ((err as Error)?.name !== 'AbortError') showBanner('Le partage a échoué. Téléchargez plutôt l\'image.', 'error');
    }
  };

  const handleCopy = async () => {
    if (!image) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image.blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
      showBanner('Copie impossible. Téléchargez plutôt l\'image.', 'error');
    }
  };

  const actionClass =
    'flex-1 min-w-[140px] py-2.5 px-3 border-2 border-black text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2 cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={data.top.length === 0}
        className={`bg-menu border-2 border-black text-black font-black uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        title={data.top.length === 0 ? 'Aucun vote à partager' : 'Créer une image de vos résultats à partager'}
      >
        <ImageIcon className="w-4 h-4 shrink-0" />
        <span>Partager les résultats</span>
      </button>

      {/* In a portal: the sidebar holding the button is its own stacking context, below the podium cards */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="info-card rounded-2xl p-4 sm:p-5 max-w-3xl w-full h-[96vh] flex flex-col items-center gap-3 shadow-none relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-title text-base uppercase text-black text-center w-full px-10">
              Partager les résultats
            </h3>

            {/* The picture always fits entirely: as big as the height of the window allows */}
            <div className="w-full min-h-0 flex-1 flex items-center justify-center">
              {image ? (
                <img src={image.url} alt="Résultats de la partie" className="max-w-full max-h-full w-auto h-auto block border-2 border-black rounded-xl" />
              ) : error ? (
                <p className="text-xs font-black text-accent-red text-center p-8">{error}</p>
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-black">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-black uppercase">Création de l&apos;image...</span>
                </div>
              )}
            </div>

            <div className="w-full flex flex-wrap gap-2">
              {canShareFile && (
                <button type="button" onClick={handleShare} className={`${actionClass} bg-host`}>
                  <Share2 className="w-4 h-4" />
                  <span>Partager</span>
                </button>
              )}
              <a
                href={image?.url}
                download={FILE_NAME}
                aria-disabled={!image}
                className={`${actionClass} bg-playlist ${image ? '' : 'opacity-40 pointer-events-none'}`}
              >
                <Download className="w-4 h-4" />
                <span>Télécharger</span>
              </a>
              {canCopyImage && (
                <button type="button" onClick={handleCopy} disabled={!image} className={`${actionClass} bg-white disabled:opacity-40`}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Image copiée !' : 'Copier l\'image'}</span>
                </button>
              )}
            </div>

            <CloseButton
              onClick={() => setIsOpen(false)}
              className="!absolute top-2 right-2 !z-50"
              sizeClassName="w-8 h-8"
              title="Fermer"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
