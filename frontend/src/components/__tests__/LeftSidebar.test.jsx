import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import LeftSidebar from '../LeftSidebar'

const DummyIcon = ({ className = '' }) => <svg data-testid="dummy-icon" className={className} />

describe('LeftSidebar', () => {
  it('calls key actions for home, create playlist, select playlist and play artist', () => {
    const handleGoHome = vi.fn()
    const handleCreatePlaylist = vi.fn((event) => event.preventDefault())
    const setPlaylistName = vi.fn()
    const onSelectPlaylist = vi.fn()
    const playTrackById = vi.fn()

    render(
      <LeftSidebar
        Icon={DummyIcon}
        handleGoHome={handleGoHome}
        currentUser={{ _id: 'u1' }}
        handleCreatePlaylist={handleCreatePlaylist}
        playlistName="My List"
        setPlaylistName={setPlaylistName}
        playlistActionLoadingId=""
        playlistLoading={false}
        playlists={[{ _id: 'p1', name: 'My List' }]}
        onSelectPlaylist={onSelectPlaylist}
        artists={[{ _id: 's1', artist: 'Mina Lee', coverUrl: '' }]}
        playTrackById={playTrackById}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /home/i }))
    fireEvent.change(screen.getByPlaceholderText(/create playlist/i), { target: { value: 'Focus' } })
    fireEvent.submit(screen.getByRole('button', { name: /^create$/i }).closest('form'))
    fireEvent.click(screen.getByRole('button', { name: /my list/i }))
    fireEvent.click(screen.getByRole('button', { name: /mina lee/i }))

    expect(handleGoHome).toHaveBeenCalled()
    expect(setPlaylistName).toHaveBeenCalled()
    expect(handleCreatePlaylist).toHaveBeenCalled()
    expect(onSelectPlaylist).toHaveBeenCalledWith('p1')
    expect(playTrackById).toHaveBeenCalledWith('s1')
  })
})
