import React from 'react'

function LeftSidebar({
  handleGoHome,
  currentUser,
  handleCreatePlaylist,
  playlistName,
  setPlaylistName,
  playlistActionLoadingId,
  playlistLoading,
  playlists,
  selectedPlaylistId = '',
  onSelectPlaylist = () => {},
  artists,
  playTrackById,
  onResizeStart = () => {},
  likedSongsCount = 0,
  likedSongs = [],
  onOpenMessages = () => {},
  onOpenLikedSongs = () => {},
  isLikedSongsRoute = false,
}) {
  const effectiveCollapsed = false

  const sidePadding = effectiveCollapsed ? 'p-1' : 'p-2'
  const cardPadding = effectiveCollapsed ? 'p-2' : 'p-4'
  const textRevealClass = effectiveCollapsed
    ? 'max-w-0 opacity-0'
    : 'max-w-[220px] opacity-100'

  const flyoutClassName = ''

  return (
    <aside
      className={`relative rounded-lg bg-[#121212] ${sidePadding} transition-all duration-300 ease-in-out ${flyoutClassName}`}
    >
      <button
        type="button"
        onPointerDown={onResizeStart}
        className="absolute top-2 right-0 hidden h-[calc(100%-16px)] w-1 translate-x-1/2 cursor-col-resize rounded-full bg-transparent xl:block"
        title="Kéo để đổi độ rộng sidebar"
        aria-label="Resize sidebar"
      />

      <div className={`rounded-lg bg-[#181818] ${cardPadding} overflow-hidden transition-all duration-300 ease-in-out`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleGoHome}
            className={`flex items-center text-xl font-bold ${effectiveCollapsed ? 'justify-center' : 'gap-2'}`}
            title="Home"
          >
            <img src="/favicon.svg" alt="Sontraify logo" className="h-7 w-7 rounded-md" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${textRevealClass}`}>
              Sontraify
            </span>
          </button>

        </div>

        <button
          type="button"
          onClick={handleGoHome}
          className={`group relative mb-2 flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold ${effectiveCollapsed ? 'justify-center bg-transparent' : 'gap-3 bg-white/8'}`}
          title="Home"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${textRevealClass}`}>
            Home
          </span>
          {effectiveCollapsed && (
            <span className="pointer-events-none absolute left-full ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              Home
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenMessages}
          className={`group relative flex w-full items-center rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-white/8 ${effectiveCollapsed ? 'justify-center' : 'gap-3'}`}
          title="Messages"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true"><path d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.5l8 5 8-5V7H4zm16 10V9.85l-7.47 4.67a1 1 0 01-1.06 0L4 9.85V17h16z"/></svg>
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${textRevealClass}`}>
            Messages
          </span>
          {effectiveCollapsed && (
            <span className="pointer-events-none absolute left-full ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              Messages
            </span>
          )}
        </button>
      </div>

      <div className={`mt-2 rounded-lg bg-[#181818] ${cardPadding} overflow-hidden transition-all duration-300 ease-in-out`}>
        {!effectiveCollapsed ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Library</h2>
              {currentUser && (
                <button
                  type="button"
                  className="type-button-sm rounded-full bg-zinc-800 px-3 py-1 hover:bg-zinc-700"
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
                  placeholder="Create playlist"
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  disabled={playlistActionLoadingId === 'create'}
                  className="type-button-sm rounded-md bg-white px-2 text-black"
                >
                  {playlistActionLoadingId === 'create' ? '...' : 'Create'}
                </button>
              </form>
            )}

            <div className="space-y-4">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="type-kicker text-zinc-300">Playlists</p>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{playlists.length}</span>
                </div>

                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {playlistLoading && <p className="text-xs text-zinc-500">Loading playlists...</p>}
                  {!playlistLoading && playlists.length === 0 && (
                    <p className="text-xs text-zinc-500">No playlists yet</p>
                  )}
                  {playlists.map((playlist) => {
                    const songCount = Array.isArray(playlist.songs) ? playlist.songs.length : 0
                    const isSelected = selectedPlaylistId === playlist._id

                    return (
                      <div
                        key={playlist._id}
                        className={`rounded-xl px-2 py-2 transition-all ${isSelected ? 'bg-green-500/15 ring-1 ring-green-400/50' : 'bg-zinc-900/70 hover:bg-zinc-900'}`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectPlaylist(playlist._id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            title={playlist.name}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-800 text-xs font-bold text-zinc-300">
                              {playlist.coverUrl ? (
                                <img src={playlist.coverUrl} alt={playlist.name} className="h-full w-full object-cover" />
                              ) : 'PL'}
                            </div>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isSelected ? 'text-green-300' : 'text-zinc-100'}`}>
                                {playlist.name}
                              </p>
                              <p className="truncate text-[11px] text-zinc-400">{songCount} tracks</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onOpenLikedSongs}
                    className={`type-kicker rounded px-1 text-left ${isLikedSongsRoute ? 'bg-green-500/20 text-green-300' : 'text-zinc-300 hover:text-zinc-100'}`}
                  >
                    Liked Songs
                  </button>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{likedSongsCount}</span>
                </div>

                {likedSongs.length === 0 ? (
                  <p className="rounded-md bg-zinc-900/60 px-2 py-2 text-xs text-zinc-500">No liked songs yet</p>
                ) : (
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {likedSongs.slice(0, 8).map((song) => {
                      const songLabel = song?.title || song?.artist || 'Unknown'

                      return (
                        <button
                          type="button"
                          key={`liked-${song._id}`}
                          onClick={() => playTrackById(song._id)}
                          className="flex w-full items-center gap-2 rounded-md bg-zinc-900/70 px-2 py-2 text-left hover:bg-zinc-800"
                          title={songLabel}
                        >
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-zinc-800">
                            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-zinc-100">{song.title || 'Unknown title'}</p>
                            <p className="truncate text-[11px] text-zinc-400">{song.artist || 'Unknown artist'}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="mb-2 flex justify-center">
            {currentUser && (
              <button
                type="button"
                className="rounded-full bg-zinc-800 p-2 text-xs hover:bg-zinc-700"
                title="Tạo playlist"
              >
                +
              </button>
            )}
          </div>
        )}

        {!effectiveCollapsed && (
          <p className="type-kicker mb-2 text-zinc-400">Artist Radio</p>
        )}

        <div className={effectiveCollapsed ? 'space-y-3' : 'space-y-2'}>
          {artists.map((song) => {
            const songLabel = song.title || song.artist || 'Unknown'

            return (
              <button
                type="button"
                key={`${song.artist}-${song._id}`}
                onClick={() => playTrackById(song._id)}
                className={`group relative flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-white/8 ${effectiveCollapsed ? 'justify-center' : 'gap-2'}`}
                title={songLabel}
              >
                <div className="h-9 w-9 overflow-hidden rounded-full bg-zinc-800">
                  {song.coverUrl ? (
                    <img src={song.coverUrl} alt={song.artist} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${textRevealClass}`}>
                  {!effectiveCollapsed && (
                    <p className="truncate text-sm font-semibold" title={songLabel}>{songLabel}</p>
                  )}
                  {!effectiveCollapsed && <p className="truncate text-xs text-zinc-400" title={song.artist || ''}>{song.artist || 'Artist'}</p>}
                </div>
                {effectiveCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                    {songLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default LeftSidebar


