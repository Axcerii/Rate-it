'use client';

import React from 'react';
import { Film, CheckCircle2, Users, Search, X } from 'lucide-react';

export interface PlaylistFiltersProps {
  categories: readonly string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  activeTab: 'validated' | 'community';
  onSelectTab: (tab: 'validated' | 'community') => void;
  validatedCount: number;
  communityCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function PlaylistFilters({
  categories,
  activeCategory,
  onSelectCategory,
  activeTab,
  onSelectTab,
  validatedCount,
  communityCount,
  searchQuery,
  onSearchChange,
}: PlaylistFiltersProps) {
  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      {/* Category Filters Bar (Horizontal Pills) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            <span>Filtrer par catégorie</span>
          </span>
          {activeCategory !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-[11px] font-bold text-slate-800 hover:text-black underline underline-offset-2"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs uppercase whitespace-nowrap transition-all shadow-none ${
              activeCategory === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-slate-100'
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs uppercase whitespace-nowrap transition-all shadow-none ${
                  isSelected
                    ? 'bg-[#BF1539] text-white'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabs Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex border-3 border-black rounded-2xl bg-white p-1 gap-1 shadow-none">
          <button
            type="button"
            onClick={() => onSelectTab('validated')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-none ${
              activeTab === 'validated'
                ? 'bg-[#BF1539] text-white'
                : 'text-black hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Playlists Validées</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTab === 'validated'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {validatedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('community')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-none ${
              activeTab === 'community'
                ? 'bg-[#BF1539] text-white'
                : 'text-black hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Playlists Communauté</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTab === 'community'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {communityCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une playlist..."
            className="w-full pl-9 pr-8 py-2 border-2 border-black bg-white rounded-xl text-xs font-bold text-black focus:outline-none shadow-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-0.5"
              title="Effacer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
