'use client';

import React, { useState } from 'react';
import { CheckCircle2, Users, Search, X, Filter, SlidersHorizontal, Check } from 'lucide-react';

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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="w-full flex flex-col">
      {/* ========================================================================= */}
      {/* 1. MOBILE CONTROLS (< lg)                                                */}
      {/* Completely redesigned: search + tabs + interactive category filter modal */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col gap-2.5 w-full">
        {/* Search Bar + Mobile Filter Trigger Button */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-8 py-2.5 border-2 border-black bg-white rounded-xl text-xs font-bold text-black focus:outline-none shadow-none"
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

          {/* Mobile Category Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`px-3.5 py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shrink-0 transition-all shadow-none ${activeCategory !== 'all'
                ? 'bg-[#BF1539] text-white'
                : 'bg-white text-black hover:bg-slate-100'
              }`}
            title="Ouvrir les filtres par catégorie"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtres</span>
            {activeCategory !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>

        {/* Mobile Tabs Switcher */}
        <div className="flex border-2 border-black rounded-xl bg-white p-1 gap-1 w-full shadow-none">
          <button
            type="button"
            onClick={() => onSelectTab('validated')}
            className={`flex-1 py-2 px-2 rounded-lg font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-none ${activeTab === 'validated'
                ? 'bg-[#BF1539] text-white'
                : 'text-black hover:bg-slate-100'
              }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validées</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'validated'
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
            className={`flex-1 py-2 px-2 rounded-lg font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-none ${activeTab === 'community'
                ? 'bg-[#BF1539] text-white'
                : 'text-black hover:bg-slate-100'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Communauté</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'community'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-800'
                }`}
            >
              {communityCount}
            </span>
          </button>
        </div>

        {/* Active Category Chip on Mobile */}
        {activeCategory !== 'all' && (
          <div className="flex items-center justify-between bg-rose-50 border-2 border-[#BF1539] rounded-xl px-3 py-1.5 shadow-none">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[10px] font-black text-[#BF1539] uppercase">Filtre actif :</span>
              <span className="text-xs font-black text-black uppercase truncate">{activeCategory}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-[#BF1539] hover:text-black p-0.5 ml-2"
              title="Supprimer ce filtre"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mobile Modal Drawer for Categories */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-[#FAF7F2] border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-black bg-white">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#BF1539]" />
                  <h3 className="font-title text-base font-black uppercase text-black">
                    Filtrer par Catégorie
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Grid Selection */}
              <div className="p-4 overflow-y-auto flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('all');
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`p-3 rounded-2xl border-2 border-black font-black text-xs uppercase flex items-center justify-between transition-all ${activeCategory === 'all'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-slate-100'
                    }`}
                >
                  <span>Toutes les catégories</span>
                  {activeCategory === 'all' && <Check className="w-4 h-4" />}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onSelectCategory(isSelected ? 'all' : cat);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`p-3 rounded-2xl border-2 border-black font-black text-xs uppercase flex items-center justify-between transition-all text-left ${isSelected
                            ? 'bg-[#BF1539] text-white'
                            : 'bg-white text-black hover:bg-slate-50'
                          }`}
                      >
                        <span className="truncate mr-1">{cat}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t-2 border-black bg-white flex gap-2">
                {activeCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory('all');
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex-1 py-3 border-2 border-black bg-slate-100 hover:bg-slate-200 text-black font-black text-xs uppercase rounded-xl"
                  >
                    Réinitialiser
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex-1 py-3 bg-[#BF1539] hover:bg-[#cf1840] text-white border-2 border-black font-black text-xs uppercase rounded-xl"
                >
                  Voir les résultats
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP SIDEBAR VIEW (lg:flex)                                        */}
      {/* Vertical sidebar with Search + Tabs + Category list                      */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col gap-5 w-full">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une playlist..."
            className="w-full pl-10 pr-9 py-2.5 border-3 border-black bg-white rounded-2xl text-xs font-bold text-black focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-0.5"
              title="Effacer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs Switcher */}
        <div className="flex flex-col border-3 border-black rounded-2xl bg-white p-1 gap-1">
          <button
            type="button"
            onClick={() => onSelectTab('validated')}
            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-between shadow-none ${activeTab === 'validated'
                ? 'bg-[#BF1539] text-white'
                : 'text-black hover:bg-slate-100'
              }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Playlists Validées</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${activeTab === 'validated'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-800'
                }`}
            >
              {validatedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('community')}
            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-between shadow-none ${activeTab === 'community'
                ? 'bg-[#BF1539] text-white'
                : 'text-black hover:bg-slate-100'
              }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Communauté</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${activeTab === 'community'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-800'
                }`}
            >
              {communityCount}
            </span>
          </button>
        </div>

        {/* Desktop Categories Panel */}
        <div className="border-3 border-black bg-white rounded-3xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
            <span className="text-xs font-black uppercase text-black flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#BF1539]" />
              <span>Catégories</span>
            </span>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="text-[10px] font-black uppercase text-[#BF1539] hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Vertical Categories List */}
          <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
            {/* "Toutes les catégories" Button */}
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className={`w-full px-3 py-2 rounded-xl border-2 border-black font-black text-xs uppercase text-left transition-all flex items-center justify-between ${activeCategory === 'all'
                  ? 'bg-black text-white'
                  : 'bg-slate-50 text-black hover:bg-slate-100'
                }`}
            >
              <span>Toutes les catégories</span>
              {activeCategory === 'all' && <Check className="w-3.5 h-3.5" />}
            </button>

            {categories.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                  className={`w-full px-3 py-2 rounded-xl border-2 border-black font-black text-xs uppercase text-left transition-all flex items-center justify-between ${isSelected
                      ? 'bg-[#BF1539] text-white shadow-none'
                      : 'bg-white text-black hover:bg-slate-50'
                    }`}
                >
                  <span className="truncate">{cat}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
