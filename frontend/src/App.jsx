import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import UserPage from './pages/UserPage'

const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {children}
  </svg>
)

function App() {
  const [currentTrackId, setCurrentTrackId] = useState(getInitialTrackId)
  const [searchQuery, setSearchQuery] = useState('')
  const audioFileInputRef = useRef(null)
  const coverFileInputRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

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
    handleLogout,
  } = useAuthSession({
    onSessionCleared: () => {
      setSearchQuery('')
    },
  })

  const {
    playlists,
    playlistName,
    setPlaylistName,
    playlistLoading,
    playlistError,
    playlistActionLoadingId,
    selectedPlaylistBySong,
    setSelectedPlaylistBySong,
    loadPlaylists,
    handleCreatePlaylist,
    handleAddSongToPlaylist,
    handleRemoveSongFromPlaylist,
    handleDeletePlaylist,
  } = usePlaylists({
    currentUser,
    accessToken,
  })

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

  const popularSongs = useMemo(() => {
    const section = filteredSongs.slice(5, 15)
    return section.length > 0 ? section : filteredSongs.slice(0, 10)
  }, [filteredSongs])

  const {
    isPlaying,
    repeatMode,
    isShuffle,
    playbackTime,
    trackDuration,
    volume,
    setVolume,
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
    seek: handleSeek,
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
    onError: setSongMutationError,
  })

  const handleGoHome = () => {
    navigate('/')
    setSearchQuery('')
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

  return (
    <AppShell
      leftSidebar={(
        <LeftSidebar
          Icon={Icon}
          handleGoHome={handleGoHome}
          currentUser={currentUser}
          handleCreatePlaylist={handleCreatePlaylist}
          playlistName={playlistName}
          setPlaylistName={setPlaylistName}
          playlistActionLoadingId={playlistActionLoadingId}
          playlistLoading={playlistLoading}
          playlists={playlists}
          handleDeletePlaylist={handleDeletePlaylist}
          artists={artists}
          playTrackById={playTrackById}
        />
      )}

      mainContent={(
        <main className="rounded-lg bg-[#121212] p-2">
          <div className="rounded-lg bg-linear-to-b from-[#1a1f4d] via-[#121212] to-[#121212] p-4">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" className="rounded-full bg-black/40 p-2"><Icon className="h-3 w-3"><path d="M15.4 4.6L9 11l6.4 6.4-1.4 1.4L6.2 11l7.8-7.8z"/></Icon></button>
                <button type="button" className="rounded-full bg-black/40 p-2"><Icon className="h-3 w-3"><path d="M8.6 19.4L15 13 8.6 6.6 10 5.2l7.8 7.8-7.8 7.8z"/></Icon></button>
                <div className="flex min-w-0 items-center gap-2 rounded-full bg-[#2a2a2a] px-3 py-2 text-sm text-zinc-300">
                  <Icon className="h-4 w-4"><path d="M10 2a8 8 0 105.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></Icon>
                  <input
                    placeholder="What do you want to play?"
                    className="w-48 bg-transparent text-sm outline-none sm:w-72"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" className="hidden rounded-full bg-white px-4 py-2 text-xs font-semibold text-black sm:block">Explore Premium</button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => (isAdminRoute ? navigate('/') : handleOpenAdmin())}
                    className="rounded-full bg-green-500 px-3 py-2 text-xs font-semibold text-black"
                  >
                    {isAdminRoute ? 'User mode' : 'Admin mode'}
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

            {isAdminRoute ? (
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
            ) : (
              <UserPage
                currentUser={currentUser}
                loading={loading}
                error={error}
                playlistError={playlistError}
                filteredSongs={filteredSongs}
                playTrackById={playTrackById}
                recommendedSongs={recommendedSongs}
                playlists={playlists}
                selectedPlaylistBySong={selectedPlaylistBySong}
                setSelectedPlaylistBySong={setSelectedPlaylistBySong}
                playlistActionLoadingId={playlistActionLoadingId}
                handleAddSongToPlaylist={handleAddSongToPlaylist}
                popularSongs={popularSongs}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </main>
      )}

      rightSidebar={(
        <RightSidebar
          highlightedSong={highlightedSong}
          sessionLoading={sessionLoading}
          currentUser={currentUser}
          authLoading={authLoading}
          handleLogout={handleLogout}
          handleAuthSubmit={handleAuthSubmit}
          authMode={authMode}
          setAuthMode={setAuthMode}
          setAuthError={setAuthError}
          authForm={authForm}
          handleAuthInput={handleAuthInput}
          authError={authError}
          playlistError={playlistError}
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
        />
      )}
    />
  )
}

export default App
