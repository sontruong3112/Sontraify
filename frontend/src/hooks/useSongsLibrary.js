import { useEffect, useState } from 'react'
import { songsApi, uploadsApi } from '../api/client'

const readAudioDuration = (file) => {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    const objectUrl = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      audio.removeAttribute('src')
      audio.load()
    }

    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const seconds = Math.round(Number(audio.duration) || 0)
      cleanup()

      if (!Number.isFinite(seconds) || seconds <= 0) {
        reject(new Error('Không thể đọc thời lượng của file nhạc'))
        return
      }

      resolve(seconds)
    }

    audio.onerror = () => {
      cleanup()
      reject(new Error('Không thể đọc metadata của file nhạc'))
    }

    audio.src = objectUrl
  })
}

export function useSongsLibrary({ accessToken, initialTrackId, onSongsChanged } = {}) {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [songMutationLoading, setSongMutationLoading] = useState(false)
  const [audioUploadLoading, setAudioUploadLoading] = useState(false)
  const [coverUploadLoading, setCoverUploadLoading] = useState(false)
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

  const loadSongs = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await songsApi.list({ page: 1, limit: 24 })
      const items = Array.isArray(data?.items) ? data.items : []
      setSongs(items)

      if (items.length > 0 && !initialTrackId) {
        onSongsChanged?.(items)
      }
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải bài hát lúc này')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSongs()
  }, [])

  const handleAdminSongInput = (event) => {
    const { name, value } = event.target
    setAdminSongForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetAdminSongForm = () => {
    setEditingSongId('')
    setSongMutationError('')
    setAdminSongForm({
      title: '',
      artist: '',
      genre: '',
      audioUrl: '',
      coverUrl: '',
      duration: '',
    })
  }

  const uploadToCloudinary = async ({ file, resourceType, folder }) => {
    if (!accessToken) {
      throw new Error('Vui lòng đăng nhập admin trước khi upload')
    }

    const signedData = await uploadsApi.createSignature(accessToken, {
      resourceType,
      folder,
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

  const handleUploadAudio = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setAudioUploadLoading(true)
      setSongMutationError('')
      const duration = await readAudioDuration(file)
      const uploadedUrl = await uploadToCloudinary({
        file,
        resourceType: 'video',
        folder: 'music-app/audio',
      })

      if (!uploadedUrl) {
        throw new Error('Không nhận được URL file nhạc từ Cloudinary')
      }

      setAdminSongForm((prev) => ({
        ...prev,
        audioUrl: uploadedUrl,
        duration: String(duration),
      }))
    } catch (requestError) {
      setSongMutationError(requestError.message || 'Upload file nhạc thất bại')
    } finally {
      setAudioUploadLoading(false)
    }
  }

  const handleUploadCover = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setCoverUploadLoading(true)
      setSongMutationError('')
      const uploadedUrl = await uploadToCloudinary({
        file,
        resourceType: 'image',
        folder: 'music-app/covers',
      })

      if (!uploadedUrl) {
        throw new Error('Không nhận được URL cover từ Cloudinary')
      }

      setAdminSongForm((prev) => ({ ...prev, coverUrl: uploadedUrl }))
    } catch (requestError) {
      setSongMutationError(requestError.message || 'Upload cover thất bại')
    } finally {
      setCoverUploadLoading(false)
    }
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
      await onSongsChanged?.()
    } catch (requestError) {
      setSongMutationError(requestError.message || 'Không thể lưu bài hát')
    } finally {
      setSongMutationLoading(false)
    }
  }

  const startEditSong = (song) => {
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
  }

  const handleDeleteSong = async (songId) => {
    try {
      setSongMutationLoading(true)
      setSongMutationError('')
      await songsApi.remove(accessToken, songId)
      await loadSongs()
      await onSongsChanged?.()

      if (editingSongId === songId) {
        resetAdminSongForm()
      }
    } catch (requestError) {
      setSongMutationError(requestError.message || 'Không thể xóa bài hát')
    } finally {
      setSongMutationLoading(false)
    }
  }

  return {
    songs,
    loading,
    error,
    setError,
    loadSongs,
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
  }
}

