import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import SongsSection from '../SongsSection'

const baseSong = {
  _id: 'song-1',
  title: 'Night Train',
  artist: 'Mina Lee',
  genre: 'Indie',
  duration: 200,
}

describe('SongsSection', () => {
  it('shows loading state', () => {
    render(
      <SongsSection
        songs={[]}
        loading
        error=""
        currentUser={null}
        playlists={[]}
        selectedPlaylistBySong={{}}
        setSelectedPlaylistBySong={() => {}}
        playlistActionLoadingId=""
        onAddSongToPlaylist={() => {}}
        onEditSong={() => {}}
        onDeleteSong={() => {}}
        songMutationLoading={false}
      />,
    )

    expect(screen.getByText(/đang tải danh sách bài hát/i)).toBeInTheDocument()
  })

  it('calls edit and delete handlers for admin', () => {
    const onEditSong = vi.fn()
    const onDeleteSong = vi.fn()

    render(
      <SongsSection
        songs={[baseSong]}
        loading={false}
        error=""
        currentUser={{ role: 'admin' }}
        playlists={[]}
        selectedPlaylistBySong={{}}
        setSelectedPlaylistBySong={() => {}}
        playlistActionLoadingId=""
        onAddSongToPlaylist={() => {}}
        onEditSong={onEditSong}
        onDeleteSong={onDeleteSong}
        songMutationLoading={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /sửa/i }))
    fireEvent.click(screen.getByRole('button', { name: /xóa/i }))

    expect(onEditSong).toHaveBeenCalledWith(baseSong)
    expect(onDeleteSong).toHaveBeenCalledWith('song-1')
  })
})
