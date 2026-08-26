'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { AlertTriangle, Trash2, Pencil, X, Plus, Sparkles, FolderX, ShieldCheck, Clock, Calendar, Gamepad2 } from 'lucide-react';

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
    getGlobalStats,
    isConnected 
  } = useSocket();

  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playlists data
  const [validatedLists, setValidatedLists] = useState<any[]>([]);
  const [communityLists, setCommunityLists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'validated' | 'all' | 'analytics'>('pending');

  // Global Ratings Analytics State
  const [globalStats, setGlobalStats] = useState<{ overall: any; topTracks: any[]; worstTracks: any[] } | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      fetchGlobalStats();
    }
  }, [activeTab, isAuthenticated]);

  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Editing states
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState<string>('');
  const [editingPlaylistTracks, setEditingPlaylistTracks] = useState<any[]>([]);
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  // New Track inputs for editor
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackDescription, setNewTrackDescription] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');

  const fetchLists = async () => {
    setError(null);
    try {
      const { validated, community } = await getPlaylists();
      setValidatedLists(validated);
      setCommunityLists(community);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch playlists');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminPassword) {
      setError('Admin password is required.');
      return;
    }

    // Try a simple validate call to check if password is correct, or just load lists
    try {
      const { validated, community } = await getPlaylists();
      setValidatedLists(validated);
      setCommunityLists(community);
      setIsAuthenticated(true);
      localStorage.setItem('rate_it_admin_password', adminPassword);
    } catch (err: any) {
      setError('Invalid admin password or connection error.');
    }
  };

  // Restore password on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('rate_it_admin_password');
    if (savedPassword) {
      setAdminPassword(savedPassword);
      // Auto login
      getPlaylists().then(({ validated, community }) => {
        setValidatedLists(validated);
        setCommunityLists(community);
        setIsAuthenticated(true);
      }).catch(() => {
        localStorage.removeItem('rate_it_admin_password');
      });
    }
  }, [isConnected]);

  const handleToggleValidation = async (id: string, currentStatus: boolean) => {
    setError(null);
    setActionSuccess(null);
    try {
      await validatePlaylist(id, !currentStatus, adminPassword);
      setActionSuccess(`Playlist ${id} validation toggled successfully!`);
      await fetchLists();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle validation status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to permanently delete playlist ${id}?`)) {
      return;
    }
    setError(null);
    setActionSuccess(null);
    try {
      await deletePlaylist(id, adminPassword);
      setActionSuccess(`Playlist ${id} deleted successfully!`);
      await fetchLists();
    } catch (err: any) {
      setError(err.message || 'Failed to delete playlist.');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('This will permanently delete all custom playlists played 1 time or less, and not played in the last 30 days. Proceed?')) {
      return;
    }
    setError(null);
    setCleanupResult(null);
    try {
      const count = await cleanStalePlaylists(adminPassword);
      setCleanupResult(`Stale cleanup completed! Deleted ${count} playlists.`);
      await fetchLists();
    } catch (err: any) {
      setError(err.message || 'Failed to run stale playlists cleanup.');
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
      setError(err.message || 'Failed to fetch playlist tracks');
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
      setError('Please fill in Artist Name, Song Title, and YouTube link.');
      return;
    }

    const ytid = extractYoutubeId(newTrackUrl.trim());
    if (ytid.length !== 11) {
      setError('Invalid YouTube link or ID. Must contain 11-char video ID.');
      return;
    }

    try {
      await adminAddVideo(
        editingPlaylistId,
        newTrackTitle.trim(),
        ytid,
        newTrackArtist.trim(),
        newTrackDescription.trim(),
        adminPassword
      );
      
      // Refresh list
      const res = await getPlaylistDetails(editingPlaylistId);
      setEditingPlaylistTracks(res.videos);
      
      // Clear inputs
      setNewTrackArtist('');
      setNewTrackTitle('');
      setNewTrackDescription('');
      setNewTrackUrl('');
      setActionSuccess('Track added to playlist successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add track');
    }
  };

  const handleAdminDeleteTrack = async (videoId: string) => {
    if (!editingPlaylistId) return;
    if (!confirm('Are you sure you want to remove this track from the playlist?')) return;

    setError(null);
    try {
      await adminDeleteVideo(editingPlaylistId, videoId, adminPassword);
      
      // Refresh list
      const res = await getPlaylistDetails(editingPlaylistId);
      setEditingPlaylistTracks(res.videos);
      setActionSuccess('Track removed from playlist successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete track');
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
              <label className="block text-xs font-black uppercase mb-1 text-left">Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter password..."
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
                className="flex-1 py-3 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-sm uppercase rounded-xl transition"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#BF1539] text-white border-2 border-black font-black text-sm uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              >
                Login
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
      <div className="w-full max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-4 border-black pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black font-title uppercase tracking-wider text-[#990000] drop-shadow-[2px_2px_0px_#000] flex items-center gap-3">
            <ShieldCheck className="w-9 h-9 text-[#990000]" />
            <span>ADMIN CONSOLE</span>
          </h1>
          <p className="text-sm font-bold text-slate-700 mt-1">
            Manage custom anime theme playlists and validate moderation checks
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 font-black text-xs uppercase rounded-xl transition"
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border-2 border-black bg-[#990000] text-white font-black text-xs uppercase rounded-xl transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-3 items-start">
        {/* Left Side: Cleanup Controls */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="info-card p-6 rounded-2xl">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-[#BF1539]">
              Database Cleanup
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed mb-4 font-bold">
              Automatically deletes custom user playlists that have been played **only 1 time or less** and have not been used in the **last 30 days**.
            </p>
            <button
              onClick={handleCleanup}
              className="w-full py-3 bg-[#990000] text-white border-2 border-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Stale Playlists</span>
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
                  <span>Edit: {editingPlaylistName}</span>
                </h2>
                <button
                  onClick={() => setEditingPlaylistId(null)}
                  className="text-xs font-black text-slate-500 hover:text-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000]"
                >
                  Close
                </button>
              </div>

              {isEditingLoading ? (
                <p className="text-xs text-slate-500 font-bold py-6 text-center animate-pulse">Loading tracks...</p>
              ) : (
                <>
                  {/* Current Tracks List */}
                  <div className="border-2 border-black bg-white p-3 rounded-xl max-h-56 overflow-y-auto">
                    <p className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">
                      Tracks in Playlist ({editingPlaylistTracks.length})
                    </p>
                    {editingPlaylistTracks.length === 0 ? (
                      <p className="text-[10px] text-slate-400 py-4 text-center">No tracks in this playlist.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {editingPlaylistTracks.map((track) => (
                          <div key={track.id} className="flex items-center justify-between text-[11px] font-bold py-1 border-b border-slate-100 last:border-b-0 gap-2">
                            <div className="truncate text-left flex-1">
                              <span className="font-black text-black text-[10px]">{track.title}</span>
                              <span className="text-slate-600 text-[10px]"> by {track.artistName || 'Unknown Artist'}</span>
                              {track.description && <span className="text-slate-500 text-[10px]"> — {track.description}</span>}
                            </div>
                            <button
                              onClick={() => handleAdminDeleteTrack(track.id)}
                              className="text-[9px] text-[#990000] hover:text-red-500 font-black shrink-0 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Track Form */}
                  <form onSubmit={handleAdminAddTrack} className="border-t border-black pt-3 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Track</span>
                    </p>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Artist Name</label>
                      <input
                        type="text"
                        value={newTrackArtist}
                        onChange={(e) => setNewTrackArtist(e.target.value)}
                        placeholder="e.g. Yoko Takahashi..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Song Title</label>
                      <input
                        type="text"
                        value={newTrackTitle}
                        onChange={(e) => setNewTrackTitle(e.target.value)}
                        placeholder="e.g. Cruel Angel Thesis..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">Description (Optional)</label>
                      <input
                        type="text"
                        value={newTrackDescription}
                        onChange={(e) => setNewTrackDescription(e.target.value)}
                        placeholder="e.g. Opening of Neon Genesis Evangelion..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-600">YouTube URL / ID</label>
                      <input
                        type="text"
                        value={newTrackUrl}
                        onChange={(e) => setNewTrackUrl(e.target.value)}
                        placeholder="YouTube watch link or 11-char ID..."
                        className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#BF1539] text-white border border-black font-black text-[10px] uppercase rounded-lg shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 mt-1"
                    >
                      Add Track
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Playlists List */}
        <div className="info-card lg:col-span-2 p-6 rounded-2xl flex flex-col min-h-[500px]">
          {/* Tabs */}
          <div className="flex flex-wrap border-b-2 border-black pb-3 mb-6 gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${activeTab === 'pending' ? 'bg-[#BF1539] text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              Pending ({communityLists.length})
            </button>
            <button
              onClick={() => setActiveTab('validated')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${activeTab === 'validated' ? 'bg-[#BF1539] text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              Validated ({validatedLists.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${activeTab === 'all' ? 'bg-[#BF1539] text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              All ({allLists.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 sm:px-4 py-2 border-2 border-black font-black text-xs uppercase rounded-xl transition ${activeTab === 'analytics' ? 'bg-amber-400 text-black' : 'bg-white hover:bg-slate-100'}`}
            >
              Ratings Stats 📊
            </button>
          </div>

          {actionSuccess && (
            <div className="mb-4 bg-emerald-100 border-2 border-emerald-500 text-emerald-700 px-4 py-2.5 rounded-lg text-xs font-bold animate-pulse flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Analytics View */}
          {activeTab === 'analytics' ? (
            isStatsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <p className="text-xs font-bold animate-pulse">Loading global rating statistics...</p>
              </div>
            ) : globalStats ? (
              <div className="flex flex-col gap-6 overflow-y-auto max-h-[520px] pr-1 text-left">
                {/* Overall Summary Card */}
                <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2">
                    <h3 className="font-black text-xs sm:text-sm text-black uppercase">
                      All-Time Rating Summary
                    </h3>
                    <span className="text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                      {globalStats.overall.totalVotes} Total Votes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-black rounded-xl">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Global Average Rating</span>
                      <span className="text-3xl font-black font-mono text-[#BF1539] mt-1">
                        {globalStats.overall.averageRating.toFixed(2)} / 5
                      </span>
                    </div>

                    {/* Distribution Bars */}
                    <div className="flex flex-col gap-1.5 justify-center">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = globalStats.overall.distribution[star as 1|2|3|4|5] || 0;
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
                    Highest-Rated Tracks
                  </h3>
                  {globalStats.topTracks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No votes recorded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {globalStats.topTracks.map((tr, idx) => (
                        <div key={tr.youtubeId + idx} className="flex items-center justify-between text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 gap-2">
                          <div className="truncate flex-1">
                            <span className="font-black text-black">{tr.title || tr.youtubeId}</span>
                            <span className="text-slate-500 text-[10px]"> by {tr.artistName || 'Unknown Artist'}</span>
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
                    Lowest-Rated Tracks
                  </h3>
                  {globalStats.worstTracks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No votes recorded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {globalStats.worstTracks.map((tr, idx) => (
                        <div key={tr.youtubeId + idx} className="flex items-center justify-between text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 gap-2">
                          <div className="truncate flex-1">
                            <span className="font-black text-black">{tr.title || tr.youtubeId}</span>
                            <span className="text-slate-500 text-[10px]"> by {tr.artistName || 'Unknown Artist'}</span>
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
                <p className="text-xs font-bold">No rating statistics recorded yet.</p>
              </div>
            )
          ) : (
            <div>
              {(() => {
                const list = activeTab === 'pending' ? communityLists : activeTab === 'validated' ? validatedLists : allLists;

                if (list.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                      <FolderX className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="mt-2 text-xs font-bold text-slate-600">No playlists found in this tab.</p>
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
                              {playlist.description || 'No description'}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${playlist.is_validated ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : 'bg-amber-100 text-amber-700 border-amber-500'}`}>
                            {playlist.is_validated ? 'Validated' : 'Pending'}
                          </span>
                        </div>

                        <div className="flex flex-wrap text-[10px] font-black text-slate-500 gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Gamepad2 className="w-3 h-3 text-slate-500" />
                            <span>Play count: {playlist.played_count || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Last played: {playlist.last_played ? new Date(playlist.last_played).toLocaleDateString() : 'Never'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Created: {new Date(playlist.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex justify-end gap-3 mt-1 border-t border-slate-100 pt-3">
                          <button
                            onClick={() => handleSelectEditPlaylist(playlist.id, playlist.name)}
                            className="px-3 py-1.5 border-2 border-black bg-yellow-400 text-black font-black text-xs uppercase rounded-xl shadow-[1px_1px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                          >
                            Edit Tracks
                          </button>
                          <button
                            onClick={() => handleToggleValidation(playlist.id, playlist.is_validated)}
                            className={`px-3 py-1.5 border-2 border-black font-black text-xs uppercase rounded-xl shadow-[1px_1px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform ${playlist.is_validated ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}
                          >
                            {playlist.is_validated ? 'Invalidate' : 'Validate'}
                          </button>
                          <button
                            onClick={() => handleDelete(playlist.id)}
                            disabled={playlist.id === 'anime-classics'}
                            className="px-3 py-1.5 border-2 border-black bg-[#990000] text-white font-black text-xs uppercase rounded-xl shadow-[1px_1px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                          >
                            Delete
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
    </div>
  );
}
