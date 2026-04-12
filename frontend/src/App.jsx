import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { artistsApi, authApi, socialApi, songsApi } from './api/client'
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
import AlbumPage from './pages/AlbumPage'
import AccountPage from './pages/AccountPage'
import ArtistPage from './pages/ArtistPage'
import LoginPage from './pages/LoginPage'
import MessagesPage from './pages/MessagesPage'
import PlaylistPage from './pages/PlaylistPage'
import UserPage from './pages/UserPage'

const TABLET_AUTO_COLLAPSE_BREAKPOINT = 1536
const MOBILE_LAYOUT_BREAKPOINT = 1280
const GUEST_LIKED_SONGS_KEY = 'guest_liked_song_ids'
const GUEST_LIKED_COLLECTION_META_KEY = 'guest_liked_collection_meta'
const GUEST_RECENT_TRACKS_KEY = 'guest_recent_track_ids'
const GUEST_QUEUE_TRACKS_KEY = 'guest_queue_track_ids'
const PREFERENCE_ACTION_QUEUE_KEY_PREFIX = 'preference_action_queue_'
const LEFT_SIDEBAR_WIDTH_KEY = 'left_sidebar_width'
const RIGHT_SIDEBAR_WIDTH_KEY = 'right_sidebar_width'
const SOCKET_SERVER_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '')

const getInitials = (value = '') => {
  const words = String(value).trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase()
  }

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase()
}

const normalizeChatMessage = (message, { fallbackState = 'sent' } = {}) => {
  if (!message) {
    return null
  }

  return {
    id: String(message.id || ''),
    senderId: String(message.senderId || ''),
    receiverId: String(message.receiverId || ''),
    text: String(message.text || ''),
    createdAt: message.createdAt || new Date().toISOString(),
    seenAt: message.seenAt || null,
    clientTempId: String(message.clientTempId || ''),
    deliveryState: message.seenAt ? 'seen' : fallbackState,
  }
}

const sortMessagesByTime = (items) => {
  return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

const toSearchText = (value = '') => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const isSubsequenceMatch = (query, target) => {
  if (!query || !target) {
    return false
  }

  let queryIndex = 0
  for (let targetIndex = 0; targetIndex < target.length && queryIndex < query.length; targetIndex += 1) {
    if (query[queryIndex] === target[targetIndex]) {
      queryIndex += 1
    }
  }

  return queryIndex === query.length
}

const getSongSearchScore = (song, keyword) => {
  if (!keyword) {
    return 1
  }

  const title = toSearchText(song?.title || '')
  const artist = toSearchText(song?.artist || '')
  const genre = toSearchText(song?.genre || '')
  const joined = `${title} ${artist} ${genre}`.trim()

  if (!joined) {
    return 0
  }

  let score = 0
  if (title.startsWith(keyword)) score += 180
  if (artist.startsWith(keyword)) score += 160
  if (title.includes(keyword)) score += 120
  if (artist.includes(keyword)) score += 100
  if (genre.includes(keyword)) score += 40

  const tokens = keyword.split(' ').filter(Boolean)
  tokens.forEach((token) => {
    if (title.includes(token)) score += 24
    if (artist.includes(token)) score += 20
    if (genre.includes(token)) score += 8
  })

  if (isSubsequenceMatch(keyword.replace(/\s+/g, ''), joined.replace(/\s+/g, ''))) {
    score += 30
  }

  return score
}

const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {children}
  </svg>
)

