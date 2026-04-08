export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '--:--'
  }

  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
