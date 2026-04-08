import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import FooterPlayer from '../FooterPlayer'

const DummyIcon = ({ className = '' }) => <svg data-testid="dummy-icon" className={className} />

describe('FooterPlayer', () => {
  it('triggers playback and volume controls', () => {
    const handleToggleShuffle = vi.fn()
    const handlePrevTrack = vi.fn()
    const handleTogglePlayPause = vi.fn()
    const handleNextTrack = vi.fn()
    const handleCycleRepeatMode = vi.fn()
    const handleSeek = vi.fn()
    const setVolume = vi.fn()

    render(
      <FooterPlayer
        Icon={DummyIcon}
        highlightedSong={{ title: 'Song A', artist: 'Artist A', duration: 210, coverUrl: '' }}
        isShuffle={false}
        handleToggleShuffle={handleToggleShuffle}
        handlePrevTrack={handlePrevTrack}
        handleTogglePlayPause={handleTogglePlayPause}
        isPlaying={false}
        handleNextTrack={handleNextTrack}
        handleCycleRepeatMode={handleCycleRepeatMode}
        repeatMode="off"
        playbackTime={10}
        progressWrapperRef={{ current: null }}
        handleProgressMouseMove={() => {}}
        handleProgressMouseLeave={() => {}}
        isProgressHovering={false}
        safeTrackDuration={210}
        hoverPreviewPercent={0}
        hoverPreviewTime={0}
        handleSeek={handleSeek}
        progressPercent={10}
        trackDuration={210}
        volume={0.7}
        setVolume={setVolume}
      />,
    )

    fireEvent.click(screen.getByTitle(/bat phat ngau nhien/i))
    fireEvent.click(screen.getByTitle(/lap lai: tat/i))

    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '50' } })
    fireEvent.change(sliders[1], { target: { value: '0.4' } })

    expect(handleToggleShuffle).toHaveBeenCalled()
    expect(handleCycleRepeatMode).toHaveBeenCalled()
    expect(handleSeek).toHaveBeenCalled()
    expect(setVolume).toHaveBeenCalledWith(0.4)
  })
})
