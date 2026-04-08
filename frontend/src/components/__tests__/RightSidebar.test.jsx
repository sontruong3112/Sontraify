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

  it('handles auth mode switch and submit for guest', () => {
    const setAuthMode = vi.fn()
    const handleAuthSubmit = vi.fn((event) => event.preventDefault())

    render(
      <RightSidebar
        highlightedSong={{ title: 'Track A', artist: 'Artist A', coverUrl: '' }}
        sessionLoading={false}
        currentUser={null}
        authLoading={false}
        handleLogout={() => {}}
        handleAuthSubmit={handleAuthSubmit}
        authMode="login"
        setAuthMode={setAuthMode}
        setAuthError={() => {}}
        authForm={{ name: '', email: 'u@test.com', password: '123456' }}
        handleAuthInput={() => {}}
        authError=""
        playlistError=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /dang ky/i }))
    fireEvent.submit(screen.getByPlaceholderText(/email@cuaban.com/i).closest('form'))

    expect(setAuthMode).toHaveBeenCalledWith('register')
    expect(handleAuthSubmit).toHaveBeenCalled()
  })
})
