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
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Admin song manager</h2>
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={handleCreateOrUpdateSong}>
          <input name="title" value={adminSongForm.title} onChange={handleAdminSongInput} placeholder="Ten bài hát" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
          <input name="artist" value={adminSongForm.artist} onChange={handleAdminSongInput} placeholder="Nghe si" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
          <input name="genre" value={adminSongForm.genre} onChange={handleAdminSongInput} placeholder="The loai" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
          <input name="audioUrl" value={adminSongForm.audioUrl} onChange={handleAdminSongInput} placeholder="Audio URL" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" required />
          <input name="coverUrl" value={adminSongForm.coverUrl} onChange={handleAdminSongInput} placeholder="Cover URL" className="rounded-md bg-zinc-900 px-3 py-2 text-sm" />
          <div className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={audioUploadLoading || songMutationLoading}
              className="type-button-sm w-full rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700 disabled:opacity-70"
            >
              {audioUploadLoading ? 'Đang upload bài hát...' : 'Tải bài hát từ máy tính'}
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
              className="type-button-sm w-full rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700 disabled:opacity-70"
            >
              {coverUploadLoading ? 'Đang upload cover...' : 'Tải ảnh cover'}
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
            <button type="submit" disabled={songMutationLoading} className="type-button-sm rounded-md bg-green-500 px-4 py-2 text-black">
              {songMutationLoading ? 'Đang lưu...' : editingSongId ? 'Cập nhật bài hát' : 'Tạo bài hát'}
            </button>
            {editingSongId && (
              <button type="button" onClick={resetAdminSongForm} className="type-button-sm rounded-md bg-zinc-800 px-4 py-2">Huy</button>
            )}
          </div>
        </form>
        {songMutationError && <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{songMutationError}</p>}
      </section>

      <section className="rounded-lg bg-[#181818] p-3">
        <h2 className="mb-3 text-lg font-semibold">Danh sach bài hát</h2>
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
          <h2 className="text-lg font-semibold">Quan ly nguoi dung</h2>
          <button
            type="button"
            onClick={onRefreshAdminUsers}
            className="type-button-sm rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>

        {adminUsersLoading ? <p className="text-sm text-zinc-400">Dang tai danh sach user...</p> : null}
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
        <h2 className="mb-3 text-lg font-semibold">Gui thong bao</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            name="title"
            value={notificationForm.title}
            onChange={onNotificationFormChange}
            placeholder="Tieu de thong bao"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm"
          />
          <select
            name="targetUserId"
            value={notificationForm.targetUserId}
            onChange={onNotificationFormChange}
            disabled={notificationForm.sendToAll}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">Chon nguoi dung cu the</option>
            {adminUsers.map((user) => (
              <option key={`notify-${user.id}`} value={user.id}>{user.name} - {user.email}</option>
            ))}
          </select>
          <textarea
            name="message"
            value={notificationForm.message}
            onChange={onNotificationFormChange}
            placeholder="Noi dung thong bao"
            className="sm:col-span-2 min-h-24 rounded-md bg-zinc-900 px-3 py-2 text-sm"
          />
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="sendToAll"
              checked={notificationForm.sendToAll}
              onChange={onNotificationFormChange}
            />
            Gui cho tat ca nguoi dung
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={onSendNotification}
              disabled={sendingNotification}
              className="type-button-sm rounded-md bg-blue-500 px-4 py-2 text-black disabled:opacity-70"
            >
              {sendingNotification ? 'Dang gui...' : 'Gui thong bao'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminPage


