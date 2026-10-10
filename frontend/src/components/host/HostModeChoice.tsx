'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import HomeButton from '@/components/HomeButton';

export type HostQuizMode = 'playlist' | 'mal';

interface HostModeChoiceProps {
  onChoose: (mode: HostQuizMode) => void;
  onBackToHome: () => void;
}

const CHOICES: { mode: HostQuizMode; image: string; alt: string; title: string; text: string; tilt: string }[] = [
  {
    mode: 'playlist',
    image: '/LOGOS/Bouton_Playlist.png',
    alt: 'Playlists',
    title: 'Utiliser une playlist préfaite',
    text: 'Explorez le catalogue officiel, les playlists communautaires ou chargez un code.',
    tilt: '-2.5deg',
  },
  {
    mode: 'mal',
    image: '/LOGOS/Bouton_MAL_AL.png',
    alt: 'MyAnimeList / AniList',
    title: 'Importer une liste depuis MAL / AL',
    text: 'Générez automatiquement une playlist avec les openings de vos animés complétés.',
    tilt: '2deg',
  },
];

// Geometry of the tag, in px: the string comes out from behind the picture and loops through the eyelet
const STRING_HEIGHT = 64; // part of the string above the tag
const EYELET_Y = 24; // centre of the hole, from the top edge of the tag
const HOLE_RADIUS = 7;
const HOLE_MASK = `radial-gradient(circle ${HOLE_RADIUS}px at 50% ${EYELET_Y}px, transparent ${HOLE_RADIUS - 0.5}px, #000 ${HOLE_RADIUS}px)`;

// First screen of the host lobby: where do the songs of this session come from?
// Each choice is its picture with a luggage tag tied to it (same string and paper as /PLAYLIST/etiquette.png).
export default function HostModeChoice({ onChoose, onBackToHome }: HostModeChoiceProps) {
  return (
    <div className="flex-1 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16 gap-8 sm:gap-10 lg:gap-12 animate-in fade-in duration-300">
      <div className="text-center flex flex-col items-center">
        <h2 className="font-title text-2xl text-black leading-tight tracking-wide max-w-2xl lg:max-w-4xl text-center">
          Comment souhaitez-vous sélectionner les musiques pour cette session ?
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-8 lg:gap-10 xl:gap-12 w-full px-2 sm:px-4 lg:px-6 items-stretch">
        {CHOICES.map((choice) => (
          <button
            key={choice.mode}
            type="button"
            onClick={() => onChoose(choice.mode)}
            className="group relative flex flex-col items-center h-full w-full text-left cursor-pointer select-none focus:outline-none shadow-none"
          >
            <div className="relative z-10 w-full flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03] group-active:scale-[0.98]">
              <img
                src={choice.image}
                alt={choice.alt}
                className="w-full h-auto max-h-[220px] sm:max-h-[280px] lg:max-h-[340px] xl:max-h-[400px] object-contain drop-shadow-md group-hover:drop-shadow-xl transition-all duration-200"
                draggable={false}
              />
            </div>

            {/* The tag hangs from the picture: it swings from the point where the string disappears behind it */}
            <div
              className="mode-tag relative z-0 w-[86%] sm:w-[82%] flex-1 flex flex-col -mt-9 sm:-mt-10 lg:-mt-12"
              style={{ '--tag-tilt': choice.tilt, paddingTop: STRING_HEIGHT } as React.CSSProperties}
            >
              <svg
                aria-hidden="true"
                viewBox={`0 0 36 ${STRING_HEIGHT + EYELET_Y}`}
                width={36}
                height={STRING_HEIGHT + EYELET_Y}
                className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none overflow-visible"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* A loop of white string with a black outline, knotted through the eyelet */}
                <path d={`M18 0 C 5 ${STRING_HEIGHT * 0.35}, 7 ${STRING_HEIGHT * 0.8}, 18 ${STRING_HEIGHT + EYELET_Y - 2} C 29 ${STRING_HEIGHT * 0.8}, 31 ${STRING_HEIGHT * 0.35}, 18 0`} stroke="#000" strokeWidth={7} />
                <path d={`M18 0 C 5 ${STRING_HEIGHT * 0.35}, 7 ${STRING_HEIGHT * 0.8}, 18 ${STRING_HEIGHT + EYELET_Y - 2} C 29 ${STRING_HEIGHT * 0.8}, 31 ${STRING_HEIGHT * 0.35}, 18 0`} stroke="#fff" strokeWidth={3} />
              </svg>

              <div
                className="relative flex-1 flex flex-col bg-[#FBF0C9] group-hover:bg-menu group-focus-visible:bg-menu border-[3px] sm:border-4 border-black rounded-2xl sm:rounded-3xl px-4 sm:px-6 lg:px-7 pb-4 sm:pb-6 lg:pb-7 pt-12 sm:pt-13 transition-colors duration-200"
                style={{ WebkitMaskImage: HOLE_MASK, maskImage: HOLE_MASK }}
              >
                {/* Reinforced eyelet around the punched hole */}
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white border-[3px] border-black"
                  style={{ top: EYELET_Y - 14, width: 28, height: 28, marginTop: -4 }}
                />

                <div className="flex items-center justify-between w-full gap-2 text-black font-title text-base sm:text-xl lg:text-2xl xl:text-3xl uppercase text-left leading-snug">
                  <span>{choice.title}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-xs sm:text-sm lg:text-base xl:text-lg font-bold text-slate-700 mt-2 lg:mt-3 leading-relaxed text-left">
                  {choice.text}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Leave without choosing */}
      <div className="flex justify-center pt-2">
        <HomeButton
          onClick={onBackToHome}
          sizeClassName="h-10 sm:h-12 md:h-14"
          title="Retourner à l'accueil"
          ariaLabel="Retourner à l'accueil"
        />
      </div>
    </div>
  );
}
