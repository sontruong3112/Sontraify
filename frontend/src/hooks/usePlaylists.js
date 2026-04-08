import { useEffect, useState } from 'react'
import { playlistsApi } from '../api/client'

export function usePlaylists({ currentUser, accessToken } = {}) {
  const [playlists, setPlaylists] = useState([])
  const [playlistName, setPlaylistName] = useState('')
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState('')
  const [playlistActionLoadingId, setPlaylistActionLoadingId] = useState('')
  const [selectedPlaylistBySong, setSelectedPlaylistBySong] = useState({})

  const loadPlaylists = async () => {
    if (!currentUser || !accessToken) {
      setPlaylists([])
      return
    }

    try {
      setPlaylistLoading(true)
      setPlaylistError('')
      const data = await playlistsApi.listMine(accessToken)
      setPlaylists(Array.isArray(data?.items) ? data.items : [])
    } catch (requestError) {
      setPlaylists([])
      setPlaylistError(requestError.message || 'Khong the tai playlist')
    } finally {
      setPlaylistLoading(false)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [currentUser, accessToken])

  const handleCreatePlaylist = async (event) => {
    event.preventDefault()

    try {
      setPlaylistActionLoadingId('create')
      setPlaylistError('')
      await playlistsApi.create(accessToken, { name: playlistName.trim() })
      setPlaylistName('')
      await loadPlaylists()
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
      await loadPlaylists()
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
      await loadPlaylists()
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
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Khong the xoa playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  return {
    playlists,
    playlistName,
    setPlaylistName,
    playlistLoading,
    playlistError,
    setPlaylistError,
    playlistActionLoadingId,
    selectedPlaylistBySong,
    setSelectedPlaylistBySong,
    loadPlaylists,
    handleCreatePlaylist,
    handleAddSongToPlaylist,
    handleRemoveSongFromPlaylist,
    handleDeletePlaylist,
  }
}
