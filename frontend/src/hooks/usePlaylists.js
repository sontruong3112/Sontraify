import { useEffect, useState } from 'react'
import { playlistsApi, uploadsApi } from '../api/client'

export function usePlaylists({ currentUser, accessToken } = {}) {
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState('')
  const [playlistActionLoadingId, setPlaylistActionLoadingId] = useState('')
  const [playlistCoverUploadLoading, setPlaylistCoverUploadLoading] = useState(false)
  const [selectedPlaylistBySong, setSelectedPlaylistBySong] = useState({})

  const uploadPlaylistCoverToCloudinary = async (file) => {
    if (!accessToken) {
      throw new Error('Vui lòng đăng nhập trước khi upload cover')
    }

    const signedData = await uploadsApi.createSignature(accessToken, {
      resourceType: 'image',
      folder: 'music-app/playlist-covers',
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', signedData.apiKey)
    formData.append('timestamp', String(signedData.timestamp))
    formData.append('signature', signedData.signature)
    formData.append('folder', signedData.folder)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signedData.cloudName}/${signedData.resourceType}/upload`
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Upload Cloudinary thất bại')
    }

    return data.secure_url || data.url || ''
  }

  const loadPlaylists = async () => {
    if (!currentUser || !accessToken) {
      setPlaylists([])
      setSelectedPlaylistId('')
      return
    }

    try {
      setPlaylistLoading(true)
      setPlaylistError('')
      const data = await playlistsApi.listMine(accessToken)
      const items = Array.isArray(data?.items) ? data.items : []
      setPlaylists(items)

      setSelectedPlaylistId((prev) => {
        if (!items.length) {
          return ''
        }

        if (prev && items.some((playlist) => playlist._id === prev)) {
          return prev
        }

        return items[0]._id
      })
    } catch (requestError) {
      setPlaylists([])
      setSelectedPlaylistId('')
      setPlaylistError(requestError.message || 'Không thể tải playlist')
    } finally {
      setPlaylistLoading(false)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [currentUser, accessToken])

  const handleCreatePlaylist = async (event) => {
    event.preventDefault()

    const normalizedName = playlistName.trim()

    if (!normalizedName) {
      setPlaylistError('Tên playlist không được để trống')
      return
    }

    if (playlists.some((playlist) => playlist.name.toLowerCase() === normalizedName.toLowerCase())) {
      setPlaylistError('Playlist này đã tồn tại')
      return
    }

    try {
      setPlaylistActionLoadingId('create')
      setPlaylistError('')
      await playlistsApi.create(accessToken, { name: normalizedName })
      setPlaylistName('')
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể tạo playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleAddSongToPlaylist = async (songId, playlistIdOverride = '') => {
    const selectedId = playlistIdOverride || selectedPlaylistBySong[songId] || playlists[0]?._id

    if (!selectedId) {
      setPlaylistError('Vui lòng tạo playlist trước')
      return
    }

    try {
      setPlaylistActionLoadingId(`add-${songId}`)
      setPlaylistError('')
      await playlistsApi.addSong(accessToken, selectedId, songId)
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể thêm bài hát vào playlist')
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
      setPlaylistError(requestError.message || 'Không thể xóa bài hát khoi playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleMoveSongInPlaylist = async (playlistId, index, direction) => {
    if (!playlistId) {
      return
    }

    try {
      setPlaylistActionLoadingId(`reorder-${playlistId}-${index}`)
      setPlaylistError('')
      await playlistsApi.reorderSong(accessToken, playlistId, { index, direction })
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể sắp xếp lại playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleReorderSongsInPlaylist = async (playlistId, fromIndex, toIndex) => {
    if (!playlistId) {
      return false
    }

    if (fromIndex === toIndex) {
      return true
    }

    if (fromIndex < 0 || toIndex < 0) {
      return false
    }

    const direction = fromIndex < toIndex ? 1 : -1

    try {
      setPlaylistActionLoadingId(`reorder-drag-${playlistId}`)
      setPlaylistError('')

      let currentIndex = fromIndex

      while (currentIndex !== toIndex) {
        await playlistsApi.reorderSong(accessToken, playlistId, {
          index: currentIndex,
          direction,
        })

        currentIndex += direction
      }

      await loadPlaylists()
      return true
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể sắp xếp lại playlist')
      return false
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleDeletePlaylist = async (playlistId) => {
    try {
      setPlaylistActionLoadingId(`delete-${playlistId}`)
      setPlaylistError('')
      await playlistsApi.delete(accessToken, playlistId)
      setSelectedPlaylistId((prev) => (prev === playlistId ? '' : prev))
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể xóa playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleRenamePlaylist = async (playlistId, nextNameRaw) => {
    const normalizedName = String(nextNameRaw || '').trim()

    if (!playlistId) {
      return
    }

    if (!normalizedName) {
      setPlaylistError('Tên playlist không được để trống')
      return
    }

    if (playlists.some((playlist) => playlist._id !== playlistId && playlist.name.toLowerCase() === normalizedName.toLowerCase())) {
      setPlaylistError('Playlist này đã tồn tại')
      return
    }

    try {
      setPlaylistActionLoadingId(`rename-${playlistId}`)
      setPlaylistError('')
      await playlistsApi.update(accessToken, playlistId, { name: normalizedName })
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể cập nhật playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleUpdatePlaylistCover = async (playlistId, coverUrlRaw) => {
    const coverUrl = String(coverUrlRaw || '').trim()

    if (!playlistId) {
      return
    }

    try {
      setPlaylistActionLoadingId(`cover-${playlistId}`)
      setPlaylistError('')
      await playlistsApi.update(accessToken, playlistId, { coverUrl })
      await loadPlaylists()
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể cập nhật ảnh bìa playlist')
    } finally {
      setPlaylistActionLoadingId('')
    }
  }

  const handleUploadPlaylistCover = async (playlistId, file) => {
    if (!playlistId || !file) {
      return false
    }

    try {
      setPlaylistCoverUploadLoading(true)
      setPlaylistError('')
      const uploadedUrl = await uploadPlaylistCoverToCloudinary(file)

      if (!uploadedUrl) {
        throw new Error('Không nhận được URL cover từ Cloudinary')
      }

      await playlistsApi.update(accessToken, playlistId, { coverUrl: uploadedUrl })
      await loadPlaylists()
      return true
    } catch (requestError) {
      setPlaylistError(requestError.message || 'Không thể upload ảnh bìa playlist')
      return false
    } finally {
      setPlaylistCoverUploadLoading(false)
    }
  }

  return {
    playlists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistName,
    setPlaylistName,
    playlistLoading,
    playlistError,
    setPlaylistError,
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
  }
}