function App() {
  const [currentTrackId, setCurrentTrackId] = useState(getInitialTrackId)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false)
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
  const [isSidebarResizing, setIsSidebarResizing] = useState(false)
  const [likedSongIds, setLikedSongIds] = useState([])
  const [likedCollectionName, setLikedCollectionName] = useState('Liked Songs')
  const [likedCollectionCoverUrl, setLikedCollectionCoverUrl] = useState('')
  const [likedCollectionCoverUploadLoading, setLikedCollectionCoverUploadLoading] = useState(false)
  const [recentTrackIds, setRecentTrackIds] = useState([])
  const [queuedTrackIds, setQueuedTrackIds] = useState([])
  const [forcedPlaybackSongIds, setForcedPlaybackSongIds] = useState([])
  const [playerToast, setPlayerToast] = useState('')
  const [syncPendingCount, setSyncPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isChatListOpen, setIsChatListOpen] = useState(false)
  const [chatFriends, setChatFriends] = useState([])
  const [chatFriendsLoading, setChatFriendsLoading] = useState(false)
  const [chatFriendsError, setChatFriendsError] = useState('')
  const [activeMiniChatFriendId, setActiveMiniChatFriendId] = useState('')
  const [miniChatMessages, setMiniChatMessages] = useState([])
  const [miniChatDraft, setMiniChatDraft] = useState('')
  const [miniChatLoading, setMiniChatLoading] = useState(false)
  const [miniChatSending, setMiniChatSending] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')
  const [artistLibrary, setArtistLibrary] = useState([])
  const [artistLibraryLoading, setArtistLibraryLoading] = useState(false)
  const [artistLibraryError, setArtistLibraryError] = useState('')
  const [selectedArtistDetail, setSelectedArtistDetail] = useState(null)
  const [selectedArtistLoading, setSelectedArtistLoading] = useState(false)
  const [selectedAlbumDetail, setSelectedAlbumDetail] = useState(null)
  const [selectedAlbumLoading, setSelectedAlbumLoading] = useState(false)
  const [trendingSongs, setTrendingSongs] = useState([])
  const [trendingSongsLoading, setTrendingSongsLoading] = useState(false)
  const [adminArtistForm, setAdminArtistForm] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    bannerUrl: '',
  })
  const [adminAlbumForm, setAdminAlbumForm] = useState({
    artistId: '',
    title: '',
    coverUrl: '',
    description: '',
    releaseDate: '',
  })
  const [adminAlbumSongForm, setAdminAlbumSongForm] = useState({
    artistId: '',
    albumId: '',
    songId: '',
  })
  const [artistMutationLoading, setArtistMutationLoading] = useState(false)
  const [artistMutationError, setArtistMutationError] = useState('')
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    targetUserId: '',
    sendToAll: false,
  })
  const [sendingNotification, setSendingNotification] = useState(false)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true
    }

    return navigator.onLine
  })
  const audioFileInputRef = useRef(null)
  const coverFileInputRef = useRef(null)
  const searchMenuRef = useRef(null)
  const searchInputRef = useRef(null)
  const userMenuRef = useRef(null)
  const notificationMenuRef = useRef(null)
  const chatMenuRef = useRef(null)
  const miniChatViewportRef = useRef(null)
  const activeMiniChatFriendRef = useRef('')
  const location = useLocation()
  const navigate = useNavigate()
  const loginRedirectPathRef = useRef('/')
  const lastNonZeroVolumeRef = useRef(0.7)
  const hasLoadedPreferencesRef = useRef(false)
  const isHydratingPreferencesRef = useRef(false)
  const pendingPreferenceActionsRef = useRef([])
  const isFlushingPreferenceActionsRef = useRef(false)
  const lastTrackedPlaySongIdRef = useRef('')
  const appSocketRef = useRef(null)
  const [isAppSocketConnected, setIsAppSocketConnected] = useState(false)

  const clampLeftSidebarWidth = (value) => Math.min(460, Math.max(260, Math.round(value)))
  const clampRightSidebarWidth = (value) => Math.min(520, Math.max(280, Math.round(value)))

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

  const likedCollectionMetaStorageKey = useMemo(() => {
    return currentUser?.id ? `liked_collection_meta_${currentUser.id}` : GUEST_LIKED_COLLECTION_META_KEY
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

  const activeMiniChatFriend = useMemo(() => {
    if (!activeMiniChatFriendId) {
      return null
    }

    return chatFriends.find((friend) => friend.id === activeMiniChatFriendId) || null
  }, [chatFriends, activeMiniChatFriendId])

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
  const isAlbumRoute = location.pathname.startsWith('/album/')
  const isPlaylistRoute = location.pathname.startsWith('/playlist/')
  const isLikedSongsRoute = location.pathname === '/liked-songs'
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

  const loadAdminUsers = async () => {
    if (!accessToken || !isAdmin) {
      setAdminUsers([])
      return
    }

    try {
      setAdminUsersLoading(true)
      setAdminUsersError('')
      const data = await authApi.adminListUsers(accessToken)
      setAdminUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (error) {
      setAdminUsersError(error?.message || 'Khong the tai danh sach user')
    } finally {
      setAdminUsersLoading(false)
    }
  }

  const loadArtistsLibrary = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setArtistLibraryLoading(true)
      }

      setArtistLibraryError('')
      const data = await artistsApi.list()
      setArtistLibrary(Array.isArray(data?.artists) ? data.artists : [])
    } catch (error) {
      setArtistLibraryError(error?.message || 'Unable to load artists')
    } finally {
      if (!silent) {
        setArtistLibraryLoading(false)
      }
    }
  }

  const loadTrendingSongs = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setTrendingSongsLoading(true)
      }

      const data = await songsApi.list({ page: 1, limit: 10, sort: 'trending' })
      setTrendingSongs(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setTrendingSongs([])
    } finally {
      if (!silent) {
        setTrendingSongsLoading(false)
      }
    }
  }

  const handleAdminArtistInput = (event) => {
    const { name, value } = event.target
    setAdminArtistForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAdminAlbumInput = (event) => {
    const { name, value } = event.target
    setAdminAlbumForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAdminAlbumSongInput = (event) => {
    const { name, value } = event.target
    setAdminAlbumSongForm((prev) => {
      const next = { ...prev, [name]: value }

      if (name === 'artistId') {
        next.albumId = ''
      }

      return next
    })
  }

  const handleCreateArtistByAdmin = async (event) => {
    event.preventDefault()

    if (!accessToken || !isAdmin) {
      return
    }

    const payload = {
      name: adminArtistForm.name.trim(),
      bio: adminArtistForm.bio.trim(),
      avatarUrl: adminArtistForm.avatarUrl.trim(),
      bannerUrl: adminArtistForm.bannerUrl.trim(),
    }

    if (!payload.name) {
      setArtistMutationError('Artist name is required')
      return
    }

    try {
      setArtistMutationLoading(true)
      setArtistMutationError('')
      await artistsApi.create(accessToken, payload)
      setAdminArtistForm({ name: '', bio: '', avatarUrl: '', bannerUrl: '' })
      await loadArtistsLibrary({ silent: true })
    } catch (error) {
      setArtistMutationError(error?.message || 'Unable to create artist')
    } finally {
      setArtistMutationLoading(false)
    }
  }

  const handleCreateAlbumByAdmin = async (event) => {
    event.preventDefault()

    if (!accessToken || !isAdmin) {
      return
    }

    if (!adminAlbumForm.artistId || !adminAlbumForm.title.trim()) {
      setArtistMutationError('Select artist and provide album title')
      return
    }

    try {
      setArtistMutationLoading(true)
      setArtistMutationError('')
      await artistsApi.createAlbum(accessToken, adminAlbumForm.artistId, {
        title: adminAlbumForm.title.trim(),
        coverUrl: adminAlbumForm.coverUrl.trim(),
        description: adminAlbumForm.description.trim(),
        releaseDate: adminAlbumForm.releaseDate || undefined,
      })

      setAdminAlbumForm((prev) => ({ ...prev, title: '', coverUrl: '', description: '', releaseDate: '' }))
      await loadArtistsLibrary({ silent: true })
    } catch (error) {
      setArtistMutationError(error?.message || 'Unable to create album')
    } finally {
      setArtistMutationLoading(false)
    }
  }

  const handleAddSongToAlbumByAdmin = async (event) => {
    event.preventDefault()

    if (!accessToken || !isAdmin) {
      return
    }

    if (!adminAlbumSongForm.artistId || !adminAlbumSongForm.albumId || !adminAlbumSongForm.songId) {
      setArtistMutationError('Select artist, album and song')
      return
    }

    try {
      setArtistMutationLoading(true)
      setArtistMutationError('')
      await artistsApi.addSongToAlbum(
        accessToken,
        adminAlbumSongForm.artistId,
        adminAlbumSongForm.albumId,
        adminAlbumSongForm.songId,
      )

      setAdminAlbumSongForm((prev) => ({ ...prev, songId: '' }))
      await loadArtistsLibrary({ silent: true })
    } catch (error) {
      setArtistMutationError(error?.message || 'Unable to add song to album')
    } finally {
      setArtistMutationLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdminRoute || !isAdmin || !accessToken) {
      return
    }

    loadAdminUsers()
  }, [isAdminRoute, isAdmin, accessToken])

  useEffect(() => {
    loadArtistsLibrary()
    loadTrendingSongs()
  }, [])

  const handleChangeUserRole = async (userId, nextRole) => {
    if (!accessToken || !userId || !nextRole) {
      return
    }

    const previous = [...adminUsers]
    setAdminUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)))

    try {
      setAdminUsersError('')
      await authApi.adminUpdateUser(accessToken, userId, { role: nextRole })
    } catch (error) {
      setAdminUsers(previous)
      setAdminUsersError(error?.message || 'Khong the cap nhat role user')
    }
  }

  const handleDeleteUserByAdmin = async (userId) => {
    if (!accessToken || !userId) {
      return
    }

    const shouldDelete = window.confirm('Ban co chac chan muon xoa user nay?')
    if (!shouldDelete) {
      return
    }

    const previous = [...adminUsers]
    setAdminUsers((prev) => prev.filter((item) => item.id !== userId))

    try {
      setAdminUsersError('')
      await authApi.adminDeleteUser(accessToken, userId)
    } catch (error) {
      setAdminUsers(previous)
      setAdminUsersError(error?.message || 'Khong the xoa user')
    }
  }

  const handleResetUserPasswordByAdmin = async (userId) => {
    if (!accessToken || !userId) {
      return
    }

    const newPassword = window.prompt('Nhap mat khau moi cho user (toi thieu 6 ky tu):', '')
    if (!newPassword) {
      return
    }

    try {
      setAdminUsersError('')
      await authApi.adminResetUserPassword(accessToken, userId, { newPassword })
      window.alert('Reset password thanh cong')
    } catch (error) {
      setAdminUsersError(error?.message || 'Khong the reset mat khau user')
    }
  }

  const handleNotificationFormChange = (event) => {
    const { name, value, type, checked } = event.target
    setNotificationForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }

      if (name === 'sendToAll' && checked) {
        next.targetUserId = ''
      }

      return next
    })
  }

  const handleSendAdminNotification = async () => {
    if (!accessToken || !isAdmin) {
      return
    }

    const payload = {
      title: notificationForm.title.trim(),
      message: notificationForm.message.trim(),
      recipientUserId: notificationForm.targetUserId,
      sendToAll: notificationForm.sendToAll,
    }

    if (!payload.title || !payload.message) {
      setAdminUsersError('Vui long nhap tieu de va noi dung thong bao')
      return
    }

    if (!payload.sendToAll && !payload.recipientUserId) {
      setAdminUsersError('Vui long chon user nhan thong bao hoac gui tat ca')
      return
    }

    try {
      setSendingNotification(true)
      setAdminUsersError('')
      await authApi.adminSendNotification(accessToken, payload)
      setNotificationForm({ title: '', message: '', targetUserId: '', sendToAll: false })
      window.alert('Gui thong bao thanh cong')
    } catch (error) {
      setAdminUsersError(error?.message || 'Khong the gui thong bao')
    } finally {
      setSendingNotification(false)
    }
  }

  const loadNotifications = async ({ silent = false } = {}) => {
    if (!accessToken || !currentUser) {
      setNotifications([])
      setUnreadNotificationsCount(0)
      return
    }

    try {
      if (!silent) {
        setNotificationsLoading(true)
      }

      setNotificationError('')
      const data = await authApi.listNotifications(accessToken)
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : [])
      setUnreadNotificationsCount(Number(data?.unreadCount) || 0)
    } catch (error) {
      setNotificationError(error?.message || 'Khong the tai thong bao')
    } finally {
      if (!silent) {
        setNotificationsLoading(false)
      }
    }
  }

  const handleOpenNotifications = async () => {
    setIsNotificationOpen((prev) => !prev)

    if (!isNotificationOpen) {
      await loadNotifications()
    }
  }

  const handleReadNotification = async (notificationId, isRead) => {
    if (!accessToken || !notificationId || isRead) {
      return
    }

    setNotifications((prev) => prev.map((item) => (
      item.id === notificationId ? { ...item, isRead: true } : item
    )))
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1))

    try {
      await authApi.markNotificationRead(accessToken, notificationId)
    } catch {
      loadNotifications({ silent: true })
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    if (!accessToken) {
      return
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setUnreadNotificationsCount(0)

    try {
      await authApi.markAllNotificationsRead(accessToken)
    } catch {
      loadNotifications({ silent: true })
    }
  }

  const upsertMiniChatMessage = (nextMessageRaw, { fallbackState = 'sent' } = {}) => {
    const nextMessage = normalizeChatMessage(nextMessageRaw, { fallbackState })
    if (!nextMessage || !nextMessage.id) {
      return
    }

    setMiniChatMessages((prev) => {
      const existingById = prev.findIndex((item) => item.id === nextMessage.id)
      const existingByTempId = existingById < 0 && nextMessage.clientTempId
        ? prev.findIndex((item) => item.clientTempId && item.clientTempId === nextMessage.clientTempId)
        : -1
      const targetIndex = existingById >= 0 ? existingById : existingByTempId

      if (targetIndex >= 0) {
        const next = [...prev]
        next[targetIndex] = {
          ...next[targetIndex],
          ...nextMessage,
        }

        return sortMessagesByTime(next)
      }

      return sortMessagesByTime([...prev, nextMessage])
    })
  }

  const loadChatFriends = async () => {
    if (!accessToken || !currentUser) {
      setChatFriends([])
      return
    }

    try {
      setChatFriendsLoading(true)
      setChatFriendsError('')
      const data = await socialApi.getFriends(accessToken)
      setChatFriends(Array.isArray(data?.friends) ? data.friends : [])
    } catch (error) {
      setChatFriendsError(error?.message || 'Unable to load friends list')
    } finally {
      setChatFriendsLoading(false)
    }
  }

  const loadMiniChatConversation = async (friendId) => {
    if (!accessToken || !friendId) {
      setMiniChatMessages([])
      return
    }

    try {
      setMiniChatLoading(true)
      const data = await socialApi.listMessages(accessToken, friendId, { limit: 40 })
      const messages = (Array.isArray(data?.messages) ? data.messages : [])
        .map((item) => normalizeChatMessage(item, { fallbackState: 'sent' }))
        .filter(Boolean)

      setMiniChatMessages(sortMessagesByTime(messages))
      await socialApi.markConversationSeen(accessToken, friendId)
    } catch {
      // Ignore conversation fetch failures in mini chat.
    } finally {
      setMiniChatLoading(false)
    }
  }

  const handleToggleChatList = async () => {
    if (!currentUser) {
      handleOpenLogin('login')
      return
    }

    setIsChatListOpen((prev) => !prev)
    if (!isChatListOpen && chatFriends.length === 0) {
      await loadChatFriends()
    }
  }

  const handleOpenMiniChat = async (friendId) => {
    const friendValue = String(friendId || '').trim()
    if (!friendValue) {
      return
    }

    setActiveMiniChatFriendId(friendValue)
    setIsChatListOpen(false)
    await loadMiniChatConversation(friendValue)
  }

  const handleCloseMiniChat = () => {
    setActiveMiniChatFriendId('')
    setMiniChatMessages([])
    setMiniChatDraft('')
  }

  const handleSendMiniChatMessage = async (event) => {
    event.preventDefault()

    if (!accessToken || !activeMiniChatFriendId) {
      return
    }

    const text = miniChatDraft.trim()
    if (!text) {
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      senderId: String(currentUser?.id || ''),
      receiverId: activeMiniChatFriendId,
      text,
      createdAt: new Date().toISOString(),
      seenAt: null,
      clientTempId: tempId,
      deliveryState: 'sending',
    }

    setMiniChatDraft('')
    setMiniChatSending(true)
    setMiniChatMessages((prev) => sortMessagesByTime([...prev, optimistic]))

    try {
      const data = await socialApi.sendMessage(accessToken, activeMiniChatFriendId, { text, clientTempId: tempId })
      if (data?.message) {
        upsertMiniChatMessage(data.message)
      }
    } catch {
      setMiniChatMessages((prev) => prev.map((message) => (
        message.id === tempId
          ? { ...message, deliveryState: 'failed' }
          : message
      )))
    } finally {
      setMiniChatSending(false)
    }
  }

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
    if (!isUserMenuOpen && !isNotificationOpen && !isChatListOpen && !isSearchMenuOpen) {
      return
    }

    const handlePointerDown = (event) => {
      const clickedInsideUserMenu = userMenuRef.current && userMenuRef.current.contains(event.target)
      const clickedInsideNotification = notificationMenuRef.current && notificationMenuRef.current.contains(event.target)
      const clickedInsideChatMenu = chatMenuRef.current && chatMenuRef.current.contains(event.target)
      const clickedInsideSearch = searchMenuRef.current && searchMenuRef.current.contains(event.target)

      if (clickedInsideUserMenu || clickedInsideNotification || clickedInsideChatMenu || clickedInsideSearch) {
        return
      }

      setIsUserMenuOpen(false)
      setIsNotificationOpen(false)
      setIsChatListOpen(false)
      setIsSearchMenuOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isUserMenuOpen, isNotificationOpen, isChatListOpen, isSearchMenuOpen])

  useEffect(() => {
    setIsUserMenuOpen(false)
    setIsNotificationOpen(false)
    setIsChatListOpen(false)
    setIsSearchMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!currentUser || !accessToken) {
      return
    }

    loadNotifications({ silent: true })

    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true })
    }, 20000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentUser?.id, accessToken])

  const routeArtistIdOrSlug = useMemo(() => {
    if (!isArtistRoute) {
      return ''
    }

    const encodedValue = location.pathname.replace('/artist/', '')
    if (!encodedValue) {
      return ''
    }

    try {
      return decodeURIComponent(encodedValue)
    } catch {
      return encodedValue
    }
  }, [isArtistRoute, location.pathname])

  const routeAlbumParams = useMemo(() => {
    if (!isAlbumRoute) {
      return { artistId: '', albumId: '' }
    }

    const raw = location.pathname.replace('/album/', '')
    const [artistId = '', albumId = ''] = raw.split('/')

    return {
      artistId: decodeURIComponent(artistId || ''),
      albumId: decodeURIComponent(albumId || ''),
    }
  }, [isAlbumRoute, location.pathname])

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

  useEffect(() => {
    activeMiniChatFriendRef.current = activeMiniChatFriendId
  }, [activeMiniChatFriendId])

  useEffect(() => {
    if (!activeMiniChatFriendId || !isAppSocketConnected || !appSocketRef.current) {
      return
    }

    appSocketRef.current.emit('chat:join', { friendId: activeMiniChatFriendId })
  }, [activeMiniChatFriendId, isAppSocketConnected])

  useEffect(() => {
    if (!miniChatViewportRef.current) {
      return
    }

    miniChatViewportRef.current.scrollTop = miniChatViewportRef.current.scrollHeight
  }, [miniChatMessages.length, activeMiniChatFriendId])

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
    const keyword = toSearchText(searchQuery)

    if (!keyword) {
      return songs
    }

    return songs
      .map((song) => ({
        song,
        score: getSongSearchScore(song, keyword),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }

        return String(a.song?.title || '').localeCompare(String(b.song?.title || ''))
      })
      .map((entry) => entry.song)
  }, [songs, searchQuery])

  const searchSuggestions = useMemo(() => filteredSongs.slice(0, 8), [filteredSongs])

  const recommendedSongs = useMemo(() => filteredSongs.slice(0, 10), [filteredSongs])

  useEffect(() => {
    if (!routeArtistIdOrSlug) {
      setSelectedArtistDetail(null)
      return
    }

    let disposed = false

    const loadArtistDetail = async () => {
      try {
        setSelectedArtistLoading(true)
        const data = await artistsApi.getByIdOrSlug(routeArtistIdOrSlug)

        if (!disposed) {
          setSelectedArtistDetail(data?.artist || null)
        }
      } catch {
        if (!disposed) {
          setSelectedArtistDetail(null)
        }
      } finally {
        if (!disposed) {
          setSelectedArtistLoading(false)
        }
      }
    }

    loadArtistDetail()

    return () => {
      disposed = true
    }
  }, [routeArtistIdOrSlug])

  useEffect(() => {
    if (!routeAlbumParams.artistId || !routeAlbumParams.albumId) {
      setSelectedAlbumDetail(null)
      return
    }

    let disposed = false

    const loadAlbumDetail = async () => {
      try {
        setSelectedAlbumLoading(true)
        const data = await artistsApi.getAlbumDetail(routeAlbumParams.artistId, routeAlbumParams.albumId)

        if (!disposed) {
          setSelectedAlbumDetail({
            artist: data?.artist || null,
            album: data?.album || null,
          })
        }
      } catch {
        if (!disposed) {
          setSelectedAlbumDetail(null)
        }
      } finally {
        if (!disposed) {
          setSelectedAlbumLoading(false)
        }
      }
    }

    loadAlbumDetail()

    return () => {
      disposed = true
    }
  }, [routeAlbumParams.artistId, routeAlbumParams.albumId])

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
    forcedPlaybackSongIds,
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
    try {
      const raw = localStorage.getItem(likedCollectionMetaStorageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      const nextName = String(parsed?.name || '').trim()
      const nextCoverUrl = String(parsed?.coverUrl || '').trim()

      setLikedCollectionName(nextName || 'Liked Songs')
      setLikedCollectionCoverUrl(nextCoverUrl)
    } catch {
      setLikedCollectionName('Liked Songs')
      setLikedCollectionCoverUrl('')
    }
  }, [likedCollectionMetaStorageKey])

  useEffect(() => {
    localStorage.setItem(
      likedCollectionMetaStorageKey,
      JSON.stringify({
        name: likedCollectionName,
        coverUrl: likedCollectionCoverUrl,
      }),
    )
  }, [likedCollectionMetaStorageKey, likedCollectionName, likedCollectionCoverUrl])

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

    const handleIncomingChatMessage = (incomingMessage) => {
      const viewerId = String(currentUser?.id || '')
      if (!viewerId || !incomingMessage?.id) {
        return
      }

      const senderId = String(incomingMessage.senderId || '')
      const receiverId = String(incomingMessage.receiverId || '')

      if (senderId !== viewerId && receiverId !== viewerId) {
        return
      }

      const conversationFriendId = senderId === viewerId ? receiverId : senderId
      if (!conversationFriendId) {
        return
      }

      if (activeMiniChatFriendRef.current === conversationFriendId) {
        upsertMiniChatMessage(incomingMessage)

        if (senderId === conversationFriendId) {
          socialApi.markConversationSeen(accessToken, conversationFriendId).catch(() => {})
        }
      }

      if (senderId === conversationFriendId) {
        loadNotifications({ silent: true })
      }
    }

    const handleChatSeen = (payload) => {
      const readerId = String(payload?.readerId || '')
      const seenAt = payload?.seenAt || null

      if (!readerId || !seenAt || readerId !== activeMiniChatFriendRef.current) {
        return
      }

      setMiniChatMessages((prev) => prev.map((item) => {
        if (item.senderId !== String(currentUser?.id || '') || item.receiverId !== readerId) {
          return item
        }

        return {
          ...item,
          seenAt,
          deliveryState: 'seen',
        }
      }))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:message', handleIncomingChatMessage)
    socket.on('chat:seen', handleChatSeen)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:message', handleIncomingChatMessage)
      socket.off('chat:seen', handleChatSeen)
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
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    const startX = event.clientX
    const startWidth = leftSidebarWidth
    let latestWidth = startWidth
    let frameId = 0
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    setIsSidebarResizing(true)

    const handlePointerMove = (moveEvent) => {
      latestWidth = clampLeftSidebarWidth(startWidth + (moveEvent.clientX - startX))

      if (frameId) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        setLeftSidebarWidth(latestWidth)
        frameId = 0
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      setLeftSidebarWidth(latestWidth)
      localStorage.setItem(LEFT_SIDEBAR_WIDTH_KEY, String(latestWidth))
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      setIsSidebarResizing(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  const handleRightSidebarResizeStart = (event) => {
    if (window.innerWidth < TABLET_AUTO_COLLAPSE_BREAKPOINT) {
      return
    }

    event.preventDefault()
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    const startX = event.clientX
    const startWidth = rightSidebarWidth
    let latestWidth = startWidth
    let frameId = 0
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    setIsSidebarResizing(true)

    const handlePointerMove = (moveEvent) => {
      latestWidth = clampRightSidebarWidth(startWidth - (moveEvent.clientX - startX))

      if (frameId) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        setRightSidebarWidth(latestWidth)
        frameId = 0
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      setRightSidebarWidth(latestWidth)
      localStorage.setItem(RIGHT_SIDEBAR_WIDTH_KEY, String(latestWidth))
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      setIsSidebarResizing(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
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

    if (lastTrackedPlaySongIdRef.current !== currentTrackId) {
      lastTrackedPlaySongIdRef.current = currentTrackId
      songsApi.trackPlay(currentTrackId)
        .then(() => loadTrendingSongs({ silent: true }))
        .catch(() => {})
    }
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

  const likedSongsPlaylist = useMemo(() => {
    return {
      _id: 'liked-songs',
      name: likedCollectionName || 'Liked Songs',
      coverUrl: likedCollectionCoverUrl || '',
      songs: likedSongs,
    }
  }, [likedCollectionName, likedCollectionCoverUrl, likedSongs])

  const handleOpenLikedSongsPage = () => {
    navigate('/liked-songs')
    setIsMobileSidebarOpen(false)
  }

  const handleRemoveSongFromLikedSongs = async (_likedCollectionId, songId) => {
    if (!songId || !likedSongIds.includes(songId)) {
      return
    }

    toggleLikeSong(songId)
  }

  const handleMoveSongInLikedSongs = async (_likedCollectionId, index, direction) => {
    setLikedSongIds((prev) => {
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || index >= prev.length || nextIndex >= prev.length) {
        return prev
      }

      const next = [...prev]
      const temp = next[index]
      next[index] = next[nextIndex]
      next[nextIndex] = temp
      return next
    })
  }

  const handleDragReorderLikedSongs = async (_likedCollectionId, fromIndex, toIndex) => {
    let didReorder = false

    setLikedSongIds((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length || fromIndex === toIndex) {
        return prev
      }

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      didReorder = true
      return next
    })

    return didReorder
  }

  const handleRenameLikedSongs = async (_likedCollectionId, nextNameRaw) => {
    const nextName = String(nextNameRaw || '').trim()
    if (!nextName) {
      showPlayerToast('Please enter a playlist name')
      return
    }

    setLikedCollectionName(nextName)
  }

  const handleUpdateLikedSongsCover = async (_likedCollectionId, coverUrlRaw) => {
    setLikedCollectionCoverUrl(String(coverUrlRaw || '').trim())
  }

  const handleUploadLikedSongsCover = async (_likedCollectionId, file) => {
    if (!file) {
      return false
    }

    setLikedCollectionCoverUploadLoading(true)

    try {
      const nextCoverDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          resolve(String(reader.result || ''))
        }

        reader.onerror = () => {
          reject(new Error('Failed to read image file'))
        }

        reader.readAsDataURL(file)
      })

      if (!nextCoverDataUrl) {
        return false
      }

      setLikedCollectionCoverUrl(nextCoverDataUrl)
      return true
    } catch {
      showPlayerToast('Unable to upload cover image')
      return false
    } finally {
      setLikedCollectionCoverUploadLoading(false)
    }
  }

  const handleClearLikedSongsCollection = async () => {
    const idsToClear = [...likedSongIds]

    setLikedSongIds([])
    setLikedCollectionName('Liked Songs')
    setLikedCollectionCoverUrl('')

    idsToClear.forEach((songId) => {
      syncPreferenceAction({ action: 'like_remove', songId })
    })
  }

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
    setForcedPlaybackSongIds([])
    navigate('/')
    setSearchQuery('')
    setIsSearchMenuOpen(false)
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
    setForcedPlaybackSongIds([])
    setIsMobileSidebarOpen(false)
    setActiveArtist('')
    navigate('/messages')
  }

  const handleOpenArtistPage = (artistIdOrSlug) => {
    const value = String(artistIdOrSlug || '').trim()
    if (!value) {
      return
    }

    navigate(`/artist/${encodeURIComponent(value)}`)
    setForcedPlaybackSongIds([])
    setSearchQuery('')
    showPlayerToast('Artist page opened')
  }

  const handleOpenAlbumPage = (artistId, albumId) => {
    const normalizedArtistId = String(artistId || '').trim()
    const normalizedAlbumId = String(albumId || '').trim()

    if (!normalizedArtistId || !normalizedAlbumId) {
      return
    }

    navigate(`/album/${encodeURIComponent(normalizedArtistId)}/${encodeURIComponent(normalizedAlbumId)}`)
    setForcedPlaybackSongIds([])
    setSearchQuery('')
    showPlayerToast('Album page opened')
  }

  const handleOpenArtistRadio = (artistName) => {
    const value = String(artistName || '').trim().toLowerCase()
    if (!value) {
      return
    }

    const match = artistLibrary.find((artist) => String(artist.name || '').trim().toLowerCase() === value)
    if (match?.id || match?.slug) {
      handleOpenArtistPage(match.id || match.slug)
      return
    }

    showPlayerToast('Artist profile not available yet')
  }

  const handleOpenPlaylistPage = (playlistId) => {
    const value = String(playlistId || '').trim()
    if (!value) {
      return
    }

    setSelectedPlaylistId(value)
    setForcedPlaybackSongIds([])
    setActiveArtist('')
    setSearchQuery('')
    setIsMobileSidebarOpen(false)
    navigate(`/playlist/${value}`)
  }

  const handleClearArtistRadio = () => {
    setForcedPlaybackSongIds([])
    navigate('/')
  }

  const handlePlayAlbumOnly = (albumSongs = []) => {
    const normalizedIds = Array.from(new Set(
      (Array.isArray(albumSongs) ? albumSongs : [])
        .map((song) => String(song?._id || ''))
        .filter(Boolean),
    ))

    if (normalizedIds.length === 0) {
      return
    }

    setForcedPlaybackSongIds(normalizedIds)
    playTrackById(normalizedIds[0])
    showPlayerToast('Playing selected album')
  }

  const handlePlaySongInAlbum = (songId, albumSongs = []) => {
    const normalizedSongId = String(songId || '').trim()
    if (!normalizedSongId) {
      return
    }

    const normalizedIds = Array.from(new Set(
      (Array.isArray(albumSongs) ? albumSongs : [])
        .map((song) => String(song?._id || ''))
        .filter(Boolean),
    ))

    if (normalizedIds.length > 0) {
      setForcedPlaybackSongIds(normalizedIds)
    }

    playTrackById(normalizedSongId)
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
      leftSidebarWidth={leftSidebarWidth}
      rightSidebarWidth={rightSidebarWidth}
      isSidebarResizing={isSidebarResizing}
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
          likedSongs={likedSongs}
          artists={artists}
          playTrackById={playTrackById}
          onOpenMessages={handleOpenMessages}
          onOpenLikedSongs={handleOpenLikedSongsPage}
          isLikedSongsRoute={isLikedSongsRoute}
          onResizeStart={handleLeftSidebarResizeStart}
        />
      )}

      mainContent={(
        <>
        <main className="rounded-lg bg-[#121212] p-2">
          <div className="rounded-lg bg-linear-to-b from-[#1a1f4d] via-[#121212] to-[#121212] p-4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 xl:grid xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 xl:col-start-2 xl:col-end-3">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="rounded-full bg-black/40 p-2 xl:hidden"
                  title="Mở sidebar"
                >
                  <Icon className="h-4 w-4"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></Icon>
                </button>
                <div className="relative w-full max-w-xl sm:max-w-2xl xl:max-w-[42rem] xl:mx-auto" ref={searchMenuRef}>
                  <div className="flex min-w-0 items-center gap-3 rounded-full bg-[#2a2a2a] px-4 py-3 text-zinc-300 ring-1 ring-white/10 transition focus-within:ring-2 focus-within:ring-emerald-400/70">
                    <Icon className="h-5 w-5"><path d="M10 2a8 8 0 105.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></Icon>
                    <input
                      ref={searchInputRef}
                      placeholder="What do you want to play?"
                      className="w-full min-w-0 bg-transparent text-base outline-none"
                      value={searchQuery}
                      onFocus={() => setIsSearchMenuOpen(true)}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setSearchQuery(nextValue)
                        setIsSearchMenuOpen(Boolean(nextValue.trim()))
                        if (activeArtist || isPlaylistRoute || isMessagesRoute || isAlbumRoute || isLikedSongsRoute) {
                          navigate('/')
                          setActiveArtist('')
                          setForcedPlaybackSongIds([])
                        }
                      }}
                    />
                  </div>

                  {isSearchMenuOpen && searchQuery.trim() && (
                    <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1015] p-2 shadow-2xl shadow-black/60">
                      {searchSuggestions.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-zinc-400">No results</p>
                      ) : (
                        searchSuggestions.map((song) => (
                          <div
                            key={`search-song-${song._id}`}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/10"
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                              {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                playTrackById(song._id)
                                setSearchQuery(song.title || '')
                                setIsSearchMenuOpen(false)
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-zinc-100">{song.title}</p>
                              <p className="truncate text-sm text-zinc-400">{song.artist}</p>
                            </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSongPlayback(song._id)}
                              className="rounded-full bg-white p-2 text-black hover:bg-zinc-100"
                              title="Play/Pause"
                              aria-label="Play or pause"
                            >
                              <Icon className="h-3.5 w-3.5"><path d={song._id === currentTrackId && isPlaying ? 'M7 5h3v14H7zm7 0h3v14h-3z' : 'M8 5v14l11-7z'} /></Icon>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 xl:col-start-3 xl:justify-self-end">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => (isAdminRoute ? navigate('/') : handleOpenAdmin())}
                    className="type-button-sm rounded-full bg-white px-3 py-2 text-black"
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
                    <button type="button" className="type-button-sm hidden rounded-full bg-zinc-800 px-3 py-2 sm:block">Install App</button>
                    <div className="relative" ref={chatMenuRef}>
                      <button
                        type="button"
                        onClick={handleToggleChatList}
                        className="rounded-full bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700"
                        title="Chat"
                        aria-label="Open chat list"
                      >
                        <Icon className="h-4 w-4"><path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z"/></Icon>
                      </button>

                      {isChatListOpen && (
                        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-2xl shadow-black/60">
                          <div className="mb-2 px-2 pt-1">
                            <p className="text-base font-semibold text-white">Chats</p>
                            <p className="text-xs text-zinc-400">Select a friend to open a mini chat window</p>
                          </div>

                          {chatFriendsLoading ? <p className="px-2 py-2 text-sm text-zinc-400">Loading friends...</p> : null}
                          {chatFriendsError ? <p className="mx-2 mb-2 rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">{chatFriendsError}</p> : null}

                          {!chatFriendsLoading && chatFriends.length === 0 ? (
                            <p className="px-2 py-2 text-sm text-zinc-500">No friends available.</p>
                          ) : null}

                          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                            {chatFriends.map((friend) => (
                              <button
                                key={friend.id}
                                type="button"
                                onClick={() => handleOpenMiniChat(friend.id)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white/10"
                              >
                                <div className="relative h-9 w-9 shrink-0 rounded-full bg-zinc-700 text-center text-xs font-semibold leading-9 text-zinc-100">
                                  {friend.avatarUrl ? (
                                    <img src={friend.avatarUrl} alt={friend.name} className="h-full w-full rounded-full object-cover" />
                                  ) : getInitials(friend.name)}
                                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900 ${friend.isOnline ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-zinc-100">{friend.name}</p>
                                  <p className="truncate text-[11px] text-zinc-400">{friend.isOnline ? 'Online' : 'Offline'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative" ref={notificationMenuRef}>
                      <button
                        type="button"
                        onClick={handleOpenNotifications}
                        className="relative rounded-full bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700"
                        title="Notifications"
                      >
                        <Icon className="h-4 w-4"><path d="M12 2a6 6 0 00-6 6v3.6c0 .8-.26 1.58-.74 2.22L4 16h16l-1.26-2.18a4.4 4.4 0 01-.74-2.22V8a6 6 0 00-6-6zm0 20a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22z"/></Icon>
                        {unreadNotificationsCount > 0 && (
                          <span className="type-badge absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
                            {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                          </span>
                        )}
                      </button>

                      {isNotificationOpen && (
                        <div className="absolute right-0 mt-2 w-96 rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-2xl shadow-black/60">
                          <div className="mb-2 flex items-center justify-between px-2 pt-1">
                            <p className="text-base font-semibold text-white">Notifications</p>
                            <button
                              type="button"
                              onClick={handleMarkAllNotificationsRead}
                              className="type-button-sm rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
                            >
                              Mark all as read
                            </button>
                          </div>

                          {notificationsLoading ? <p className="px-2 py-2 text-sm text-zinc-400">Loading notifications...</p> : null}
                          {notificationError ? <p className="mx-2 mb-2 rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">{notificationError}</p> : null}

                          {!notificationsLoading && notifications.length === 0 ? (
                            <p className="px-2 py-2 text-sm text-zinc-500">No notifications yet.</p>
                          ) : null}

                          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                            {notifications.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleReadNotification(item.id, item.isRead)}
                                className={`w-full rounded-md px-2 py-2 text-left ${item.isRead ? 'bg-zinc-800/40' : 'bg-blue-500/15'}`}
                              >
                                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                                <p className="mt-1 text-xs text-zinc-300">{item.message}</p>
                                <p className="mt-1 text-[11px] text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <img src="/logo-white.svg" alt="Sontraify in-page logo" className="h-6 w-6 rounded-sm" />
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
                  adminUsers={adminUsers}
                  adminUsersLoading={adminUsersLoading}
                  adminUsersError={adminUsersError}
                  onRefreshAdminUsers={loadAdminUsers}
                  onChangeUserRole={handleChangeUserRole}
                  onDeleteUser={handleDeleteUserByAdmin}
                  onResetUserPassword={handleResetUserPasswordByAdmin}
                  notificationForm={notificationForm}
                  onNotificationFormChange={handleNotificationFormChange}
                  onSendNotification={handleSendAdminNotification}
                  sendingNotification={sendingNotification}
                  currentUserId={currentUser?.id || ''}
                  artistLibrary={artistLibrary}
                  artistLibraryLoading={artistLibraryLoading}
                  artistLibraryError={artistLibraryError || artistMutationError}
                  adminArtistForm={adminArtistForm}
                  onAdminArtistInput={handleAdminArtistInput}
                  onCreateArtist={handleCreateArtistByAdmin}
                  adminAlbumForm={adminAlbumForm}
                  onAdminAlbumInput={handleAdminAlbumInput}
                  onCreateAlbum={handleCreateAlbumByAdmin}
                  adminAlbumSongForm={adminAlbumSongForm}
                  onAdminAlbumSongInput={handleAdminAlbumSongInput}
                  onAddSongToAlbum={handleAddSongToAlbumByAdmin}
                  artistMutationLoading={artistMutationLoading}
                />
              </ProtectedAdminRoute>
            ) : isArtistRoute ? (
              <ArtistPage
                  artist={selectedArtistDetail}
                  artistLoading={selectedArtistLoading}
                playTrackById={playTrackById}
                onPlayAlbumOnly={handlePlayAlbumOnly}
                onPlaySongInAlbum={handlePlaySongInAlbum}
                onOpenAlbumPage={handleOpenAlbumPage}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onToggleSongPlayback={handleToggleSongPlayback}
                addSongToQueueNext={addSongToQueueNext}
                addSongToQueueLast={addSongToQueueLast}
                isSongLiked={isSongLiked}
                toggleLikeSong={toggleLikeSong}
                onBackToHome={handleClearArtistRadio}
              />
            ) : isAlbumRoute ? (
              <AlbumPage
                artist={selectedAlbumDetail?.artist || null}
                album={selectedAlbumDetail?.album || null}
                albumLoading={selectedAlbumLoading}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onToggleSongPlayback={handleToggleSongPlayback}
                onPlayAlbumOnly={handlePlayAlbumOnly}
                onPlaySongInAlbum={handlePlaySongInAlbum}
                onBack={() => {
                  const targetArtistId = routeAlbumParams.artistId || selectedAlbumDetail?.artist?.id || ''
                  if (targetArtistId) {
                    navigate(`/artist/${encodeURIComponent(targetArtistId)}`)
                    return
                  }

                  navigate('/')
                }}
              />
            ) : isLikedSongsRoute ? (
              <PlaylistPage
                playlist={likedSongsPlaylist}
                playlistActionLoadingId=""
                playTrackById={playTrackById}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onToggleSongPlayback={handleToggleSongPlayback}
                handleRemoveSongFromPlaylist={handleRemoveSongFromLikedSongs}
                handleMoveSongInPlaylist={handleMoveSongInLikedSongs}
                handleDragReorderSongsInPlaylist={handleDragReorderLikedSongs}
                handleDeletePlaylist={handleClearLikedSongsCollection}
                handleRenamePlaylist={handleRenameLikedSongs}
                handleUpdatePlaylistCover={handleUpdateLikedSongsCover}
                handleUploadPlaylistCover={handleUploadLikedSongsCover}
                addSongToQueueNext={addSongToQueueNext}
                addSongToQueueLast={addSongToQueueLast}
                isSongLiked={isSongLiked}
                toggleLikeSong={toggleLikeSong}
                playlistLoading={false}
                playlistCoverUploadLoading={likedCollectionCoverUploadLoading}
                onShowToast={showPlayerToast}
                onBackToHome={handleGoHome}
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
                handleDeletePlaylist={handleDeletePlaylistWithAuth}
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
                trendingSongs={trendingSongs}
                trendingSongsLoading={trendingSongsLoading}
                isSongLiked={isSongLiked}
                toggleLikeSong={toggleLikeSong}
                addSongToQueueNext={addSongToQueueNext}
                addSongToQueueLast={addSongToQueueLast}
                onOpenArtistPage={handleOpenArtistPage}
                artistLibrary={artistLibrary}
                artistLibraryLoading={artistLibraryLoading}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </main>

        {activeMiniChatFriend && (
          <div className="fixed bottom-24 left-2 right-2 z-50 w-auto overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 sm:left-auto sm:right-4 sm:w-[min(380px,calc(100vw-24px))]">
            <div className="flex items-center justify-between bg-zinc-800/80 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{activeMiniChatFriend.name}</p>
                <p className="text-[11px] text-zinc-300">{activeMiniChatFriend.isOnline ? 'Online now' : 'Offline'}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseMiniChat}
                className="rounded-md px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div ref={miniChatViewportRef} className="h-72 space-y-2 overflow-y-auto bg-zinc-950/80 px-3 py-3">
              {miniChatLoading && <p className="text-xs text-zinc-500">Loading conversation...</p>}
              {!miniChatLoading && miniChatMessages.length === 0 && (
                <p className="text-xs text-zinc-500">No messages yet. Start the conversation.</p>
              )}
              {miniChatMessages.map((message) => {
                const isMine = String(message.senderId) === String(currentUser?.id || '')

                return (
                  <div key={`${message.id}-${message.createdAt}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-100'}`}>
                      <p className="whitespace-pre-wrap wrap-break-word">{message.text}</p>
                      <p className={`mt-1 text-[10px] ${isMine ? 'text-black/70' : 'text-zinc-400'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSendMiniChatMessage} className="flex items-center gap-2 border-t border-white/10 bg-zinc-900 px-3 py-2">
              <input
                value={miniChatDraft}
                onChange={(event) => setMiniChatDraft(event.target.value)}
                placeholder="Type a message..."
                className="w-full rounded-full bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-transparent transition focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!miniChatDraft.trim() || miniChatSending}
                className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </div>
        )}
        </>
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


