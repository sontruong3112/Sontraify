import { formatDuration } from '../utils/formatDuration'

function PlayerPanel({ highlightedSong }) {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <h3 className="display-font text-xl">Trình Phát</h3>
      <p className="mt-2 text-sm text-stone-600">
        {highlightedSong
          ? `${highlightedSong.title} • ${highlightedSong.artist}`
          : 'Chưa chọn bài hát'}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-300/60">
        <div className="h-full w-1/3 rounded-full bg-linear-to-r from-orange-500 to-amber-400" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-stone-600">
        <span>01:04</span>
        <span>{formatDuration(highlightedSong?.duration)}</span>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button className="rounded-full border border-stone-800/20 bg-white/70 px-3 py-2 text-sm">Trước</button>
        <button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Phát</button>
        <button className="rounded-full border border-stone-800/20 bg-white/70 px-3 py-2 text-sm">Tiếp</button>
      </div>
    </section>
  )
}

export default PlayerPanel
