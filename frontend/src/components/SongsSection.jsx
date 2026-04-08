import { formatDuration } from '../utils/formatDuration'

function SongsSection({
  songs,
  loading,
  error,
  currentUser,
  playlists,
  selectedPlaylistBySong,
  setSelectedPlaylistBySong,
  playlistActionLoadingId,
  onAddSongToPlaylist,
  onEditSong,
  onDeleteSong,
  songMutationLoading,
}) {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="display-font text-2xl">Bài Hát Nổi Bật</h2>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          API Trực Tiếp
        </span>
      </div>
      {loading && (
        <div className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-6 text-sm text-stone-600">
          Đang tải danh sách bài hát...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-300/60 bg-red-50/80 px-4 py-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && songs.length === 0 && (
        <div className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-6 text-sm text-stone-600">
          Chưa có bài hát nào. Hãy thêm bài hát từ trang quản trị để hiển thị tại đây.
        </div>
      )}

      {!loading && !error && songs.length > 0 && (
        <ul className="space-y-3">
          {songs.map((song, index) => (
            <li
              key={song._id || song.id || `${song.title}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-stone-900/10 bg-white/70 p-3 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-300 to-amber-200 text-sm font-bold">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold sm:text-base">{song.title}</p>
                <p className="truncate text-xs text-stone-600 sm:text-sm">
                  {song.artist} • {song.genre}
                </p>
              </div>
              <span className="text-xs font-semibold text-stone-500 sm:text-sm">
                {formatDuration(song.duration)}
              </span>
              {currentUser && playlists.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPlaylistBySong[song._id] || playlists[0]?._id || ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setSelectedPlaylistBySong((prev) => ({
                        ...prev,
                        [song._id]: value,
                      }))
                    }}
                    className="max-w-28 rounded-lg border border-stone-900/15 bg-white/80 px-2 py-1 text-xs"
                  >
                    {playlists.map((playlist) => (
                      <option key={playlist._id} value={playlist._id}>
                        {playlist.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={playlistActionLoadingId === `add-${song._id}`}
                    onClick={() => onAddSongToPlaylist(song._id)}
                    className="rounded-full border border-stone-900/15 bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-white disabled:opacity-70"
                  >
                    {playlistActionLoadingId === `add-${song._id}` ? 'Đang thêm...' : 'Thêm'}
                  </button>
                </div>
              )}
              {currentUser?.role === 'admin' && song._id && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditSong(song)}
                    className="rounded-full border border-stone-900/15 bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-white"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSong(song._id)}
                    disabled={songMutationLoading}
                    className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-70"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default SongsSection
