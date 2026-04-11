import React, { useMemo, useState } from 'react'
import { formatDuration } from '../utils/formatDuration'

function FooterPlayer({
  Icon,
  highlightedSong,
  isCurrentTrackLiked = false,
  handleToggleLikeCurrentTrack = () => {},
  isShuffle = false,
  handleToggleShuffle = () => {},
  handlePrevTrack = () => {},
  handleTogglePlayPause = () => {},
  isPlaying = false,
  handleNextTrack = () => {},
  handleCycleRepeatMode = () => {},
  repeatMode = 'off',
  playbackTime = 0,
  progressWrapperRef,
  handleProgressMouseMove = () => {},
  handleProgressMouseLeave = () => {},
  isProgressHovering = false,
  safeTrackDuration = 0,
  hoverPreviewPercent = 0,
  hoverPreviewTime = 0,
  handleSeek = () => {},
  progressPercent = 0,
  trackDuration = 0,
  volume = 0.7,
  setVolume = () => {},
  isMuted = false,
  handleToggleMute = () => {},
  queueCount = 0,
  handleOpenQueuePanel = () => {},
  playerToast = '',
  onVolumeWheel = () => {},
  playbackRate = 1,
  handleCyclePlaybackRate = () => {},
}) {
  const [showRemainingTime, setShowRemainingTime] = useState(false)

  const remainingTime = Math.max(safeTrackDuration - playbackTime, 0)
  const volumeLevel = Number(volume) || 0

  const volumeIcon = useMemo(() => {
    if (isMuted || volumeLevel <= 0.001) {
      return (
        <Icon className="h-5 w-5">
          <path d="M5 10v4h3l4 4V6l-4 4H5z"/>
          <path d="M16 9l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="2"/>
        </Icon>
      )
    }

    if (volumeLevel < 0.5) {
      return (
        <Icon className="h-5 w-5">
          <path d="M3 10v4h4l5 5V5L7 10H3z"/>
          <path d="M16 12a3 3 0 010 0.01" fill="none" stroke="currentColor" strokeWidth="2"/>
        </Icon>
      )
    }

    return (
      <Icon className="h-5 w-5">
        <path d="M3 10v4h4l5 5V5L7 10H3z"/>
        <path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" strokeWidth="2"/>
      </Icon>
    )
  }, [Icon, isMuted, volumeLevel])

  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#000000]/96 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto grid max-w-360 grid-cols-1 items-center gap-3 md:grid-cols-[1.1fr_1.4fr_1fr] md:gap-4">
        <div className="-ml-1 flex min-w-0 items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded bg-zinc-800 shadow-lg shadow-black/40">
            {highlightedSong?.coverUrl ? (
              <img src={highlightedSong.coverUrl} alt={highlightedSong.title} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold hover:underline">{highlightedSong?.title || 'Chưa có bài hát nào'}</p>
            <p className="truncate text-xs text-zinc-400 hover:text-zinc-200 hover:underline">{highlightedSong?.artist || '---'}</p>
          </div>
          <button
            type="button"
            onClick={handleToggleLikeCurrentTrack}
            className={isCurrentTrackLiked ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-white'}
            title={isCurrentTrackLiked ? 'Bỏ thích bài hát hiện tại' : 'Yêu thích bài hát hiện tại'}
          >
            <Icon className="h-5 w-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0116.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></Icon>
          </button>
          <button type="button" className="hidden text-zinc-400 hover:text-white lg:block" title="Mo mini player">
            <Icon className="h-4 w-4"><path d="M4 4h16v12H4zm2 2v8h12V6zM8 18h8v2H8z"/></Icon>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center">
          {playerToast && (
            <div className="type-badge mb-2 rounded-full bg-zinc-800/95 px-3 py-1 text-zinc-100 player-toast">
              {playerToast}
            </div>
          )}
          <div className="mb-2 flex items-center gap-4 text-zinc-300">
            <button type="button" onClick={handleToggleShuffle} className={isShuffle ? 'text-green-400 hover:text-green-300' : 'hover:text-white'} title={isShuffle ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}><Icon className="h-5 w-5"><path d="M17 17V7h-2v3H9V7H7v10h2v-3h6v3h2z"/></Icon></button>
            <button type="button" onClick={handlePrevTrack} className="hover:text-white" title="Bài trước"><Icon className="h-5 w-5"><path d="M15 18l-8-6 8-6z"/></Icon></button>
            <button type="button" onClick={handleTogglePlayPause} className="rounded-full bg-white p-2.5 text-black hover:scale-105" title={isPlaying ? 'Tạm dừng' : 'Phát'}><Icon className="h-5 w-5"><path d={isPlaying ? 'M7 6h3v12H7zm7 0h3v12h-3z' : 'M8 5v14l11-7z'}/></Icon></button>
            <button type="button" onClick={handleNextTrack} className="hover:text-white" title="Bài tiếp theo"><Icon className="h-5 w-5"><path d="M9 6l8 6-8 6z"/></Icon></button>
            <button
              type="button"
              onClick={handleCycleRepeatMode}
              className={repeatMode !== 'off' ? 'relative text-green-400 hover:text-green-300' : 'relative hover:text-white'}
              title={repeatMode === 'off' ? 'Lặp lại: Tắt' : repeatMode === 'all' ? 'Lặp lại: Toàn bộ' : 'Lặp lại: Một bài'}
            >
              <Icon className="h-5 w-5"><path d="M7 7h10v2l3-3-3-3v2H6a3 3 0 00-3 3v3h2V8a1 1 0 011-1h11v2zm10 10H6v-2l-3 3 3 3v-2h11a3 3 0 003-3v-3h-2v3a1 1 0 01-1 1z"/></Icon>
              {repeatMode === 'one' && <span className="absolute -bottom-1 -right-1 text-[9px] font-bold">1</span>}
            </button>
            <button
              type="button"
              onClick={handleCyclePlaybackRate}
              className={`type-button-sm rounded px-1.5 py-0.5 ${playbackRate === 1 ? 'text-zinc-300 hover:text-white' : 'bg-green-500/20 text-green-300'}`}
              title="Đổi tốc độ phát"
            >
              {playbackRate}x
            </button>
          </div>
          <div className="flex w-full max-w-xl items-center gap-2 text-[11px] text-zinc-400">
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
            <button
              type="button"
              onClick={() => setShowRemainingTime((prev) => !prev)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200"
              title="Chuyển hiển thị tổng thời lượng và thời gian còn lại"
            >
              {showRemainingTime
                ? `-${formatDuration(remainingTime)}`
                : formatDuration(trackDuration || highlightedSong?.duration)}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 text-zinc-300 md:justify-end">
          <button type="button" className="hidden hover:text-white lg:block" title="Now playing view"><Icon className="h-5 w-5"><path d="M5 5h14v2H5zm0 6h9v2H5zm0 6h14v2H5z"/></Icon></button>
          <button type="button" onClick={handleOpenQueuePanel} className="hover:text-white" title={`Hàng đợi (${queueCount || 0})`}>
            <div className="relative">
              <Icon className="h-5 w-5"><path d="M4 6h16v2H4zm0 5h10v2H4zm0 5h6v2H4z"/></Icon>
              {(queueCount || 0) > 0 ? <span className="type-badge absolute -right-2 -top-2 rounded-full bg-green-500 px-1 text-black">{queueCount}</span> : null}
            </div>
          </button>
          <button type="button" className="hidden hover:text-white lg:block" title="Connect to a device"><Icon className="h-5 w-5"><path d="M3 5h18v12H3zm2 2v8h14V7zM8 19h8v1H8z"/></Icon></button>
          <button
            type="button"
            onClick={handleToggleMute}
            onWheel={(event) => {
              event.preventDefault()
              onVolumeWheel(event.deltaY)
            }}
            className="hover:text-white"
            title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
          >
            {volumeIcon}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="player-volume h-1 w-28 cursor-pointer appearance-none rounded-full"
            style={{ '--volume-percent': `${Math.round(Math.max(0, Math.min(volume, 1)) * 100)}%` }}
          />
          <button type="button" className="hover:text-white" title="Toan man hinh"><Icon className="h-5 w-5"><path d="M7 3H3v4h2V5h2V3zm12 0h-4v2h2v2h2V3zM5 17H3v4h4v-2H5v-2zm14 0h-2v2h-2v2h4v-4z"/></Icon></button>
        </div>
      </div>
    </footer>
  )
}

export default FooterPlayer


