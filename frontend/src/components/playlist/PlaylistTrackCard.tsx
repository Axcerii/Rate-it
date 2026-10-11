'use client';

import React from 'react';
import { Play, Check, X } from '@/components/icons';

export interface PlaylistTrack {
  trackId?: string | number;
  id?: string | number;
  youtubeId: string;
  title: string;
  artistName?: string | null;
  malTitle?: string | null;
  description?: string | null;
}

export interface PlaylistTrackCardProps {
  track: PlaylistTrack;
  index: number;
  selectable?: boolean;
  isChecked?: boolean;
  onToggle?: () => void;
  badgeText?: string;
  checkboxSide?: 'left' | 'right';
  disablePlay?: boolean;
}

export default function PlaylistTrackCard({
  track,
  index,
  selectable = false,
  isChecked = true,
  onToggle,
  badgeText,
  checkboxSide = 'right',
  disablePlay = false,
}: PlaylistTrackCardProps) {
  const content = (
    <>
      {/* 1. Miniature vidéo dans l'encadré central transparent de Film.png */}
      <div
        className={`absolute left-[14%] right-[14%] top-[21%] bottom-[20.5%] overflow-hidden bg-black flex items-center justify-center ${selectable && !isChecked ? 'opacity-35 grayscale' : ''
          }`}
      >
        <img
          src={`https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`}
          alt={track.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('mqdefault')) {
              target.src = `https://img.youtube.com/vi/${track.youtubeId}/mqdefault.jpg`;
            }
          }}
        />

        {/* Numéro ou badge de la piste en vintage */}
        <span
          className={`absolute top-1 ${checkboxSide === 'left' ? 'right-1' : 'left-1'
            } px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-xs font-black leading-none z-10 border border-white/20 select-none`}
        >
          {badgeText || `#${index + 1}`}
        </span>

        {/* Badge "Exclu" si désactivé en mode sélection */}
        {selectable && !isChecked && (
          <span className="absolute z-20 px-2 py-0.5 rounded bg-accent-red text-white font-mono text-xs font-black uppercase border border-black/40 select-none">
            Exclu
          </span>
        )}

        {/* Checkbox de sélection tactile */}
        {selectable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className={`absolute top-1 ${checkboxSide === 'left' ? 'left-1' : 'right-1'
              } z-30 w-5 h-5 rounded border-2 border-black flex items-center justify-center cursor-pointer transition-transform active:scale-90 shadow-none ${isChecked
                ? 'bg-accent-red hover:bg-accent-red text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            title={isChecked ? 'Désactiver cette musique' : 'Activer cette musique'}
            aria-label={isChecked ? 'Désactiver' : 'Activer'}
          >
            {isChecked ? (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <X className="w-3.5 h-3.5 stroke-[3]" />
            )}
          </button>
        )}

        {/* Bouton Play au survol de la miniature (pour preview sur YouTube) */}
        {!disablePlay && (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
            {selectable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.youtube.com/watch?v=${track.youtubeId}`, '_blank', 'noopener,noreferrer');
                }}
                className="pointer-events-auto w-8 h-8 rounded-full bg-white/95 border-2 border-black flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-none"
                title="Aperçu YouTube"
              >
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/95 border-2 border-black flex items-center justify-center transition-transform group-hover:scale-110">
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Image du cadre de Film (Film.png avec perforations 35mm et bandes noires) */}
      <img
        src="/PLAYLIST/Film.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10 select-none"
      />

      {/* 3. Titre en blanc sur la bande noire du dessus */}
      <div className="absolute top-0 left-[14%] right-[14%] h-[21%] z-20 flex items-center justify-center px-1.5 text-center pointer-events-none">
        <h4
          className={`text-white font-black text-xs leading-tight truncate w-full group-hover:text-[#FEEC66] transition-colors tracking-tight ${selectable && !isChecked ? 'line-through text-slate-400' : ''
            }`}
          title={track.title}
        >
          {track.title}
        </h4>
      </div>

      {/* 4. Artiste en blanc sur la bande noire du dessous */}
      <div className="absolute bottom-0 left-[14%] right-[14%] h-[20.5%] z-20 flex items-center justify-center px-1.5 text-center pointer-events-none">
        <p
          className={`text-white/90 font-bold text-xs leading-tight truncate w-full ${selectable && !isChecked ? 'text-slate-400' : ''
            }`}
          title={track.artistName || 'Artiste inconnu'}
        >
          {track.artistName || 'Artiste inconnu'}
        </p>
      </div>
    </>
  );

  if (selectable) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle?.();
          }
        }}
        title={`${track.title} - ${track.artistName || 'Artiste inconnu'} (${isChecked ? 'Activé - Cliquer pour exclure' : 'Exclu - Cliquer pour activer'})`}
        className={`group relative w-full aspect-[500/410] select-none text-left transition-transform duration-150 hover:-translate-y-1 active:translate-y-0 block bg-transparent cursor-pointer shadow-none ${!isChecked ? 'opacity-80' : ''
          }`}
      >
        {content}
      </div>
    );
  }

  if (disablePlay) {
    return (
      <div
        title={`${track.title} - ${track.artistName || 'Artiste inconnu'}${track.malTitle ? ` (${track.malTitle})` : ''}`}
        className="group relative w-full aspect-[500/410] select-none text-left transition-transform duration-200 block bg-transparent shadow-none"
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`${track.title} - ${track.artistName || 'Artiste inconnu'}${track.malTitle ? ` (${track.malTitle})` : ''} — Ouvrir sur YouTube`}
      className="group relative w-full aspect-[500/410] select-none text-left transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 block bg-transparent shadow-none"
    >
      {content}
    </a>
  );
}

