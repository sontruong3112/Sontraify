import React from 'react'

function LeftSidebar({
  Icon,
  handleGoHome,
  currentUser,
  handleCreatePlaylist,
  playlistName,
  setPlaylistName,
  playlistActionLoadingId,
  playlistLoading,
  playlists,
  handleDeletePlaylist,
  artists,
  playTrackById,
}) {
  return (
    <aside className="rounded-lg bg-[#121212] p-2">
      <div className="rounded-lg bg-[#181818] p-4">
        <button type="button" onClick={handleGoHome} className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon className="h-7 w-7 text-green-500"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.64 14.45a.76.76 0 01-1.04.25 9.7 9.7 0 00-5.03-1.31 9.8 9.8 0 00-3.38.62.75.75 0 11-.5-1.41 11.2 11.2 0 013.88-.7c2.04 0 4.05.52 5.78 1.5.36.2.49.67.29 1.05zm1.5-2.9a.94.94 0 01-1.3.3 12.5 12.5 0 00-6.3-1.66 12.7 12.7 0 00-4.22.73.94.94 0 11-.62-1.77 14.6 14.6 0 014.84-.83c2.52 0 4.99.65 7.23 1.88.45.24.61.82.37 1.35zm.12-3.03A15.3 15.3 0 0010.6 8.4c-1.83 0-3.63.3-5.31.91a1.12 1.12 0 11-.76-2.1A17.5 17.5 0 0110.6 6c3.24 0 6.43.85 9.23 2.46a1.12 1.12 0 11-1.13 1.96z"/></Icon>
          Sontraify
        </button>
        <button type="button" onClick={handleGoHome} className="mb-2 flex w-full items-center gap-3 rounded-md bg-white/8 px-3 py-2 text-sm font-semibold">
          <Icon><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></Icon>
          Home
        </button>
        <button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-white/8">
          <Icon><path d="M10 2a8 8 0 105.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></Icon>
          Search
        </button>
      </div>

      <div className="mt-2 rounded-lg bg-[#181818] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Library</h2>
          {currentUser && (
            <button
              type="button"
              className="rounded-full bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700"
            >
              + Create
            </button>
          )}
        </div>

        {currentUser && (
          <form className="mb-3 flex gap-2" onSubmit={handleCreatePlaylist}>
            <input
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="Tao playlist"
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={playlistActionLoadingId === 'create'}
              className="rounded-md bg-white px-2 text-xs font-semibold text-black"
            >
              {playlistActionLoadingId === 'create' ? '...' : 'Tao'}
            </button>
          </form>
        )}

        <div className="mb-3 max-h-52 space-y-2 overflow-y-auto pr-1">
          {playlistLoading && <p className="text-xs text-zinc-500">Dang tai playlist...</p>}
          {!playlistLoading && playlists.length === 0 && (
            <p className="text-xs text-zinc-500">Chua co playlist nao</p>
          )}
          {playlists.map((playlist) => (
            <div key={playlist._id} className="rounded-md bg-zinc-900/60 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="truncate text-left text-sm"
                >
                  {playlist.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlaylist(playlist._id)}
                  disabled={playlistActionLoadingId === `delete-${playlist._id}`}
                  className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] hover:bg-zinc-700"
                >
                  Xoa
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {artists.map((song) => (
            <button
              type="button"
              key={`${song.artist}-${song._id}`}
              onClick={() => playTrackById(song._id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/8"
            >
              <div className="h-9 w-9 overflow-hidden rounded-full bg-zinc-800">
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt={song.artist} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{song.artist}</p>
                <p className="truncate text-xs text-zinc-400">Artist</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default LeftSidebar
