import React from 'react'
import { act } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import AccountPage from '../../pages/AccountPage'

describe('AccountPage', () => {
  it('submits profile updates', async () => {
    const onUpdateProfile = vi.fn().mockResolvedValue({
      name: 'Updated User',
      avatarUrl: 'https://example.com/avatar.jpg',
    })

    render(
      <AccountPage
        currentUser={{ name: 'Demo User', email: 'demo@music.local', role: 'user', avatarUrl: '' }}
        likedSongsCount={2}
        recentlyPlayedCount={3}
        queueCount={1}
        accessToken="token"
        onUpdateProfile={onUpdateProfile}
      />,
    )

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Updated User' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    })

    expect(onUpdateProfile).toHaveBeenCalledWith({
      name: 'Updated User',
      avatarUrl: '',
    })
  })

  it('calls logout action', () => {
    const onLogout = vi.fn()

    render(
      <AccountPage
        currentUser={{ name: 'Demo User', email: 'demo@music.local', role: 'user', avatarUrl: '' }}
        onLogout={onLogout}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('blocks submit when avatar url is invalid', async () => {
    const onUpdateProfile = vi.fn()

    render(
      <AccountPage
        currentUser={{ name: 'Demo User', email: 'demo@music.local', role: 'user', avatarUrl: '' }}
        onUpdateProfile={onUpdateProfile}
      />,
    )

    fireEvent.change(screen.getByLabelText(/avatar url/i), {
      target: { value: 'invalid-url' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    })

    expect(onUpdateProfile).not.toHaveBeenCalled()
    expect(screen.getByText(/avatar url khong hop le/i)).toBeInTheDocument()
  })
})
