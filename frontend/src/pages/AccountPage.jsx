import React, { useEffect, useState } from 'react'
import { uploadsApi } from '../api/client'

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024

function AccountPage({
  currentUser,
  likedSongsCount = 0,
  recentlyPlayedCount = 0,
  queueCount = 0,
  accessToken = '',
  onUpdateProfile = async () => {},
  onLogout = () => {},
  authLoading = false,
  onBackHome = () => {},
}) {
  const [name, setName] = useState(currentUser?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')

  useEffect(() => {
    setName(currentUser?.name || '')
    setAvatarUrl(currentUser?.avatarUrl || '')
  }, [currentUser?.name, currentUser?.avatarUrl])

  const stats = [
    { label: 'Liked songs', value: likedSongsCount },
    { label: 'Recently played', value: recentlyPlayedCount },
    { label: 'Queue items', value: queueCount },
  ]

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedName = name.trim()
    const normalizedAvatarUrl = avatarUrl.trim()

    if (!normalizedName) {
      setProfileMessage('Ten hien thi khong duoc de trong')
      return
    }

    if (normalizedAvatarUrl) {
      try {
        const parsed = new URL(normalizedAvatarUrl)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('invalid_protocol')
        }
      } catch {
        setProfileMessage('Avatar URL khong hop le (chi chap nhan http/https)')
        return
      }
    }

    try {
      setSaving(true)
      setProfileMessage('')
      await onUpdateProfile({ name: normalizedName, avatarUrl: normalizedAvatarUrl })
      setProfileMessage('Cap nhat tai khoan thanh cong')
    } catch (error) {
      setProfileMessage(error?.message || 'Cap nhat tai khoan that bai')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadAvatarFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!String(file.type || '').startsWith('image/')) {
      setProfileMessage('Chi cho phep upload file anh')
      return
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      setProfileMessage('Kich thuoc avatar toi da 5MB')
      return
    }

    if (!accessToken) {
      setProfileMessage('Vui long dang nhap lai de upload avatar')
      return
    }

    try {
      setAvatarUploading(true)
      setProfileMessage('')

      const signedData = await uploadsApi.createSignature(accessToken, {
        resourceType: 'image',
        folder: 'music-app/avatars',
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
        throw new Error(data?.error?.message || 'Upload avatar that bai')
      }

      const uploadedUrl = data.secure_url || data.url || ''

      if (!uploadedUrl) {
        throw new Error('Khong nhan duoc URL avatar sau khi upload')
      }

      setAvatarUrl(uploadedUrl)
      setProfileMessage('Upload avatar thanh cong, bam Save profile de luu')
    } catch (error) {
      setProfileMessage(error?.message || 'Upload avatar that bai')
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-linear-to-b from-[#191919] via-[#121212] to-[#0b0b0b] p-6 shadow-2xl shadow-black/50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Account</p>
          <h1 className="mt-1 truncate text-3xl font-black text-white">{currentUser?.name || 'Nguoi dung'}</h1>
          <p className="mt-1 truncate text-sm text-zinc-400">{currentUser?.email || ''}</p>
          <p className="mt-1 text-xs text-zinc-500">Role: {currentUser?.role || 'user'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackHome}
            className="type-button-sm rounded-full border border-white/15 px-4 py-2 text-zinc-200 hover:bg-white/10"
          >
            Back to Home
          </button>
          <button
            type="button"
            onClick={onLogout}
            disabled={authLoading}
            className="type-button-sm rounded-full bg-white px-4 py-2 text-black disabled:opacity-70"
          >
            {authLoading ? 'Dang dang xuat...' : 'Log out'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{item.value}</p>
          </article>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="text-sm font-semibold text-white">Profile</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Display name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Avatar URL
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              maxLength={500}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="type-button-sm inline-flex cursor-pointer items-center rounded-full border border-white/20 px-3 py-2 text-zinc-100 hover:bg-white/10">
            {avatarUploading ? 'Dang upload avatar...' : 'Upload avatar file'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadAvatarFile}
              className="hidden"
              disabled={avatarUploading}
            />
          </label>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Avatar preview"
              className="h-10 w-10 rounded-full object-cover"
            />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">Thong tin se duoc luu vao tai khoan hien tai.</p>
          <button
            type="submit"
            disabled={saving || avatarUploading}
            className="type-button-sm rounded-full bg-green-500 px-4 py-2 font-semibold text-black disabled:opacity-70"
          >
            {saving ? 'Dang luu...' : 'Save profile'}
          </button>
        </div>
        {profileMessage && (
          <p className={`mt-3 rounded px-2 py-1 text-xs ${profileMessage.includes('thanh cong') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-200'}`}>
            {profileMessage}
          </p>
        )}
      </form>

      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="text-sm font-semibold text-white">Authentication Flow Status</p>
        <p className="mt-2 text-sm text-zinc-300">
          Ban da dang nhap thanh cong. Session/token dang hoat dong va cac tinh nang ca nhan da mo.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-400">
          <li>- Kiem tra avatar top-right cap nhat sau khi Save profile</li>
          <li>- Kiem tra route /account bi chuyen qua /login neu chua dang nhap</li>
          <li>- Kiem tra thao tac Like/Queue/Playlist yeu cau dang nhap</li>
        </ul>
      </div>
    </section>
  )
}

export default AccountPage
