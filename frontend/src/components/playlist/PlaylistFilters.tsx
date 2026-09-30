'use client';

import React, { useState } from 'react';
import { CheckCircle2, Users, Search, X, Filter, SlidersHorizontal } from 'lucide-react';

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

// ---------------------------------------------------------------------------
// CONFIGURATION DE LA TAILLE DES ÉTIQUETTES (NAME TAG SIZE)
// Modifiez la valeur ci-dessous pour changer la largeur de l'étiquette.
// La hauteur s'adapte automatiquement avec le ratio aspect-[480/150].
// Exemples : 'w-[180px]', 'w-[200px]', 'w-[220px]', 'w-[240px]', 'w-[80%]'
// ---------------------------------------------------------------------------
export const CATEGORY_TAG_WIDTH = 'w-[200px]';

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
              placeholder="Rechercher une playlist..."
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
            className={`px-3.5 py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shrink-0 transition-all shadow-none cursor-pointer ${activeCategory !== 'all'
              ? 'bg-catalog text-white'
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
        <div className="flex border-2 border-black rounded-xl bg-[#FAF0CA] p-1 gap-1 w-full shadow-none">
          <button
            type="button"
            onClick={() => onSelectTab('validated')}
            className={`flex-1 py-2 px-2 rounded-lg font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-none cursor-pointer ${activeTab === 'validated'
              ? 'bg-catalog text-white'
              : 'text-black hover:bg-black/5'
              }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validées</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'validated'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-800'
                }`}
            >
              {validatedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('community')}
            className={`flex-1 py-2 px-2 rounded-lg font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-none cursor-pointer ${activeTab === 'community'
              ? 'bg-catalog text-white'
              : 'text-black hover:bg-black/5'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Communauté</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'community'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-800'
                }`}
            >
              {communityCount}
            </span>
          </button>
        </div>

        {/* Active Category Chip on Mobile */}
        {activeCategory !== 'all' && (
          <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-3 py-1.5 shadow-none">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-black text-catalog uppercase bg-catalog/15 px-2 py-0.5 rounded-md">Filtre</span>
              <span className="text-xs font-black text-black uppercase truncate">{activeCategory}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-slate-500 hover:text-black p-0.5 ml-2 cursor-pointer"
              title="Supprimer ce filtre"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mobile Modal Drawer for Categories */}
        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <div
              className="bg-[#FAF7F2] border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-black bg-white">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-catalog" />
                  <h3 className="font-title text-base font-black uppercase text-black">
                    Filtrer par Catégorie
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100 cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Selection with centered vintage tickets */}
              <div className="p-4 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-4 max-h-[60vh] w-full">
                {/* Option "Toutes les catégories" */}
                <button
                  id="mobile-category-all"
                  type="button"
                  onClick={() => {
                    onSelectCategory('all');
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`relative flex items-center justify-between transition-all duration-200 cursor-pointer select-none group shrink-0 focus:outline-none overflow-hidden rounded-r-2xl ${
                    activeCategory === 'all' ? 'scale-105' : 'hover:scale-[1.02]'
                  } w-[230px] sm:w-[250px] aspect-[480/150] rotate-[-1deg] hover:rotate-0`}
                >
                  <img
                    src="/PLAYLIST/etiquette.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md"
                  />
                  <div className="relative z-10 flex items-center justify-between w-full pl-[29%] pr-[6%]">
                    <span className="font-black text-xs uppercase text-black tracking-tight truncate">
                      Toutes les catégories
                    </span>
                  </div>
                  {activeCategory === 'all' && (
                    <img
                      src="/PLAYLIST/Tampon.png"
                      alt="Tampon"
                      className="absolute -right-3.5 top-1/2 -translate-y-1/2 h-[135%] aspect-square object-contain pointer-events-none z-20 rotate-[-12deg] animate-stamp"
                    />
                  )}
                </button>

                {categories.map((cat, idx) => {
                  const isSelected = activeCategory === cat;
                  const rotations = [
                    'rotate-[2deg]',
                    'rotate-[-2deg]',
                    'rotate-[1.5deg]',
                    'rotate-[-2.5deg]',
                    'rotate-[2.5deg]',
                    'rotate-[-1deg]',
                    'rotate-[1deg]',
                    'rotate-[-1.5deg]',
                  ];
                  const rot = rotations[idx % rotations.length];

                  return (
                    <button
                      key={cat}
                      id={`mobile-category-${idx}`}
                      type="button"
                      onClick={() => {
                        onSelectCategory(isSelected ? 'all' : cat);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`relative flex items-center justify-between transition-all duration-200 cursor-pointer select-none group shrink-0 focus:outline-none overflow-hidden rounded-r-2xl ${
                        isSelected ? 'scale-105' : 'hover:scale-[1.02]'
                      } w-[230px] sm:w-[250px] aspect-[480/150] ${rot} hover:rotate-0`}
                    >
                      <img
                        src="/PLAYLIST/etiquette.png"
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md"
                      />
                      <div className="relative z-10 flex items-center justify-between w-full pl-[29%] pr-[6%]">
                        <span className="font-black text-xs uppercase text-black tracking-tight truncate">
                          {cat}
                        </span>
                      </div>
                      {isSelected && (
                        <img
                          src="/PLAYLIST/Tampon.png"
                          alt="Tampon"
                          className="absolute -right-3.5 top-1/2 -translate-y-1/2 h-[135%] aspect-square object-contain pointer-events-none z-20 rotate-[-12deg] animate-stamp"
                        />
                      )}
                    </button>
                  );
                })}
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
                    className="flex-1 py-3 border-2 border-black bg-slate-100 hover:bg-slate-200 text-black font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex-1 py-3 bg-catalog hover:brightness-105 text-white border-2 border-black font-black text-xs uppercase rounded-xl cursor-pointer"
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
            className="w-full pl-10 pr-9 py-2.5 border-1 border-black bg-white rounded-lg -rotate-2 text-xs font-bold text-black focus:outline-none"
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
        <div className="flex flex-col border rotate-2 border-black rounded-lg bg-[#FAF0CA]">
          <button
            type="button"
            onClick={() => onSelectTab('validated')}
            className={`w-full py-2.5 px-3 font-black text-xs rounded-t-lg uppercase transition-all flex items-center justify-between shadow-none ${activeTab === 'validated'
              ? 'bg-catalog text-white'
              : 'text-black'
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
            className={`w-full py-2.5 px-3 rounded-b-lg font-black text-xs uppercase transition-all flex items-center justify-between shadow-none ${activeTab === 'community'
              ? 'bg-catalog text-white'
              : 'text-black'
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
        <div className="bg-transparent rounded-3xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b-2 border-black/30 pb-2 px-1">
            <span className="text-xs font-black uppercase text-white flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <Filter className="w-4 h-4 text-white" />
              <span>Catégories</span>
            </span>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="text-[10px] font-black uppercase text-white hover:text-white/80 underline drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Vertical Categories List */}
          <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto overflow-x-hidden p-2 pr-4 scrollbar-thin">
            {categories.map((cat, idx) => {
              const isSelected = activeCategory === cat;
              const rotations = [
                'rotate-[2deg]',
                'rotate-[-2deg]',
                'rotate-[1.5deg]',
                'rotate-[-2.5deg]',
                'rotate-[2.5deg]',
                'rotate-[-1deg]',
                'rotate-[1deg]',
                'rotate-[-1.5deg]',
              ];
              const rot = rotations[idx % rotations.length];

              return (
                <button
                  key={cat}
                  id={`desktop-category-${idx}`}
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                  className={`relative flex items-center justify-between transition-all duration-200 cursor-pointer select-none group shrink-0 focus:outline-none overflow-hidden rounded-r-2xl ${isSelected ? 'ml-7' : 'ml-2 hover:translate-x-1'
                    } ${CATEGORY_TAG_WIDTH} aspect-[480/150] ${rot} hover:rotate-0`}
                >
                  <img
                    src="/PLAYLIST/etiquette.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md"
                  />
                  <div className="relative z-10 flex items-center justify-between w-full pl-[29%] pr-[6%]">
                    <span className="font-black text-xs uppercase text-black tracking-tight truncate">
                      {cat}
                    </span>
                  </div>
                  {isSelected && (
                    <img
                      src="/PLAYLIST/Tampon.png"
                      alt="Tampon"
                      className="absolute -right-3.5 top-full -translate-y-1/2 h-[105%] aspect-square object-contain pointer-events-none z-20 rotate-[-12deg] animate-stamp"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
