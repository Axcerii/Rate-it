'use client';

import React from 'react';
import { useSocket } from '@/lib/useSocket';
import { AlertTriangle, Radio, X, Sparkles } from 'lucide-react';

export default function BannerNotification() {
  const { banner, hideBanner } = useSocket();

  if (!banner) return null;

  const isAnnouncement = banner.type === 'announcement';

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
          className={`w-full border-b-4 border-black px-4 py-3 shadow-[0px_4px_16px_rgba(0,0,0,0.4)] flex items-center justify-between gap-3 font-sans ${
            isAnnouncement
              ? 'bg-[#24B3F1] text-black'
              : 'bg-[#990000] text-white'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 overflow-hidden min-w-0">
            <div className="p-2 rounded-xl bg-black border-2 border-black shrink-0 flex items-center justify-center">
              {isAnnouncement ? (
                <Radio className="w-5 h-5 text-yellow-400 animate-pulse" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-white" />
              )}
            </div>

            <div className="flex flex-col flex-1 truncate">
              <span className="text-[10px] font-black uppercase tracking-wider text-black bg-white/90 px-2 py-0.5 rounded w-max border border-black mb-0.5">
                {isAnnouncement ? 'Twitch Announcement' : 'Notification / Notice'}
              </span>
              <p className="text-xs sm:text-sm font-black truncate tracking-wide leading-tight text-white">
                {banner.message}
              </p>
            </div>
          </div>

          <button
            onClick={hideBanner}
            className="p-1.5 bg-black hover:bg-slate-800 text-white rounded-lg border-2 border-black shrink-0 transition active:scale-95"
            title="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
