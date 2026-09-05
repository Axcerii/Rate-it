'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { Wand2, Loader2, FolderX, AlertTriangle, Sparkles, Home, Sliders, X, Check, ChevronLeft, Key, Copy, CheckCircle2, ShieldAlert, FileEdit } from 'lucide-react';

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
  const {
    createPlaylist,
    verifyPlaylistSecret,
    updatePlaylistWithSecret,
    searchVideos,
    getMalVideos,
    getPlaylistDetails,
    verifyVideo,
    isConnected,
    showBanner,
  } = useSocket();

  const DRAFT_KEY = 'rate_it_playlist_draft';

  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [videos, setVideos] = useState<VideoInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Secret Code & Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [activeSecretCode, setActiveSecretCode] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ playlistId: string; secretCode: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'share' | 'secret' | null>(null);
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [isVerifyingSecret, setIsVerifyingSecret] = useState(false);
  const [secretModalError, setSecretModalError] = useState<string | null>(null);

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

  // 2. Auto-save draft to localStorage whenever fields change after load (only if NOT in edit mode)
  useEffect(() => {
    if (!isDraftLoaded || isEditMode) return;
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
  }, [playlistName, description, videos, isDraftLoaded, isEditMode]);

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

  const handleCopy = async (text: string, field: 'share' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showBanner(field === 'share' ? 'Code de partage copié !' : 'Code secret copié ! Conservez-le en lieu sûr.', 'success');
      setTimeout(() => setCopiedField(null), 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      showBanner('Impossible de copier dans le presse-papier', 'error');
    }
  };

  const handleVerifySecretCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = secretCodeInput.trim();
    if (!code) return;

    setIsVerifyingSecret(true);
    setSecretModalError(null);
    try {
      const res = await verifyPlaylistSecret(code);
      setIsEditMode(true);
      setEditingPlaylistId(res.playlist.id);
      setActiveSecretCode(code);
      setPlaylistName(res.playlist.name);
      setDescription(res.playlist.description || '');

      const mappedVideos = res.videos.map(v => ({
        artistName: v.artistName || 'Artiste inconnu',
        title: v.title,
        description: v.description || '',
        youtubeId: v.youtubeId,
        malAnimeId: v.malAnimeId,
        malTitle: v.malTitle,
      }));
      setVideos(mappedVideos);
      setIsSecretModalOpen(false);
      setSecretCodeInput('');
      showBanner(`Mode édition activé : "${res.playlist.name}" chargée (${mappedVideos.length} pistes) !`, 'success');
    } catch (err: any) {
      setSecretModalError(err.message || 'Échec de la validation du code secret');
    } finally {
      setIsVerifyingSecret(false);
    }
  };

  const handleExitEditMode = () => {
    if (typeof window !== 'undefined') {
      const confirmExit = window.confirm('Voulez-vous quitter le mode édition ? Toutes les modifications non enregistrées sur cette playlist seront perdues.');
      if (!confirmExit) return;
    }

    setIsEditMode(false);
    setEditingPlaylistId(null);
    setActiveSecretCode(null);

    // Restore draft from localStorage if present
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          setPlaylistName(parsed.playlistName || '');
          setDescription(parsed.description || '');
          setVideos(Array.isArray(parsed.videos) ? parsed.videos : []);
        } else {
          setPlaylistName('');
          setDescription('');
          setVideos([]);
        }
      } catch (_) {
        setPlaylistName('');
        setDescription('');
        setVideos([]);
      }
    }
    showBanner('Mode édition désactivé. Retour à la création.', 'info');
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
      if (isEditMode && editingPlaylistId && activeSecretCode) {
        // Update existing playlist using secret code
        await updatePlaylistWithSecret(
          editingPlaylistId,
          activeSecretCode,
          playlistName.trim(),
          description.trim(),
          videos
        );
        showBanner(`Playlist "${playlistName}" mise à jour avec succès !`, 'success');
        setIsSaving(false);
      } else {
        // Create new custom playlist
        const res = await createPlaylist(playlistName.trim(), description.trim(), videos);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DRAFT_KEY);
        }
        setCreatedResult({ playlistId: res.playlistId, secretCode: res.secretCode });
        showBanner('Playlist créée avec succès ! Notez bien votre code secret.', 'success');
        setIsSaving(false);
      }
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

        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2.5 border-2 border-white bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-2 shrink-0 shadow-none"
          >
            <Home className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        </div>
      </div>

      {/* Mode Édition Active Banner */}
      {isEditMode && (
        <div className="info-card w-full max-w-6xl mb-6 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-black shadow-none animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="p-3 bg-white border-2 border-white text-black rounded-2xl shrink-0 shadow-none">
              <FileEdit className="w-6 h-6 text-[#24B3F1]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="text-[11px] font-black uppercase bg-black text-white px-2.5 py-0.5 rounded-lg">
                  Mode Édition Actif
                </span>
                <span className="font-mono text-xs font-black bg-white px-2.5 py-0.5 rounded-lg border-2 border-white">
                  {editingPlaylistId}
                </span>
              </div>
              <p className="text-sm sm:text-base font-black mt-1">
                Vous modifiez la playlist : <span className="underline decoration-2">{playlistName || 'Sans titre'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExitEditMode}
            className="px-4 py-2.5 border-2 border-white bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover shrink-0 shadow-none"
          >
            Quitter l'édition
          </button>
        </div>
      )}

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
                placeholder="Rechercher par artiste, titre, anime (ex: Naruto op 2)..."
                className="w-full pl-3 pr-10 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
              />
              <div className="absolute right-3 top-2.5 flex items-center gap-1">
                {isSearching && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                )}
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-slate-400 hover:text-black p-0.5"
                    title="Effacer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              {isSaving
                ? (isEditMode ? 'Mise à jour...' : 'Enregistrement...')
                : (isEditMode ? 'Enregistrer les modifications' : 'Sauvegarder la playlist')}
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
        className={`fixed top-0 left-0 bottom-0 z-50 w-full max-w-md bg-[#FEEC67] border-r-8 border-white flex flex-col shadow-none transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) h-full max-h-screen overflow-visible ${isInfoDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Clickable Languette Attached to Right Edge of Drawer */}
        <button
          type="button"
          onClick={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
          title={isInfoDrawerOpen ? 'Fermer le menu' : 'Ouvrir les infos & config'}
          className="absolute top-1/3 left-full -mt-8 bg-[#FEEC67] border-4 border-l-0 border-white rounded-r-2xl py-4 px-2.5 shadow-none flex flex-col items-center justify-center gap-2 text-black font-black uppercase text-[10px] sm:text-xs btn-action-hover cursor-pointer z-50 select-none"
        >
          <ChevronLeft
            className={`w-5 h-5 stroke-[3] transition-transform duration-300 ${isInfoDrawerOpen ? '' : 'rotate-180'}`}
          />
          <span className="[writing-mode:vertical-lr] rotate-180 tracking-wider">
            Infos Playlist
          </span>
        </button>

        {/* Scrollable Drawer Inner Content with Menu Pattern Background */}
        <div 
          className="relative z-10 p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto h-full max-h-screen bg-no-repeat bg-bottom"
          style={{ backgroundImage: "url('/BACKGROUNDS/Background_Basique.png')" }}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b-2 border-white pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-black" />
              <h2 className="text-lg font-black uppercase text-black font-title">
                Infos & Config Playlist
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsInfoDrawerOpen(false)}
              className="p-1.5 border-2 border-white bg-white hover:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 rounded-xl btn-action-hover shadow-none"
              title="Fermer"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Section: Éditer une playlist (as requested: mets le bouton "éditer une playlist" dedans avec un CTA qui est "Entrer un code secret d'édition") */}
          <div className="bg-white/90 backdrop-blur-xs border-2 border-white p-4 rounded-2xl flex flex-col gap-2.5 shrink-0 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-black font-black text-xs uppercase font-title">
                <Key className="w-4 h-4 text-[#24B3F1]" />
                <span>Éditer une playlist</span>
              </div>
              {isEditMode && (
                <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 rounded-md shadow-none">
                  Mode Édition Actif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-800 font-bold leading-relaxed">
              {isEditMode
                ? `Vous modifiez actuellement la playlist "${playlistName || editingPlaylistId}". Vous pouvez entrer un autre code secret pour en charger une autre.`
                : "Vous avez déjà créé une playlist et possédez son code secret ? Chargez toutes ses vidéos pour la modifier."}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsInfoDrawerOpen(false);
                setIsSecretModalOpen(true);
                setSecretModalError(null);
              }}
              className="w-full py-3 bg-[#24B3F1] hover:bg-[#5cd0ff] text-black border-2 border-white font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2 shadow-none"
            >
              <Key className="w-4 h-4" />
              <span>Entrer un code secret d'édition</span>
            </button>
          </div>

          {/* Playlist Info Form */}
          <div className="flex flex-col gap-4 shrink-0 border-t-2 border-white pt-4">
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
              className={`w-full px-3.5 py-2.5 border-2 border-white bg-white rounded-xl focus:outline-none focus:bg-[#faf6eb] text-sm font-bold shadow-none ${!playlistName.trim() && error ? 'ring-2 ring-red-500' : ''}`}
            />

            <div>
              <label className="block text-xs font-black uppercase mb-1">Description (Optionnelle)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre sélection..."
                rows={3}
                className="w-full px-3.5 py-2.5 border-2 border-white bg-white rounded-xl focus:outline-none focus:bg-[#faf6eb] text-sm font-bold resize-none shadow-none"
              />
            </div>
          </div>

          {/* Quick Setup Tools */}
          <div className="border-t-2 border-white pt-4 flex flex-col gap-4 shrink-0">
            <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
              <span>Outils de configuration rapide</span>
            </h3>

            {/* Import MAL */}
            <div className="border-b border-dashed border-white/60 pb-4">
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
                  className="flex-1 min-w-0 px-3 py-2 border-2 border-white bg-white rounded-xl focus:outline-none text-xs font-bold shadow-none"
                />
                <button
                  type="submit"
                  disabled={isImportingMal}
                  className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-50 shrink-0 shadow-none"
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
                  className="flex-1 min-w-0 px-3 py-2 border-2 border-white bg-white rounded-xl focus:outline-none text-xs font-bold shadow-none"
                />
                <button
                  type="submit"
                  disabled={isCloningPlaylist}
                  className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-50 shrink-0 shadow-none"
                >
                  {isCloningPlaylist ? '...' : 'Cloner'}
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Confirm Drawer Button */}
          <div className="mt-auto pt-4 border-t-2 border-white shrink-0">
            <button
              type="button"
              onClick={() => setIsInfoDrawerOpen(false)}
              className="w-full py-3 bg-[#4BD66F] hover:bg-[#5ce27f] text-black font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-white btn-action-hover flex items-center justify-center gap-2 shadow-none"
            >
              <Check className="w-4 h-4" />
              <span>Valider les informations</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATION SUCCESS MODAL WITH ONE-TIME SECRET CODE & SHARE CODE POPUP    */}
      {/* ========================================================================= */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="info-card w-full max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col gap-5 text-left relative max-h-[92vh] overflow-y-auto shadow-none">
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b-2 border-white/70 pb-4">
              <div className="p-3 bg-white text-black border-2 border-white rounded-2xl shrink-0 shadow-none">
                <CheckCircle2 className="w-8 h-8 text-[#4BD66F] stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black font-title uppercase text-black leading-tight">
                  Playlist Créée avec Succès !
                </h3>
                <p className="text-xs text-slate-800 font-bold mt-0.5">
                  Conservez bien vos codes d'accès ci-dessous.
                </p>
              </div>
            </div>

            {/* Block 1: Share Code */}
            <div className="bg-white/90 backdrop-blur-xs border-2 border-white p-4 rounded-2xl flex flex-col gap-2 shadow-none">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-slate-800">
                  Code de Partage de la Playlist
                </label>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border-2 border-white shadow-none">
                  Public
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-bold">
                Partagez ce code avec vos amis pour qu'ils puissent jouer à votre playlist dans une room !
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white border-2 border-white px-3.5 py-2.5 rounded-xl font-mono text-base sm:text-lg font-black tracking-widest text-black text-center select-all shadow-none">
                  {createdResult.playlistId}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(createdResult.playlistId, 'share')}
                  className="px-4 py-2.5 border-2 border-white bg-[#24B3F1] hover:bg-[#5cd0ff] text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 shrink-0 shadow-none"
                >
                  {copiedField === 'share' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-900 stroke-[3]" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Block 2: Secret Edit Code (One-time only!) */}
            <div className="bg-white/90 backdrop-blur-xs border-2 border-white p-4 sm:p-5 rounded-2xl flex flex-col gap-2.5 shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#990000] font-black text-xs uppercase">
                  <ShieldAlert className="w-4 h-4 text-[#990000] shrink-0" />
                  <span>Code Secret d'Édition</span>
                </div>
                <span className="text-[10px] font-black text-white bg-[#990000] px-2 py-0.5 rounded border-2 border-white shadow-none uppercase">
                  Affichage Unique
                </span>
              </div>

              <div className="p-3 bg-red-100/90 border-2 border-white rounded-xl text-xs font-black text-red-950 leading-relaxed shadow-none">
                ⚠️ <strong>ATTENTION : Ce code secret ne sera affiché qu'une seule fois !</strong>
                <p className="font-bold text-red-900 mt-1 text-[11px]">
                  Copiez-le et conservez-le en lieu sûr. Il vous donne les droits exclusifs d'édition de cette playlist depuis le menu "Créer une playlist". Si vous le perdez, seul un administrateur pourra le retrouver.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white border-2 border-white px-3 py-2 rounded-xl font-mono text-xs sm:text-sm font-black text-slate-900 break-all select-all shadow-none">
                  {createdResult.secretCode}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(createdResult.secretCode, 'secret')}
                  className="px-4 py-2.5 border-2 border-white bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center gap-1.5 shrink-0 shadow-none"
                >
                  {copiedField === 'secret' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-900 stroke-[3]" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-3 bg-[#4BD66F] hover:bg-[#5ce27f] text-black border-2 border-white font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover text-center shadow-none"
              >
                J'ai bien noté mon code secret (Terminer)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SECRET CODE ENTRY MODAL (FOR EDITING AN EXISTING PLAYLIST)             */}
      {/* ========================================================================= */}
      {isSecretModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="info-card w-full max-w-md rounded-3xl p-6 sm:p-7 flex flex-col gap-4 text-left relative shadow-none">
            <div className="flex justify-between items-center border-b-2 border-white pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#24B3F1] border-2 border-white rounded-lg shadow-none">
                  <Key className="w-4 h-4 text-black" />
                </div>
                <h3 className="text-base sm:text-lg font-black font-title uppercase text-black">
                  Éditer avec un Code Secret
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSecretModalOpen(false)}
                className="p-1.5 border-2 border-white rounded-xl bg-white hover:bg-slate-100 btn-action-hover shadow-none"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-800 leading-relaxed">
              Entrez le <strong>code secret d'édition</strong> fourni lors de la création de la playlist pour charger toutes ses pistes et la modifier.
            </p>

            {secretModalError && (
              <div className="p-3 bg-red-100/90 border-2 border-white rounded-xl text-xs font-bold text-red-900 flex items-start gap-2 shadow-none">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{secretModalError}</span>
              </div>
            )}

            <form onSubmit={handleVerifySecretCode} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-800 mb-1">
                  Code Secret (ex: sec_...)
                </label>
                <input
                  type="text"
                  value={secretCodeInput}
                  onChange={(e) => setSecretCodeInput(e.target.value)}
                  placeholder="Collez votre code secret ici..."
                  className="w-full px-3.5 py-2.5 border-2 border-white bg-white rounded-xl font-mono text-xs font-bold text-black focus:outline-none shadow-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSecretModalOpen(false)}
                  className="flex-1 py-2.5 border-2 border-white bg-white hover:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover shadow-none"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingSecret || !secretCodeInput.trim()}
                  className="flex-1 py-2.5 bg-[#24B3F1] hover:bg-[#5cd0ff] text-black border-2 border-white font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-none"
                >
                  {isVerifyingSecret ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Vérification...</span>
                    </>
                  ) : (
                    <span>Valider & Éditer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
