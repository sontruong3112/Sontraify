function HeroHeader() {
  return (
    <header className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-orange-300/40 blur-2xl" />
      <div className="absolute -bottom-12 left-20 h-40 w-40 rounded-full bg-amber-200/50 blur-2xl" />
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-600">Nền Tảng Âm Nhạc</p>
      <h1 className="display-font mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
        Xây dựng, thưởng thức và quản lý thế giới âm nhạc của bạn tại một nơi.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-stone-700 sm:text-base">
        Giao diện frontend đã sẵn sàng với React và Tailwind. Bước tiếp theo là kết nối auth, bài hát và playlist từ backend.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700">
          Tiếp Tục Xây Dựng
        </button>
        <button className="rounded-full border border-stone-700/30 bg-white/60 px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-white">
          Mở Checklist API
        </button>
      </div>
    </header>
  )
}

export default HeroHeader
