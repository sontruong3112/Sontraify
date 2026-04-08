import React from 'react'
import { formatDuration } from '../utils/formatDuration'

function FooterPlayer({
  Icon,
  highlightedSong,
  isShuffle,
  handleToggleShuffle,
  handlePrevTrack,
  handleTogglePlayPause,
  isPlaying,
  handleNextTrack,
  handleCycleRepeatMode,
  repeatMode,
  playbackTime,
  progressWrapperRef,
  handleProgressMouseMove,
  handleProgressMouseLeave,
  isProgressHovering,
  safeTrackDuration,
  hoverPreviewPercent,
  hoverPreviewTime,
  handleSeek,
  progressPercent,
  trackDuration,
  volume,
  setVolume,
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#000000]/95 px-5 py-3 backdrop-blur-sm">
      <div className="mx-auto grid max-w-360 grid-cols-[1fr_1fr_1fr] items-center gap-4">
        <div className="-ml-2 flex min-w-0 items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded bg-zinc-800 shadow-lg shadow-black/40">
            {highlightedSong?.coverUrl ? (
              <img src={highlightedSong.coverUrl} alt={highlightedSong.title} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{highlightedSong?.title || 'Chua co bai hat nao'}</p>
            <p className="truncate text-sm text-zinc-400">{highlightedSong?.artist || '---'}</p>
          </div>
          <button type="button" className="text-zinc-400 hover:text-white">
            <Icon className="h-5 w-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0116.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></Icon>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="mb-2 flex items-center gap-5 text-zinc-300">
            <button type="button" onClick={handleToggleShuffle} className={isShuffle ? 'text-green-400 hover:text-green-300' : 'hover:text-white'} title={isShuffle ? 'Tat phat ngau nhien' : 'Bat phat ngau nhien'}><Icon className="h-5 w-5"><path d="M17 17V7h-2v3H9V7H7v10h2v-3h6v3h2z"/></Icon></button>
            <button type="button" onClick={handlePrevTrack} className="hover:text-white"><Icon className="h-5 w-5"><path d="M15 18l-8-6 8-6z"/></Icon></button>
            <button type="button" onClick={handleTogglePlayPause} className="rounded-full bg-white p-2.5 text-black hover:scale-105"><Icon className="h-5 w-5"><path d={isPlaying ? 'M7 6h3v12H7zm7 0h3v12h-3z' : 'M8 5v14l11-7z'}/></Icon></button>
            <button type="button" onClick={handleNextTrack} className="hover:text-white"><Icon className="h-5 w-5"><path d="M9 6l8 6-8 6z"/></Icon></button>
            <button
              type="button"
              onClick={handleCycleRepeatMode}
              className={repeatMode !== 'off' ? 'relative text-green-400 hover:text-green-300' : 'relative hover:text-white'}
              title={repeatMode === 'off' ? 'Lap lai: Tat' : repeatMode === 'all' ? 'Lap lai: Toan bo' : 'Lap lai: Mot bai'}
            >
              <Icon className="h-5 w-5"><path d="M7 7h10v2l3-3-3-3v2H6a3 3 0 00-3 3v3h2V8a1 1 0 011-1h11v2zm10 10H6v-2l-3 3 3 3v-2h11a3 3 0 003-3v-3h-2v3a1 1 0 01-1 1z"/></Icon>
              {repeatMode === 'one' && <span className="absolute -bottom-1 -right-1 text-[9px] font-bold">1</span>}
            </button>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 text-xs text-zinc-400">
            <span>{formatDuration(playbackTime)}</span>
            <div
              ref={progressWrapperRef}
              className="relative flex-1"
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
            >
              {isProgressHovering && safeTrackDuration > 0 && (
                <div
                  className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ left: `${hoverPreviewPercent}%` }}
                >
                  {formatDuration(hoverPreviewTime)}
                </div>
              )}
              <input
                type="range"
                min="0"
                max={safeTrackDuration}
                step="0.1"
                value={Math.min(playbackTime, safeTrackDuration)}
                onChange={handleSeek}
                className="player-progress h-1 w-full cursor-pointer appearance-none rounded-full"
                style={{ '--progress-percent': `${progressPercent}%` }}
              />
            </div>
            <span>{formatDuration(trackDuration || highlightedSong?.duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-zinc-300">
          <button type="button" className="hover:text-white"><Icon className="h-5 w-5"><path d="M4 6h16v2H4zm0 5h10v2H4zm0 5h6v2H4z"/></Icon></button>
          <button type="button" className="hover:text-white"><Icon className="h-5 w-5"><path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" strokeWidth="2"/></Icon></button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-zinc-700"
          />
          <button type="button" className="hover:text-white"><Icon className="h-5 w-5"><path d="M7 5h10v2H7zm0 6h10v2H7zm0 6h10v2H7z"/></Icon></button>
        </div>
      </div>
    </footer>
  )
}

export default FooterPlayer
