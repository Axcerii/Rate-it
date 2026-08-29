'use client';

import React from 'react';
import { useSocket, BannerType } from '@/lib/useSocket';
import { AlertOctagon, AlertTriangle, Info, Radio, CheckCircle2, X } from 'lucide-react';

interface ThemeConfig {
  bgClass: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  textColor: string;
  icon: React.ReactNode;
}

const getBannerConfig = (type: BannerType = 'error', sender?: string): ThemeConfig => {
  switch (type) {
    case 'announcement':
      return {
        bgClass: 'bg-menu text-black',
        badgeBg: 'bg-black',
        badgeText: 'text-menu',
        badgeLabel: sender ? `TWITCH @${sender.toUpperCase()}` : 'ANNONCE TWITCH',
        textColor: 'text-black',
        icon: <Radio className="w-5 h-5 text-menu animate-pulse" />,
      };
    case 'info':
      return {
        bgClass: 'bg-host text-white',
        badgeBg: 'bg-black',
        badgeText: 'text-host',
        badgeLabel: 'INFORMATION',
        textColor: 'text-white',
        icon: <Info className="w-5 h-5 text-host" />,
      };
    case 'success':
      return {
        bgClass: 'bg-playlist text-white',
        badgeBg: 'bg-black',
        badgeText: 'text-playlist',
        badgeLabel: 'SUCCÈS',
        textColor: 'text-white',
        icon: <CheckCircle2 className="w-5 h-5 text-playlist" />,
      };
    case 'warning':
      return {
        bgClass: 'bg-play text-white',
        badgeBg: 'bg-black',
        badgeText: 'text-play',
        badgeLabel: 'ATTENTION',
        textColor: 'text-white',
        icon: <AlertTriangle className="w-5 h-5 text-play" />,
      };
    case 'error':
    default:
      return {
        bgClass: 'bg-admin text-white',
        badgeBg: 'bg-black',
        badgeText: 'text-admin',
        badgeLabel: 'ERREUR',
        textColor: 'text-white',
        icon: <AlertOctagon className="w-5 h-5 text-admin" />,
      };
  }
};

export default function BannerNotification() {
  const { banner, hideBanner } = useSocket();

  if (!banner) return null;

  const config = getBannerConfig(banner.type, banner.sender);

  const displayMessage = banner.sender && banner.type !== 'announcement'
    ? `[${banner.sender}]: ${banner.message}`
    : banner.message;

  return (
    <>
      <style>{`
        @keyframes bannerUnfoldRight {
          0% {
            opacity: 0;
            transform: translateX(100%) scaleX(0.05);
          }
          65% {
            opacity: 1;
            transform: translateX(0) scaleX(1.02);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scaleX(1);
          }
        }
        .banner-unfold-anim {
          animation: bannerUnfoldRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          transform-origin: right center !important;
        }
      `}</style>
      <div
        key={banner.id}
        className="fixed top-0 left-0 right-0 z-50 banner-unfold-anim overflow-hidden"
      >
        <div
          className={`w-full border-b-4 border-white px-4 py-3 shadow-[0px_4px_16px_rgba(0,0,0,0.4)] flex items-center justify-between gap-3 font-sans ${config.bgClass}`}
        >
          <div className="flex items-center gap-3 flex-1 overflow-hidden min-w-0">
            <div className="p-2 rounded-xl bg-black border-2 border-black shrink-0 flex items-center justify-center">
              {config.icon}
            </div>

            <div className="flex flex-col flex-1 truncate">
              <span className={`text-[10px] font-black uppercase tracking-wider ${config.badgeBg} ${config.badgeText} px-2 py-0.5 rounded w-max border border-black mb-0.5`}>
                {config.badgeLabel}
              </span>
              <p className={`text-xs sm:text-sm font-black truncate tracking-wide leading-tight ${config.textColor}`}>
                {displayMessage}
              </p>
            </div>
          </div>

          <button
            onClick={hideBanner}
            className="p-1.5 bg-black hover:bg-slate-800 focus:bg-slate-800 focus-visible:bg-slate-800 text-white rounded-lg border-2 border-black shrink-0 transition active:scale-95"
            title="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
