function BuildStatusPanel() {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <h3 className="display-font text-xl">Trạng Thái Xây Dựng</h3>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
          <span>API Xác thực</span>
          <span className="font-semibold text-emerald-700">Đã kết nối</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
          <span>CRUD Bài hát</span>
          <span className="font-semibold text-emerald-700">Hoàn tất</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
          <span>Giao diện quản trị bài hát</span>
          <span className="font-semibold text-emerald-700">Đã kết nối</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
          <span>Giao diện playlist</span>
          <span className="font-semibold text-emerald-700">Đã kết nối</span>
        </div>
      </div>
    </section>
  )
}

export default BuildStatusPanel
