import React from 'react'

function UserPage({
  currentUser,
  loading,
  error,
  playlistError,
  recommendedSongs = [],
  trendingSongs = [],
  trendingSongsLoading = false,
  playTrackById,
  currentTrackId = '',
  isPlaying = false,
  onToggleSongPlayback = () => {},
  playlists = [],
  selectedPlaylistBySong = {},
  setSelectedPlaylistBySong = () => {},
  playlistActionLoadingId = '',
  handleAddSongToPlaylist = () => {},
  isSongLiked = () => false,
  toggleLikeSong = () => {},
  addSongToQueueNext = () => {},
  addSongToQueueLast = () => {},
  onOpenArtistPage = () => {},
  artistLibrary = [],
  artistLibraryLoading = false,
  searchQuery = '',
}) {
  const renderSongPlayButton = (song) => {
    const active = song?._id === currentTrackId
    const showPause = active && isPlaying

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleSongPlayback(song?._id)
        }}
        className="rounded-full bg-white p-3 text-black shadow-lg shadow-black/50 transition-all duration-200 ease-out hover:scale-105 hover:bg-zinc-100 active:scale-95"
        title={showPause ? 'Pause' : 'Play'}
        aria-label={showPause ? 'Pause' : 'Play'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d={showPause ? 'M7 5h3v14H7zm7 0h3v14h-3z' : 'M8 5v14l11-7z'} />
        </svg>
      </button>
    )
  }

  return (
    <>
      {loading && <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Loading songs...</p>}
      {error && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}
      {playlistError && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</p>}

      {!loading && !error && (
        <>
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="type-display-title">Trending</h2>
            </div>

            {trendingSongsLoading ? (
              <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Loading trending songs...</p>
            ) : trendingSongs.length === 0 ? (
              <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">No trending data yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {trendingSongs.slice(0, 10).map((song) => (
                  <article key={`trending-${song._id}`} className="rounded-lg bg-[#181818] p-2 text-left hover:bg-[#232323]">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => playTrackById(song._id)}
                    >
                      <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-zinc-800">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                        <div className="absolute bottom-2 right-2">
                          {renderSongPlayButton(song)}
                        </div>
                      </div>
                      <p className="truncate text-sm font-semibold text-zinc-100">{song.title}</p>
                      <p className="truncate text-[11px] text-zinc-400">{song.artist}</p>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="type-display-title">Artists</h2>
            </div>

            {artistLibraryLoading ? (
              <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Loading artists...</p>
            ) : artistLibrary.length === 0 ? (
              <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">No artist profiles available yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {artistLibrary.map((artist) => (
                  <button
                    type="button"
                    key={`artist-card-${artist.id}`}
                    onClick={() => onOpenArtistPage(artist.id || artist.slug)}
                    className="rounded-lg bg-[#181818] p-2 text-left hover:bg-[#232323]"
                  >
                    <div className="mb-2 aspect-square overflow-hidden rounded-md bg-zinc-800">
                      {artist.avatarUrl ? <img src={artist.avatarUrl} alt={artist.name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <p className="truncate text-sm font-semibold text-zinc-100">{artist.name}</p>
                    <p className="truncate text-[11px] text-zinc-400">{Array.isArray(artist.albums) ? artist.albums.length : 0} albums</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="type-display-title">Recommended Stations</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recommendedSongs.map((song, index) => (
                <article key={`station-${song._id}`} className="group rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                  <button type="button" className="w-full text-left" onClick={() => playTrackById(song._id)}>
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                      <div className="absolute bottom-2 right-2">
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
                    className={`type-button-sm mt-2 rounded px-2 py-1 ${isSongLiked(song._id) ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}
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
                        className="type-button-sm rounded-md bg-white px-2 py-1 text-black disabled:opacity-70"
                      >
                        {playlistActionLoadingId === `add-${song._id}` ? '...' : 'Add'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          {searchQuery.trim() && recommendedSongs.length === 0 && (
            <p className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
              No songs found for keyword "{searchQuery}"
            </p>
          )}
        </>
      )}
    </>
  )
}

export default UserPage
