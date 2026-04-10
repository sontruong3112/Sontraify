import { useEffect, useMemo, useRef, useState } from 'react'

const PLAYER_VOLUME_KEY = 'music_player_volume'
const PLAYER_REPEAT_MODE_KEY = 'music_player_repeat_mode'
const PLAYER_SHUFFLE_KEY = 'music_player_shuffle'
const PLAYER_TRACK_ID_KEY = 'music_player_track_id'
const PLAYER_RATE_KEY = 'music_player_rate'

const getInitialVolume = () => {
  const raw = Number(localStorage.getItem(PLAYER_VOLUME_KEY))
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.7
}

const getInitialRepeatMode = () => {
  const raw = localStorage.getItem(PLAYER_REPEAT_MODE_KEY)
  return raw === 'off' || raw === 'all' || raw === 'one' ? raw : 'off'
}

const getInitialPlaybackRate = () => {
  const raw = Number(localStorage.getItem(PLAYER_RATE_KEY))
  const allowedRates = [0.75, 1, 1.25, 1.5]
  return allowedRates.includes(raw) ? raw : 1
}

export const getInitialTrackId = () => localStorage.getItem(PLAYER_TRACK_ID_KEY) || ''

export function useAudioPlayer({
  songs,
  filteredSongs,
  highlightedSong,
  currentTrackId,
  setCurrentTrackId,
  queuedTrackIds = [],
  onConsumeQueuedTrack = () => {},
  onError,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [repeatMode, setRepeatMode] = useState(getInitialRepeatMode)
  const [isShuffle, setIsShuffle] = useState(localStorage.getItem(PLAYER_SHUFFLE_KEY) === '1')
  const [playbackTime, setPlaybackTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(0)
  const [volume, setVolume] = useState(getInitialVolume)
  const [playbackRate, setPlaybackRate] = useState(getInitialPlaybackRate)
  const [isProgressHovering, setIsProgressHovering] = useState(false)
  const [hoverPreviewTime, setHoverPreviewTime] = useState(0)
  const [hoverPreviewPercent, setHoverPreviewPercent] = useState(0)
  const audioRef = useRef(null)
  const progressWrapperRef = useRef(null)

  const playbackQueue = useMemo(() => {
    return filteredSongs.length > 0 ? filteredSongs : songs
  }, [filteredSongs, songs])

  const safeTrackDuration = Math.max(trackDuration, 0)
  const progressPercent = safeTrackDuration > 0
    ? Math.min((playbackTime / safeTrackDuration) * 100, 100)
    : 0

  const selectTrack = (songId) => {
    setCurrentTrackId(songId)
    setIsPlaying(true)
  }

  const togglePlayPause = () => {
    if (!highlightedSong) {
      const firstSongId = filteredSongs[0]?._id || songs[0]?._id
      if (firstSongId) {
        selectTrack(firstSongId)
      }
      return
    }

    if (!highlightedSong.audioUrl) {
      onError?.('Bài hát này chưa có link audio để phát')
      return
    }

    setIsPlaying((prev) => !prev)
  }

  const moveTrack = ({ direction, fromEnded = false }) => {
    if (direction > 0 && queuedTrackIds.length > 0) {
      const nextQueuedTrackId = queuedTrackIds[0]
      if (nextQueuedTrackId) {
        onConsumeQueuedTrack(nextQueuedTrackId)
        selectTrack(nextQueuedTrackId)
        return
      }
    }

    if (playbackQueue.length === 0) {
      return
    }

    if (isShuffle && playbackQueue.length > 1) {
      const candidates = playbackQueue.filter((song) => song._id !== currentTrackId)
      const randomTrack = candidates[Math.floor(Math.random() * candidates.length)]
      if (randomTrack?._id) {
        selectTrack(randomTrack._id)
      }
      return
    }

    const currentIndex = playbackQueue.findIndex((song) => song._id === currentTrackId)

    if (currentIndex < 0) {
      selectTrack(playbackQueue[0]._id)
      return
    }

    if (direction > 0) {
      const isLastTrack = currentIndex >= playbackQueue.length - 1

      if (isLastTrack) {
        if (fromEnded && repeatMode === 'off') {
          setIsPlaying(false)
          return
        }

        selectTrack(playbackQueue[0]._id)
        return
      }

      selectTrack(playbackQueue[currentIndex + 1]._id)
      return
    }

    const isFirstTrack = currentIndex <= 0

    if (isFirstTrack) {
      selectTrack(playbackQueue[playbackQueue.length - 1]._id)
      return
    }

    selectTrack(playbackQueue[currentIndex - 1]._id)
  }

  const nextTrack = ({ fromEnded = false } = {}) => {
    moveTrack({ direction: 1, fromEnded })
  }

  const prevTrack = () => {
    const player = audioRef.current

    if (player && player.currentTime > 3) {
      player.currentTime = 0
      setPlaybackTime(0)
      return
    }

    moveTrack({ direction: -1 })
  }

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
  }

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev)
  }

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5]

    setPlaybackRate((prev) => {
      const currentIndex = rates.findIndex((rate) => rate === prev)
      const nextIndex = currentIndex < 0 ? 1 : (currentIndex + 1) % rates.length
      return rates[nextIndex]
    })
  }

  const seek = (event) => {
    const value = Number(event.target.value)
    const player = audioRef.current

    setPlaybackTime(value)

    if (player) {
      player.currentTime = value
    }
  }

  const seekBySeconds = (seconds) => {
    const player = audioRef.current

    if (!player || safeTrackDuration <= 0) {
      return
    }

    const nextTime = Math.min(Math.max(player.currentTime + seconds, 0), safeTrackDuration)
    player.currentTime = nextTime
    setPlaybackTime(nextTime)
  }

  const updateProgressHover = (clientX) => {
    const wrapper = progressWrapperRef.current

    if (!wrapper || safeTrackDuration <= 0) {
      return
    }

    const rect = wrapper.getBoundingClientRect()
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const percent = rect.width > 0 ? relativeX / rect.width : 0
    const previewTime = percent * safeTrackDuration

    setHoverPreviewPercent(percent * 100)
    setHoverPreviewTime(previewTime)
  }

  const progressMouseMove = (event) => {
    setIsProgressHovering(true)
    updateProgressHover(event.clientX)
  }

  const progressMouseLeave = () => {
    setIsProgressHovering(false)
  }

  const onLoadedMetadata = (event) => {
    const nextDuration = Number(event.currentTarget.duration)
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setTrackDuration(nextDuration)
    }
  }

  const onTimeUpdate = (event) => {
    setPlaybackTime(event.currentTarget.currentTime || 0)
  }

  const onEnded = (event) => {
    if (repeatMode === 'one') {
      event.currentTarget.currentTime = 0
      event.currentTarget.play().catch(() => {
        setIsPlaying(false)
      })
      return
    }

    nextTrack({ fromEnded: true })
  }

  useEffect(() => {
    const player = audioRef.current
    if (!player) return

    player.volume = volume
  }, [volume])

  useEffect(() => {
    const player = audioRef.current
    if (!player) return

    player.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    localStorage.setItem(PLAYER_VOLUME_KEY, String(volume))
  }, [volume])

  useEffect(() => {
    localStorage.setItem(PLAYER_REPEAT_MODE_KEY, repeatMode)
  }, [repeatMode])

  useEffect(() => {
    localStorage.setItem(PLAYER_SHUFFLE_KEY, isShuffle ? '1' : '0')
  }, [isShuffle])

  useEffect(() => {
    localStorage.setItem(PLAYER_RATE_KEY, String(playbackRate))
  }, [playbackRate])

  useEffect(() => {
    if (currentTrackId) {
      localStorage.setItem(PLAYER_TRACK_ID_KEY, currentTrackId)
    }
  }, [currentTrackId])

  useEffect(() => {
    const player = audioRef.current

    if (!player || !highlightedSong?.audioUrl) {
      setIsPlaying(false)
      return
    }

    if (isPlaying) {
      player.play().catch(() => {
        setIsPlaying(false)
      })
    } else {
      player.pause()
    }
  }, [highlightedSong?.audioUrl, isPlaying])

  useEffect(() => {
    setPlaybackTime(0)
    setTrackDuration(Number(highlightedSong?.duration) || 0)
  }, [highlightedSong?._id, highlightedSong?.duration])

  return {
    isPlaying,
    repeatMode,
    isShuffle,
    playbackQueue,
    playbackTime,
    trackDuration,
    volume,
    setVolume,
    playbackRate,
    isProgressHovering,
    hoverPreviewTime,
    hoverPreviewPercent,
    safeTrackDuration,
    progressPercent,
    audioRef,
    progressWrapperRef,
    selectTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    cycleRepeatMode,
    toggleShuffle,
    cyclePlaybackRate,
    seek,
    seekBySeconds,
    progressMouseMove,
    progressMouseLeave,
    onLoadedMetadata,
    onTimeUpdate,
    onEnded,
  }
}

