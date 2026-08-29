'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { Wand2, Loader2, FolderX, AlertTriangle, Sparkles, Home, Sliders, X, Check, ChevronLeft } from 'lucide-react';

interface VideoInput {
  title: string;
  youtubeId: string;
  artistName: string;
  description?: string;
  malAnimeId?: number;
  malTitle?: string;
}

export default function NewPlaylist() {
  const router = useRouter();
  const { createPlaylist, searchVideos, getMalVideos, getPlaylistDetails, verifyVideo, isConnected, showBanner } = useSocket();

  const DRAFT_KEY = 'rate_it_playlist_draft';

  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [videos, setVideos] = useState<VideoInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Side Drawer state for Playlist Info & Quick Setup (starts closed to trigger slide-in animation)
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  // MAL Import state
  const [malUsernameInput, setMalUsernameInput] = useState('');
  const [isImportingMal, setIsImportingMal] = useState(false);

  // Playlist Clone state
  const [clonePlaylistIdInput, setClonePlaylistIdInput] = useState('');
  const [isCloningPlaylist, setIsCloningPlaylist] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Manual Add state
  const [customArtist, setCustomArtist] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customMalTitle, setCustomMalTitle] = useState('');
  const [customMalAnimeId, setCustomMalAnimeId] = useState('');

  // 1. Load draft from localStorage on mount & trigger opening slide-in animation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.playlistName) setPlaylistName(parsed.playlistName);
          if (parsed.description) setDescription(parsed.description);
          if (Array.isArray(parsed.videos)) setVideos(parsed.videos);
          if (parsed.playlistName || parsed.description || (Array.isArray(parsed.videos) && parsed.videos.length > 0)) {
            showBanner('Brouillon sauvegardé restauré !', 'info');
          }
        }
      } catch (e) {
        console.error('Failed to load saved playlist draft:', e);
      } finally {
        setIsDraftLoaded(true);
      }
    }

    // Trigger opening slide-in animation smoothly right after page mount
    const animTimer = setTimeout(() => {
      setIsInfoDrawerOpen(true);
    }, 150);

    return () => clearTimeout(animTimer);
  }, []);

  // 2. Auto-save draft to localStorage whenever fields change after load
  useEffect(() => {
    if (!isDraftLoaded) return;
    if (typeof window !== 'undefined') {
      try {
        const draft = { playlistName, description, videos };
        if (playlistName.trim() || description.trim() || videos.length > 0) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch (e) {
        console.error('Failed to save playlist draft to localStorage:', e);
      }
    }
  }, [playlistName, description, videos, isDraftLoaded]);

  const handleConfirmClearDraft = () => {
    if (typeof window !== 'undefined') {
      const confirmClear = window.confirm('Êtes-vous sûr de vouloir effacer le brouillon en cours ? Toutes les vidéos ajoutées seront réinitialisées.');
      if (confirmClear) {
        handleClearDraft();
      }
    }
  };

  const handleClearDraft = () => {
    setPlaylistName('');
    setDescription('');
    setVideos([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY);
    }
    showBanner('Brouillon effacé.', 'info');
  };

  // Trigger search on query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchVideos(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, searchVideos]);

  // Extract YouTube ID from various YouTube URL formats
  const extractYoutubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customArtist.trim() || !customTitle.trim() || !customUrl.trim()) {
      showBanner('Veuillez renseigner le nom de l\'artiste, le titre et le lien YouTube.', 'error');
      return;
    }

    const ytid = extractYoutubeId(customUrl.trim());
    if (ytid.length !== 11) {
      showBanner('Lien ou ID YouTube invalide. Il doit contenir un identifiant de 11 caractères.', 'error');
      return;
    }

    try {
      const check = await verifyVideo(ytid);
      if (!check.valid) {
        showBanner(`Vidéo YouTube invalide ou introuvable : ${check.error || 'Indisponible'}`, 'error');
        return;
      }
    } catch (err: any) {
      console.warn('Vérification vidéo en direct:', err.message);
    }

    const newVideo: VideoInput = {
      artistName: customArtist.trim(),
      title: customTitle.trim(),
      description: customDescription.trim(),
      youtubeId: ytid,
      malTitle: customMalTitle.trim() || undefined,
      malAnimeId: customMalAnimeId.trim() ? parseInt(customMalAnimeId.trim(), 10) : undefined,
    };

    setVideos([...videos, newVideo]);
    showBanner(`Piste "${newVideo.title}" ajoutée avec succès !`, 'success');
    setCustomArtist('');
    setCustomTitle('');
    setCustomDescription('');
    setCustomUrl('');
    setCustomMalTitle('');
    setCustomMalAnimeId('');
  };

  const handleAddSearchResult = (result: any) => {
    const alreadyAdded = videos.some(v => v.youtubeId === result.youtubeId);
    if (alreadyAdded) {
      showBanner(`"${result.title}" est déjà dans votre sélection.`, 'warning');
      return;
    }

    setVideos([...videos, {
      artistName: result.artistName || 'Artiste inconnu',
      title: result.title,
      description: result.description || '',
      youtubeId: result.youtubeId,
      malAnimeId: result.malAnimeId,
      malTitle: result.malTitle,
    }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveTrack = (index: number) => {
    const updated = [...videos];
    updated.splice(index, 1);
    setVideos(updated);
  };

  const handleSavePlaylist = async () => {
    setError(null);
    if (!playlistName.trim()) {
      const errMsg = 'Le nom de la playlist est obligatoire.';
      setError(errMsg);
      showBanner(errMsg, 'error');
      setIsInfoDrawerOpen(true); // Open side menu if name is missing!
      return;
    }
    if (videos.length === 0) {
      const errMsg = 'Veuillez ajouter au moins une vidéo à la playlist.';
      setError(errMsg);
      showBanner(errMsg, 'error');
      return;
    }

    setIsSaving(true);
    try {
      await createPlaylist(playlistName, description, videos);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_KEY);
      }
      setSuccess(true);
      showBanner('Playlist créée avec succès !', 'success');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      showBanner(err.message || 'Échec de la sauvegarde de la playlist', 'error');
      setIsSaving(false);
    }
  };

  const handleImportMal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const username = malUsernameInput.trim();
    if (!username) return;

    setIsImportingMal(true);
    try {
      const matched = await getMalVideos(username);
      if (matched.length === 0) {
        throw new Error('Aucune vidéo correspondante trouvée pour ce compte MAL dans la base.');
      }

      let addedCount = 0;
      setVideos(prev => {
        const updated = [...prev];
        matched.forEach(item => {
          const exists = updated.some(v => v.youtubeId === item.youtubeId);
          if (!exists) {
            updated.push({
              artistName: item.artistName || 'Artiste inconnu',
              title: item.title,
              description: item.description || '',
              youtubeId: item.youtubeId,
            });
            addedCount++;
          }
        });
        return updated;
      });
      setMalUsernameInput('');
      showBanner(`${addedCount} vidéos importées depuis le profil MAL : ${username}`, 'success');
    } catch (err: any) {
      showBanner(err.message || 'Échec de l\'importation des vidéos MAL', 'error');
    } finally {
      setIsImportingMal(false);
    }
  };

  const handleClonePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const targetId = clonePlaylistIdInput.trim().toUpperCase();
    if (!targetId) return;

    setIsCloningPlaylist(true);
    try {
      const res = await getPlaylistDetails(targetId);
      setPlaylistName(`${res.playlist.name} (Copie)`);
      setDescription(res.playlist.description || '');

      const mappedVideos = res.videos.map(v => ({
        artistName: v.artistName || 'Artiste inconnu',
        title: v.title,
        description: v.description || '',
        youtubeId: v.youtubeId,
      }));
      setVideos(mappedVideos);
      setClonePlaylistIdInput('');
      alert(`${mappedVideos.length} vidéos chargées depuis la playlist : ${res.playlist.name}`);
    } catch (err: any) {
      setError(err.message || 'Échec du chargement des détails de la playlist');
    } finally {
      setIsCloningPlaylist(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-black font-sans px-3 sm:px-8 py-6 sm:py-12 flex flex-col items-center w-full max-w-full overflow-x-hidden relative">
      {/* Header without border */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8 text-center sm:text-left">
        <div className="flex flex-col items-center sm:items-start">
          <img
            src="/CREATE/Cr%C3%A9erText.png"
            alt="Créer une Playlist"
            className="h-12 sm:h-20 w-auto object-contain max-w-full"
          />
        </div>

        <button
          onClick={() => router.push('/')}
          className="px-4 py-2.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 shrink-0"
        >
          <Home className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>
      </div>

      {/* Main Page Grid: Add Tracks & Playlist Preview Side-by-Side on the same line */}
      <div className="w-full max-w-6xl grid gap-6 lg:grid-cols-2 items-start">
        {/* Left Card: 1. Ajouter des vidéos */}
        <div className="info-card p-3.5 sm:p-6 rounded-2xl w-full max-w-full overflow-hidden">
          <h2 className="text-base sm:text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-emerald-900">
            1. Ajouter des vidéos
          </h2>

          {/* Search Existing */}
          <div className="mb-4">
            <label className="block text-xs font-black uppercase mb-1">Rechercher dans la base de données</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un artiste, titre ou description..."
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
              />
              {isSearching && (
                <span className="absolute right-3 top-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                </span>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="border-2 border-black bg-white mt-1 max-h-48 overflow-y-auto rounded-xl shadow-lg z-20">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddSearchResult(result)}
                    className="w-full text-left p-2.5 border-b border-slate-200 hover:bg-[#faf6eb] focus:bg-[#faf6eb] focus-visible:bg-[#faf6eb] transition text-xs font-bold flex justify-between items-center gap-2"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <div className="font-black text-black truncate">{result.title}</div>
                      <div className="text-slate-600 mt-0.5 truncate">
                        Par {result.artistName || 'Artiste inconnu'} {result.description ? `— ${result.description}` : ''}
                      </div>
                    </div>
                    <span className="bg-[#4BD66F] text-black border border-black px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0">
                      + Ajouter
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center my-4">
            <hr className="border-black w-full" />
            <span className="absolute px-3 bg-[#FEEC67] border border-black rounded text-[10px] font-black text-slate-800 uppercase text-center">
              Ajouter une nouvelle vidéo
            </span>
          </div>

          {/* Add Custom Track Form */}
          <form onSubmit={handleAddCustom} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-black uppercase mb-1">Nom de l'artiste *</label>
              <input
                type="text"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                placeholder="Ex: Yoko Takahashi"
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Titre de la vidéo *</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex: A Cruel Angel's Thesis"
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Description (Optionnelle)</label>
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Ex: Opening de Neon Genesis Evangelion (1995)"
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Lien ou ID YouTube *</label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Ex: https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Nom d'animé MAL (Optionnel)</label>
              <input
                type="text"
                value={customMalTitle}
                onChange={(e) => setCustomMalTitle(e.target.value)}
                placeholder="Ex: Attack on Titan (Pour correspondance MAL exacte)"
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2.5 bg-playlist text-black font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-black btn-action-hover"
            >
              + Ajouter la vidéo
            </button>
          </form>
        </div>

        {/* Right Card: 2. Aperçu de la playlist */}
        <div className="info-card p-3.5 sm:p-6 rounded-2xl flex flex-col min-h-[500px] w-full max-w-full overflow-hidden">
          <h2 className="text-base sm:text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-emerald-900 flex items-center justify-between">
            <span>2. Aperçu de la playlist</span>
            <span className="bg-black text-[#faf6eb] px-2.5 py-0.5 rounded text-xs font-mono">
              {videos.length} {videos.length === 1 ? 'vidéo' : 'vidéos'}
            </span>
          </h2>

          {/* Tracks List */}
          {videos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 text-center">
              <FolderX className="w-10 h-10 text-slate-400 mb-2" />
              <p className="mt-2 text-xs font-bold text-slate-600">La playlist est vide.</p>
              <p className="text-[10px] text-slate-500 mt-1">Ajoutez des vidéos depuis la colonne de gauche !</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1 mb-6">
              {videos.map((video, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 sm:p-3 border-2 border-black bg-white rounded-xl gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                    <span className="h-6 w-6 shrink-0 rounded-lg bg-black text-[#faf6eb] text-xs font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 truncate">
                      <div className="font-black text-xs text-black truncate">{video.title}</div>
                      <div className="text-[10px] text-slate-600 truncate mt-0.5">
                        Par {video.artistName || 'Artiste inconnu'} {video.description ? `— ${video.description}` : ''}
                        {video.malTitle && <span className="ml-1 text-purple-700 font-black">[MAL: {video.malTitle}]</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTrack(index)}
                    className="text-xs text-[#990000] hover:text-red-500 focus:text-red-500 focus-visible:text-red-500 font-black p-1 shrink-0 btn-action-hover"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error and Success Indicators */}
          {error && (
            <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-100 border-2 border-emerald-500 text-emerald-700 px-4 py-2.5 rounded-lg text-xs font-bold animate-pulse flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Playlist créée avec succès ! Redirection en cours...</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-auto border-t-2 border-black pt-4 flex gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover"
            >
              Annuler
            </button>
            <button
              onClick={handleSavePlaylist}
              disabled={isSaving || success}
              className="flex-1 py-3 bg-[#4BD66F] text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover disabled:opacity-40"
            >
              {isSaving ? 'Enregistrement...' : 'Sauvegarder la playlist'}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity duration-300 ${isInfoDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsInfoDrawerOpen(false)}
      />

      {/* Sliding Side Drawer Panel with Clickable Languette */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-full max-w-md bg-[#FEEC67] border-r-4 border-black flex flex-col shadow-2xl transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) h-full max-h-screen ${isInfoDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Clickable Languette Attached to Right Edge of Drawer */}
        <button
          type="button"
          onClick={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
          title={isInfoDrawerOpen ? 'Fermer le menu' : 'Ouvrir les infos & config'}
          className="absolute top-1/3 left-full -mt-8 bg-[#FEEC67] border-4 border-l-0 border-black rounded-r-2xl py-4 px-2.5 shadow-2xl flex flex-col items-center justify-center gap-2 text-black font-black uppercase text-[10px] sm:text-xs btn-action-hover cursor-pointer z-50 select-none"
        >
          <ChevronLeft
            className={`w-5 h-5 stroke-[3] transition-transform duration-300 ${isInfoDrawerOpen ? '' : 'rotate-180'}`}
          />
          <span className="[writing-mode:vertical-lr] rotate-180 tracking-wider">
            Infos Playlist
          </span>
        </button>

        {/* Scrollable Drawer Inner Content */}
        <div className="p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto h-full max-h-screen">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-black" />
              <h2 className="text-lg font-black uppercase text-black">
                Infos & Config Playlist
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsInfoDrawerOpen(false)}
              className="p-1.5 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 rounded-xl btn-action-hover"
              title="Fermer"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Playlist Info Form */}
          <div className="flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase">Nom de la playlist *</label>
              {(playlistName || description || videos.length > 0) && (
                <button
                  type="button"
                  onClick={handleConfirmClearDraft}
                  className="text-[10px] font-black uppercase text-[#990000] underline hover:text-red-700 focus:text-red-700 focus-visible:text-red-700"
                >
                  Effacer le brouillon
                </button>
              )}
            </div>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => {
                setPlaylistName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex: Mes génériques d'anime préférés"
              className={`w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold ${!playlistName.trim() && error ? 'border-red-600 ring-2 ring-red-400' : ''}`}
              autoFocus
            />

            <div>
              <label className="block text-xs font-black uppercase mb-1">Description (Optionnelle)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre sélection..."
                rows={3}
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold resize-none"
              />
            </div>
          </div>

          {/* Quick Setup Tools */}
          <div className="border-t-2 border-black pt-5 flex flex-col gap-4 shrink-0">
            <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
              <span>Outils de configuration rapide</span>
            </h3>

            {/* Import MAL */}
            <div className="border-b border-dashed border-black/40 pb-4">
              <label className="block text-xs font-black uppercase mb-1">Importer depuis un profil MyAnimeList</label>
              <p className="text-[10px] text-slate-700 font-bold mb-2">
                Importez directement les vidéos correspondantes à un pseudo MAL.
              </p>
              <form onSubmit={handleImportMal} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={malUsernameInput}
                  onChange={(e) => setMalUsernameInput(e.target.value)}
                  placeholder="Pseudo MyAnimeList..."
                  className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white focus:outline-none text-xs font-bold"
                />
                <button
                  type="submit"
                  disabled={isImportingMal}
                  className="px-4 py-2 border-2 border-black bg-white text-black font-black text-xs uppercase rounded-lg btn-action-hover disabled:opacity-50 shrink-0"
                >
                  {isImportingMal ? '...' : 'Importer'}
                </button>
              </form>
            </div>

            {/* Clone existing playlist */}
            <div>
              <label className="block text-xs font-black uppercase mb-1">Cloner une playlist existante</label>
              <p className="text-[10px] text-slate-700 font-bold mb-2">
                Copier le nom, la description et les vidéos à partir d'un code de partage.
              </p>
              <form onSubmit={handleClonePlaylist} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={clonePlaylistIdInput}
                  onChange={(e) => setClonePlaylistIdInput(e.target.value)}
                  placeholder="Code de partage..."
                  className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white focus:outline-none text-xs font-bold"
                />
                <button
                  type="submit"
                  disabled={isCloningPlaylist}
                  className="px-4 py-2 border-2 border-black bg-white text-black font-black text-xs uppercase rounded-lg btn-action-hover disabled:opacity-50 shrink-0"
                >
                  {isCloningPlaylist ? '...' : 'Cloner'}
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Confirm Drawer Button */}
          <div className="mt-auto pt-4 border-t-2 border-black shrink-0">
            <button
              type="button"
              onClick={() => setIsInfoDrawerOpen(false)}
              className="w-full py-3 bg-[#4BD66F] text-black font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-black btn-action-hover flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Valider les informations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
