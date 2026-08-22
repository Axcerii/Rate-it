'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

interface VideoInput {
  title: string;
  youtubeId: string;
  animeName: string;
  type: string;
}

export default function NewPlaylist() {
  const router = useRouter();
  const { createPlaylist, searchVideos, getMalVideos, getPlaylistDetails, isConnected } = useSocket();

  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [videos, setVideos] = useState<VideoInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const [customAnime, setCustomAnime] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState('OP');

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

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customAnime.trim() || !customTitle.trim() || !customUrl.trim()) {
      setError('Please fill in all custom track fields.');
      return;
    }

    const ytid = extractYoutubeId(customUrl.trim());
    if (ytid.length !== 11) {
      setError('Invalid YouTube link or ID. Must contain an 11-character video ID.');
      return;
    }

    const newVideo: VideoInput = {
      animeName: customAnime.trim(),
      title: customTitle.trim(),
      youtubeId: ytid,
      type: customType,
    };

    setVideos([...videos, newVideo]);
    setCustomAnime('');
    setCustomTitle('');
    setCustomUrl('');
  };

  const handleAddSearchResult = (result: any) => {
    const alreadyAdded = videos.some(v => v.youtubeId === result.youtubeId);
    if (alreadyAdded) {
      setError(`"${result.title}" is already in the list.`);
      return;
    }

    setVideos([...videos, {
      animeName: result.animeName,
      title: result.title,
      youtubeId: result.youtubeId,
      type: result.type
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
      setError('Playlist Name is required.');
      return;
    }
    if (videos.length === 0) {
      setError('Please add at least one track to the playlist.');
      return;
    }

    setIsSaving(true);
    try {
      await createPlaylist(playlistName, description, videos);
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save playlist');
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
        throw new Error('No matched openings found for this MAL account in the database.');
      }
      
      let addedCount = 0;
      setVideos(prev => {
        const updated = [...prev];
        matched.forEach(item => {
          const exists = updated.some(v => v.youtubeId === item.youtubeId);
          if (!exists) {
            updated.push({
              animeName: item.animeName,
              title: item.title,
              youtubeId: item.youtubeId,
              type: item.type || 'OP'
            });
            addedCount++;
          }
        });
        return updated;
      });
      setMalUsernameInput('');
      alert(`Imported ${addedCount} unique openings from MAL account: ${username}`);
    } catch (err: any) {
      setError(err.message || 'Failed to import MAL matched tracks');
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
      setPlaylistName(`${res.playlist.name} (Copy)`);
      setDescription(res.playlist.description || '');
      
      const mappedVideos = res.videos.map(v => ({
        animeName: v.animeName,
        title: v.title,
        youtubeId: v.youtubeId,
        type: v.type || 'OP'
      }));
      setVideos(mappedVideos);
      setClonePlaylistIdInput('');
      alert(`Loaded ${mappedVideos.length} tracks from playlist: ${res.playlist.name}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlist details');
    } finally {
      setIsCloningPlaylist(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-black font-sans p-6 sm:p-12 flex flex-col items-center">
      {/* Title */}
      <div className="w-full max-w-4xl text-center mb-8 border-b-4 border-black pb-6 flex flex-col items-center justify-center">
        <img
          src="/Cr%C3%A9erText.png"
          alt="Créer une Playlist"
          className="h-16 sm:h-24 w-auto object-contain max-w-full"
        />
        <p className="text-sm font-bold text-slate-700 mt-2">
          Create your custom theme deck in Wario-style!
        </p>
      </div>

      <div className="w-full max-w-4xl grid gap-8 lg:grid-cols-2 items-start">
        {/* Left Column: Form Details & Add Track */}
        <div className="flex flex-col gap-6">
          {/* Playlist Info */}
          <div className="bg-[#f0ead8] border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_#000]">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-[#002fa7]">
              1. Playlist Info
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Playlist Name</label>
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="e.g. My Favorite Bangers"
                  className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about this list..."
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold resize-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Setup Tools Card */}
          <div className="bg-[#f0ead8] border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_#000] flex flex-col gap-4">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2 mb-2 text-[#002fa7]">
              ★ Quick Setup Tools
            </h2>
            
            {/* Import MAL */}
            <div className="border-b-2 border-dashed border-black pb-4">
              <label className="block text-xs font-black uppercase mb-1">Import from MAL Profile</label>
              <p className="text-[10px] text-slate-600 font-bold mb-2">
                Instantly import matched openings based on a MAL username.
              </p>
              <form onSubmit={handleImportMal} className="flex gap-2">
                <input
                  type="text"
                  value={malUsernameInput}
                  onChange={(e) => setMalUsernameInput(e.target.value)}
                  placeholder="MAL username (e.g. Ryrry)..."
                  className="flex-1 px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
                />
                <button
                  type="submit"
                  disabled={isImportingMal}
                  className="px-4 py-2 border-2 border-black bg-white text-black font-black text-xs uppercase rounded-lg shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                >
                  {isImportingMal ? '...' : 'Import'}
                </button>
              </form>
            </div>

            {/* Copy existing playlist */}
            <div>
              <label className="block text-xs font-black uppercase mb-1">Clone Existing Playlist</label>
              <p className="text-[10px] text-slate-600 font-bold mb-2">
                Copy name, desc, and tracks from an existing playlist ID.
              </p>
              <form onSubmit={handleClonePlaylist} className="flex gap-2">
                <input
                  type="text"
                  value={clonePlaylistIdInput}
                  onChange={(e) => setClonePlaylistIdInput(e.target.value)}
                  placeholder="Playlist ID (e.g. PL-A1B2C3)..."
                  className="flex-1 px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
                />
                <button
                  type="submit"
                  disabled={isCloningPlaylist}
                  className="px-4 py-2 border-2 border-black bg-white text-black font-black text-xs uppercase rounded-lg shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                >
                  {isCloningPlaylist ? '...' : 'Clone'}
                </button>
              </form>
            </div>
          </div>

          {/* Add Tracks Card */}
          <div className="bg-[#f0ead8] border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_#000]">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-[#002fa7]">
              2. Add Tracks
            </h2>

            {/* Search Existing */}
            <div className="mb-6">
              <label className="block text-xs font-black uppercase mb-1">Search DB Videos</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Anime Name or Song Title..."
                  className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:bg-[#faf6eb] text-sm font-bold"
                />
                {isSearching && (
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 animate-spin">⏳</span>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="border-2 border-black bg-white mt-1 max-h-48 overflow-y-auto rounded-xl shadow-lg z-20">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddSearchResult(result)}
                      className="w-full text-left p-2.5 border-b border-slate-200 hover:bg-[#faf6eb] transition text-xs font-bold flex justify-between items-center"
                    >
                      <div>
                        <div className="font-black text-black">{result.animeName}</div>
                        <div className="text-slate-600 mt-0.5">{result.type} - {result.title}</div>
                      </div>
                      <span className="bg-[#002fa7] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        + Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex items-center justify-center my-4">
              <hr className="border-black w-full" />
              <span className="absolute px-3 bg-[#f0ead8] text-xs font-black text-slate-500 uppercase">Or Add Custom YouTube Link</span>
            </div>

            {/* Add Custom Track Form */}
            <form onSubmit={handleAddCustom} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Anime Name</label>
                <input
                  type="text"
                  value={customAnime}
                  onChange={(e) => setCustomAnime(e.target.value)}
                  placeholder="e.g. Bleach"
                  className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Theme Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Asterisk"
                  className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">YouTube Video Link or ID</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none text-sm font-bold"
                />
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-xs font-black uppercase">Type:</span>
                <div className="flex border-2 border-black rounded-lg overflow-hidden font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomType('OP')}
                    className={`px-3 py-1.5 transition ${customType === 'OP' ? 'bg-[#990000] text-white' : 'bg-white hover:bg-slate-100'}`}
                  >
                    Opening (OP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('ED')}
                    className={`px-3 py-1.5 transition ${customType === 'ED' ? 'bg-[#990000] text-white' : 'bg-white hover:bg-slate-100'}`}
                  >
                    Ending (ED)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full py-3 bg-[#990000] text-white font-black text-sm uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              >
                + Add Custom Track
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Playlist Preview & Save */}
        <div className="bg-[#f0ead8] border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_#000] flex flex-col min-h-[500px]">
          <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2 mb-4 text-[#002fa7] flex items-center justify-between">
            <span>3. Playlist Preview</span>
            <span className="bg-black text-[#faf6eb] px-2.5 py-0.5 rounded text-xs font-mono">
              {videos.length} Tracks
            </span>
          </h2>

          {/* Tracks List */}
          {videos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
              <span className="text-3xl">🫙</span>
              <p className="mt-4 text-xs font-bold text-slate-600">The playlist is empty.</p>
              <p className="text-[10px] text-slate-500 mt-1">Add tracks from the left panel!</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1 mb-6">
              {videos.map((video, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_0px_#000]"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-lg bg-black text-[#faf6eb] text-xs font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="max-w-[200px] sm:max-w-xs">
                      <div className="font-black text-xs text-black truncate">{video.animeName}</div>
                      <div className="text-[10px] text-slate-600 truncate mt-0.5">
                        {video.type} — {video.title}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTrack(index)}
                    className="text-xs text-[#990000] hover:text-red-500 font-black p-1"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error and Success Indicators */}
          {error && (
            <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-100 border-2 border-emerald-500 text-emerald-700 px-4 py-2.5 rounded-lg text-xs font-bold animate-pulse">
              🎉 Playlist Created successfully! Redirecting...
            </div>
          )}

          {/* Action button */}
          <div className="mt-auto border-t-2 border-black pt-4 flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-sm uppercase rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePlaylist}
              disabled={isSaving || success}
              className="flex-1 py-3 bg-[#002fa7] text-white border-2 border-black font-black text-sm uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 transition-all duration-150"
            >
              {isSaving ? 'Saving...' : 'Save Playlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
