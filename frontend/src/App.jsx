import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { authApi } from './api/client'
import { getInitialTrackId, useAudioPlayer } from './hooks/useAudioPlayer'
import { useAuthSession } from './hooks/useAuthSession'
import { useSongsLibrary } from './hooks/useSongsLibrary'
import { usePlaylists } from './hooks/usePlaylists'
import AppShell from './layouts/AppShell'
import LeftSidebar from './components/LeftSidebar'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import RightSidebar from './components/RightSidebar'
import FooterPlayer from './components/FooterPlayer'
import AdminPage from './pages/AdminPage'
import AccountPage from './pages/AccountPage'
import ArtistPage from './pages/ArtistPage'
import LoginPage from './pages/LoginPage'
import MessagesPage from './pages/MessagesPage'
import PlaylistPage from './pages/PlaylistPage'
import UserPage from './pages/UserPage'

const LEFT_SIDEBAR_COLLAPSED_KEY = 'left_sidebar_collapsed'
const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT = 1500
const TABLET_AUTO_COLLAPSE_BREAKPOINT = 1536
const MOBILE_LAYOUT_BREAKPOINT = 1280
const GUEST_LIKED_SONGS_KEY = 'guest_liked_song_ids'
const GUEST_RECENT_TRACKS_KEY = 'guest_recent_track_ids'
const GUEST_QUEUE_TRACKS_KEY = 'guest_queue_track_ids'
const PREFERENCE_ACTION_QUEUE_KEY_PREFIX = 'preference_action_queue_'
const LEFT_SIDEBAR_WIDTH_KEY = 'left_sidebar_width'
const RIGHT_SIDEBAR_WIDTH_KEY = 'right_sidebar_width'
const SOCKET_SERVER_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '')

const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {children}
  </svg>
)

