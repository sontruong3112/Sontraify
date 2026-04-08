function AccountPanel({
  currentUser,
  sessionLoading,
  authLoading,
  authMode,
  authError,
  authForm,
  onAuthInput,
  onAuthSubmit,
  onModeChange,
  onLogout,
}) {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="display-font text-xl">Tài Khoản</h3>
        {currentUser && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Đã đăng nhập
          </span>
        )}
      </div>

      {sessionLoading && (
        <div className="rounded-xl border border-stone-900/10 bg-white/70 px-3 py-4 text-sm text-stone-600">
          Đang khôi phục phiên đăng nhập...
        </div>
      )}

      {!sessionLoading && currentUser && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-900/10 bg-white/70 p-4 text-sm">
            <p className="font-semibold">{currentUser.name}</p>
            <p className="mt-1 text-stone-600">{currentUser.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">
              Vai trò: {currentUser.role}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={authLoading}
            className="w-full rounded-full border border-stone-800/20 bg-white/70 px-4 py-2.5 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {authLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      )}

      {!sessionLoading && !currentUser && (
        <form className="space-y-3" onSubmit={onAuthSubmit}>
          <div className="inline-flex rounded-full border border-stone-900/15 bg-white/70 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={`rounded-full px-3 py-1.5 transition ${authMode === 'login' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => onModeChange('register')}
              className={`rounded-full px-3 py-1.5 transition ${authMode === 'register' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              Đăng ký
            </button>
          </div>

          {authMode === 'register' && (
            <input
              name="name"
              value={authForm.name}
              onChange={onAuthInput}
              placeholder="Họ và tên"
              className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:ring"
              required
            />
          )}

          <input
            name="email"
            type="email"
            value={authForm.email}
            onChange={onAuthInput}
            placeholder="email@cuaban.com"
            className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:ring"
            required
          />
          <input
            name="password"
            type="password"
            value={authForm.password}
            onChange={onAuthInput}
            placeholder="Mật khẩu"
            className="w-full rounded-xl border border-stone-900/15 bg-white/80 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:ring"
            minLength={6}
            required
          />

          {authError && (
            <p className="rounded-xl border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-700">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {authLoading
              ? 'Vui lòng chờ...'
              : authMode === 'register'
                ? 'Tạo tài khoản'
                : 'Đăng nhập'}
          </button>
        </form>
      )}
    </section>
  )
}

export default AccountPanel
