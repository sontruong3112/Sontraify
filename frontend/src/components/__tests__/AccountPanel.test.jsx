import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import AccountPanel from '../AccountPanel'

describe('AccountPanel', () => {
  it('renders logged in user info and logout button', () => {
    const onLogout = vi.fn()

    render(
      <AccountPanel
        currentUser={{ name: 'Demo Admin', email: 'admin@music.local', role: 'admin' }}
        sessionLoading={false}
        authLoading={false}
        authMode="login"
        authError=""
        authForm={{ name: '', email: '', password: '' }}
        onAuthInput={() => {}}
        onAuthSubmit={() => {}}
        onModeChange={() => {}}
        onLogout={onLogout}
      />,
    )

    expect(screen.getByText(/demo admin/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /đăng xuất/i }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('switches auth mode and submits auth form', () => {
    const onModeChange = vi.fn()
    const onAuthSubmit = vi.fn((event) => event.preventDefault())

    render(
      <AccountPanel
        currentUser={null}
        sessionLoading={false}
        authLoading={false}
        authMode="login"
        authError=""
        authForm={{ name: '', email: 'user@test.com', password: '123456' }}
        onAuthInput={() => {}}
        onAuthSubmit={onAuthSubmit}
        onModeChange={onModeChange}
        onLogout={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /đăng ký/i }))
    fireEvent.submit(screen.getByPlaceholderText(/email@cuaban.com/i).closest('form'))

    expect(onModeChange).toHaveBeenCalledWith('register')
    expect(onAuthSubmit).toHaveBeenCalled()
  })
})
