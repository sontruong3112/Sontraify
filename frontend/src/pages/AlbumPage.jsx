import React from 'react'
import { formatDuration } from '../utils/formatDuration'

function AlbumPage({
  artist = null,
  album = null,
  albumLoading = false,
  currentTrackId = '',
  isPlaying = false,
  onToggleSongPlayback = () => {},
  onPlayAlbumOnly = () => {},
  onPlaySongInAlbum = () => {},
  onBack = () => {},
}) {
  const songs = Array.isArray(album?.songs) ? album.songs : []

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-xl bg-linear-to-r from-sky-500/30 via-zinc-700/20 to-transparent p-5">
        <p className="type-kicker text-zinc-200">Album</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="type-display-hero truncate">{album?.title || 'Unknown album'}</h1>
            <p className="type-body-muted mt-2 text-zinc-300">{artist?.name || 'Unknown artist'} • {songs.length} tracks</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPlayAlbumOnly(songs)}
              disabled={songs.length === 0}
              className="type-button-sm rounded-full bg-white px-4 py-2 text-black disabled:opacity-60"
            >
              Play album
            </button>
            <button
              type="button"
              onClick={onBack}
              className="type-button-sm rounded-full bg-zinc-800 px-4 py-2 text-zinc-200"
            >
              Back
            </button>
          </div>
        </div>
      </section>

      {albumLoading ? <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Loading album...</p> : null}

      {!albumLoading && !album ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Album not found.</p>
      ) : null}

      {!albumLoading && album && songs.length === 0 ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">This album has no songs yet.</p>
      ) : null}

      {!albumLoading && album && songs.length > 0 ? (
        <section>
          <h2 className="type-display-title mb-3">Tracks</h2>
          <div className="space-y-2">
            {songs.map((song, index) => {
              const isActive = song._id === currentTrackId
              const isActivePlaying = isActive && isPlaying

              return (
                <div key={`album-track-${song._id}`} className="flex items-center gap-3 rounded-md bg-[#181818] px-3 py-2 hover:bg-[#232323]">
                  <button
                    type="button"
                    onClick={() => onToggleSongPlayback(song._id)}
                    className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title={isActivePlaying ? 'Pause' : 'Play'}
                  >
                    {isActivePlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path d="M7 5h3v14H7zm7 0h3v14h-3z" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlaySongInAlbum(song._id, songs)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded bg-zinc-800">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{song.title}</p>
                      <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                    </div>
                  </button>

                  <span className="text-xs text-zinc-400">{formatDuration(song.duration || 0)}</span>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </>
  )
}

export default AlbumPage
