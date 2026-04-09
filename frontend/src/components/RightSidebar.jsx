import React, { useEffect, useRef } from 'react'

function RightSidebar({
  highlightedSong,
  sessionLoading,
  currentUser,
  authLoading,
  handleLogout,
  handleAuthSubmit,
  authMode,
  setAuthMode,
  setAuthError,
  authForm,
  handleAuthInput,
  authError,
  handleGoogleLogin = async () => {},
  onOpenLogin = () => {},
  playlistError,
  nextUpSongs = [],
  currentTrackId = '',
  isPlaying = false,
  onToggleSongPlayback = () => {},
  playTrackById = () => {},
  isSongLiked = () => false,
  toggleLikeSong = () => {},
  removeSongFromQueueAt = () => {},
  moveSongInQueue = () => {},
  clearQueue = () => {},
}) {
  const radioTitle = `${highlightedSong?.artist || 'Unknown Artist'} Radio`
  const queueListRef = useRef(null)

  useEffect(() => {
    if (!currentTrackId || !queueListRef.current) {
      return
    }

    const nowPlayingElement = queueListRef.current.querySelector('[data-now-playing="1"]')
    if (nowPlayingElement) {
      nowPlayingElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentTrackId, nextUpSongs])

  const renderQueuePlayButton = (song) => {
    const isNowPlaying = song?._id === currentTrackId
    const showPause = isNowPlaying && isPlaying

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleSongPlayback(song?._id)
        }}
        className="rounded-full bg-green-500 p-1.5 text-black shadow-md shadow-black/40 transition-all duration-200 hover:scale-105 hover:bg-green-400"
        title={showPause ? 'Pause' : 'Play'}
        aria-label={showPause ? 'Pause' : 'Play'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path d={showPause ? 'M7 5h3v14H7zm7 0h3v14h-3z' : 'M8 5v14l11-7z'} />
        </svg>
      </button>
    )
  }

  return (
    <aside className="rounded-lg bg-[#121212] p-2">
      <section className="rounded-lg bg-[#181818] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="truncate text-2xl font-bold" title={radioTitle}>{radioTitle}</h2>
          <button
            type="button"
            onClick={() => toggleLikeSong(highlightedSong?._id)}
            className={`type-button-sm rounded-full px-2 py-1 ${isSongLiked(highlightedSong?._id) ? 'bg-green-500 text-black' : 'bg-zinc-800'}`}
          >
            {isSongLiked(highlightedSong?._id) ? 'Liked' : '+'}
          </button>
        </div>

        <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-zinc-900">
          {highlightedSong?.coverUrl ? (
            <img src={highlightedSong.coverUrl} alt={highlightedSong.title} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <p className="truncate text-4xl font-black">{highlightedSong?.title || 'hoa ra...'}</p>
        <p className="text-xl text-zinc-400">{highlightedSong?.artist || 'GREY D'}</p>
      </section>

      <section id="next-up-panel" className="mt-2 rounded-lg bg-[#181818] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Next up</h3>
          <div className="flex items-center gap-2">
            <span className="type-badge text-zinc-500">{nextUpSongs.length} bai</span>
            {nextUpSongs.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="type-button-sm rounded bg-zinc-800 px-2 py-1 text-zinc-300 hover:bg-zinc-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {nextUpSongs.length === 0 ? (
          <p className="text-xs text-zinc-500">Chua co bai tiep theo trong hang doi.</p>
        ) : (
          <div ref={queueListRef} className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {nextUpSongs.map((item, index) => {
              const song = item?.song || item
              const queueIndex = typeof item?.queueIndex === 'number' ? item.queueIndex : index
              const isManualQueue = item?.isManualQueue === true
              const isNowPlaying = song._id === currentTrackId

              return (
              <div
                key={`queue-${song._id}-${queueIndex}`}
                data-now-playing={isNowPlaying ? '1' : '0'}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-zinc-800 ${isNowPlaying ? 'bg-green-500/15 ring-1 ring-green-400/50' : 'bg-zinc-900/60'}`}
              >
                <button type="button" onClick={() => playTrackById(song._id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <div className="h-9 w-9 overflow-hidden rounded bg-zinc-800">
                    {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-semibold ${isNowPlaying ? 'text-green-300' : ''}`}>{song.title}</p>
                    <p className="truncate text-[11px] text-zinc-400">{song.artist}</p>
                  </div>
                </button>

                {renderQueuePlayButton(song)}

                {isNowPlaying && (
                  <span className="type-badge rounded bg-green-500/20 px-1.5 py-0.5 text-green-300">
                    Now
                  </span>
                )}

                {isManualQueue ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSongInQueue(queueIndex, -1)}
                      className="type-button-sm rounded bg-zinc-800 px-1.5 py-1 text-zinc-300 hover:bg-zinc-700"
                      title="Dua bai hat len tren"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSongInQueue(queueIndex, 1)}
                      className="type-button-sm rounded bg-zinc-800 px-1.5 py-1 text-zinc-300 hover:bg-zinc-700"
                      title="Dua bai hat xuong duoi"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSongFromQueueAt(queueIndex)}
                      className="type-button-sm rounded bg-zinc-800 px-1.5 py-1 text-zinc-300 hover:bg-zinc-700"
                      title="Xoa bai hat khoi hang doi"
                    >
                      X
                    </button>
                  </div>
                ) : null}
              </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-2 rounded-lg bg-[#181818] p-4">
        {sessionLoading && <p className="text-sm text-zinc-400">Dang khoi tao...</p>}

        {!sessionLoading && currentUser && (
          <div>
            <p className="text-sm text-zinc-400">Dang nhap voi</p>
            <p className="text-lg font-semibold">{currentUser.name}</p>
            <p className="text-sm text-zinc-500">{currentUser.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={authLoading}
              className="mt-3 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-70"
            >
              {authLoading ? 'Dang dang xuat...' : 'Dang xuat'}
            </button>
          </div>
        )}

        {!sessionLoading && !currentUser && (
          <div className="rounded-xl border border-white/10 bg-linear-to-b from-zinc-900 to-black p-4 shadow-xl shadow-black/40">
            <p className="type-body-muted text-xs uppercase tracking-[0.18em] text-zinc-400">Tai khoan</p>
            <h4 className="mt-1 text-lg font-semibold text-white">Dang nhap de dong bo nhac</h4>
            <p className="mt-1 text-xs text-zinc-400">Mo trang dang nhap rieng de tiep tuc.</p>
            <button
              type="button"
              onClick={() => onOpenLogin('login')}
              className="mt-3 w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => onOpenLogin('register')}
              className="mt-2 w-full rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Sign up
            </button>
          </div>
        )}
      </section>

      {playlistError && (
        <section className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</section>
      )}
    </aside>
  )
}

export default RightSidebar
