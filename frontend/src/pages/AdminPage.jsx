import React from 'react'
import { formatDuration } from '../utils/formatDuration'

function AdminPage({
  adminSongForm,
  handleAdminSongInput,
  handleCreateOrUpdateSong,
  audioFileInputRef,
  audioUploadLoading,
  songMutationLoading,
  handleUploadAudio,
  coverFileInputRef,
  coverUploadLoading,
  handleUploadCover,
  editingSongId,
  resetAdminSongForm,
  songMutationError,
  songs,
  handleEditSong,
  handleDeleteSong,
  adminUsers = [],
  adminUsersLoading = false,
  adminUsersError = '',
  onRefreshAdminUsers = () => {},
  onChangeUserRole = () => {},
  onDeleteUser = () => {},
  onResetUserPassword = () => {},
  notificationForm = { title: '', message: '', targetUserId: '', sendToAll: false },
  onNotificationFormChange = () => {},
  onSendNotification = () => {},
  sendingNotification = false,
  currentUserId = '',
  artistLibrary = [],
  artistLibraryLoading = false,
  artistLibraryError = '',
  adminArtistForm = { name: '', bio: '', avatarUrl: '', bannerUrl: '' },
  onAdminArtistInput = () => {},
  onCreateArtist = () => {},
  onEditArtist = () => {},
  onDeleteArtist = () => {},
  adminAlbumForm = { artistId: '', title: '', coverUrl: '', description: '', releaseDate: '' },
  onAdminAlbumInput = () => {},
  onCreateAlbum = () => {},
  adminAlbumSongForm = { artistId: '', albumId: '', songId: '' },
  onAdminAlbumSongInput = () => {},
  onAddSongToAlbum = () => {},
  artistMutationLoading = false,
}) {
  const selectedArtist = artistLibrary.find((artist) => artist.id === adminAlbumSongForm.artistId) || null
  const selectedAlbums = Array.isArray(selectedArtist?.albums) ? selectedArtist.albums : []

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Admin song manager</h2>
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={handleCreateOrUpdateSong}>
          <input name="title" value={adminSongForm.title} onChange={handleAdminSongInput} placeholder="Song title" className="rounded-md bg-zinc-900 px-3 py-3 text-base font-medium" required />
          <select name="artist" value={adminSongForm.artist} onChange={handleAdminSongInput} className="rounded-md bg-zinc-900 px-3 py-3 text-base font-medium" required>
            <option value="">Select artist</option>
            {artistLibrary.map((artist) => (
              <option key={`song-artist-${artist.id}`} value={artist.name}>{artist.name}</option>
            ))}
          </select>
          <input name="genre" value={adminSongForm.genre} onChange={handleAdminSongInput} placeholder="Genre" className="rounded-md bg-zinc-900 px-3 py-3 text-base font-medium" required />
          <input name="audioUrl" value={adminSongForm.audioUrl} onChange={handleAdminSongInput} placeholder="Audio URL" className="rounded-md bg-zinc-900 px-3 py-3 text-base font-medium" required />
          <input name="coverUrl" value={adminSongForm.coverUrl} onChange={handleAdminSongInput} placeholder="Cover URL" className="rounded-md bg-zinc-900 px-3 py-3 text-base font-medium" />
          <div className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={audioUploadLoading || songMutationLoading}
              className="type-button-lg w-full rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700 disabled:opacity-70 font-medium"
            >
              {audioUploadLoading ? 'Uploading audio...' : 'Upload audio file'}
            </button>
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUploadAudio}
              disabled={audioUploadLoading || songMutationLoading}
              className="hidden"
            />
          </div>
          <div className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={coverUploadLoading || songMutationLoading}
              className="type-button-lg w-full rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700 disabled:opacity-70 font-medium"
            >
              {coverUploadLoading ? 'Uploading cover...' : 'Upload cover image'}
            </button>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadCover}
              disabled={coverUploadLoading || songMutationLoading}
              className="hidden"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={songMutationLoading} className="type-button-lg rounded-md bg-white px-4 py-3 text-black font-semibold">
              {songMutationLoading ? 'Saving...' : editingSongId ? 'Update song' : 'Create song'}
            </button>
            {editingSongId && (
              <button type="button" onClick={resetAdminSongForm} className="type-button-lg rounded-md bg-zinc-800 px-4 py-3">Cancel</button>
            )}
          </div>
        </form>
        {songMutationError && <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{songMutationError}</p>}
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Song list</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="type-table-head text-zinc-500">
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
                    <button type="button" onClick={() => handleEditSong(song)} className="type-button-sm mr-2 rounded bg-zinc-800 px-2 py-1">Edit</button>
                    <button type="button" onClick={() => handleDeleteSong(song._id)} disabled={songMutationLoading} className="type-button-sm rounded bg-red-500/20 px-2 py-1 text-red-200">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">User management</h2>
          <button
            type="button"
            onClick={onRefreshAdminUsers}
            className="type-button-sm rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>

        {adminUsersLoading ? <p className="text-sm text-zinc-400">Loading users...</p> : null}
        {adminUsersError ? <p className="mb-2 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{adminUsersError}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="type-table-head text-zinc-500">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Created</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => {
                const isSelf = user.id === currentUserId

                return (
                  <tr key={user.id} className="border-t border-white/6">
                    <td className="py-2">{user.name}</td>
                    <td className="py-2 text-zinc-400">{user.email}</td>
                    <td className="py-2">
                      <select
                        value={user.role}
                        onChange={(event) => onChangeUserRole(user.id, event.target.value)}
                        disabled={isSelf}
                        className="rounded bg-zinc-900 px-2 py-1 text-xs"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2 text-zinc-400">{new Date(user.createdAt).toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onResetUserPassword(user.id)}
                        disabled={isSelf}
                        className="type-button-sm mr-2 rounded bg-amber-500/20 px-2 py-1 text-amber-200 disabled:opacity-40"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteUser(user.id)}
                        disabled={isSelf}
                        className="type-button-sm rounded bg-red-500/20 px-2 py-1 text-red-200 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Send notifications</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            name="title"
            value={notificationForm.title}
            onChange={onNotificationFormChange}
            placeholder="Notification title"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm"
          />
          <select
            name="targetUserId"
            value={notificationForm.targetUserId}
            onChange={onNotificationFormChange}
            disabled={notificationForm.sendToAll}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">Select specific user</option>
            {adminUsers.map((user) => (
              <option key={`notify-${user.id}`} value={user.id}>{user.name} - {user.email}</option>
            ))}
          </select>
          <textarea
            name="message"
            value={notificationForm.message}
            onChange={onNotificationFormChange}
            placeholder="Notification message"
            className="sm:col-span-2 min-h-24 rounded-md bg-zinc-900 px-3 py-2 text-sm"
          />
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="sendToAll"
              checked={notificationForm.sendToAll}
              onChange={onNotificationFormChange}
            />
            Send to all users
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={onSendNotification}
              disabled={sendingNotification}
              className="type-button-sm rounded-md bg-blue-500 px-4 py-2 text-black disabled:opacity-70"
            >
              {sendingNotification ? 'Sending...' : 'Send notification'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Artists</h2>
        {artistLibraryLoading ? <p className="mt-3 text-sm text-zinc-400">Loading artists...</p> : null}
        {artistLibraryError ? <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{artistLibraryError}</p> : null}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="type-table-head text-zinc-500">
              <tr>
                <th className="pb-2">Artist</th>
                <th className="pb-2">Albums</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {artistLibrary.map((artist) => (
                <tr key={`artist-row-${artist.id}`} className="border-t border-white/6">
                  <td className="py-2">{artist.name}</td>
                  <td className="py-2 text-zinc-400">{Array.isArray(artist.albums) ? artist.albums.length : 0}</td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => onEditArtist(artist)} className="type-button-sm mr-2 rounded bg-zinc-800 px-2 py-1">Edit</button>
                    <button type="button" onClick={() => onDeleteArtist(artist.id || artist._id)} disabled={artistMutationLoading} className="type-button-sm rounded bg-red-500/20 px-2 py-1 text-red-200">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Artist and album manager</h2>

        <div className="grid gap-3 lg:grid-cols-2">
          <form className="space-y-2 rounded-md bg-zinc-900/50 p-3" onSubmit={onCreateArtist}>
            <p className="text-sm font-semibold text-zinc-100">Create artist</p>
            <input name="name" value={adminArtistForm.name} onChange={onAdminArtistInput} placeholder="Artist name" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
            <input name="avatarUrl" value={adminArtistForm.avatarUrl} onChange={onAdminArtistInput} placeholder="Avatar URL" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" />
            <input name="bannerUrl" value={adminArtistForm.bannerUrl} onChange={onAdminArtistInput} placeholder="Banner URL" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" />
            <textarea name="bio" value={adminArtistForm.bio} onChange={onAdminArtistInput} placeholder="Artist bio" className="min-h-20 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" />
            <button type="submit" disabled={artistMutationLoading} className="type-button-sm rounded-md bg-white px-4 py-2 text-black disabled:opacity-70">
              {artistMutationLoading ? 'Saving...' : 'Create artist'}
            </button>
          </form>

          <form className="space-y-2 rounded-md bg-zinc-900/50 p-3" onSubmit={onCreateAlbum}>
            <p className="text-sm font-semibold text-zinc-100">Create album</p>
            <select name="artistId" value={adminAlbumForm.artistId} onChange={onAdminAlbumInput} className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" required>
              <option value="">Select artist</option>
              {artistLibrary.map((artist) => (
                <option key={`artist-album-${artist.id}`} value={artist.id}>{artist.name}</option>
              ))}
            </select>
            <input name="title" value={adminAlbumForm.title} onChange={onAdminAlbumInput} placeholder="Album title" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
            <input name="coverUrl" value={adminAlbumForm.coverUrl} onChange={onAdminAlbumInput} placeholder="Album cover URL" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" />
            <input name="releaseDate" type="date" value={adminAlbumForm.releaseDate} onChange={onAdminAlbumInput} className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" />
            <textarea name="description" value={adminAlbumForm.description} onChange={onAdminAlbumInput} placeholder="Album description" className="min-h-20 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm" />
            <button type="submit" disabled={artistMutationLoading} className="type-button-sm rounded-md bg-cyan-500 px-4 py-2 text-black disabled:opacity-70">
              {artistMutationLoading ? 'Saving...' : 'Create album'}
            </button>
          </form>
        </div>

        <form className="mt-3 grid gap-2 rounded-md bg-zinc-900/50 p-3 sm:grid-cols-4" onSubmit={onAddSongToAlbum}>
          <select name="artistId" value={adminAlbumSongForm.artistId} onChange={onAdminAlbumSongInput} className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required>
            <option value="">Artist</option>
            {artistLibrary.map((artist) => (
              <option key={`assign-artist-${artist.id}`} value={artist.id}>{artist.name}</option>
            ))}
          </select>
          <select name="albumId" value={adminAlbumSongForm.albumId} onChange={onAdminAlbumSongInput} className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required>
            <option value="">Album</option>
            {selectedAlbums.map((album) => (
              <option key={`assign-album-${album.id}`} value={album.id}>{album.title}</option>
            ))}
          </select>
          <select name="songId" value={adminAlbumSongForm.songId} onChange={onAdminAlbumSongInput} className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required>
            <option value="">Song</option>
            {songs.map((song) => (
              <option key={`assign-song-${song._id}`} value={song._id}>{song.title} - {song.artist}</option>
            ))}
          </select>
          <button type="submit" disabled={artistMutationLoading} className="type-button-sm rounded-md bg-amber-400 px-4 py-2 text-black disabled:opacity-70">
            {artistMutationLoading ? 'Saving...' : 'Add song to album'}
          </button>
        </form>

        {artistLibraryLoading ? <p className="mt-3 text-sm text-zinc-400">Loading artists...</p> : null}
        {artistLibraryError ? <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{artistLibraryError}</p> : null}
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Admin song manager</h2>
        {/* song create is above; keep this area for management below if needed */}
      </section>
    </div>
  )
}

export default AdminPage


