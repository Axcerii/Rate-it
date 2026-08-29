'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import {
  AlertTriangle,
  Trash2,
  Pencil,
  X,
  Plus,
  Sparkles,
  FolderX,
  ShieldCheck,
  Clock,
  Calendar,
  Gamepad2,
  Search,
  ExternalLink,
  Film,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';

export default function AdminConsole() {
  const router = useRouter();
  const {
    getPlaylists,
    validatePlaylist,
    deletePlaylist,
    cleanStalePlaylists,
    getPlaylistDetails,
    adminAddVideo,
    adminDeleteVideo,
    adminDeleteVideoDirect,
    adminUpdateVideo,
    adminSearchVideos,
    verifyVideo,
    getGlobalStats,
    isConnected,
  } = useSocket();

  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playlists data
  const [validatedLists, setValidatedLists] = useState<any[]>([]);
  const [communityLists, setCommunityLists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'validated' | 'all' | 'videos' | 'analytics'>('pending');

  // Video Maintenance / Search State
  const [adminVideos, setAdminVideos] = useState<any[]>([]);
  const [adminVideosTotal, setAdminVideosTotal] = useState<number>(0);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [isVideoSearchLoading, setIsVideoSearchLoading] = useState(false);
  const [testedVideos, setTestedVideos] = useState<Record<string, { checking: boolean; valid?: boolean; error?: string; title?: string }>>({});

  // Global Ratings Analytics State
  const [globalStats, setGlobalStats] = useState<{ overall: any; topTracks: any[]; worstTracks: any[] } | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Playlist track editing states
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState<string>('');
  const [editingPlaylistTracks, setEditingPlaylistTracks] = useState<any[]>([]);
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  // New Track inputs for editor
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackDescription, setNewTrackDescription] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackMalTitle, setNewTrackMalTitle] = useState('');
  const [newTrackMalAnimeId, setNewTrackMalAnimeId] = useState('');

  // Video In-Depth Edit Modal state
  const [modalVideo, setModalVideo] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editYoutubeId, setEditYoutubeId] = useState('');
  const [editMalTitle, setEditMalTitle] = useState('');
  const [editMalAnimeId, setEditMalAnimeId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editTestStatus, setEditTestStatus] = useState<{ checking: boolean; valid?: boolean; error?: string; title?: string } | null>(null);

  const fetchLists = async () => {
    setError(null);
    try {
      const { validated, community } = await getPlaylists();
      setValidatedLists(validated);
      setCommunityLists(community);
    } catch (err: any) {
      setError(err.message || 'Échec de la récupération des playlists');
    }
  };

  const fetchGlobalStats = async () => {
    setIsStatsLoading(true);
    try {
      const stats = await getGlobalStats(adminPassword);
      setGlobalStats(stats);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchAdminVideos = useCallback(async (query = '') => {
    setIsVideoSearchLoading(true);
    setError(null);
    try {
      const res = await adminSearchVideos(query, 100, 0, adminPassword);
      setAdminVideos(res.videos);
      setAdminVideosTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Échec de la recherche des vidéos');
    } finally {
      setIsVideoSearchLoading(false);
    }
  }, [adminPassword, adminSearchVideos]);

  // Load playlists and videos when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchLists();
      fetchAdminVideos(videoSearchQuery);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      fetchGlobalStats();
    } else if (isAuthenticated && activeTab === 'videos') {
      fetchAdminVideos(videoSearchQuery);
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminPassword) {
      setError('Mot de passe administrateur obligatoire.');
      return;
    }

    try {
      const { validated, community } = await getPlaylists();
      setValidatedLists(validated);
      setCommunityLists(community);
      setIsAuthenticated(true);
      localStorage.setItem('rate_it_admin_password', adminPassword);
    } catch (err: any) {
      setError('Mot de passe administrateur incorrect ou erreur de connexion.');
    }
  };

  // Restore password on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('rate_it_admin_password');
    if (savedPassword) {
      setAdminPassword(savedPassword);
      getPlaylists()
        .then(({ validated, community }) => {
          setValidatedLists(validated);
          setCommunityLists(community);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('rate_it_admin_password');
        });
    }
  }, [isConnected]);

  const handleToggleValidation = async (id: string, currentStatus: boolean) => {
    setError(null);
    setActionSuccess(null);
    try {
      await validatePlaylist(id, !currentStatus, adminPassword);
      setActionSuccess(`Validation de la playlist ${id} mise à jour avec succès !`);
      await fetchLists();
    } catch (err: any) {
      setError(err.message || 'Échec du changement de statut de validation.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la playlist ${id} ?`)) {
      return;
    }
    setError(null);
    setActionSuccess(null);
    try {
      await deletePlaylist(id, adminPassword);
      setActionSuccess(`Playlist ${id} supprimée avec succès !`);
      await fetchLists();
      if (activeTab === 'videos') {
        fetchAdminVideos(videoSearchQuery);
      }
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression de la playlist.');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Cette action supprimera toutes les playlists personnalisées jouées 1 fois ou moins et inactives depuis 30 jours. Confirmer ?')) {
      return;
    }
    setError(null);
    setCleanupResult(null);
    try {
      const count = await cleanStalePlaylists(adminPassword);
      setCleanupResult(`Nettoyage terminé ! ${count} playlists inactives supprimées.`);
      await fetchLists();
      if (activeTab === 'videos') {
        fetchAdminVideos(videoSearchQuery);
      }
    } catch (err: any) {
      setError(err.message || 'Échec du nettoyage des playlists inactives.');
    }
  };

  const extractYoutubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  };

  const handleSelectEditPlaylist = async (id: string, name: string) => {
    setError(null);
    setActionSuccess(null);
    setIsEditingLoading(true);
    setEditingPlaylistId(id);
    setEditingPlaylistName(name);
    try {
      const res = await getPlaylistDetails(id);
      setEditingPlaylistTracks(res.videos);
    } catch (err: any) {
      setError(err.message || 'Échec de la récupération des pistes de la playlist');
      setEditingPlaylistId(null);
    } finally {
      setIsEditingLoading(false);
    }
  };

  const handleAdminAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingPlaylistId) return;

    if (!newTrackArtist.trim() || !newTrackTitle.trim() || !newTrackUrl.trim()) {
      setError('Veuillez renseigner le nom de l\'artiste, le titre et le lien YouTube.');
      return;
    }

    const ytid = extractYoutubeId(newTrackUrl.trim());
    if (ytid.length !== 11) {
      setError('Lien ou identifiant YouTube invalide. Doit comporter 11 caractères.');
      return;
    }

    try {
      await adminAddVideo(
        editingPlaylistId,
        newTrackTitle.trim(),
        ytid,
        newTrackArtist.trim(),
        newTrackDescription.trim(),
        newTrackMalAnimeId.trim() || undefined,
        newTrackMalTitle.trim() || undefined,
        adminPassword
      );

      // Refresh playlist tracks
      const res = await getPlaylistDetails(editingPlaylistId);
      setEditingPlaylistTracks(res.videos);

      // Clear inputs
      setNewTrackArtist('');
      setNewTrackTitle('');
      setNewTrackDescription('');
      setNewTrackUrl('');
      setNewTrackMalTitle('');
      setNewTrackMalAnimeId('');
      setActionSuccess('Piste ajoutée à la playlist avec succès !');

      if (activeTab === 'videos') {
        fetchAdminVideos(videoSearchQuery);
      }
    } catch (err: any) {
      setError(err.message || 'Échec de l\'ajout de la piste');
    }
  };

  const handleAdminDeleteTrack = async (videoId: string) => {
    if (!editingPlaylistId) return;
    if (!confirm('Êtes-vous sûr de vouloir retirer cette vidéo de la playlist ?')) return;

    setError(null);
    try {
      await adminDeleteVideo(editingPlaylistId, videoId, adminPassword);

      const res = await getPlaylistDetails(editingPlaylistId);
      setEditingPlaylistTracks(res.videos);
      setActionSuccess('Piste retirée de la playlist avec succès.');

      if (activeTab === 'videos') {
        fetchAdminVideos(videoSearchQuery);
      }
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression de la piste');
    }
  };

  // Direct video delete from the Maintenance tab
  const handleAdminDeleteVideoDirect = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la vidéo "${videoTitle}" (ID: ${videoId}) de la base de données ?`)) {
      return;
    }

    setError(null);
    try {
      await adminDeleteVideoDirect(videoId, adminPassword);
      setActionSuccess(`Vidéo "${videoTitle}" supprimée de la base de données.`);
      fetchAdminVideos(videoSearchQuery);
      if (editingPlaylistId) {
        const res = await getPlaylistDetails(editingPlaylistId);
        setEditingPlaylistTracks(res.videos);
      }
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression de la vidéo');
    }
  };

  // Test YouTube availability for a video in the list
  const handleTestVideo = async (youtubeId: string) => {
    setTestedVideos((prev) => ({
      ...prev,
      [youtubeId]: { checking: true },
    }));

    try {
      const res = await verifyVideo(youtubeId);
      setTestedVideos((prev) => ({
        ...prev,
        [youtubeId]: {
          checking: false,
          valid: res.valid,
          error: res.error,
          title: res.title,
        },
      }));
    } catch (err: any) {
      setTestedVideos((prev) => ({
        ...prev,
        [youtubeId]: {
          checking: false,
          valid: false,
          error: err.message,
        },
      }));
    }
  };

  // Open Edit Modal for a video
  const handleOpenEditModal = (video: any) => {
    setModalVideo(video);
    setEditTitle(video.title || '');
    setEditArtist(video.artistName || '');
    setEditDescription(video.description || '');
    setEditYoutubeId(video.youtubeId || '');
    setEditMalTitle(video.malTitle || '');
    setEditMalAnimeId(video.malAnimeId ? String(video.malAnimeId) : '');
    setEditModalError(null);
    setEditTestStatus(null);
  };

  // Test YouTube link inside the Edit Modal
  const handleTestModalLink = async () => {
    const ytid = extractYoutubeId(editYoutubeId.trim());
    if (!ytid || ytid.length !== 11) {
      setEditTestStatus({ checking: false, valid: false, error: 'Identifiant YouTube invalide (11 caractères requis)' });
      return;
    }

    setEditTestStatus({ checking: true });
    try {
      const res = await verifyVideo(ytid);
      setEditTestStatus({
        checking: false,
        valid: res.valid,
        error: res.error,
        title: res.title,
      });
    } catch (err: any) {
      setEditTestStatus({ checking: false, valid: false, error: err.message });
    }
  };

  // Save changes from Edit Modal
  const handleSaveModalVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVideo) return;
    setEditModalError(null);

    const cleanTitle = editTitle.trim();
    const cleanArtist = editArtist.trim();
    const cleanYtId = extractYoutubeId(editYoutubeId.trim());

    if (!cleanTitle || !cleanYtId) {
      setEditModalError('Le titre et un identifiant YouTube valide sont requis.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await adminUpdateVideo(
        modalVideo.id,
        {
          title: cleanTitle,
          artistName: cleanArtist || 'Artiste inconnu',
          description: editDescription.trim(),
          youtubeId: cleanYtId,
          malTitle: editMalTitle.trim() || undefined,
          malAnimeId: editMalAnimeId.trim() ? parseInt(editMalAnimeId.trim(), 10) : undefined,
        },
        adminPassword
      );

      setActionSuccess(`Vidéo "${cleanTitle}" mise à jour avec succès !`);
      setModalVideo(null);

      // Refresh list
      fetchAdminVideos(videoSearchQuery);
      if (editingPlaylistId) {
        const res = await getPlaylistDetails(editingPlaylistId);
        setEditingPlaylistTracks(res.videos);
      }
    } catch (err: any) {
      setEditModalError(err.message || 'Échec de la mise à jour de la vidéo');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rate_it_admin_password');
    setAdminPassword('');
    setIsAuthenticated(false);
  };

  // Render Login view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent text-black font-sans px-3 sm:px-6 py-6 sm:py-12 flex items-center justify-center w-full max-w-full overflow-x-hidden">
        <div className="info-card w-full max-w-md p-6 sm:p-8 rounded-3xl text-center">
          <h1 className="text-3xl font-black font-title text-[#990000] uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#990000]" />
            <span>ADMIN LOGIN</span>
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-left">Mot de passe Administrateur</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Entrez le mot de passe..."
                className="w-full px-3 py-2.5 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold text-center"
              />
            </div>
            {error && (
              <p className="text-xs text-[#990000] font-black uppercase flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-3 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 text-black font-black text-sm uppercase rounded-xl btn-action-hover"
              >
                Retour
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#BF1539] text-white border-2 border-black font-black text-sm uppercase rounded-xl btn-action-hover"
              >
                Connexion
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Group all playlists for "all" tab
  const allLists = [...validatedLists, ...communityLists];

  return (
    <div className="min-h-screen bg-transparent text-black font-sans px-3 sm:px-12 py-6 sm:py-12 flex flex-col items-center w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-4 border-black pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black font-title uppercase tracking-wider text-[#990000] drop-shadow-[2px_2px_0px_#000] flex items-center gap-3">
            <ShieldCheck className="w-9 h-9 text-[#990000]" />
            <span>ADMIN CONSOLE</span>
          </h1>
          <p className="text-sm font-bold text-slate-700 mt-1">
            Gestion des playlists, modération, maintenance des vidéos et statistiques globales
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 focus:bg-slate-100 font-black text-xs uppercase rounded-xl btn-action-hover"
          >
            Accueil
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border-2 border-black bg-[#990000] text-white font-black text-xs uppercase rounded-xl btn-action-hover"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-3 items-start">
        {/* Left Side: Cleanup Controls & Playlist Editor */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="info-card p-6 rounded-2xl">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-[#BF1539]">
              Nettoyage de la BDD
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed mb-4 font-bold">
              Supprime automatiquement les playlists personnalisées jouées **1 fois ou moins** et inactives depuis **30 jours**.
            </p>
            <button
              onClick={handleCleanup}
              className="w-full py-3 bg-[#990000] text-white border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Nettoyer les Playlists Inactives</span>
            </button>
            {cleanupResult && (
              <p className="mt-4 text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-500 rounded p-2.5">
                {cleanupResult}
              </p>
            )}
          </div>

          {editingPlaylistId && (
            <div className="info-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <h2 className="text-xs font-black uppercase text-[#990000] truncate max-w-[180px] inline-flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span>Édition : {editingPlaylistName}</span>
                </h2>
                <button
                  onClick={() => setEditingPlaylistId(null)}
                  className="text-xs font-black text-slate-500 hover:text-black focus:text-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000] btn-action-hover"
                >
                  Fermer
                </button>
              </div>

              {isEditingLoading ? (
                <p className="text-xs text-slate-500 font-bold py-6 text-center animate-pulse">Chargement des pistes...</p>
              ) : (
                <>
                  {/* Current Tracks List */}
                  <div className="border-2 border-black bg-white p-3 rounded-xl max-h-64 overflow-y-auto">
                    <p className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
                      <span>Pistes ({editingPlaylistTracks.length})</span>
                      <span className="font-mono text-slate-400 text-[8px]">Cliquez sur ✏️ pour modifier</span>
                    </p>
                    {editingPlaylistTracks.length === 0 ? (
                      <p className="text-[10px] text-slate-400 py-4 text-center">Aucune piste dans cette playlist.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {editingPlaylistTracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between text-[11px] font-bold py-1.5 px-1 border-b border-slate-100 last:border-b-0 gap-2 hover:bg-slate-50 rounded"
                          >
                            <div className="truncate text-left flex-1 min-w-0">
                              <span className="font-black text-black text-[10px] block truncate">{track.title}</span>
                              <span className="text-slate-600 text-[9px] block truncate">
                                par {track.artistName || 'Artiste inconnu'} {track.malTitle ? `(MAL: ${track.malTitle})` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(track)}
                                title="Modifier la vidéo"
                                className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-black rounded btn-action-hover"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteTrack(track.id)}
                                title="Supprimer de la playlist"
                                className="p-1 bg-red-100 hover:bg-red-200 text-red-900 border border-black rounded btn-action-hover"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Track Form */}
                  <form onSubmit={handleAdminAddTrack} className="border-t border-black pt-3 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une nouvelle piste</span>
                    </p>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Nom de l'Artiste</label>
                      <input
                        type="text"
                        value={newTrackArtist}
                        onChange={(e) => setNewTrackArtist(e.target.value)}
                        placeholder="ex: Yoko Takahashi..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Titre de la musique</label>
                      <input
                        type="text"
                        value={newTrackTitle}
                        onChange={(e) => setNewTrackTitle(e.target.value)}
                        placeholder="ex: Cruel Angel Thesis..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Description (Optionnelle)</label>
                      <input
                        type="text"
                        value={newTrackDescription}
                        onChange={(e) => setNewTrackDescription(e.target.value)}
                        placeholder="ex: Opening de Neon Genesis Evangelion..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Lien ou ID YouTube</label>
                      <input
                        type="text"
                        value={newTrackUrl}
                        onChange={(e) => setNewTrackUrl(e.target.value)}
                        placeholder="Lien watch YouTube ou ID à 11 caractères..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Titre MAL de l'Animé (Optionnel)</label>
                      <input
                        type="text"
                        value={newTrackMalTitle}
                        onChange={(e) => setNewTrackMalTitle(e.target.value)}
                        placeholder="ex: Attack on Titan..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">ID Animé MyAnimeList (Optionnel)</label>
                      <input
                        type="number"
                        value={newTrackMalAnimeId}
                        onChange={(e) => setNewTrackMalAnimeId(e.target.value)}
                        placeholder="ex: 30..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#BF1539] text-white border border-black font-black text-[10px] uppercase rounded-lg btn-action-hover mt-1"
                    >
                      Ajouter la piste
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Main Content Tabs */}
        <div className="info-card lg:col-span-2 p-6 rounded-2xl flex flex-col min-h-[500px]">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap border-b-2 border-black pb-3 mb-6 gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${
                activeTab === 'pending' ? 'bg-[#BF1539] text-white' : 'bg-white hover:bg-slate-100'
              }`}
            >
              En attente ({communityLists.length})
            </button>
            <button
              onClick={() => setActiveTab('validated')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${
                activeTab === 'validated' ? 'bg-[#BF1539] text-white' : 'bg-white hover:bg-slate-100'
              }`}
            >
              Validées ({validatedLists.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${
                activeTab === 'all' ? 'bg-[#BF1539] text-white' : 'bg-white hover:bg-slate-100'
              }`}
            >
              Toutes ({allLists.length})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'videos' ? 'bg-[#24B3F1] text-black shadow-md' : 'bg-white hover:bg-slate-100'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Vidéos DB ({adminVideosTotal})</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${
                activeTab === 'analytics' ? 'bg-amber-400 text-black shadow-md' : 'bg-white hover:bg-slate-100'
              }`}
            >
              Stats Votes 📊
            </button>
          </div>

          {actionSuccess && (
            <div className="mb-4 bg-emerald-100 border-2 border-emerald-500 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-bold animate-pulse flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: VIDEO MAINTENANCE VIEW */}
          {activeTab === 'videos' && (
            <div className="flex flex-col gap-4">
              {/* Search Bar & Refresh */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchAdminVideos(videoSearchQuery);
                }}
                className="flex flex-col sm:flex-row gap-2 items-center"
              >
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={videoSearchQuery}
                    onChange={(e) => {
                      setVideoSearchQuery(e.target.value);
                    }}
                    placeholder="Rechercher par titre, artiste, anime MAL, ID YouTube..."
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-black bg-white rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#24B3F1] text-black border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover shrink-0 inline-flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Rechercher</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVideoSearchQuery('');
                    fetchAdminVideos('');
                  }}
                  className="w-full sm:w-auto px-3 py-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover shrink-0 inline-flex items-center justify-center gap-1.5"
                  title="Rafraîchir la liste"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVideoSearchLoading ? 'animate-spin' : ''}`} />
                </button>
              </form>

              {/* Video List */}
              {isVideoSearchLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mb-2" />
                  <p className="text-xs font-bold">Chargement des vidéos de la base de données...</p>
                </div>
              ) : adminVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Film className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600">Aucune vidéo trouvée pour cette recherche.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[580px] pr-1">
                  {adminVideos.map((video) => {
                    const testStatus = testedVideos[video.youtubeId];
                    return (
                      <div
                        key={video.id}
                        className="p-3.5 border-2 border-black bg-white rounded-2xl shadow-[3px_3px_0px_0px_#000] flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between"
                      >
                        {/* Thumbnail & Track Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-20 sm:w-24 aspect-video bg-black rounded-lg border border-black overflow-hidden shrink-0">
                            <img
                              src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <a
                              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 text-white transition-opacity"
                              title="Ouvrir sur YouTube"
                            >
                              <ExternalLink className="w-4 h-4 drop-shadow" />
                            </a>
                          </div>

                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-black text-sm leading-tight truncate max-w-full">
                                {video.title}
                              </h4>
                              <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300 font-mono">
                                ID: {video.id}
                              </span>
                              <span className="text-[9px] font-black bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-300">
                                {video.playlistName || video.playlistId || 'Sans playlist'}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                              par <span className="text-black">{video.artistName || 'Artiste inconnu'}</span>
                              {video.description ? ` — ${video.description}` : ''}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                              {/* YouTube ID Tag */}
                              <span className="font-mono font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                YT: {video.youtubeId}
                              </span>

                              {/* MAL Liaison Tag */}
                              {video.malAnimeId ? (
                                <a
                                  href={`https://myanimelist.net/anime/${video.malAnimeId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1"
                                >
                                  <span>MAL: {video.malTitle || `#${video.malAnimeId}`}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <span className="font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Pas de liaison MAL
                                </span>
                              )}

                              {/* Test Live Status Badge */}
                              {testStatus && !testStatus.checking && (
                                <span
                                  className={`font-black px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                    testStatus.valid
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                                      : 'bg-red-100 text-red-800 border-red-400'
                                  }`}
                                >
                                  {testStatus.valid ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Valide sur YouTube</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 text-red-600" />
                                      <span>{testStatus.error || 'Indisponible'}</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex sm:flex-col lg:flex-row items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleTestVideo(video.youtubeId)}
                            disabled={testStatus?.checking}
                            className="px-2.5 py-1.5 border border-black bg-white hover:bg-slate-100 text-black font-black text-[10px] uppercase rounded-lg btn-action-hover inline-flex items-center gap-1"
                            title="Tester la validité de la vidéo YouTube"
                          >
                            <RefreshCw className={`w-3 h-3 ${testStatus?.checking ? 'animate-spin' : ''}`} />
                            <span>{testStatus?.checking ? 'Test...' : 'Tester'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(video)}
                            className="px-2.5 py-1.5 border border-black bg-amber-400 text-black font-black text-[10px] uppercase rounded-lg btn-action-hover inline-flex items-center gap-1"
                            title="Modifier le titre, l'artiste, le lien ou la liaison MAL"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAdminDeleteVideoDirect(video.id, video.title)}
                            className="px-2.5 py-1.5 border border-black bg-[#990000] text-white font-black text-[10px] uppercase rounded-lg btn-action-hover inline-flex items-center gap-1"
                            title="Supprimer définitivement la vidéo"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANALYTICS VIEW */}
          {activeTab === 'analytics' && (
            <div>
              {isStatsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                  <p className="text-xs font-bold animate-pulse">Chargement des statistiques globales...</p>
                </div>
              ) : globalStats ? (
                <div className="flex flex-col gap-6 overflow-y-auto max-h-[520px] pr-1 text-left">
                  {/* Overall Summary Card */}
                  <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b-2 border-black pb-2">
                      <h3 className="font-black text-xs sm:text-sm text-black uppercase">
                        Résumé Global des Votes
                      </h3>
                      <span className="text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                        {globalStats.overall.totalVotes} Votes Enregistrés
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-black rounded-xl">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Note Moyenne Globale</span>
                        <span className="text-3xl font-black font-mono text-[#BF1539] mt-1">
                          {globalStats.overall.averageRating.toFixed(2)} / 5
                        </span>
                      </div>

                      {/* Distribution Bars */}
                      <div className="flex flex-col gap-1.5 justify-center">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = globalStats.overall.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                          const total = globalStats.overall.totalVotes || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={star} className="flex items-center gap-2 text-[10px] font-bold">
                              <span className="w-8 font-black shrink-0">{star} ★</span>
                              <div className="flex-1 bg-slate-100 border border-black rounded-full h-3 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 border-r border-black"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-12 text-right font-mono font-black shrink-0 text-slate-600">
                                {count} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Top 10 Rated Tracks */}
                  <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_#000]">
                    <h3 className="font-black text-xs sm:text-sm text-black uppercase border-b-2 border-black pb-2 mb-3 text-emerald-700">
                      Top 10 — Titres les Mieux Notés
                    </h3>
                    {globalStats.topTracks.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Aucun vote enregistré.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {globalStats.topTracks.map((tr, idx) => (
                          <div key={tr.youtubeId + idx} className="flex items-center justify-between text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 gap-2">
                            <div className="truncate flex-1">
                              <span className="font-black text-black">{tr.title || tr.youtubeId}</span>
                              <span className="text-slate-500 text-[10px]"> par {tr.artistName || 'Artiste inconnu'}</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2 font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                              <span>★ {tr.averageRating}</span>
                              <span className="text-[9px] text-slate-400">({tr.totalVotes} votes)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lowest 10 Rated Tracks */}
                  <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_#000]">
                    <h3 className="font-black text-xs sm:text-sm text-black uppercase border-b-2 border-black pb-2 mb-3 text-[#990000]">
                      Top 10 — Titres les Moins Bien Notés
                    </h3>
                    {globalStats.worstTracks.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Aucun vote enregistré.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {globalStats.worstTracks.map((tr, idx) => (
                          <div key={tr.youtubeId + idx} className="flex items-center justify-between text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 gap-2">
                            <div className="truncate flex-1">
                              <span className="font-black text-black">{tr.title || tr.youtubeId}</span>
                              <span className="text-slate-500 text-[10px]"> par {tr.artistName || 'Artiste inconnu'}</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2 font-mono font-black text-[#990000] bg-red-50 border border-red-300 px-2 py-0.5 rounded">
                              <span>★ {tr.averageRating}</span>
                              <span className="text-[9px] text-slate-400">({tr.totalVotes} votes)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                  <p className="text-xs font-bold">Aucune statistique enregistrée pour l'instant.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3, 4, 5: PLAYLISTS VIEWS (Pending, Validated, All) */}
          {activeTab !== 'analytics' && activeTab !== 'videos' && (
            <div>
              {(() => {
                const list = activeTab === 'pending' ? communityLists : activeTab === 'validated' ? validatedLists : allLists;

                if (list.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                      <FolderX className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="mt-2 text-xs font-bold text-slate-600">Aucune playlist trouvée dans cet onglet.</p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-4 overflow-y-auto max-h-[480px] pr-1">
                    {list.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="flex flex-col gap-3 p-4 border-2 border-black bg-white rounded-2xl shadow-[3px_3px_0px_0px_#000]"
                      >
                        <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                          <div>
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                              ID: {playlist.id}
                            </span>
                            <h3 className="font-black text-sm text-black mt-1">
                              {playlist.name}
                            </h3>
                            <p className="text-[10px] text-slate-600 mt-1 italic">
                              {playlist.description || 'Sans description'}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${playlist.is_validated ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : 'bg-amber-100 text-amber-700 border-amber-500'}`}>
                            {playlist.is_validated ? 'Validée' : 'En attente'}
                          </span>
                        </div>

                        <div className="flex flex-wrap text-[10px] font-black text-slate-500 gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Gamepad2 className="w-3 h-3 text-slate-500" />
                            <span>Parties jouées : {playlist.played_count || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Dernière partie : {playlist.last_played ? new Date(playlist.last_played).toLocaleDateString() : 'Jamais'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Créée le : {new Date(playlist.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex justify-end gap-3 mt-1 border-t border-slate-100 pt-3">
                          <button
                            onClick={() => handleSelectEditPlaylist(playlist.id, playlist.name)}
                            className="px-3 py-1.5 border-2 border-black bg-yellow-400 text-black font-black text-xs uppercase rounded-xl btn-action-hover"
                          >
                            Éditer Pistes
                          </button>
                          <button
                            onClick={() => handleToggleValidation(playlist.id, playlist.is_validated)}
                            className={`px-3 py-1.5 border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover ${playlist.is_validated ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}
                          >
                            {playlist.is_validated ? 'Invalider' : 'Valider'}
                          </button>
                          <button
                            onClick={() => handleDelete(playlist.id)}
                            disabled={playlist.id === 'anime-classics'}
                            className="px-3 py-1.5 border-2 border-black bg-[#990000] text-white font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-30"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT VIDEO MODAL                                                          */}
      {/* ========================================================================= */}
      {modalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto text-left">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#BF1539]" />
                <h3 className="text-base sm:text-lg font-black font-title uppercase text-black">
                  Maintenance Vidéo (ID: {modalVideo.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalVideo(null)}
                className="p-1 text-slate-500 hover:text-black border-2 border-black rounded-lg bg-white btn-action-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModalError && (
              <div className="p-2.5 bg-red-100 border border-red-500 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{editModalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveModalVideo} className="flex flex-col gap-3.5 text-xs font-bold">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Titre du Thème / Musique *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="ex: Cruel Angel's Thesis..."
                  className="w-full px-3 py-2 border-2 border-black bg-white rounded-xl focus:outline-none"
                  required
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Nom de l'Artiste / Groupe
                </label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  placeholder="ex: Yoko Takahashi..."
                  className="w-full px-3 py-2 border-2 border-black bg-white rounded-xl focus:outline-none"
                />
              </div>

              {/* YouTube Link / ID + Live Tester */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-700">
                    Lien ou ID YouTube (11 caractères) *
                  </label>
                  <button
                    type="button"
                    onClick={handleTestModalLink}
                    disabled={editTestStatus?.checking}
                    className="text-[9px] font-black text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-300 px-2 py-0.5 rounded inline-flex items-center gap-1 btn-action-hover"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${editTestStatus?.checking ? 'animate-spin' : ''}`} />
                    <span>{editTestStatus?.checking ? 'Vérification...' : 'Tester le lien'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editYoutubeId}
                  onChange={(e) => {
                    setEditYoutubeId(e.target.value);
                    setEditTestStatus(null);
                  }}
                  placeholder="ex: nU21rCWkuJw ou https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border-2 border-black bg-white rounded-xl font-mono text-xs focus:outline-none"
                  required
                />
                {editTestStatus && !editTestStatus.checking && (
                  <div
                    className={`mt-1.5 p-2 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                      editTestStatus.valid
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-300 text-red-900'
                    }`}
                  >
                    {editTestStatus.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Vidéo valide sur YouTube : "{editTestStatus.title}"</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Erreur YouTube : {editTestStatus.error || 'Indisponible'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Description / Précisions
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="ex: Opening 1 de la saison 1..."
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-black bg-white rounded-xl focus:outline-none"
                />
              </div>

              {/* MAL Integration Fields */}
              <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-2xl flex flex-col gap-2.5">
                <span className="text-[10px] font-black uppercase text-purple-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-700" />
                  <span>Liaison MyAnimeList (MAL)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-purple-800 mb-0.5">
                      Titre Animé MAL
                    </label>
                    <input
                      type="text"
                      value={editMalTitle}
                      onChange={(e) => setEditMalTitle(e.target.value)}
                      placeholder="ex: Neon Genesis Evangelion..."
                      className="w-full px-2.5 py-1.5 border border-purple-300 bg-white rounded-lg text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-purple-800 mb-0.5">
                      ID Animé MAL (Chiffre)
                    </label>
                    <input
                      type="number"
                      value={editMalAnimeId}
                      onChange={(e) => setEditMalAnimeId(e.target.value)}
                      placeholder="ex: 30..."
                      className="w-full px-2.5 py-1.5 border border-purple-300 bg-white rounded-lg text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalVideo(null)}
                  className="flex-1 py-2.5 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase rounded-xl btn-action-hover"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 bg-[#BF1539] text-white border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {isSavingEdit ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
