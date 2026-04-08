import React from 'react'

function ProtectedAdminRoute({ isAdmin, children }) {
  if (!isAdmin) {
    return (
      <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
        Ban khong co quyen vao trang quan tri.
      </div>
    )
  }

  return children
}

export default ProtectedAdminRoute