function App() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(() => {
    return localStorage.getItem(LEFT_SIDEBAR_COLLAPSED_KEY) === '1'
  })
  const [currentTrackId, setCurrentTrackId] = useState(getInitialTrackId)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeArtist, setActiveArtist] = useState('')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(LEFT_SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(saved) && saved >= 260 && saved <= 460) {
      return saved
    }

    return 320
  })
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(RIGHT_SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(saved) && saved >= 280 && saved <= 520) {
      return saved
    }

    return 360
  })
  const [likedSongIds, setLikedSongIds] = useState([])
  const [recentTrackIds, setRecentTrackIds] = useState([])
  const [queuedTrackIds, setQueuedTrackIds] = useState([])
  const [playerToast, setPlayerToast] = useState('')
  const [syncPendingCount, setSyncPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true
    }

    return navigator.onLine
  })
  const audioFileInputRef = useRef(null)
  const coverFileInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const userMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const loginRedirectPathRef = useRef('/')
  const lastNonZeroVolumeRef = useRef(0.7)
  const hasLoadedPreferencesRef = useRef(false)
  const isHydratingPreferencesRef = useRef(false)
  const pendingPreferenceActionsRef = useRef([])
  const isFlushingPreferenceActionsRef = useRef(false)
  const appSocketRef = useRef(null)
  const [isAppSocketConnected, setIsAppSocketConnected] = useState(false)

  const clampLeftSidebarWidth = (value) => Math.min(460, Math.max(260, Math.round(value)))
  const clampRightSidebarWidth = (value) => Math.min(520, Math.max(280, Math.round(value)))

  useEffect(() => {
    const autoCollapseOnNarrowScreen = () => {
      if (window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT) {
        setIsLeftSidebarCollapsed(true)
      }

      if (window.innerWidth < TABLET_AUTO_COLLAPSE_BREAKPOINT) {
        setIsLeftSidebarCollapsed(true)
        return
      }

      const savedCollapsed = localStorage.getItem(LEFT_SIDEBAR_COLLAPSED_KEY)
      if (savedCollapsed != null) {
        setIsLeftSidebarCollapsed(savedCollapsed === '1')
      }
    }

    autoCollapseOnNarrowScreen()
    window.addEventListener('resize', autoCollapseOnNarrowScreen)

    return () => {
      window.removeEventListener('resize', autoCollapseOnNarrowScreen)
    }
  }, [])

  useEffect(() => {
    const closeDrawerOnDesktop = () => {
      if (window.innerWidth >= MOBILE_LAYOUT_BREAKPOINT) {
        setIsMobileSidebarOpen(false)
      }
    }

    closeDrawerOnDesktop()
    window.addEventListener('resize', closeDrawerOnDesktop)

    return () => {
      window.removeEventListener('resize', closeDrawerOnDesktop)
    }
  }, [])

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      document.body.style.removeProperty('overflow')
      return
    }

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.removeProperty('overflow')
    }
  }, [isMobileSidebarOpen])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isMobileSidebarOpen])

  const {
    authMode,
    setAuthMode,
    authLoading,
    sessionLoading,
    authError,
    setAuthError,
    accessToken,
    currentUser,
    authForm,
    handleAuthInput,
    handleAuthSubmit,
    handleGoogleLogin,
    handleUpdateProfile,
    handleLogout,
  } = useAuthSession({
    onSessionCleared: () => {
      setSearchQuery('')
      setActiveArtist('')
    },
  })

  const preferenceActionQueueStorageKey = useMemo(() => {
    if (!currentUser?.id) {
      return ''
    }

    return `${PREFERENCE_ACTION_QUEUE_KEY_PREFIX}${currentUser.id}`
  }, [currentUser?.id])

  const persistPreferenceActionQueue = (queue) => {
    if (!preferenceActionQueueStorageKey) {
      return
    }

    localStorage.setItem(preferenceActionQueueStorageKey, JSON.stringify(queue))
    setSyncPendingCount(queue.length)

    if (queue.length > 0 && !isOnline) {
      setSyncStatus('offline')
    }
  }

  const flushPreferenceActions = async () => {
    if (isFlushingPreferenceActionsRef.current) {
      return
    }

    if (!currentUser || !accessToken || !hasLoadedPreferencesRef.current || isHydratingPreferencesRef.current) {
      return
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline')
      return
    }

    if (pendingPreferenceActionsRef.current.length === 0) {
      setSyncStatus('idle')
      return
    }

    isFlushingPreferenceActionsRef.current = true
    setSyncStatus('syncing')

    try {
      while (pendingPreferenceActionsRef.current.length > 0) {
        const nextAction = pendingPreferenceActionsRef.current[0]

        await authApi.applyPreferenceAction(accessToken, nextAction)

        pendingPreferenceActionsRef.current = pendingPreferenceActionsRef.current.slice(1)
        persistPreferenceActionQueue(pendingPreferenceActionsRef.current)
      }

      setSyncStatus('idle')
    } catch {
      setSyncStatus(isOnline ? 'error' : 'offline')
    } finally {
      isFlushingPreferenceActionsRef.current = false
    }
  }

  const syncPreferenceAction = (payload) => {
    if (!currentUser || !accessToken || !hasLoadedPreferencesRef.current || isHydratingPreferencesRef.current) {
      return
    }

    pendingPreferenceActionsRef.current = [...pendingPreferenceActionsRef.current, payload]
    persistPreferenceActionQueue(pendingPreferenceActionsRef.current)
    setSyncStatus('syncing')
    flushPreferenceActions()
  }

  const likedSongsStorageKey = useMemo(() => {
    return currentUser?.id ? `liked_song_ids_${currentUser.id}` : GUEST_LIKED_SONGS_KEY
  }, [currentUser?.id])

  const recentTracksStorageKey = useMemo(() => {
    return currentUser?.id ? `recent_track_ids_${currentUser.id}` : GUEST_RECENT_TRACKS_KEY
  }, [currentUser?.id])

  const queuedTracksStorageKey = useMemo(() => {
    return currentUser?.id ? `queue_track_ids_${currentUser.id}` : GUEST_QUEUE_TRACKS_KEY
  }, [currentUser?.id])

  const {
    playlists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistName,
    setPlaylistName,
    playlistLoading,
    playlistError,
    playlistActionLoadingId,
    playlistCoverUploadLoading,
    selectedPlaylistBySong,
    setSelectedPlaylistBySong,
    loadPlaylists,
    handleCreatePlaylist,
    handleAddSongToPlaylist,
    handleRemoveSongFromPlaylist,
    handleMoveSongInPlaylist,
    handleReorderSongsInPlaylist,
    handleDeletePlaylist,
    handleRenamePlaylist,
    handleUpdatePlaylistCover,
    handleUploadPlaylistCover,
  } = usePlaylists({
    currentUser,
    accessToken,
  })

  const selectedPlaylist = useMemo(() => {
    if (!selectedPlaylistId) {
      return null
    }

    return playlists.find((playlist) => playlist._id === selectedPlaylistId) || null
  }, [playlists, selectedPlaylistId])

  const {
    songs,
    loading,
    error,
    songMutationLoading,
    audioUploadLoading,
    coverUploadLoading,
    songMutationError,
    setSongMutationError,
    editingSongId,
    adminSongForm,
    handleAdminSongInput,
    resetAdminSongForm,
    handleUploadAudio,
    handleUploadCover,
    handleCreateOrUpdateSong,
    startEditSong,
    handleDeleteSong,
  } = useSongsLibrary({
    accessToken,
    initialTrackId: currentTrackId,
    onSongsChanged: loadPlaylists,
  })

  const isAdmin = currentUser?.role === 'admin'
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isArtistRoute = location.pathname.startsWith('/artist/')
  const isPlaylistRoute = location.pathname.startsWith('/playlist/')
  const isAccountRoute = location.pathname === '/account'
  const isMessagesRoute = location.pathname === '/messages'
  const isLoginRoute = location.pathname === '/login'

  useEffect(() => {
    if (!isLoginRoute) {
      return
    }

    const nextPath = typeof location.state?.from === 'string' ? location.state.from : '/'
    if (nextPath && nextPath !== '/login') {
      loginRedirectPathRef.current = nextPath
    }
  }, [isLoginRoute, location.state])

  useEffect(() => {
    if (!isLoginRoute || sessionLoading || !currentUser) {
      return
    }

    navigate(loginRedirectPathRef.current || '/', { replace: true })
  }, [isLoginRoute, sessionLoading, currentUser, navigate])

  useEffect(() => {
    if (sessionLoading || isLoginRoute || currentUser || (!isPlaylistRoute && !isAccountRoute && !isMessagesRoute)) {
      return
    }

    const from = `${location.pathname}${location.search}`
    const nextFrom = from === '/login' ? '/' : from

    loginRedirectPathRef.current = nextFrom
    setAuthMode('login')
    setAuthError('')
    navigate('/login', { state: { from: nextFrom } })
  }, [sessionLoading, isLoginRoute, currentUser, isPlaylistRoute, isAccountRoute, isMessagesRoute, location.pathname, location.search, navigate, setAuthMode, setAuthError])

  useEffect(() => {
    if (!isUserMenuOpen) {
      return
    }

    const handlePointerDown = (event) => {
      if (!userMenuRef.current || userMenuRef.current.contains(event.target)) {
        return
      }

      setIsUserMenuOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isUserMenuOpen])

  useEffect(() => {
    setIsUserMenuOpen(false)
  }, [location.pathname])

  const routeArtistName = useMemo(() => {
    if (!isArtistRoute) {
      return ''
    }

    const encodedName = location.pathname.replace('/artist/', '')
    if (!encodedName) {
      return ''
    }

    try {
      return decodeURIComponent(encodedName)
    } catch {
      return encodedName
    }
  }, [isArtistRoute, location.pathname])

  const routePlaylistId = useMemo(() => {
    if (!isPlaylistRoute) {
      return ''
    }

    return location.pathname.replace('/playlist/', '') || ''
  }, [isPlaylistRoute, location.pathname])

  const routePlaylist = useMemo(() => {
    if (!routePlaylistId) {
      return null
    }

    return playlists.find((playlist) => playlist._id === routePlaylistId) || null
  }, [playlists, routePlaylistId])

  useEffect(() => {
    if (!routePlaylistId) {
      return
    }

    setSelectedPlaylistId(routePlaylistId)
  }, [routePlaylistId, setSelectedPlaylistId])

  const highlightedSong = useMemo(() => {
    const selected = songs.find((song) => song._id === currentTrackId)
    return selected || songs[0] || null
  }, [songs, currentTrackId])

  const artists = useMemo(() => {
    const map = new Map()

    songs.forEach((song) => {
      if (!song.artist) return
      if (!map.has(song.artist)) {
        map.set(song.artist, song)
      }
    })

    return Array.from(map.values()).slice(0, 8)
  }, [songs])

  const filteredSongs = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    if (!keyword) {
      return songs
    }

    return songs.filter((song) => {
      const title = String(song.title || '').toLowerCase()
      const artist = String(song.artist || '').toLowerCase()
      const genre = String(song.genre || '').toLowerCase()
      return title.includes(keyword) || artist.includes(keyword) || genre.includes(keyword)
    })
  }, [songs, searchQuery])

  const recommendedSongs = useMemo(() => filteredSongs.slice(0, 10), [filteredSongs])

  const artistRadioSongs = useMemo(() => {
    const targetArtist = String(routeArtistName || activeArtist || '').trim().toLowerCase()

    if (!targetArtist) {
      return []
    }

    return songs
      .filter((song) => String(song.artist || '').trim().toLowerCase() === targetArtist)
      .slice(0, 20)
  }, [songs, routeArtistName, activeArtist])

  useEffect(() => {
    if (routeArtistName) {
      setActiveArtist(routeArtistName)
      return
    }

    if (isArtistRoute) {
      setActiveArtist('')
    }
  }, [routeArtistName, isArtistRoute])

  const popularSongs = useMemo(() => {
    const section = filteredSongs.slice(5, 15)
    return section.length > 0 ? section : filteredSongs.slice(0, 10)
  }, [filteredSongs])

  const {
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
    selectTrack: playTrackById,
    togglePlayPause: handleTogglePlayPause,
    nextTrack: handleNextTrack,
    prevTrack: handlePrevTrack,
    cycleRepeatMode: handleCycleRepeatMode,
    toggleShuffle: handleToggleShuffle,
    cyclePlaybackRate: handleCyclePlaybackRate,
    seek: handleSeek,
    seekBySeconds: handleSeekBySeconds,
    progressMouseMove: handleProgressMouseMove,
    progressMouseLeave: handleProgressMouseLeave,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleAudioEnded,
  } = useAudioPlayer({
    songs,
    filteredSongs,
    highlightedSong,
    currentTrackId,
    setCurrentTrackId,
    queuedTrackIds,
    onConsumeQueuedTrack: (trackId) => {
      setQueuedTrackIds((prev) => {
        const index = prev.indexOf(trackId)
        if (index < 0) {
          return prev
        }

        syncPreferenceAction({ action: 'queue_consume_first' })
        return [...prev.slice(0, index), ...prev.slice(index + 1)]
      })
    },
    onError: setSongMutationError,
  })

  useEffect(() => {
    if (currentUser && accessToken) {
      return
    }

    try {
      const raw = localStorage.getItem(likedSongsStorageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setLikedSongIds(Array.isArray(parsed) ? parsed : [])
    } catch {
      setLikedSongIds([])
    }
  }, [likedSongsStorageKey, currentUser, accessToken])

  useEffect(() => {
    if (currentUser && accessToken) {
      return
    }

    try {
      const raw = localStorage.getItem(recentTracksStorageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setRecentTrackIds(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRecentTrackIds([])
    }
  }, [recentTracksStorageKey, currentUser, accessToken])

  useEffect(() => {
    if (currentUser && accessToken) {
      return
    }

    try {
      const raw = localStorage.getItem(queuedTracksStorageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setQueuedTrackIds(Array.isArray(parsed) ? parsed : [])
    } catch {
      setQueuedTrackIds([])
    }
  }, [queuedTracksStorageKey, currentUser, accessToken])

  useEffect(() => {
    if (currentUser && accessToken) {
      return
    }

    localStorage.setItem(likedSongsStorageKey, JSON.stringify(likedSongIds))
  }, [likedSongIds, likedSongsStorageKey, currentUser, accessToken])

  useEffect(() => {
    if (currentUser && accessToken) {
      return
    }

    localStorage.setItem(recentTracksStorageKey, JSON.stringify(recentTrackIds))
  }, [recentTrackIds, recentTracksStorageKey, currentUser, accessToken])

  useEffect(() => {
    if (currentUser && accessToken) {
      return
    }

    localStorage.setItem(queuedTracksStorageKey, JSON.stringify(queuedTrackIds))
  }, [queuedTrackIds, queuedTracksStorageKey, currentUser, accessToken])

  useEffect(() => {
    hasLoadedPreferencesRef.current = false
    pendingPreferenceActionsRef.current = []
    isFlushingPreferenceActionsRef.current = false
    setSyncPendingCount(0)
    setSyncStatus('idle')

    if (!currentUser || !accessToken) {
      return
    }

    if (preferenceActionQueueStorageKey) {
      try {
        const rawQueue = localStorage.getItem(preferenceActionQueueStorageKey)
        const parsedQueue = rawQueue ? JSON.parse(rawQueue) : []
        pendingPreferenceActionsRef.current = Array.isArray(parsedQueue) ? parsedQueue : []
        setSyncPendingCount(pendingPreferenceActionsRef.current.length)
      } catch {
        pendingPreferenceActionsRef.current = []
        setSyncPendingCount(0)
      }
    }

    isHydratingPreferencesRef.current = true

    const loadPreferences = async () => {
      try {
        const data = await authApi.getPreferences(accessToken)
        const preferences = data?.preferences || {}

        setLikedSongIds(Array.isArray(preferences.likedSongIds) ? preferences.likedSongIds : [])
        setRecentTrackIds(Array.isArray(preferences.recentTrackIds) ? preferences.recentTrackIds : [])
        setQueuedTrackIds(Array.isArray(preferences.queuedTrackIds) ? preferences.queuedTrackIds : [])
      } catch {
        // Ignore preference fetch errors and keep current in-memory state.
      } finally {
        hasLoadedPreferencesRef.current = true
        isHydratingPreferencesRef.current = false
        flushPreferenceActions()
      }
    }

    loadPreferences()
  }, [currentUser?.id, accessToken, preferenceActionQueueStorageKey])

  useEffect(() => {
    if (!currentUser || !accessToken) {
      return
    }

    const handleOnline = () => {
      setIsOnline(true)
      flushPreferenceActions()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        flushPreferenceActions()
      }
    }

    const intervalId = window.setInterval(() => {
      flushPreferenceActions()
    }, 5000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentUser?.id, accessToken])

  useEffect(() => {
    if (!currentUser || !accessToken) {
      if (appSocketRef.current) {
        appSocketRef.current.disconnect()
        appSocketRef.current = null
      }

      setIsAppSocketConnected(false)
      return
    }

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: {
        token: accessToken,
      },
    })

    appSocketRef.current = socket

    const handleConnect = () => {
      setIsAppSocketConnected(true)
    }

    const handleDisconnect = () => {
      setIsAppSocketConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.disconnect()
      appSocketRef.current = null
      setIsAppSocketConnected(false)
    }
  }, [currentUser?.id, accessToken])

  useEffect(() => {
    const socket = appSocketRef.current
    if (!socket || !isAppSocketConnected) {
      return
    }

    if (!highlightedSong?._id || !isPlaying) {
      socket.emit('presence:activity', { isPlaying: false })
      return
    }

    socket.emit('presence:activity', {
      songId: highlightedSong._id,
      title: highlightedSong.title,
      artist: highlightedSong.artist,
      coverUrl: highlightedSong.coverUrl || '',
      isPlaying: true,
    })
  }, [isAppSocketConnected, highlightedSong?._id, highlightedSong?.title, highlightedSong?.artist, highlightedSong?.coverUrl, isPlaying])

  const handleLeftSidebarResizeStart = (event) => {
    if (window.innerWidth < MOBILE_LAYOUT_BREAKPOINT) {
      return
    }

    event.preventDefault()
    const startX = event.clientX
    const startWidth = isLeftSidebarCollapsed ? 320 : leftSidebarWidth

    const handlePointerMove = (moveEvent) => {
      const next = clampLeftSidebarWidth(startWidth + (moveEvent.clientX - startX))
      setLeftSidebarWidth(next)
      localStorage.setItem(LEFT_SIDEBAR_WIDTH_KEY, String(next))

      if (isLeftSidebarCollapsed) {
        setIsLeftSidebarCollapsed(false)
        localStorage.setItem(LEFT_SIDEBAR_COLLAPSED_KEY, '0')
      }
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleRightSidebarResizeStart = (event) => {
    if (window.innerWidth < TABLET_AUTO_COLLAPSE_BREAKPOINT) {
      return
    }

    event.preventDefault()
    const startX = event.clientX
    const startWidth = rightSidebarWidth

    const handlePointerMove = (moveEvent) => {
      const next = clampRightSidebarWidth(startWidth - (moveEvent.clientX - startX))
      setRightSidebarWidth(next)
      localStorage.setItem(RIGHT_SIDEBAR_WIDTH_KEY, String(next))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    if (!currentTrackId) {
      return
    }

    setRecentTrackIds((prev) => {
      const next = [currentTrackId, ...prev.filter((id) => id !== currentTrackId)]
      return next.slice(0, 25)
    })

    syncPreferenceAction({ action: 'recent_push', songId: currentTrackId })
  }, [currentTrackId])

  const toggleLikeSong = (songId) => {
    if (!songId) {
      return
    }

    requireAuthenticatedAction(() => {
      setLikedSongIds((prev) => {
        if (prev.includes(songId)) {
          syncPreferenceAction({ action: 'like_remove', songId })
          return prev.filter((id) => id !== songId)
        }

        syncPreferenceAction({ action: 'like_add', songId })
        return [songId, ...prev]
      })
    })
  }

  const isSongLiked = (songId) => likedSongIds.includes(songId)

  const addSongToQueueLast = (songId) => {
    if (!songId) {
      return
    }

    requireAuthenticatedAction(() => {
      setQueuedTrackIds((prev) => [...prev, songId])
      syncPreferenceAction({ action: 'queue_add_last', songId })
    })
  }

  const addSongToQueueNext = (songId) => {
    if (!songId) {
      return
    }

    requireAuthenticatedAction(() => {
      setQueuedTrackIds((prev) => [songId, ...prev])
      syncPreferenceAction({ action: 'queue_add_next', songId })
    })
  }

  const removeSongFromQueueAt = (indexToRemove) => {
    if (indexToRemove < 0) {
      return
    }

    requireAuthenticatedAction(() => {
      setQueuedTrackIds((prev) => prev.filter((_, index) => index !== indexToRemove))
      syncPreferenceAction({ action: 'queue_remove_at', index: indexToRemove })
    })
  }

  const moveSongInQueue = (index, direction) => {
    const targetIndex = index + direction

    requireAuthenticatedAction(() => {
      setQueuedTrackIds((prev) => {
        if (index < 0 || targetIndex < 0 || index >= prev.length || targetIndex >= prev.length) {
          return prev
        }

        const next = [...prev]
        const temp = next[index]
        next[index] = next[targetIndex]
        next[targetIndex] = temp

        syncPreferenceAction({ action: 'queue_move', index, direction })
        return next
      })
    })
  }

  const clearQueue = () => {
    requireAuthenticatedAction(() => {
      setQueuedTrackIds([])
      syncPreferenceAction({ action: 'queue_clear' })
    })
  }

  const likedSongs = useMemo(() => {
    if (!likedSongIds.length || !songs.length) {
      return []
    }

    const songMap = new Map(songs.map((song) => [song._id, song]))
    return likedSongIds.map((id) => songMap.get(id)).filter(Boolean)
  }, [likedSongIds, songs])

  const recentlyPlayedSongs = useMemo(() => {
    if (!recentTrackIds.length || !songs.length) {
      return []
    }

    const songMap = new Map(songs.map((song) => [song._id, song]))
    return recentTrackIds.map((id) => songMap.get(id)).filter(Boolean)
  }, [recentTrackIds, songs])

  const nextUpSongs = useMemo(() => {
    if (queuedTrackIds.length > 0 && songs.length > 0) {
      const songMap = new Map(songs.map((song) => [song._id, song]))
      return queuedTrackIds
        .map((id, queueIndex) => {
          const song = songMap.get(id)

          if (!song) {
            return null
          }

          return {
            song,
            queueIndex,
            isManualQueue: true,
          }
        })
        .filter(Boolean)
        .slice(0, 10)
    }

    if (!playbackQueue.length) {
      return []
    }

    const currentIndex = playbackQueue.findIndex((song) => song._id === currentTrackId)
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const queue = []

    for (let offset = 1; offset < playbackQueue.length && queue.length < 6; offset += 1) {
      const nextIndex = (startIndex + offset) % playbackQueue.length
      queue.push({
        song: playbackQueue[nextIndex],
        queueIndex: -1,
        isManualQueue: false,
      })
    }

    return queue
  }, [queuedTrackIds, songs, playbackQueue, currentTrackId])

  const handleGoHome = () => {
    navigate('/')
    setSearchQuery('')
    setActiveArtist('')
    setIsMobileSidebarOpen(false)
  }

  const handleOpenLogin = (targetMode = 'login') => {
    const from = `${location.pathname}${location.search}`
    const nextFrom = from === '/login' ? '/' : from

    loginRedirectPathRef.current = nextFrom
    setAuthMode(targetMode)
    setAuthError('')
    setIsMobileSidebarOpen(false)
    navigate('/login', { state: { from: nextFrom } })
  }

  const requireAuthenticatedAction = async (
    action,
    { mode = 'login', unauthorizedReturn = undefined, onUnauthorized } = {},
  ) => {
    if (currentUser) {
      return action()
    }

    onUnauthorized?.()
    showPlayerToast('Vui lòng đăng nhập để sử dụng tính năng này')
    handleOpenLogin(mode)
    return unauthorizedReturn
  }

  const handleCreatePlaylistWithAuth = (event) => {
    return requireAuthenticatedAction(
      () => handleCreatePlaylist(event),
      {
        onUnauthorized: () => {
          event?.preventDefault?.()
        },
      },
    )
  }

  const handleAddSongToPlaylistWithAuth = (songId, playlistIdOverride = '') => {
    return requireAuthenticatedAction(
      () => handleAddSongToPlaylist(songId, playlistIdOverride),
    )
  }

  const handleRemoveSongFromPlaylistWithAuth = (playlistId, songId) => {
    return requireAuthenticatedAction(
      () => handleRemoveSongFromPlaylist(playlistId, songId),
    )
  }

  const handleMoveSongInPlaylistWithAuth = (playlistId, index, direction) => {
    return requireAuthenticatedAction(
      () => handleMoveSongInPlaylist(playlistId, index, direction),
    )
  }

  const handleReorderSongsInPlaylistWithAuth = (playlistId, fromIndex, toIndex) => {
    return requireAuthenticatedAction(
      () => handleReorderSongsInPlaylist(playlistId, fromIndex, toIndex),
      { unauthorizedReturn: false },
    )
  }

  const handleDeletePlaylistWithAuth = (playlistId) => {
    return requireAuthenticatedAction(
      () => handleDeletePlaylist(playlistId),
    )
  }

  const handleRenamePlaylistWithAuth = (playlistId, nextNameRaw) => {
    return requireAuthenticatedAction(
      () => handleRenamePlaylist(playlistId, nextNameRaw),
    )
  }

  const handleUpdatePlaylistCoverWithAuth = (playlistId, coverUrlRaw) => {
    return requireAuthenticatedAction(
      () => handleUpdatePlaylistCover(playlistId, coverUrlRaw),
    )
  }

  const handleUploadPlaylistCoverWithAuth = (playlistId, file) => {
    return requireAuthenticatedAction(
      () => handleUploadPlaylistCover(playlistId, file),
      { unauthorizedReturn: false },
    )
  }

  const handleOpenAccount = () => {
    setIsUserMenuOpen(false)
    navigate('/account')
  }

  const handleLogoutFromMenu = async () => {
    setIsUserMenuOpen(false)
    await handleLogout()
    navigate('/')
  }

  const handleToggleSongPlayback = (songId) => {
    if (!songId) {
      return
    }

    if (songId === currentTrackId) {
      handleTogglePlayPause()
      return
    }

    playTrackById(songId)
  }

  const handleOpenMessages = () => {
    setIsMobileSidebarOpen(false)
    setActiveArtist('')
    navigate('/messages')
  }

  const handleOpenArtistRadio = (artistName) => {
    const value = String(artistName || '').trim()
    if (!value) {
      return
    }

    navigate(`/artist/${encodeURIComponent(value)}`)
    setActiveArtist(value)
    setSearchQuery('')
    showPlayerToast(`Mở radio: ${value}`)
  }

  const handleOpenPlaylistPage = (playlistId) => {
    const value = String(playlistId || '').trim()
    if (!value) {
      return
    }

    setSelectedPlaylistId(value)
    setActiveArtist('')
    setSearchQuery('')
    setIsMobileSidebarOpen(false)
    navigate(`/playlist/${value}`)
  }

  const handleClearArtistRadio = () => {
    navigate('/')
    setActiveArtist('')
  }

  const handleOpenAdmin = () => {
    if (isAdmin) {
      navigate('/admin')
    }
  }

  const handleEditSong = (song) => {
    startEditSong(song)

    if (!isAdminRoute && isAdmin) {
      navigate('/admin')
    }
  }

  const handleToggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(LEFT_SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    if (volume > 0) {
      lastNonZeroVolumeRef.current = volume
    }
  }, [volume])

  const handleToggleMute = () => {
    if (volume > 0) {
      setVolume(0)
      return
    }

    setVolume(lastNonZeroVolumeRef.current || 0.7)
  }

  const showPlayerToast = (message) => {
    setPlayerToast(message)
  }

  const handleVolumeWheel = (deltaY) => {
    setVolume((prev) => {
      const step = deltaY > 0 ? -0.05 : 0.05
      const next = Math.max(0, Math.min(1, Number((prev + step).toFixed(2))))
      return next
    })
  }

  const handleOpenQueuePanel = () => {
    const queueSection = document.getElementById('next-up-panel')
    if (queueSection) {
      queueSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!target) {
        return false
      }

      const tagName = String(target.tagName || '').toLowerCase()
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
    }

    const handleGlobalPlayerShortcuts = (event) => {
      if (isTypingTarget(event.target)) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        handleTogglePlayPause()
        showPlayerToast(isPlaying ? 'Tạm dừng' : 'Đang phát')
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
        event.preventDefault()
        handleNextTrack()
        showPlayerToast('Bài tiếp theo')
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
        event.preventDefault()
        handlePrevTrack()
        showPlayerToast('Bài trước')
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleSeekBySeconds(5)
        showPlayerToast('+5 giay')
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handleSeekBySeconds(-5)
        showPlayerToast('-5 giay')
        return
      }

      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault()
        handleToggleMute()
        showPlayerToast(volume > 0 ? 'Tắt tiếng' : 'Bật tiếng')
        return
      }

      if (event.key === 'l' || event.key === 'L') {
        if (highlightedSong?._id) {
          event.preventDefault()
          toggleLikeSong(highlightedSong._id)
          showPlayerToast(isSongLiked(highlightedSong._id) ? 'Bỏ yêu thích' : 'Đã yêu thích')
        }
        return
      }

      if (event.key === 's' || event.key === 'S') {
        event.preventDefault()
        handleToggleShuffle()
        showPlayerToast(isShuffle ? 'Shuffle off' : 'Shuffle on')
        return
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        handleCycleRepeatMode()
        showPlayerToast('Đổi chế độ lặp lại')
        return
      }

      if (event.key === 'q' || event.key === 'Q') {
        event.preventDefault()
        handleOpenQueuePanel()
        showPlayerToast('Mở hàng đợi')
      }
    }

    window.addEventListener('keydown', handleGlobalPlayerShortcuts)

    return () => {
      window.removeEventListener('keydown', handleGlobalPlayerShortcuts)
    }
  }, [
    handleTogglePlayPause,
    isPlaying,
    handleNextTrack,
    handlePrevTrack,
    handleSeekBySeconds,
    highlightedSong?._id,
    toggleLikeSong,
    isSongLiked,
    handleToggleShuffle,
    isShuffle,
    handleCycleRepeatMode,
    handleToggleMute,
    handleOpenQueuePanel,
    volume,
  ])

  useEffect(() => {
    if (!playerToast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPlayerToast('')
    }, 1200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [playerToast])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return
    }

    const artwork = highlightedSong?.coverUrl
      ? [{ src: highlightedSong.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
      : []

    navigator.mediaSession.metadata = new MediaMetadata({
      title: highlightedSong?.title || 'Sontraify',
      artist: highlightedSong?.artist || 'Unknown Artist',
      album: highlightedSong?.genre || 'Radio',
      artwork,
    })

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    navigator.mediaSession.setActionHandler('play', () => handleTogglePlayPause())
    navigator.mediaSession.setActionHandler('pause', () => handleTogglePlayPause())
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack())
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack())
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const seekOffset = details?.seekOffset || 10
      handleSeekBySeconds(-seekOffset)
    })
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const seekOffset = details?.seekOffset || 10
      handleSeekBySeconds(seekOffset)
    })

    return () => {
      if (!('mediaSession' in navigator)) {
        return
      }

      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
    }
  }, [
    highlightedSong?.title,
    highlightedSong?.artist,
    highlightedSong?.genre,
    highlightedSong?.coverUrl,
    isPlaying,
    handleTogglePlayPause,
    handlePrevTrack,
    handleNextTrack,
    handleSeekBySeconds,
  ])

  if (isLoginRoute) {
    return (
      <main className="min-h-screen bg-linear-to-b from-black via-[#121212] to-black px-4 py-6 sm:px-6 lg:px-8">
        <LoginPage
          authMode={authMode}
          setAuthMode={setAuthMode}
          setAuthError={setAuthError}
          authForm={authForm}
          handleAuthInput={handleAuthInput}
          handleAuthSubmit={handleAuthSubmit}
          handleGoogleLogin={handleGoogleLogin}
          authError={authError}
          authLoading={authLoading}
          onBackToPrevious={() => navigate(loginRedirectPathRef.current || '/', { replace: true })}
        />
      </main>
    )
  }

  return (
    <AppShell
      isLeftSidebarCollapsed={isLeftSidebarCollapsed}
      leftSidebarWidth={leftSidebarWidth}
      rightSidebarWidth={rightSidebarWidth}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
      mobileBottomNav={(
        <nav className="rounded-xl border border-white/10 bg-[#0f0f0f]/95 p-1 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={handleGoHome}
              className="type-button-sm flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-zinc-200 hover:bg-white/10"
            >
              <Icon className="h-4 w-4"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></Icon>
              Home
            </button>
            <button
              type="button"
              onClick={handleOpenMessages}
              className="type-button-sm flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-zinc-200 hover:bg-white/10"
            >
              <Icon className="h-4 w-4"><path d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.5l8 5 8-5V7H4zm16 10V9.85l-7.47 4.67a1 1 0 01-1.06 0L4 9.85V17h16z"/></Icon>
              Messages
            </button>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="type-button-sm flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-zinc-200 hover:bg-white/10"
            >
              <Icon className="h-4 w-4"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/></Icon>
              Library
            </button>
          </div>
        </nav>
      )}
      leftSidebar={(
        <LeftSidebar
          handleGoHome={handleGoHome}
          currentUser={currentUser}
          handleCreatePlaylist={handleCreatePlaylistWithAuth}
          playlistName={playlistName}
          setPlaylistName={setPlaylistName}
          playlistActionLoadingId={playlistActionLoadingId}
          playlistLoading={playlistLoading}
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          onSelectPlaylist={handleOpenPlaylistPage}
          likedSongsCount={likedSongs.length}
          handleDeletePlaylist={handleDeletePlaylistWithAuth}
          artists={artists}
          playTrackById={playTrackById}
          onOpenMessages={handleOpenMessages}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={handleToggleLeftSidebar}
          onResizeStart={handleLeftSidebarResizeStart}
        />
      )}

      mainContent={(
        <main className="rounded-lg bg-[#121212] p-2">
          <div className="rounded-lg bg-linear-to-b from-[#1a1f4d] via-[#121212] to-[#121212] p-4">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="rounded-full bg-black/40 p-2 xl:hidden"
                  title="Mở sidebar"
                >
                  <Icon className="h-4 w-4"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></Icon>
                </button>
                <button type="button" className="rounded-full bg-black/40 p-2"><Icon className="h-3 w-3"><path d="M15.4 4.6L9 11l6.4 6.4-1.4 1.4L6.2 11l7.8-7.8z"/></Icon></button>
                <button type="button" className="rounded-full bg-black/40 p-2"><Icon className="h-3 w-3"><path d="M8.6 19.4L15 13 8.6 6.6 10 5.2l7.8 7.8-7.8 7.8z"/></Icon></button>
                <button
                  type="button"
                  onClick={handleToggleLeftSidebar}
                  className={`hidden rounded-full p-2 xl:block ${isLeftSidebarCollapsed ? 'bg-zinc-700 text-white' : 'bg-black/40 text-zinc-300'}`}
                  title={isLeftSidebarCollapsed ? 'Mở rộng sidebar trái' : 'Thu gọn sidebar trái'}
                >
                  <Icon className="h-4 w-4"><path d="M4 4h6v16H4V4zm10 0h6v16h-6V4z"/></Icon>
                </button>
                <div className="flex min-w-0 items-center gap-2 rounded-full bg-[#2a2a2a] px-3 py-2 text-sm text-zinc-300">
                  <Icon className="h-4 w-4"><path d="M10 2a8 8 0 105.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></Icon>
                  <input
                    ref={searchInputRef}
                    placeholder="What do you want to play?"
                    className="w-48 bg-transparent text-sm outline-none sm:w-72"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value)
                      if (activeArtist || isPlaylistRoute || isMessagesRoute) {
                        navigate('/')
                        setActiveArtist('')
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" className="type-button-sm hidden rounded-full bg-white px-4 py-2 text-black sm:block">Explore Premium</button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => (isAdminRoute ? navigate('/') : handleOpenAdmin())}
                    className="type-button-sm rounded-full bg-green-500 px-3 py-2 text-black"
                  >
                    {isAdminRoute ? 'User mode' : 'Admin mode'}
                  </button>
                )}
                {!currentUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenLogin('register')}
                      className="type-button-sm hidden rounded-full px-3 py-2 text-zinc-300 hover:text-white sm:block"
                    >
                      Sign up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLogin('login')}
                      className="type-button-sm rounded-full bg-white px-5 py-2 text-black"
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="type-button-sm rounded-full bg-zinc-800 px-3 py-2">Install App</button>
                    <div className="relative" ref={userMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsUserMenuOpen((prev) => !prev)}
                        className="h-8 w-8 rounded-full bg-pink-500 text-sm font-bold text-black"
                        title={currentUser?.name || 'User'}
                      >
                        {currentUser?.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl}
                            alt={currentUser?.name || 'User avatar'}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          currentUser?.name?.[0] || 'S'
                        )}
                      </button>
                      {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-2xl shadow-black/60">
                          <p className="truncate px-2 pt-1 text-sm font-semibold text-white">{currentUser?.name}</p>
                          <p className="truncate px-2 pb-2 text-xs text-zinc-400">{currentUser?.email}</p>
                          <button
                            type="button"
                            onClick={handleOpenAccount}
                            className="type-button-sm w-full rounded-md px-2 py-2 text-left text-zinc-200 hover:bg-white/10"
                          >
                            Account
                          </button>
                          <button
                            type="button"
                            onClick={handleLogoutFromMenu}
                            disabled={authLoading}
                            className="type-button-sm mt-1 w-full rounded-md px-2 py-2 text-left text-zinc-200 hover:bg-white/10 disabled:opacity-70"
                          >
                            {authLoading ? 'Đang đăng xuất...' : 'Log out'}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" className="type-button-sm rounded-full bg-white px-3 py-1 text-black">All</button>
              <button type="button" className="type-button-sm rounded-full bg-zinc-800 px-3 py-1">Music</button>
              <button type="button" className="type-button-sm rounded-full bg-zinc-800 px-3 py-1">Podcasts</button>
            </div>

            {isAccountRoute ? (
              <AccountPage
                currentUser={currentUser}
                likedSongsCount={likedSongs.length}
                recentlyPlayedCount={recentlyPlayedSongs.length}
                queueCount={queuedTrackIds.length}
                accessToken={accessToken}
                onUpdateProfile={handleUpdateProfile}
                onLogout={handleLogoutFromMenu}
                authLoading={authLoading}
                onBackHome={handleGoHome}
              />
            ) : isMessagesRoute ? (
              <MessagesPage
                currentUser={currentUser}
                accessToken={accessToken}
                onOpenLogin={handleOpenLogin}
              />
            ) : isAdminRoute ? (
              <ProtectedAdminRoute isAdmin={isAdmin}>
                <AdminPage
                  adminSongForm={adminSongForm}
                  handleAdminSongInput={handleAdminSongInput}
                  handleCreateOrUpdateSong={handleCreateOrUpdateSong}
                  audioFileInputRef={audioFileInputRef}
                  audioUploadLoading={audioUploadLoading}
                  songMutationLoading={songMutationLoading}
                  handleUploadAudio={handleUploadAudio}
                  coverFileInputRef={coverFileInputRef}
                  coverUploadLoading={coverUploadLoading}
                  handleUploadCover={handleUploadCover}
                  editingSongId={editingSongId}
                  resetAdminSongForm={resetAdminSongForm}
                  songMutationError={songMutationError}
                  songs={songs}
                  handleEditSong={handleEditSong}
                  handleDeleteSong={handleDeleteSong}
                />
              </ProtectedAdminRoute>
            ) : isArtistRoute ? (
              <ArtistPage
                artistName={routeArtistName || activeArtist}
                artistSongs={artistRadioSongs}
                playTrackById={playTrackById}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onToggleSongPlayback={handleToggleSongPlayback}
                addSongToQueueNext={addSongToQueueNext}
                addSongToQueueLast={addSongToQueueLast}
                isSongLiked={isSongLiked}
                toggleLikeSong={toggleLikeSong}
                onBackToHome={handleClearArtistRadio}
              />
            ) : isPlaylistRoute ? (
              <PlaylistPage
                playlist={routePlaylist || selectedPlaylist}
                playlistActionLoadingId={playlistActionLoadingId}
                playTrackById={playTrackById}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onToggleSongPlayback={handleToggleSongPlayback}
                handleRemoveSongFromPlaylist={handleRemoveSongFromPlaylistWithAuth}
                handleMoveSongInPlaylist={handleMoveSongInPlaylistWithAuth}
                handleDragReorderSongsInPlaylist={handleReorderSongsInPlaylistWithAuth}
                handleRenamePlaylist={handleRenamePlaylistWithAuth}
                handleUpdatePlaylistCover={handleUpdatePlaylistCoverWithAuth}
                handleUploadPlaylistCover={handleUploadPlaylistCoverWithAuth}
                addSongToQueueNext={addSongToQueueNext}
                addSongToQueueLast={addSongToQueueLast}
                isSongLiked={isSongLiked}
                toggleLikeSong={toggleLikeSong}
                playlistLoading={playlistLoading || playlistActionLoadingId.startsWith('rename-')}
                playlistCoverUploadLoading={playlistCoverUploadLoading}
                onShowToast={showPlayerToast}
                onBackToHome={handleGoHome}
              />
            ) : (
              <UserPage
                currentUser={currentUser}
                loading={loading}
                error={error}
                playlistError={playlistError}
                filteredSongs={filteredSongs}
                playTrackById={playTrackById}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onToggleSongPlayback={handleToggleSongPlayback}
                recommendedSongs={recommendedSongs}
                playlists={playlists}
                selectedPlaylistBySong={selectedPlaylistBySong}
                setSelectedPlaylistBySong={setSelectedPlaylistBySong}
                playlistActionLoadingId={playlistActionLoadingId}
                handleAddSongToPlaylist={handleAddSongToPlaylistWithAuth}
                selectedPlaylist={selectedPlaylist}
                handleRemoveSongFromPlaylist={handleRemoveSongFromPlaylistWithAuth}
                popularSongs={popularSongs}
                likedSongs={likedSongs}
                recentlyPlayedSongs={recentlyPlayedSongs}
                isSongLiked={isSongLiked}
                toggleLikeSong={toggleLikeSong}
                addSongToQueueNext={addSongToQueueNext}
                addSongToQueueLast={addSongToQueueLast}
                onOpenArtistRadio={handleOpenArtistRadio}
                onClearArtistRadio={handleClearArtistRadio}
                activeArtist={routeArtistName || activeArtist}
                artistRadioSongs={artistRadioSongs}
                onShowToast={showPlayerToast}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </main>
      )}

      rightSidebar={(
        <RightSidebar
          highlightedSong={highlightedSong}
          currentTrackId={currentTrackId}
          sessionLoading={sessionLoading}
          currentUser={currentUser}
          authLoading={authLoading}
          handleLogout={handleLogout}
          onOpenLogin={handleOpenLogin}
          playlistError={playlistError}
          nextUpSongs={nextUpSongs}
          isPlaying={isPlaying}
          onToggleSongPlayback={handleToggleSongPlayback}
          playTrackById={playTrackById}
          isSongLiked={isSongLiked}
          toggleLikeSong={toggleLikeSong}
          removeSongFromQueueAt={removeSongFromQueueAt}
          moveSongInQueue={moveSongInQueue}
          clearQueue={clearQueue}
          onResizeStart={handleRightSidebarResizeStart}
        />
      )}
      audioNode={(
        <audio
        ref={audioRef}
        src={highlightedSong?.audioUrl || ''}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        hidden
      />
      )}
      footerNode={(
        <FooterPlayer
          Icon={Icon}
          highlightedSong={highlightedSong}
          isCurrentTrackLiked={isSongLiked(highlightedSong?._id || '')}
          handleToggleLikeCurrentTrack={() => toggleLikeSong(highlightedSong?._id)}
          isShuffle={isShuffle}
          handleToggleShuffle={handleToggleShuffle}
          handlePrevTrack={handlePrevTrack}
          handleTogglePlayPause={handleTogglePlayPause}
          isPlaying={isPlaying}
          handleNextTrack={handleNextTrack}
          handleCycleRepeatMode={handleCycleRepeatMode}
          repeatMode={repeatMode}
          playbackTime={playbackTime}
          progressWrapperRef={progressWrapperRef}
          handleProgressMouseMove={handleProgressMouseMove}
          handleProgressMouseLeave={handleProgressMouseLeave}
          isProgressHovering={isProgressHovering}
          safeTrackDuration={safeTrackDuration}
          hoverPreviewPercent={hoverPreviewPercent}
          hoverPreviewTime={hoverPreviewTime}
          handleSeek={handleSeek}
          progressPercent={progressPercent}
          trackDuration={trackDuration}
          volume={volume}
          setVolume={setVolume}
          isMuted={volume <= 0}
          handleToggleMute={handleToggleMute}
          queueCount={nextUpSongs.length}
          handleOpenQueuePanel={handleOpenQueuePanel}
          playerToast={playerToast}
          onVolumeWheel={handleVolumeWheel}
          syncStatus={syncStatus}
          syncPendingCount={syncPendingCount}
          isOnline={isOnline}
          playbackRate={playbackRate}
          handleCyclePlaybackRate={handleCyclePlaybackRate}
        />
      )}
    />
  )
}

export default App


