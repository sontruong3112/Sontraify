import React, { useEffect, useMemo, useState } from 'react'
import { formatDuration } from '../utils/formatDuration'

function ArtistPage({
  artist = null,
  artistLoading = false,
  playTrackById = () => {},
  onPlayAlbumOnly = () => {},
  onPlaySongInAlbum = () => {},
  currentTrackId = '',
  isPlaying = false,
  onToggleSongPlayback = () => {},
  addSongToQueueNext = () => {},
  addSongToQueueLast = () => {},
  isSongLiked = () => false,
  toggleLikeSong = () => {},
  onBackToHome = () => {},
}) {
  const albums = Array.isArray(artist?.albums) ? artist.albums : []
  const [selectedAlbumId, setSelectedAlbumId] = useState('')
  const allSongs = useMemo(() => albums.flatMap((album) => (Array.isArray(album.songs) ? album.songs : [])), [albums])
  const heroSong = allSongs[0] || null
  const [sortMode, setSortMode] = useState('latest')
  const selectedAlbum = useMemo(() => albums.find((album) => album.id === selectedAlbumId) || null, [albums, selectedAlbumId])
  const selectedAlbumSongs = Array.isArray(selectedAlbum?.songs) ? selectedAlbum.songs : []

  useEffect(() => {
    if (!albums.length) {
      setSelectedAlbumId('')
      return
    }

    if (!selectedAlbumId || !albums.some((album) => album.id === selectedAlbumId)) {
      setSelectedAlbumId(albums[0].id)
    }
  }, [albums, selectedAlbumId])

  const topTracks = useMemo(() => {
    const songMap = new Map()

    allSongs.forEach((song) => {
      if (song?._id && !songMap.has(song._id)) {
        songMap.set(song._id, song)
      }
    })

    const list = Array.from(songMap.values())

    if (sortMode === 'title') {
      list.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')))
    } else if (sortMode === 'duration') {
      list.sort((a, b) => Number(a?.duration || 0) - Number(b?.duration || 0))
    } else {
      list.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    }

    return list.slice(0, 10)
  }, [allSongs, sortMode])

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-xl bg-linear-to-r from-emerald-500/35 via-cyan-500/20 to-sky-500/10 p-5">
        <p className="type-kicker text-zinc-200">Artist profile</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="type-display-hero truncate">{artist?.name || 'Unknown Artist'}</h1>
            <p className="type-body-muted mt-2 text-zinc-200/90">
              {allSongs.length} tracks • {albums.length} albums
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToHome}
            className="type-button-sm rounded-full bg-black/45 px-4 py-2 text-zinc-200 hover:bg-black/60"
          >
            Back to home
          </button>
        </div>

        {heroSong && (
          <button
            type="button"
            onClick={() => playTrackById(heroSong._id)}
            className="type-button-sm mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-black hover:bg-zinc-100"
          >
            Play {heroSong.title}
          </button>
        )}
      </section>

      {artistLoading ? <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Loading artist...</p> : null}

      {!artistLoading && !allSongs.length ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
          No songs available for this artist yet.
        </p>
      ) : (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="type-display-title">Popular tracks</h2>
            <div className="flex items-center gap-2">
              <p className="type-body-muted">Top {topTracks.length}</p>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="rounded-md bg-zinc-900 px-2 py-1 text-xs"
              >
                <option value="latest">Sort: Latest</option>
                <option value="title">Sort: Title</option>
                <option value="duration">Sort: Duration</option>
              </select>
            </div>
          </div>

          <div className="type-table-head mb-2 grid grid-cols-[1fr_auto] px-3 text-zinc-500">
            <span>Title</span>
            <span>Duration</span>
          </div>

          <div className="space-y-2">
            {topTracks.map((song, index) => (
              <div key={`artist-track-${song._id}`} className="group flex flex-wrap items-center gap-2 rounded-md bg-[#181818] px-3 py-2 hover:bg-[#232323] sm:flex-nowrap sm:gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleSongPlayback(song._id)
                  }}
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${song._id === currentTrackId ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                  title={song._id === currentTrackId && isPlaying ? 'Pause' : 'Play'}
                  aria-label={song._id === currentTrackId && isPlaying ? 'Pause' : 'Play'}
                >
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-xs font-bold transition-all duration-150 ${song._id === currentTrackId ? 'scale-90 opacity-0' : 'scale-100 opacity-100 group-hover:scale-90 group-hover:opacity-0'}`}
                  >
                    {index + 1}
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
                >
                  <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800">
                    {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{song.title}</p>
                    <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                  </div>
                </button>

                <span className="w-12 shrink-0 text-right text-xs text-zinc-400">{formatDuration(song.duration || 0)}</span>

                <button
                  type="button"
                  onClick={() => addSongToQueueNext(song._id)}
                  className="type-button-sm hidden rounded bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700 sm:inline-flex"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => addSongToQueueLast(song._id)}
                  className="type-button-sm hidden rounded bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700 sm:inline-flex"
                >
                  Queue
                </button>
                <button
                  type="button"
                  onClick={() => toggleLikeSong(song._id)}
                  className={`type-button-sm rounded px-2 py-1 ${isSongLiked(song._id) ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  {isSongLiked(song._id) ? 'Liked' : 'Like'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!artistLoading && albums.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="type-display-title">Albums</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <article
                key={`album-${album.id}`}
                className={`rounded-lg p-3 ${selectedAlbumId === album.id ? 'bg-zinc-700/40 ring-1 ring-white/30' : 'bg-[#181818]'}`}
              >
                <div className="mb-2 aspect-video overflow-hidden rounded-md bg-zinc-800">
                  {album.coverUrl ? <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" /> : null}
                </div>
                <h3 className="truncate text-sm font-semibold text-zinc-100">{album.title}</h3>
                <p className="mt-1 text-xs text-zinc-400">{Array.isArray(album.songs) ? album.songs.length : 0} tracks</p>
                <button
                  type="button"
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="type-button-sm mt-2 rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-black hover:bg-white"
                >
                  Open album
                </button>
              </article>
            ))}
          </div>

          {selectedAlbum && (
            <div className="mt-4 rounded-lg bg-[#181818] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">{selectedAlbum.title}</h3>
                  <p className="text-xs text-zinc-400">{selectedAlbumSongs.length} tracks in this album</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPlayAlbumOnly(selectedAlbumSongs)}
                  className="type-button-sm rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-100"
                >
                  Play album
                </button>
              </div>

              {selectedAlbumSongs.length === 0 ? (
                <p className="text-xs text-zinc-500">This album has no songs yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedAlbumSongs.map((song, index) => (
                    <button
                      key={`album-song-${song._id}`}
                      type="button"
                      onClick={() => onPlaySongInAlbum(song._id, selectedAlbumSongs)}
                      className="flex w-full items-center gap-3 rounded-md bg-zinc-900/70 px-2 py-2 text-left hover:bg-zinc-800"
                    >
                      <span className="w-5 text-center text-xs text-zinc-400">{index + 1}</span>
                      <div className="h-8 w-8 overflow-hidden rounded bg-zinc-800">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-zinc-100">{song.title}</p>
                        <p className="truncate text-[11px] text-zinc-400">{song.artist}</p>
                      </div>
                      <span className="text-[11px] text-zinc-500">{formatDuration(song.duration || 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </>
  )
}

export default ArtistPage


