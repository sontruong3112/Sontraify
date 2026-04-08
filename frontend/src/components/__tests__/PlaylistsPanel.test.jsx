import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import PlaylistsPanel from '../PlaylistsPanel'

describe('PlaylistsPanel', () => {
  it('shows login prompt when user is not authenticated', () => {
    render(
      <PlaylistsPanel
        currentUser={null}
        playlistName=""
        setPlaylistName={() => {}}
        playlistError=""
        playlistLoading={false}
        playlistActionLoadingId=""
        playlists={[]}
        onCreatePlaylist={(event) => event.preventDefault()}
        onDeletePlaylist={() => {}}
        onRemoveSongFromPlaylist={() => {}}
      />,
    )

    expect(screen.getByText(/hãy đăng nhập để tạo và quản lý playlist/i)).toBeInTheDocument()
  })

  it('creates and deletes playlist via callbacks', () => {
    const setPlaylistName = vi.fn()
    const onCreatePlaylist = vi.fn((event) => event.preventDefault())
    const onDeletePlaylist = vi.fn()

    render(
      <PlaylistsPanel
        currentUser={{ id: 'u1', role: 'user' }}
        playlistName="My List"
        setPlaylistName={setPlaylistName}
        playlistError=""
        playlistLoading={false}
        playlistActionLoadingId=""
        playlists={[{ _id: 'p1', name: 'My List', songs: [] }]}
        onCreatePlaylist={onCreatePlaylist}
        onDeletePlaylist={onDeletePlaylist}
        onRemoveSongFromPlaylist={() => {}}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/tên playlist mới/i), {
      target: { value: 'Focus' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /^tạo$/i }).closest('form'))
    fireEvent.click(screen.getByRole('button', { name: /^xóa$/i }))

    expect(setPlaylistName).toHaveBeenCalled()
    expect(onCreatePlaylist).toHaveBeenCalled()
    expect(onDeletePlaylist).toHaveBeenCalledWith('p1')
  })
})
