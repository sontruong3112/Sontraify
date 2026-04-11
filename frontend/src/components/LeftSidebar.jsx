import React, { useEffect, useRef, useState } from 'react'

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
  selectedPlaylistId = '',
  onSelectPlaylist = () => {},
  handleDeletePlaylist,
  artists,
  playTrackById,
  isCollapsed = false,
  onToggleCollapse = () => {},
  onResizeStart = () => {},
  hoverFlyoutEnabled = true,
  likedSongsCount = 0,
  onOpenMessages = () => {},
}) {
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current)
      }

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])
  const effectiveCollapsed = isCollapsed && !isHoverExpanded

  const sidePadding = effectiveCollapsed ? 'p-1' : 'p-2'
  const cardPadding = effectiveCollapsed ? 'p-2' : 'p-4'
  const textRevealClass = effectiveCollapsed
    ? 'max-w-0 opacity-0'
    : 'max-w-[220px] opacity-100'

  const flyoutClassName = isCollapsed && isHoverExpanded && hoverFlyoutEnabled
    ? 'absolute inset-y-0 left-0 z-30 w-[360px] rounded-lg bg-[#121212]/96 shadow-2xl shadow-black/60 backdrop-blur-sm'
    : ''

  const handleMouseEnter = () => {
    if (!isCollapsed || !hoverFlyoutEnabled) {
      return
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    openTimerRef.current = setTimeout(() => {
      setIsHoverExpanded(true)
      openTimerRef.current = null
    }, 90)
  }

  const handleMouseLeave = () => {
    if (!isCollapsed || !hoverFlyoutEnabled) {
      return
    }

    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }

    closeTimerRef.current = setTimeout(() => {
      setIsHoverExpanded(false)
      closeTimerRef.current = null
    }, 120)
  }

  return (
    <aside
      className={`relative rounded-lg bg-[#121212] ${sidePadding} transition-all duration-300 ease-in-out ${flyoutClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onDoubleClick={onToggleCollapse}
        onPointerDown={onResizeStart}
        className="absolute top-2 right-0 hidden h-[calc(100%-16px)] w-1 translate-x-1/2 cursor-col-resize rounded-full bg-transparent xl:block"
        title="Kéo để đổi độ rộng sidebar, double click để thu gọn/mở rộng"
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

          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700"
            title={isCollapsed ? 'Ghim mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <Icon className="h-3 w-3">
              {effectiveCollapsed
                ? <path d="M9 6l6 6-6 6" />
                : <path d="M15 6l-6 6 6 6" />}
            </Icon>
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoHome}
          className={`group relative mb-2 flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold ${effectiveCollapsed ? 'justify-center bg-transparent' : 'gap-3 bg-white/8'}`}
          title="Home"
        >
          <Icon><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></Icon>
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
          <Icon><path d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.5l8 5 8-5V7H4zm16 10V9.85l-7.47 4.67a1 1 0 01-1.06 0L4 9.85V17h16z"/></Icon>
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
                  placeholder="Tạo playlist"
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  disabled={playlistActionLoadingId === 'create'}
                  className="type-button-sm rounded-md bg-white px-2 text-black"
                >
                  {playlistActionLoadingId === 'create' ? '...' : 'Tạo'}
                </button>
              </form>
            )}

            <div className="mb-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              <div className="rounded-md bg-linear-to-r from-indigo-500/30 to-sky-500/20 px-2 py-2">
                <p className="type-kicker truncate text-zinc-200">Liked Songs</p>
                <p className="text-[11px] text-zinc-300">{likedSongsCount} bài hát da thich</p>
              </div>

              {playlistLoading && <p className="text-xs text-zinc-500">Đang tải playlist...</p>}
              {!playlistLoading && playlists.length === 0 && (
                <p className="text-xs text-zinc-500">Chưa có playlist nào</p>
              )}
              {playlists.map((playlist) => (
                <div key={playlist._id} className="rounded-md bg-zinc-900/60 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectPlaylist(playlist._id)}
                      className={`truncate text-left text-sm ${selectedPlaylistId === playlist._id ? 'text-green-300' : ''}`}
                      title={playlist.name}
                    >
                      {playlist.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlaylist(playlist._id)}
                      disabled={playlistActionLoadingId === `delete-${playlist._id}`}
                      className="type-button-sm rounded bg-zinc-800 px-1.5 py-0.5 hover:bg-zinc-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
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


