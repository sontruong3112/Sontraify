import { useEffect, useMemo, useState } from 'react'
import { authApi, configureAuthSession, playlistsApi, songsApi } from './api/client'
import { formatDuration } from './utils/formatDuration'

const ACCESS_TOKEN_KEY = 'music_access_token'

const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {children}
  </svg>
)

function App() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [accessToken, setAccessToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  const [currentUser, setCurrentUser] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [playlistName, setPlaylistName] = useState('')
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState('')
  const [playlistActionLoadingId, setPlaylistActionLoadingId] = useState('')
  const [selectedPlaylistBySong, setSelectedPlaylistBySong] = useState({})
  const [songMutationLoading, setSongMutationLoading] = useState(false)
  const [songMutationError, setSongMutationError] = useState('')
  const [editingSongId, setEditingSongId] = useState('')
  const [adminSongForm, setAdminSongForm] = useState({
    title: '',
    artist: '',
    genre: '',
    audioUrl: '',
    coverUrl: '',
    duration: '',
  })
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [workspaceMode, setWorkspaceMode] = useState('user')
  const [userTab, setUserTab] = useState('kham-pha')
  const [currentTrackId, setCurrentTrackId] = useState('')

  const updateAccessToken = (token) => {
    setAccessToken(token || '')

    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  }

  const loadSongs = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await songsApi.list({ page: 1, limit: 24 })
      const items = Array.isArray(data?.items) ? data.items : []
      setSongs(items)

      if (!currentTrackId && items.length > 0) {
        setCurrentTrackId(items[0]._id || '')
      }
    } catch (requestError) {
      setError(requestError.message || 'Khong the tai bai hat luc nay')
    } finally {
      setLoading(false)
    }
  }

  const loadPlaylists = async (token) => {
    try {
      setPlaylistLoading(true)
      setPlaylistError('')
      const data = await playlistsApi.listMine(token)
      setPlaylists(Array.isArray(data?.items) ? data.items : [])
    } catch (requestError) {
      setPlaylists([])
      setPlaylistError(requestError.message || 'Khong the tai playlist')
    } finally {
      setPlaylistLoading(false)
    }
  }

  const resetLocalSession = () => {
    setCurrentUser(null)
    setPlaylists([])
    setEditingSongId('')
    setSongMutationError('')
    updateAccessToken('')
  }

  useEffect(() => {
    configureAuthSession({
      getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY) || '',
      setAccessToken: (token) => {
        updateAccessToken(token)
      },
      onUnauthorized: () => {
        resetLocalSession()
      },
    })
  }, [])

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY)

        if (savedToken) {
          const meData = await authApi.me(savedToken)
          setCurrentUser(meData.user)
          updateAccessToken(savedToken)
          return
        }

        const refreshed = await authApi.refreshToken()
        const nextToken = refreshed?.tokens?.accessToken || ''

        if (!nextToken) {
          return
        }

        updateAccessToken(nextToken)
        const meData = await authApi.me(nextToken)
        setCurrentUser(meData.user)
      } catch {
        resetLocalSession()
      } finally {
        setSessionLoading(false)
      }
    }

    bootstrapSession()
  }, [])

  useEffect(() => {
    if (!currentUser || !accessToken) {
      setPlaylists([])
      return
    }

    loadPlaylists(accessToken)
  }, [currentUser, accessToken])

  useEffect(() => {
    loadSongs()
  }, [])

  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    if (!isAdmin && workspaceMode === 'admin') {
      setWorkspaceMode('user')
    }
  }, [isAdmin, workspaceMode])

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

  const handleAuthInput = (event) => {
    const { name, value } = event.target
    setAuthForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()

    try {
      setAuthLoading(true)
      setAuthError('')

      const payload = {
        email: authForm.email.trim(),
        password: authForm.password,
      }

      const data = authMode === 'register'
        ? await authApi.register({ ...payload, name: authForm.name.trim() })
        : await authApi.login(payload)

      const nextToken = data?.tokens?.accessToken || ''

      if (!nextToken || !data?.user) {
        throw new Error('Phan hoi dang nhap khong hop le')
      }

      updateAccessToken(nextToken)
      setCurrentUser(data.user)
      setAuthForm({ name: '', email: '', password: '' })
      await loadPlaylists(nextToken)
    } catch (requestError) {
      setAuthError(requestError.message || 'Dang nhap that bai')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setAuthLoading(true)
      setAuthError('')

      if (accessToken) {
        await authApi.logout(accessToken)
      }
    } catch {
      // User session is cleared locally even if server logout fails.
    } finally {
      resetLocalSession()
      setAuthLoading(false)
    }
  }

  const handleAdminSongInput = (event) => {
    const { name, value } = event.target
    setAdminSongForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetAdminSongForm = () => {
    setEditingSongId('')
    setAdminSongForm({
      title: '',
      artist: '',
      genre: '',
      audioUrl: '',
      coverUrl: '',
      duration: '',
    })
  }

  const handleCreateOrUpdateSong = async (event) => {
    event.preventDefault()

    const payload = {
      title: adminSongForm.title.trim(),
      artist: adminSongForm.artist.trim(),
      genre: adminSongForm.genre.trim(),
      audioUrl: adminSongForm.audioUrl.trim(),
      coverUrl: adminSongForm.coverUrl.trim(),
      duration: adminSongForm.duration ? Number(adminSongForm.duration) : 0,
    }

    try {
      setSongMutationLoading(true)
      setSongMutationError('')

      if (editingSongId) {
        await songsApi.update(accessToken, editingSongId, payload)
      } else {
        await songsApi.create(accessToken, payload)
      }

      resetAdminSongForm()
      await loadSongs()
    } catch (requestError) {
      setSongMutationError(requestError.message || 'Khong the luu bai hat')
    } finally {
      setSongMutationLoading(false)
    }
  }

  const handleEditSong = (song) => {
    setEditingSongId(song._id)
    setSongMutationError('')
    setAdminSongForm({
      title: song.title || '',
      artist: song.artist || '',
      genre: song.genre || '',
      audioUrl: song.audioUrl || '',
      coverUrl: song.coverUrl || '',
      duration: Number.isFinite(song.duration) ? String(song.duration) : '',
    })

    if (workspaceMode !== 'admin' && isAdmin) {
      setWorkspaceMode('admin')
    }
  }

  const handleDeleteSong = async (songId) => {
    try {
      setSongMutationLoading(true)
      setSongMutationError('')
      await songsApi.remove(accessToken, songId)
      await loadSongs()
      await loadPlaylists(accessToken)

      if (editingSongId === songId) {
        resetAdminSongForm()
      }
    } catch (requestError) {
      setSongMutationError(requestError.message || 'Khong the xoa bai hat')
    } finally {
      setSongMutationLoading(false)
    }
  }

  const handleCreatePlaylist = async (event) => {
    event.preventDefault()

    try {
      setPlaylistActionLoadingId('create')
      setPlaylistError('')
      await playlistsApi.create(accessToken, { name: playlistName.trim() })
      setPlaylistName('')
      await loadPlaylists(accessToken)
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Khong the tao playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleAddSongToPlaylist = async (songId) => {
    const selectedId = selectedPlaylistBySong[songId] || playlists[0]?._id

    if (!selectedId) {
      setPlaylistError('Vui long tao playlist truoc')
      return
    }

    try {
      setPlaylistActionLoadingId(`add-${songId}`)
      setPlaylistError('')
      await playlistsApi.addSong(accessToken, selectedId, songId)
      await loadPlaylists(accessToken)
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Khong the them bai hat vao playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleRemoveSongFromPlaylist = async (playlistId, songId) => {
    try {
      setPlaylistActionLoadingId(`remove-${playlistId}-${songId}`)
      setPlaylistError('')
      await playlistsApi.removeSong(accessToken, playlistId, songId)
      await loadPlaylists(accessToken)
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Khong the xoa bai hat khoi playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleDeletePlaylist = async (playlistId) => {
    try {
      setPlaylistActionLoadingId(`delete-${playlistId}`)
      setPlaylistError('')
      await playlistsApi.delete(accessToken, playlistId)
      await loadPlaylists(accessToken)
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Khong the xoa playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen grid-cols-1 gap-2 p-2 pb-24 xl:grid-cols-[360px_1fr_360px]">
        <aside className="rounded-lg bg-[#121212] p-2">
          <div className="rounded-lg bg-[#181818] p-4">
            <div className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Icon className="h-7 w-7 text-green-500"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.64 14.45a.76.76 0 01-1.04.25 9.7 9.7 0 00-5.03-1.31 9.8 9.8 0 00-3.38.62.75.75 0 11-.5-1.41 11.2 11.2 0 013.88-.7c2.04 0 4.05.52 5.78 1.5.36.2.49.67.29 1.05zm1.5-2.9a.94.94 0 01-1.3.3 12.5 12.5 0 00-6.3-1.66 12.7 12.7 0 00-4.22.73.94.94 0 11-.62-1.77 14.6 14.6 0 014.84-.83c2.52 0 4.99.65 7.23 1.88.45.24.61.82.37 1.35zm.12-3.03A15.3 15.3 0 0010.6 8.4c-1.83 0-3.63.3-5.31.91a1.12 1.12 0 11-.76-2.1A17.5 17.5 0 0110.6 6c3.24 0 6.43.85 9.23 2.46a1.12 1.12 0 11-1.13 1.96z"/></Icon>
              Sontraify
            </div>
            <button type="button" className="mb-2 flex w-full items-center gap-3 rounded-md bg-white/8 px-3 py-2 text-sm font-semibold">
              <Icon><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></Icon>
              Home
            </button>
            <button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-white/8">
              <Icon><path d="M10 2a8 8 0 105.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></Icon>
              Search
            </button>
          </div>

          <div className="mt-2 rounded-lg bg-[#181818] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Library</h2>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setUserTab('playlist')}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700"
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
                  placeholder="Tao playlist"
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  disabled={playlistActionLoadingId === 'create'}
                  className="rounded-md bg-white px-2 text-xs font-semibold text-black"
                >
                  {playlistActionLoadingId === 'create' ? '...' : 'Tao'}
                </button>
              </form>
            )}

            <div className="mb-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {playlistLoading && <p className="text-xs text-zinc-500">Dang tai playlist...</p>}
              {!playlistLoading && playlists.length === 0 && (
                <p className="text-xs text-zinc-500">Chua co playlist nao</p>
              )}
              {playlists.map((playlist) => (
                <div key={playlist._id} className="rounded-md bg-zinc-900/60 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setUserTab('playlist')}
                      className="truncate text-left text-sm"
                    >
                      {playlist.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlaylist(playlist._id)}
                      disabled={playlistActionLoadingId === `delete-${playlist._id}`}
                      className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] hover:bg-zinc-700"
                    >
                      Xoa
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {artists.map((song) => (
                <button
                  type="button"
                  key={`${song.artist}-${song._id}`}
                  onClick={() => setCurrentTrackId(song._id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/8"
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full bg-zinc-800">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt={song.artist} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{song.artist}</p>
                    <p className="truncate text-xs text-zinc-400">Artist</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="rounded-lg bg-[#121212] p-2">
          <div className="rounded-lg bg-linear-to-b from-[#1a1f4d] via-[#121212] to-[#121212] p-4">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" className="rounded-full bg-black/40 p-2"><Icon className="h-3 w-3"><path d="M15.4 4.6L9 11l6.4 6.4-1.4 1.4L6.2 11l7.8-7.8z"/></Icon></button>
                <button type="button" className="rounded-full bg-black/40 p-2"><Icon className="h-3 w-3"><path d="M8.6 19.4L15 13 8.6 6.6 10 5.2l7.8 7.8-7.8 7.8z"/></Icon></button>
                <div className="flex min-w-0 items-center gap-2 rounded-full bg-[#2a2a2a] px-3 py-2 text-sm text-zinc-300">
                  <Icon className="h-4 w-4"><path d="M10 2a8 8 0 105.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></Icon>
                  <input placeholder="What do you want to play?" className="w-48 bg-transparent text-sm outline-none sm:w-72" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" className="hidden rounded-full bg-white px-4 py-2 text-xs font-semibold text-black sm:block">Explore Premium</button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode(workspaceMode === 'admin' ? 'user' : 'admin')}
                    className="rounded-full bg-green-500 px-3 py-2 text-xs font-semibold text-black"
                  >
                    {workspaceMode === 'admin' ? 'User mode' : 'Admin mode'}
                  </button>
                )}
                <button type="button" className="rounded-full bg-zinc-800 px-3 py-2 text-xs">Install App</button>
                <button type="button" className="h-8 w-8 rounded-full bg-pink-500 text-sm font-bold text-black">{currentUser?.name?.[0] || 'S'}</button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
              <button type="button" className="rounded-full bg-white px-3 py-1 text-black">All</button>
              <button type="button" className="rounded-full bg-zinc-800 px-3 py-1">Music</button>
              <button type="button" className="rounded-full bg-zinc-800 px-3 py-1">Podcasts</button>
            </div>

            {workspaceMode === 'admin' && isAdmin ? (
              <div className="space-y-4">
                <section className="rounded-lg bg-[#181818] p-3">
                  <h2 className="mb-3 text-lg font-semibold">Admin song manager</h2>
                  <form className="grid gap-2 sm:grid-cols-2" onSubmit={handleCreateOrUpdateSong}>
                    <input name="title" value={adminSongForm.title} onChange={handleAdminSongInput} placeholder="Ten bai hat" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
                    <input name="artist" value={adminSongForm.artist} onChange={handleAdminSongInput} placeholder="Nghe si" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
                    <input name="genre" value={adminSongForm.genre} onChange={handleAdminSongInput} placeholder="The loai" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
                    <input name="audioUrl" value={adminSongForm.audioUrl} onChange={handleAdminSongInput} placeholder="Audio URL" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
                    <input name="coverUrl" value={adminSongForm.coverUrl} onChange={handleAdminSongInput} placeholder="Cover URL" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" />
                    <input name="duration" type="number" min="0" value={adminSongForm.duration} onChange={handleAdminSongInput} placeholder="Thoi luong (giay)" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" />
                    <div className="sm:col-span-2 flex gap-2">
                      <button type="submit" disabled={songMutationLoading} className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-black">
                        {songMutationLoading ? 'Dang luu...' : editingSongId ? 'Cap nhat bai hat' : 'Tao bai hat'}
                      </button>
                      {editingSongId && (
                        <button type="button" onClick={resetAdminSongForm} className="rounded-md bg-zinc-800 px-4 py-2 text-sm">Huy</button>
                      )}
                    </div>
                  </form>
                  {songMutationError && <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{songMutationError}</p>}
                </section>

                <section className="rounded-lg bg-[#181818] p-3">
                  <h2 className="mb-3 text-lg font-semibold">Danh sach bai hat</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="pb-2">Title</th>
                          <th className="pb-2">Artist</th>
                          <th className="pb-2">Genre</th>
                          <th className="pb-2">Time</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {songs.map((song) => (
                          <tr key={song._id} className="border-t border-white/6">
                            <td className="py-2">{song.title}</td>
                            <td className="py-2 text-zinc-400">{song.artist}</td>
                            <td className="py-2 text-zinc-400">{song.genre}</td>
                            <td className="py-2 text-zinc-400">{formatDuration(song.duration)}</td>
                            <td className="py-2 text-right">
                              <button type="button" onClick={() => handleEditSong(song)} className="mr-2 rounded bg-zinc-800 px-2 py-1 text-xs">Edit</button>
                              <button type="button" onClick={() => handleDeleteSong(song._id)} disabled={songMutationLoading} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : (
              <>
                {loading && <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400">Dang tai bai hat...</p>}
                {error && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}
                {playlistError && <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</p>}

                {!loading && !error && (
                  <>
                    <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {songs.slice(0, 8).map((song) => (
                        <button
                          type="button"
                          key={`quick-${song._id}`}
                          onClick={() => setCurrentTrackId(song._id)}
                          className="group flex items-center overflow-hidden rounded bg-white/10 text-left hover:bg-white/15"
                        >
                          <div className="h-12 w-12 overflow-hidden bg-zinc-800">
                            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="truncate px-3 text-sm font-semibold">{song.title}</div>
                        </button>
                      ))}
                    </div>

                    <section className="mb-8">
                      <div className="mb-3 flex items-end justify-between">
                        <h2 className="text-3xl font-bold">Recommended Stations</h2>
                        <button type="button" className="text-sm font-semibold text-zinc-400 hover:underline">Show all</button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {songs.slice(0, 10).map((song, index) => (
                          <article key={`station-${song._id}`} className="rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                            <button type="button" className="w-full text-left" onClick={() => setCurrentTrackId(song._id)}>
                              <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                                {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                              </div>
                              <p className="truncate text-2xl font-bold">{song.artist}</p>
                              <p className="mt-1 text-sm text-zinc-400">With {song.artist} and more</p>
                              <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Radio {index + 1}</p>
                            </button>
                            {currentUser && playlists.length > 0 && (
                              <div className="mt-3 flex gap-2">
                                <select
                                  value={selectedPlaylistBySong[song._id] || playlists[0]?._id || ''}
                                  onChange={(event) => {
                                    const value = event.target.value
                                    setSelectedPlaylistBySong((prev) => ({ ...prev, [song._id]: value }))
                                  }}
                                  className="min-w-0 flex-1 rounded-md bg-zinc-900 px-2 py-1 text-xs"
                                >
                                  {playlists.map((playlist) => (
                                    <option key={playlist._id} value={playlist._id}>{playlist.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={playlistActionLoadingId === `add-${song._id}`}
                                  onClick={() => handleAddSongToPlaylist(song._id)}
                                  className="rounded-md bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-70"
                                >
                                  {playlistActionLoadingId === `add-${song._id}` ? '...' : 'Add'}
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="mb-3 flex items-end justify-between">
                        <h2 className="text-3xl font-bold">Popular radio</h2>
                        <button type="button" className="text-sm font-semibold text-zinc-400 hover:underline">Show all</button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {songs.slice(5, 15).map((song) => (
                          <article key={`popular-${song._id}`} className="rounded-lg bg-[#181818] p-3 hover:bg-[#232323]">
                            <button type="button" className="w-full text-left" onClick={() => setCurrentTrackId(song._id)}>
                              <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                                {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : null}
                              </div>
                              <p className="truncate text-3xl font-black uppercase">{song.title}</p>
                              <p className="mt-1 text-sm text-zinc-400">With {song.artist} and friends</p>
                            </button>
                          </article>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </main>

        <aside className="rounded-lg bg-[#121212] p-2">
          <section className="rounded-lg bg-[#181818] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">GREY D Radio</h2>
              <button type="button" className="rounded-full bg-zinc-800 px-2 py-1 text-xs">+</button>
            </div>

            <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-zinc-900">
              {highlightedSong?.coverUrl ? (
                <img src={highlightedSong.coverUrl} alt={highlightedSong.title} className="h-full w-full object-cover" />
              ) : null}
            </div>

            <p className="truncate text-4xl font-black">{highlightedSong?.title || 'hoa ra...'}</p>
            <p className="text-xl text-zinc-400">{highlightedSong?.artist || 'GREY D'}</p>
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
              <form className="space-y-2" onSubmit={handleAuthSubmit}>
                <div className="inline-flex rounded-md bg-zinc-900 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setAuthError('')
                    }}
                    className={`rounded px-2 py-1 ${authMode === 'login' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                  >
                    Dang nhap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register')
                      setAuthError('')
                    }}
                    className={`rounded px-2 py-1 ${authMode === 'register' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                  >
                    Dang ky
                  </button>
                </div>

                {authMode === 'register' && (
                  <input
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthInput}
                    placeholder="Ho va ten"
                    className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
                    required
                  />
                )}
                <input
                  name="email"
                  type="email"
                  value={authForm.email}
                  onChange={handleAuthInput}
                  placeholder="email@cuaban.com"
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
                  required
                />
                <input
                  name="password"
                  type="password"
                  value={authForm.password}
                  onChange={handleAuthInput}
                  placeholder="Mat khau"
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
                  minLength={6}
                  required
                />
                {authError && <p className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">{authError}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-70"
                >
                  {authLoading ? 'Vui long cho...' : authMode === 'register' ? 'Tao tai khoan' : 'Dang nhap'}
                </button>
              </form>
            )}
          </section>

          {playlistError && (
            <section className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</section>
          )}
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#000000] px-4 py-2">
        <div className="mx-auto grid max-w-360 grid-cols-[1fr_1fr_1fr] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded bg-zinc-800">
              {highlightedSong?.coverUrl ? (
                <img src={highlightedSong.coverUrl} alt={highlightedSong.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{highlightedSong?.title || 'Chua co bai hat nao'}</p>
              <p className="truncate text-xs text-zinc-400">{highlightedSong?.artist || '---'}</p>
            </div>
            <button type="button" className="text-zinc-400 hover:text-white">
              <Icon className="h-4 w-4"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0116.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></Icon>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="mb-1 flex items-center gap-4 text-zinc-300">
              <button type="button" className="hover:text-white"><Icon><path d="M17 17V7h-2v3H9V7H7v10h2v-3h6v3h2z"/></Icon></button>
              <button type="button" className="hover:text-white"><Icon><path d="M15 18l-8-6 8-6z"/></Icon></button>
              <button type="button" className="rounded-full bg-white p-2 text-black hover:scale-105"><Icon className="h-4 w-4"><path d="M8 5v14l11-7z"/></Icon></button>
              <button type="button" className="hover:text-white"><Icon><path d="M9 6l8 6-8 6z"/></Icon></button>
              <button type="button" className="hover:text-white"><Icon><path d="M7 7h2v10H7zm8 0h2v10h-2z"/></Icon></button>
            </div>
            <div className="flex w-full max-w-md items-center gap-2 text-xs text-zinc-400">
              <span>0:01</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-700">
                <div className="h-full w-1/3 rounded-full bg-white" />
              </div>
              <span>{formatDuration(highlightedSong?.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 text-zinc-300">
            <button type="button" className="hover:text-white"><Icon><path d="M4 6h16v2H4zm0 5h10v2H4zm0 5h6v2H4z"/></Icon></button>
            <button type="button" className="hover:text-white"><Icon><path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" strokeWidth="2"/></Icon></button>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-700">
              <div className="h-full w-2/3 rounded-full bg-white" />
            </div>
            <button type="button" className="hover:text-white"><Icon><path d="M7 5h10v2H7zm0 6h10v2H7zm0 6h10v2H7z"/></Icon></button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
