import React from 'react'

function UserPage({
  currentUser,
  loading,
  error,
  playlistError,
  filteredSongs,
  playTrackById,
  recommendedSongs,
  playlists,
  selectedPlaylistBySong,
  setSelectedPlaylistBySong,
  playlistActionLoadingId,
  handleAddSongToPlaylist,
  popularSongs,
  searchQuery,
}) {
  return (
    <>
      {loading && <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Dang tai bai hat...</p>}
      {error && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}
      {playlistError && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</p>}

      {!loading && !error && (
        <>
          <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {filteredSongs.slice(0, 8).map((song) => (
              <button
                type="button"
                key={`quick-${song._id}`}
                onClick={() => playTrackById(song._id)}
                className="group flex items-center overflow-hidden rounded bg-white/10 text-left hover:bg-white/15"
              >
                <div className="h-12 w-12 overflow-hidden bg-zinc-800">
                  {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="truncate px-3 text-sm font-semibold">{song.title}</div>
              </button>
            ))}
          </div>

          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-3xl font-bold">Recommended Stations</h2>
              <button type="button" className="text-sm font-semibold text-zinc-400 hover:underline">Show all</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recommendedSongs.map((song, index) => (
                <article key={`station-${song._id}`} className="rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                  <button type="button" className="w-full text-left" onClick={() => playTrackById(song._id)}>
                    <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <p className="truncate text-2xl font-bold">{song.artist}</p>
                    <p className="mt-1 text-sm text-zinc-400">With {song.artist} and more</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Radio {index + 1}</p>
                  </button>
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
                        className="rounded-md bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-70"
                      >
                        {playlistActionLoadingId === `add-${song._id}` ? '...' : 'Add'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-3xl font-bold">Popular radio</h2>
              <button type="button" className="text-sm font-semibold text-zinc-400 hover:underline">Show all</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {popularSongs.map((song) => (
                <article key={`popular-${song._id}`} className="rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                  <button type="button" className="w-full text-left" onClick={() => playTrackById(song._id)}>
                    <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <p className="truncate text-3xl font-black uppercase">{song.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">With {song.artist} and friends</p>
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
        </>
      )}
    </>
  )
}

export default UserPage
