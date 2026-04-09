import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import RightSidebar from '../RightSidebar'

describe('RightSidebar', () => {
  it('calls logout for authenticated user', () => {
    const handleLogout = vi.fn()

    render(
      <RightSidebar
        highlightedSong={{ title: 'Track A', artist: 'Artist A', coverUrl: '' }}
        sessionLoading={false}
        currentUser={{ name: 'Demo Admin', email: 'admin@music.local' }}
        authLoading={false}
        handleLogout={handleLogout}
        handleAuthSubmit={() => {}}
        authMode="login"
        setAuthMode={() => {}}
        setAuthError={() => {}}
        authForm={{ name: '', email: '', password: '' }}
        handleAuthInput={() => {}}
        authError=""
        playlistError=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /dang xuat/i }))
    expect(handleLogout).toHaveBeenCalled()
  })

  it('opens dedicated login route for guest', () => {
    const onOpenLogin = vi.fn()

    render(
      <RightSidebar
        highlightedSong={{ title: 'Track A', artist: 'Artist A', coverUrl: '' }}
        sessionLoading={false}
        currentUser={null}
        authLoading={false}
        handleLogout={() => {}}
        handleAuthSubmit={() => {}}
        authMode="login"
        setAuthMode={() => {}}
        setAuthError={() => {}}
        authForm={{ name: '', email: 'u@test.com', password: '123456' }}
        handleAuthInput={() => {}}
        authError=""
        onOpenLogin={onOpenLogin}
        playlistError=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(onOpenLogin).toHaveBeenNthCalledWith(1, 'login')
    expect(onOpenLogin).toHaveBeenNthCalledWith(2, 'register')
  })
})
