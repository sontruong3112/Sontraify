import React from 'react'

function RightSidebar({
  highlightedSong,
  sessionLoading,
  currentUser,
  authLoading,
  handleLogout,
  handleAuthSubmit,
  authMode,
  setAuthMode,
  setAuthError,
  authForm,
  handleAuthInput,
  authError,
  playlistError,
}) {
  return (
    <aside className="rounded-lg bg-[#121212] p-2">
      <section className="rounded-lg bg-[#181818] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">GREY D Radio</h2>
          <button type="button" className="rounded-full bg-zinc-800 px-2 py-1 text-xs">+</button>
        </div>

        <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-zinc-900">
          {highlightedSong?.coverUrl ? (
            <img src={highlightedSong.coverUrl} alt={highlightedSong.title} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <p className="truncate text-4xl font-black">{highlightedSong?.title || 'hoa ra...'}</p>
        <p className="text-xl text-zinc-400">{highlightedSong?.artist || 'GREY D'}</p>
      </section>

      <section className="mt-2 rounded-lg bg-[#181818] p-4">
        {sessionLoading && <p className="text-sm text-zinc-400">Dang khoi tao...</p>}

        {!sessionLoading && currentUser && (
          <div>
            <p className="text-sm text-zinc-400">Dang nhap voi</p>
            <p className="text-lg font-semibold">{currentUser.name}</p>
            <p className="text-sm text-zinc-500">{currentUser.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={authLoading}
              className="mt-3 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-70"
            >
              {authLoading ? 'Dang dang xuat...' : 'Dang xuat'}
            </button>
          </div>
        )}

        {!sessionLoading && !currentUser && (
          <form className="space-y-2" onSubmit={handleAuthSubmit}>
            <div className="inline-flex rounded-md bg-zinc-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthError('')
                }}
                className={`rounded px-2 py-1 ${authMode === 'login' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              >
                Dang nhap
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setAuthError('')
                }}
                className={`rounded px-2 py-1 ${authMode === 'register' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              >
                Dang ky
              </button>
            </div>

            {authMode === 'register' && (
              <input
                name="name"
                value={authForm.name}
                onChange={handleAuthInput}
                placeholder="Ho va ten"
                className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
                required
              />
            )}
            <input
              name="email"
              type="email"
              value={authForm.email}
              onChange={handleAuthInput}
              placeholder="email@cuaban.com"
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
              required
            />
            <input
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleAuthInput}
              placeholder="Mat khau"
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
              minLength={6}
              required
            />
            {authError && <p className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-70"
            >
              {authLoading ? 'Vui long cho...' : authMode === 'register' ? 'Tao tai khoan' : 'Dang nhap'}
            </button>
          </form>
        )}
      </section>

      {playlistError && (
        <section className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{playlistError}</section>
      )}
    </aside>
  )
}

export default RightSidebar
