function PlaylistsPanel({
  currentUser,
  playlistName,
  setPlaylistName,
  playlistError,
  playlistLoading,
  playlistActionLoadingId,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onRemoveSongFromPlaylist,
}) {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <h3 className="display-font text-xl">Playlist Của Tôi</h3>

      {!currentUser && (
        <p className="mt-3 rounded-xl border border-stone-900/10 bg-white/70 px-3 py-3 text-sm text-stone-600">
          Hãy đăng nhập để tạo và quản lý playlist.
        </p>
      )}

      {currentUser && (
        <div className="mt-4 space-y-4">
          <form className="flex gap-2" onSubmit={onCreatePlaylist}>
            <input
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="Tên playlist mới"
              className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
              required
            />
            <button
              type="submit"
              disabled={playlistActionLoadingId === 'create'}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-70"
            >
              {playlistActionLoadingId === 'create' ? '...' : 'Tạo'}
            </button>
          </form>

          {playlistError && (
            <p className="rounded-xl border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-700">
              {playlistError}
            </p>
          )}

          {playlistLoading && (
            <p className="rounded-xl border border-stone-900/10 bg-white/70 px-3 py-3 text-sm text-stone-600">
              Đang tải playlist...
            </p>
          )}

          {!playlistLoading && playlists.length === 0 && (
            <p className="rounded-xl border border-stone-900/10 bg-white/70 px-3 py-3 text-sm text-stone-600">
              Chưa có playlist nào.
            </p>
          )}

          {!playlistLoading && playlists.length > 0 && (
            <ul className="space-y-3">
              {playlists.map((playlist) => (
                <li key={playlist._id} className="rounded-2xl border border-stone-900/10 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{playlist.name}</p>
                      <p className="text-xs text-stone-500">{playlist.songs?.length || 0} bài hát</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeletePlaylist(playlist._id)}
                      disabled={playlistActionLoadingId === `delete-${playlist._id}`}
                      className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-70"
                    >
                      {playlistActionLoadingId === `delete-${playlist._id}` ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </div>

                  {playlist.songs?.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {playlist.songs.map((song) => (
                        <li key={song._id} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2 py-1.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{song.title}</p>
                            <p className="truncate text-xs text-stone-500">{song.artist}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveSongFromPlaylist(playlist._id, song._id)}
                            disabled={playlistActionLoadingId === `remove-${playlist._id}-${song._id}`}
                            className="rounded-full border border-stone-900/15 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-70"
                          >
                            {playlistActionLoadingId === `remove-${playlist._id}-${song._id}` ? '...' : 'Gỡ'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default PlaylistsPanel
