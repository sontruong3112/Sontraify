function AdminSongsPanel({
  visible,
  adminSongForm,
  songMutationError,
  songMutationLoading,
  editingSongId,
  onAdminSongInput,
  onCreateOrUpdateSong,
  onResetAdminSongForm,
}) {
  if (!visible) {
    return null
  }

  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <h3 className="display-font text-xl">Quản Trị Bài Hát</h3>
      <p className="mt-2 text-xs text-stone-600">
        Tạo mới hoặc cập nhật bài hát trực tiếp tại đây.
      </p>

      <form className="mt-4 grid gap-2" onSubmit={onCreateOrUpdateSong}>
        <input
          name="title"
          value={adminSongForm.title}
          onChange={onAdminSongInput}
          placeholder="Tên bài hát"
          className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
          required
        />
        <input
          name="artist"
          value={adminSongForm.artist}
          onChange={onAdminSongInput}
          placeholder="Nghệ sĩ"
          className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
          required
        />
        <input
          name="genre"
          value={adminSongForm.genre}
          onChange={onAdminSongInput}
          placeholder="Thể loại"
          className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
          required
        />
        <input
          name="audioUrl"
          value={adminSongForm.audioUrl}
          onChange={onAdminSongInput}
          placeholder="Đường dẫn âm thanh"
          className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
          required
        />
        <input
          name="coverUrl"
          value={adminSongForm.coverUrl}
          onChange={onAdminSongInput}
          placeholder="Đường dẫn ảnh bìa (không bắt buộc)"
          className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
        />
        <input
          name="duration"
          type="number"
          min="0"
          value={adminSongForm.duration}
          onChange={onAdminSongInput}
          placeholder="Thời lượng (giây)"
          className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring"
        />

        {songMutationError && (
          <p className="rounded-xl border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-700">
            {songMutationError}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={songMutationLoading}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-70"
          >
            {songMutationLoading
              ? 'Đang lưu...'
              : editingSongId
                ? 'Cập nhật bài hát'
                : 'Tạo bài hát'}
          </button>

          {editingSongId && (
            <button
              type="button"
              onClick={onResetAdminSongForm}
              className="rounded-full border border-stone-900/15 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-white"
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

export default AdminSongsPanel
