import React from 'react'
import { render, screen } from '@testing-library/react'
import ProtectedAdminRoute from '../ProtectedAdminRoute'

describe('ProtectedAdminRoute', () => {
  it('shows forbidden message when user is not admin', () => {
    render(
      <ProtectedAdminRoute isAdmin={false}>
        <div>Admin Content</div>
      </ProtectedAdminRoute>,
    )

    expect(screen.getByText(/không có quyền vào trang quản trị/i)).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders children when user is admin', () => {
    render(
      <ProtectedAdminRoute isAdmin>
        <div>Admin Content</div>
      </ProtectedAdminRoute>,
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
