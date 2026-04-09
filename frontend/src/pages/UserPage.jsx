import React, { useEffect, useState } from 'react'

function UserPage({
  currentUser,
  loading,
  error,
  playlistError,
  filteredSongs,
  playTrackById,
  currentTrackId = '',
  isPlaying = false,
  onToggleSongPlayback = () => {},
  recommendedSongs,
  playlists,
  selectedPlaylistBySong,
  setSelectedPlaylistBySong,
  playlistActionLoadingId,
  handleAddSongToPlaylist,
  selectedPlaylist,
  handleRemoveSongFromPlaylist,
  popularSongs,
  likedSongs = [],
  recentlyPlayedSongs = [],
  isSongLiked = () => false,
  toggleLikeSong = () => {},
  addSongToQueueNext = () => {},
  addSongToQueueLast = () => {},
  onOpenArtistRadio = () => {},
  onClearArtistRadio = () => {},
  activeArtist = '',
  artistRadioSongs = [],
  onShowToast = () => {},
  searchQuery,
}) {
  const isSongActive = (songId) => songId === currentTrackId

  const renderSongPlayButton = (song) => {
    const active = isSongActive(song?._id)
    const showPause = active && isPlaying

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleSongPlayback(song?._id)
        }}
        className="rounded-full bg-green-500 p-3 text-black shadow-lg shadow-black/50 transition-all duration-200 ease-out hover:scale-105 hover:bg-green-400 active:scale-95"
        title={showPause ? 'Pause' : 'Play'}
        aria-label={showPause ? 'Pause' : 'Play'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d={showPause ? 'M7 5h3v14H7zm7 0h3v14h-3z' : 'M8 5v14l11-7z'} />
        </svg>
      </button>
    )
  }

  const [contextMenuState, setContextMenuState] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    song: null,
  })

  useEffect(() => {
    if (!contextMenuState.isOpen) {
      return
    }

    const handleClose = () => {
      setContextMenuState((prev) => ({ ...prev, isOpen: false }))
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('scroll', handleClose, true)

    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('scroll', handleClose, true)
    }
  }, [contextMenuState.isOpen])

  const openSongContextMenu = (event, song) => {
    event.preventDefault()

    const menuWidth = 220
    const playlistSectionHeight = currentUser && playlists.length > 0
      ? 24 + Math.min(playlists.length, 5) * 30
      : 0
    const menuHeight = 170 + playlistSectionHeight
    const maxX = Math.max(window.innerWidth - menuWidth - 8, 8)
    const maxY = Math.max(window.innerHeight - menuHeight - 8, 8)

    setContextMenuState({
      isOpen: true,
      x: Math.max(8, Math.min(event.clientX, maxX)),
      y: Math.max(8, Math.min(event.clientY, maxY)),
      song,
    })
  }

  const handleContextAction = (action, payload = {}) => {
    const songId = contextMenuState.song?._id
    if (!songId) {
      return
    }

    if (action === 'play_toggle') {
      onToggleSongPlayback(songId)
    }

    if (action === 'next') {
      addSongToQueueNext(songId)
    }

    if (action === 'queue') {
      addSongToQueueLast(songId)
    }

    if (action === 'like') {
      toggleLikeSong(songId)
    }

    if (action === 'artist') {
      onOpenArtistRadio(contextMenuState.song?.artist)
    }

    if (action === 'playlist') {
      const playlistId = payload.playlistId
      if (playlistId) {
        setSelectedPlaylistBySong((prev) => ({ ...prev, [songId]: playlistId }))
        handleAddSongToPlaylist(songId, playlistId)
        onShowToast('Da them vao playlist')
      }
    }

    setContextMenuState((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <>
      {loading && <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Dang tai bai hat...</p>}
      {error && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}
      {playlistError && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</p>}

      {!loading && !error && (
        <>
          {activeArtist && (
            <section className="mb-8 overflow-hidden rounded-xl bg-linear-to-r from-emerald-500/30 via-cyan-500/10 to-transparent p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="type-kicker text-zinc-300">Artist radio</p>
                  <h2 className="type-display-title mt-1">{activeArtist}</h2>
                  <p className="type-body-muted mt-1 text-zinc-300">Top tracks va bai hat lien quan cua nghe si nay.</p>
                </div>
                <button
                  type="button"
                  onClick={onClearArtistRadio}
                  className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-black/60"
                >
                  Back to all
                </button>
              </div>

              {artistRadioSongs.length === 0 ? (
                <p className="mt-4 rounded-md bg-black/30 px-3 py-2 text-sm text-zinc-300">
                  Chua tim thay bai hat nao cho nghe si nay.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {artistRadioSongs.slice(0, 8).map((song, index) => (
                    <button
                      type="button"
                      key={`artist-radio-${song._id}`}
                      onClick={() => playTrackById(song._id)}
                      onContextMenu={(event) => openSongContextMenu(event, song)}
                      className="group flex w-full items-center gap-3 rounded-md bg-black/30 px-3 py-2 text-left hover:bg-black/40"
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onToggleSongPlayback(song._id)
                        }}
                        className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${isSongActive(song._id) ? 'bg-green-500 text-black' : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'}`}
                        title={isSongActive(song._id) && isPlaying ? 'Pause' : 'Play'}
                        aria-label={isSongActive(song._id) && isPlaying ? 'Pause' : 'Play'}
                      >
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-xs font-bold transition-all duration-150 ${isSongActive(song._id) ? 'scale-90 opacity-0' : 'scale-100 opacity-100 group-hover:scale-90 group-hover:opacity-0'}`}
                        >
                          {index + 1}
                        </span>
                        {isSongActive(song._id) && isPlaying ? (
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
                            className={`h-4 w-4 transition-all duration-150 ${isSongActive(song._id) ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`}
                            aria-hidden="true"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{song.title}</p>
                        <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          addSongToQueueNext(song._id)
                        }}
                        className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                      >
                        Next
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {filteredSongs.slice(0, 8).map((song) => (
              <button
                type="button"
                key={`quick-${song._id}`}
                onClick={() => playTrackById(song._id)}
                onContextMenu={(event) => openSongContextMenu(event, song)}
                className="group relative flex items-center overflow-hidden rounded bg-white/10 text-left hover:bg-white/15"
              >
                <div className="h-12 w-12 overflow-hidden bg-zinc-800">
                  {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="truncate px-3 text-sm font-semibold">{song.title}</div>
                <span className={`ml-auto mr-2 opacity-100 transition-opacity ${isSongActive(song._id) ? 'xl:opacity-100' : 'xl:opacity-0 xl:group-hover:opacity-100'}`}>
                  {renderSongPlayButton(song)}
                </span>
              </button>
            ))}
          </div>

          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="type-display-title">Recommended Stations</h2>
              <button type="button" className="type-button-sm text-zinc-400 hover:underline">Show all</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recommendedSongs.map((song, index) => (
                <article key={`station-${song._id}`} className="group rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                  <button type="button" className="w-full text-left" onClick={() => playTrackById(song._id)} onContextMenu={(event) => openSongContextMenu(event, song)}>
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                      <div className={`absolute right-2 bottom-2 translate-y-0 opacity-100 transition-all ${isSongActive(song._id) ? 'xl:translate-y-0 xl:opacity-100' : 'xl:translate-y-2 xl:opacity-0 xl:group-hover:translate-y-0 xl:group-hover:opacity-100'}`}>
                        {renderSongPlayButton(song)}
                      </div>
                    </div>
                    <p className="truncate text-2xl font-bold">{song.artist}</p>
                    <p className="mt-1 text-sm text-zinc-400">With {song.artist} and more</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Radio {index + 1}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLikeSong(song._id)}
                    className={`type-button-sm mt-2 rounded px-2 py-1 ${isSongLiked(song._id) ? 'bg-green-500/20 text-green-300' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    {isSongLiked(song._id) ? 'Liked' : 'Like'}
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => addSongToQueueNext(song._id)}
                      className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-300"
                    >
                      Play next
                    </button>
                    <button
                      type="button"
                      onClick={() => addSongToQueueLast(song._id)}
                      className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-300"
                    >
                      Queue
                    </button>
                  </div>
                  {currentUser && playlists.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      <select
                        value={selectedPlaylistBySong[song._id] || playlists[0]?._id || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setSelectedPlaylistBySong((prev) => ({ ...prev, [song._id]: value }))
                        }}
                        className="min-w-0 flex-1 rounded-md bg-zinc-900 px-2 py-1 text-xs"
                      >
                        {playlists.map((playlist) => (
                          <option key={playlist._id} value={playlist._id}>{playlist.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={playlistActionLoadingId === `add-${song._id}`}
                        onClick={() => handleAddSongToPlaylist(song._id)}
                        className="type-button-sm rounded-md bg-green-500 px-2 py-1 text-black disabled:opacity-70"
                      >
                        {playlistActionLoadingId === `add-${song._id}` ? '...' : 'Add'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          {currentUser && selectedPlaylist && (
            <section className="mb-8">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="type-display-title truncate" title={selectedPlaylist.name}>{selectedPlaylist.name}</h2>
                <p className="type-body-muted">{selectedPlaylist.songs?.length || 0} bai hat</p>
              </div>

              {!selectedPlaylist.songs?.length ? (
                <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
                  Playlist nay chua co bai hat. Hay them bai hat tu Recommended Stations.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedPlaylist.songs.map((song) => (
                    <div key={`${selectedPlaylist._id}-${song._id}`} className="flex items-center justify-between gap-3 rounded-md bg-[#181818] px-3 py-2">
                      <button type="button" onClick={() => playTrackById(song._id)} onContextMenu={(event) => openSongContextMenu(event, song)} className="flex min-w-0 items-center gap-3 text-left">
                        <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800">
                          {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{song.title}</p>
                          <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                        </div>
                      </button>

                      {renderSongPlayButton(song)}

                      <button
                        type="button"
                        disabled={playlistActionLoadingId === `remove-${selectedPlaylist._id}-${song._id}`}
                        onClick={() => handleRemoveSongFromPlaylist(selectedPlaylist._id, song._id)}
                        className="type-button-sm rounded bg-red-500/20 px-2 py-1 text-red-200 disabled:opacity-70"
                      >
                        {playlistActionLoadingId === `remove-${selectedPlaylist._id}-${song._id}` ? '...' : 'Xoa'}
                      </button>

                      <button
                        type="button"
                        onClick={() => addSongToQueueNext(song._id)}
                        className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-300"
                      >
                        Next
                      </button>

                      <button
                        type="button"
                        onClick={() => addSongToQueueLast(song._id)}
                        className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-300"
                      >
                        Queue
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {recentlyPlayedSongs.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="type-display-title">Recently played</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {recentlyPlayedSongs.slice(0, 10).map((song) => (
                  <article key={`recent-${song._id}`} className="group rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                    <button type="button" className="w-full text-left" onClick={() => playTrackById(song._id)} onContextMenu={(event) => openSongContextMenu(event, song)}>
                      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                        <div className={`absolute right-2 bottom-2 translate-y-0 opacity-100 transition-all ${isSongActive(song._id) ? 'xl:translate-y-0 xl:opacity-100' : 'xl:translate-y-2 xl:opacity-0 xl:group-hover:translate-y-0 xl:group-hover:opacity-100'}`}>
                          {renderSongPlayButton(song)}
                        </div>
                      </div>
                      <p className="truncate text-sm font-bold">{song.title}</p>
                      <p className="mt-1 truncate text-xs text-zinc-400">{song.artist}</p>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {likedSongs.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="type-display-title">Liked Songs</h2>
                <p className="type-body-muted">{likedSongs.length} bai hat</p>
              </div>
              <div className="space-y-2">
                {likedSongs.slice(0, 20).map((song) => (
                  <div key={`liked-${song._id}`} className="flex items-center justify-between gap-3 rounded-md bg-[#181818] px-3 py-2">
                    <button type="button" onClick={() => playTrackById(song._id)} onContextMenu={(event) => openSongContextMenu(event, song)} className="flex min-w-0 items-center gap-3 text-left">
                      <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{song.title}</p>
                        <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                      </div>
                    </button>
                    {renderSongPlayButton(song)}
                    <button
                      type="button"
                      onClick={() => toggleLikeSong(song._id)}
                      className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="type-display-title">Popular radio</h2>
              <button type="button" className="type-button-sm text-zinc-400 hover:underline">Show all</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {popularSongs.map((song) => (
                <article key={`popular-${song._id}`} className="group rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                  <button type="button" className="w-full text-left" onClick={() => playTrackById(song._id)} onContextMenu={(event) => openSongContextMenu(event, song)}>
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                      <div className={`absolute right-2 bottom-2 translate-y-0 opacity-100 transition-all ${isSongActive(song._id) ? 'xl:translate-y-0 xl:opacity-100' : 'xl:translate-y-2 xl:opacity-0 xl:group-hover:translate-y-0 xl:group-hover:opacity-100'}`}>
                        {renderSongPlayButton(song)}
                      </div>
                    </div>
                    <p className="truncate text-3xl font-black uppercase">{song.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">With {song.artist} and friends</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLikeSong(song._id)}
                    className={`type-button-sm mt-2 rounded px-2 py-1 ${isSongLiked(song._id) ? 'bg-green-500/20 text-green-300' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    {isSongLiked(song._id) ? 'Liked' : 'Like'}
                  </button>
                </article>
              ))}
            </div>
          </section>

          {searchQuery.trim() && filteredSongs.length === 0 && (
            <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
              Khong tim thay bai hat phu hop voi tu khoa "{searchQuery}"
            </p>
          )}

          {contextMenuState.isOpen && contextMenuState.song && (
            <div
              className="fixed z-50 w-56 overflow-hidden rounded-md border border-white/10 bg-[#1b1b1b] py-1 shadow-2xl"
              style={{ left: `${contextMenuState.x}px`, top: `${contextMenuState.y}px` }}
            >
              <button type="button" onClick={() => handleContextAction('play_toggle')} className="type-button-sm w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800">{isSongActive(contextMenuState.song._id) && isPlaying ? 'Pause' : 'Play'}</button>
              <button type="button" onClick={() => handleContextAction('next')} className="type-button-sm w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800">Play next</button>
              <button type="button" onClick={() => handleContextAction('queue')} className="type-button-sm w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800">Add to queue</button>
              <button type="button" onClick={() => handleContextAction('like')} className="type-button-sm w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800">
                {isSongLiked(contextMenuState.song._id) ? 'Remove from liked songs' : 'Like song'}
              </button>
              <button type="button" onClick={() => handleContextAction('artist')} className="type-button-sm w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800">Go to artist radio</button>

              {currentUser && playlists.length > 0 && (
                <>
                  <div className="my-1 border-t border-white/10" />
                  <p className="type-badge px-3 py-1 text-zinc-500">Add to playlist</p>
                  {playlists.slice(0, 5).map((playlist) => (
                    <button
                      key={`menu-playlist-${playlist._id}`}
                      type="button"
                      onClick={() => handleContextAction('playlist', { playlistId: playlist._id })}
                      className="type-button-sm w-full truncate px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800"
                    >
                      {playlist.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

export default UserPage
