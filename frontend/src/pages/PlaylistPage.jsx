import React, { useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration } from '../utils/formatDuration'

function PlaylistPage({
  playlist = null,
  playlistActionLoadingId = '',
  playTrackById = () => {},
  currentTrackId = '',
  isPlaying = false,
  onToggleSongPlayback = () => {},
  handleRemoveSongFromPlaylist = () => {},
  handleMoveSongInPlaylist = () => {},
  handleDragReorderSongsInPlaylist = async () => true,
  handleRenamePlaylist = () => {},
  handleUpdatePlaylistCover = () => {},
  handleUploadPlaylistCover = async () => false,
  addSongToQueueNext = () => {},
  addSongToQueueLast = () => {},
  isSongLiked = () => false,
  toggleLikeSong = () => {},
  playlistLoading = false,
  playlistCoverUploadLoading = false,
  onShowToast = () => {},
  onBackToHome = () => {},
}) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingCover, setIsEditingCover] = useState(false)
  const [draftPlaylistName, setDraftPlaylistName] = useState('')
  const [draftCoverUrl, setDraftCoverUrl] = useState('')
  const [orderedSongs, setOrderedSongs] = useState([])
  const [draggedSongIndex, setDraggedSongIndex] = useState(-1)
  const [dropTargetSongIndex, setDropTargetSongIndex] = useState(-1)
  const [sortMode, setSortMode] = useState('manual')
  const [selectedSongIds, setSelectedSongIds] = useState([])
  const [lastSelectedDisplayIndex, setLastSelectedDisplayIndex] = useState(-1)
  const coverFileInputRef = useRef(null)

  const songs = Array.isArray(playlist?.songs) ? playlist.songs : []

  useEffect(() => {
    setDraftPlaylistName(playlist?.name || '')
    setDraftCoverUrl(playlist?.coverUrl || '')
    setIsEditingName(false)
    setIsEditingCover(false)
  }, [playlist?._id, playlist?.name, playlist?.coverUrl])

  useEffect(() => {
    setOrderedSongs(songs)
    setDraggedSongIndex(-1)
    setDropTargetSongIndex(-1)
    setSortMode('manual')
    setSelectedSongIds([])
    setLastSelectedDisplayIndex(-1)
  }, [playlist?._id, songs])

  const displayedSongs = useMemo(() => {
    const list = [...orderedSongs]

    if (sortMode === 'title') {
      return list.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')))
    }

    if (sortMode === 'artist') {
      return list.sort((a, b) => String(a?.artist || '').localeCompare(String(b?.artist || '')))
    }

    if (sortMode === 'duration') {
      return list.sort((a, b) => Number(a?.duration || 0) - Number(b?.duration || 0))
    }

    return list
  }, [orderedSongs, sortMode])

  const reorderSongsArray = (list, fromIndex, toIndex) => {
    const next = [...list]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
  }

  const handleSavePlaylistName = async () => {
    if (!playlist?._id) {
      return
    }

    await handleRenamePlaylist(playlist._id, draftPlaylistName)
    setIsEditingName(false)
  }

  const handleTrackDrop = async (fromIndex, toIndex) => {
    if (!playlist?._id || fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return
    }

    const previousOrder = orderedSongs
    const optimisticOrder = reorderSongsArray(previousOrder, fromIndex, toIndex)
    setOrderedSongs(optimisticOrder)

    const success = await handleDragReorderSongsInPlaylist(playlist._id, fromIndex, toIndex)

    if (!success) {
      setOrderedSongs(previousOrder)
    }
  }

  const handleSavePlaylistCover = async () => {
    if (!playlist?._id) {
      return
    }

    await handleUpdatePlaylistCover(playlist._id, draftCoverUrl)
    setIsEditingCover(false)
  }

  const handleCoverFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !playlist?._id) {
      return
    }

    const success = await handleUploadPlaylistCover(playlist._id, file)
    if (success) {
      onShowToast('Da cap nhat anh cover playlist')
    }
  }

  const isDragging = draggedSongIndex >= 0

  const isManualOrder = sortMode === 'manual'

  const formatAddedDate = (value) => {
    if (!value) {
      return '--'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return '--'
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  const handleSelectRow = (songId, displayIndex, event) => {
    if (!songId) {
      return
    }

    if (event.shiftKey && lastSelectedDisplayIndex >= 0) {
      const start = Math.min(lastSelectedDisplayIndex, displayIndex)
      const end = Math.max(lastSelectedDisplayIndex, displayIndex)
      const rangeIds = displayedSongs.slice(start, end + 1).map((song) => song._id)

      setSelectedSongIds((prev) => Array.from(new Set([...prev, ...rangeIds])))
      return
    }

    setSelectedSongIds((prev) => {
      if (prev.includes(songId)) {
        return prev.filter((id) => id !== songId)
      }

      return [...prev, songId]
    })
    setLastSelectedDisplayIndex(displayIndex)
  }

  const handleToggleSelectAll = () => {
    if (selectedSongIds.length === displayedSongs.length) {
      setSelectedSongIds([])
      setLastSelectedDisplayIndex(-1)
      return
    }

    setSelectedSongIds(displayedSongs.map((song) => song._id))
    setLastSelectedDisplayIndex(displayedSongs.length - 1)
  }

  const handleQueueSelectedSongs = () => {
    if (selectedSongIds.length === 0) {
      return
    }

    displayedSongs.forEach((song) => {
      if (selectedSongIds.includes(song._id)) {
        addSongToQueueLast(song._id)
      }
    })

    onShowToast(`Da them ${selectedSongIds.length} bai vao queue`)
    setSelectedSongIds([])
    setLastSelectedDisplayIndex(-1)
  }

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-xl bg-linear-to-r from-violet-500/30 via-fuchsia-500/15 to-transparent p-5">
        <p className="type-kicker text-zinc-300">Playlist</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10 sm:h-36 sm:w-36">
              {playlist?.coverUrl ? (
                <img src={playlist.coverUrl} alt={playlist?.name || 'Playlist cover'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">No cover</div>
              )}
            </div>

            <div className="min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={draftPlaylistName}
                  onChange={(event) => setDraftPlaylistName(event.target.value)}
                  className="min-w-0 rounded-md bg-black/40 px-3 py-2 text-2xl font-black outline-none ring-1 ring-white/15 sm:text-3xl"
                />
                <button
                  type="button"
                  disabled={playlistLoading}
                  onClick={handleSavePlaylistName}
                  className="type-button-sm rounded-full bg-green-500 px-3 py-1 text-black disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false)
                    setDraftPlaylistName(playlist?.name || '')
                  }}
                  className="type-button-sm rounded-full bg-zinc-800 px-3 py-1 text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="type-display-hero truncate">{playlist?.name || 'Unknown Playlist'}</h1>
                {playlist && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="type-button-sm rounded-full bg-black/45 px-3 py-1 text-zinc-200 hover:bg-black/60"
                  >
                    Rename
                  </button>
                )}
              </div>
            )}

            {isEditingCover ? (
              <div className="mt-2 flex max-w-xl items-center gap-2">
                <input
                  value={draftCoverUrl}
                  onChange={(event) => setDraftCoverUrl(event.target.value)}
                  placeholder="Dan URL anh cover"
                  className="w-full min-w-0 rounded-md bg-black/40 px-3 py-2 text-xs outline-none ring-1 ring-white/15"
                />
                <button
                  type="button"
                  disabled={playlistActionLoadingId === `cover-${playlist?._id}`}
                  onClick={handleSavePlaylistCover}
                  className="type-button-sm rounded-full bg-green-500 px-3 py-1 text-black disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCover(false)
                    setDraftCoverUrl(playlist?.coverUrl || '')
                  }}
                  className="type-button-sm rounded-full bg-zinc-800 px-3 py-1 text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCover(true)}
                  className="type-button-sm rounded-full bg-black/45 px-3 py-1 text-zinc-200 hover:bg-black/60"
                >
                  Edit cover URL
                </button>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={playlistCoverUploadLoading}
                  onClick={() => coverFileInputRef.current?.click()}
                  className="type-button-sm rounded-full bg-green-500 px-3 py-1 text-black disabled:opacity-70"
                >
                  {playlistCoverUploadLoading ? 'Uploading...' : 'Upload cover'}
                </button>
              </div>
            )}

            <p className="type-body-muted mt-2 text-zinc-200/90">{songs.length} bai hat</p>
          </div>
          </div>
          <button
            type="button"
            onClick={onBackToHome}
            className="type-button-sm rounded-full bg-black/45 px-4 py-2 text-zinc-200 hover:bg-black/60"
          >
            Back to home
          </button>
        </div>
      </section>

      {!playlist ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Khong tim thay playlist nay.</p>
      ) : displayedSongs.length === 0 ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Playlist nay chua co bai hat.</p>
      ) : (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="type-display-title">Tracks</h2>
              <p className="type-body-muted">
                Top {displayedSongs.length} • {isManualOrder ? 'Keo bang nut ≡ de sap xep' : 'Dang sap xep, tat drag reorder'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="rounded-md bg-zinc-900 px-2 py-1 text-xs"
              >
                <option value="manual">Sort: Manual</option>
                <option value="title">Sort: Title</option>
                <option value="artist">Sort: Artist</option>
                <option value="duration">Sort: Duration</option>
              </select>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700"
              >
                {selectedSongIds.length === displayedSongs.length ? 'Clear all' : 'Select all'}
              </button>
              <button
                type="button"
                disabled={selectedSongIds.length === 0}
                onClick={handleQueueSelectedSongs}
                className="type-button-sm rounded bg-green-500 px-2 py-1 text-black disabled:opacity-60"
              >
                Queue selected ({selectedSongIds.length})
              </button>
            </div>
          </div>

          <div className="type-table-head mb-2 grid grid-cols-[1fr_auto_auto] gap-3 px-3 text-zinc-500">
            <span>Title</span>
            <span className="hidden xl:block">Added</span>
            <span>Duration</span>
          </div>

          <div className="space-y-2">
            {displayedSongs.map((song, index) => {
              const isSelected = selectedSongIds.includes(song._id)
              const manualIndex = orderedSongs.findIndex((item) => item._id === song._id)

              return (
              <div
                key={`playlist-track-${playlist._id}-${song._id}`}
                onDragOver={(event) => {
                  if (!isDragging || !isManualOrder) {
                    return
                  }

                  event.preventDefault()
                  if (dropTargetSongIndex !== index) {
                    setDropTargetSongIndex(index)
                  }
                }}
                onDrop={(event) => {
                  if (!isDragging || !isManualOrder) {
                    return
                  }

                  event.preventDefault()
                  const fromIndex = draggedSongIndex
                  setDraggedSongIndex(-1)
                  setDropTargetSongIndex(-1)
                  handleTrackDrop(fromIndex, index)
                }}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-[#232323] ${isSelected ? 'bg-green-500/10 ring-1 ring-green-500/40' : 'bg-[#181818]'} ${isDragging && dropTargetSongIndex === index ? 'ring-1 ring-green-400/60 bg-green-500/10' : ''} ${draggedSongIndex === index ? 'opacity-70' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(event) => handleSelectRow(song._id, index, event.nativeEvent)}
                  onChange={() => {}}
                  className="h-4 w-4 accent-green-500"
                />
                <button
                  type="button"
                  draggable={!playlistLoading && isManualOrder}
                  onDragStart={(event) => {
                    if (!isManualOrder) {
                      return
                    }

                    event.dataTransfer.effectAllowed = 'move'
                    setDraggedSongIndex(index)
                    setDropTargetSongIndex(index)
                  }}
                  onDragEnd={() => {
                    setDraggedSongIndex(-1)
                    setDropTargetSongIndex(-1)
                  }}
                  onClick={(event) => event.preventDefault()}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                  title="Keo de doi vi tri bai hat"
                  aria-label="Keo de doi vi tri bai hat"
                  disabled={!isManualOrder}
                >
                  ≡
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleSongPlayback(song._id)
                  }}
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${song._id === currentTrackId ? 'bg-green-500 text-black' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                  title={song._id === currentTrackId && isPlaying ? 'Pause' : 'Play'}
                  aria-label={song._id === currentTrackId && isPlaying ? 'Pause' : 'Play'}
                >
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-xs font-bold transition-all duration-150 ${song._id === currentTrackId ? 'scale-90 opacity-0' : 'scale-100 opacity-100 group-hover:scale-90 group-hover:opacity-0'}`}
                  >
                    {manualIndex + 1}
                  </span>
                  {song._id === currentTrackId && isPlaying ? (
                    <span className="spotify-eq" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={`h-4 w-4 transition-all duration-150 ${song._id === currentTrackId ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`}
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => playTrackById(song._id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onDoubleClick={() => onToggleSongPlayback(song._id)}
                >
                  <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800">
                    {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{song.title}</p>
                    <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                  </div>
                </button>

                <span className="hidden w-16 shrink-0 text-right text-xs text-zinc-500 xl:block">{formatAddedDate(song.addedAt || song.createdAt)}</span>

                <span className="w-12 shrink-0 text-right text-xs text-zinc-400">{formatDuration(song.duration || 0)}</span>

                <button
                  type="button"
                  onClick={() => addSongToQueueNext(song._id)}
                  className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                >
                  Next
                </button>
                <button
                  type="button"
                  disabled={!isManualOrder || manualIndex === 0 || playlistActionLoadingId === `reorder-${playlist._id}-${manualIndex}`}
                  onClick={() => handleMoveSongInPlaylist(playlist._id, manualIndex, -1)}
                  className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700 disabled:opacity-60"
                  title="Dua bai hat len tren"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={!isManualOrder || manualIndex === orderedSongs.length - 1 || playlistActionLoadingId === `reorder-${playlist._id}-${manualIndex}`}
                  onClick={() => handleMoveSongInPlaylist(playlist._id, manualIndex, 1)}
                  className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700 disabled:opacity-60"
                  title="Dua bai hat xuong duoi"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => addSongToQueueLast(song._id)}
                  className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                >
                  Queue
                </button>
                <button
                  type="button"
                  onClick={() => toggleLikeSong(song._id)}
                  className={`rounded px-2 py-1 text-[11px] ${isSongLiked(song._id) ? 'bg-green-500/20 text-green-300' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  {isSongLiked(song._id) ? 'Liked' : 'Like'}
                </button>
                <button
                  type="button"
                  disabled={playlistActionLoadingId === `remove-${playlist._id}-${song._id}`}
                  onClick={() => handleRemoveSongFromPlaylist(playlist._id, song._id)}
                  className="rounded bg-red-500/20 px-2 py-1 text-[11px] text-red-200 hover:bg-red-500/30 disabled:opacity-70"
                >
                  {playlistActionLoadingId === `remove-${playlist._id}-${song._id}` ? '...' : 'Remove'}
                </button>
              </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

export default PlaylistPage
