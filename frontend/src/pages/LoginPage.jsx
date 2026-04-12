function LoginPage({
  authMode,
  setAuthMode,
  setAuthError,
  authForm,
  handleAuthInput,
  handleAuthSubmit,
  authError,
  authLoading,
  onBackToPrevious,
}) {
  return (
    <section className="mx-auto w-full max-w-105 px-2 py-8">
      <div className="rounded-2xl border border-white/10 bg-black/55 p-6 shadow-2xl shadow-black/60 backdrop-blur-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-zinc-900/80 p-1.5">
            <img src="/logo-white.svg" alt="Sontraify logo" className="h-full w-full rounded-md" />
          </div>
          <h1 className="text-[3.2rem] font-black leading-none tracking-tight text-white">Welcome back</h1>
        </div>

        <div className="mb-3 inline-flex w-full rounded-full bg-zinc-900 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login')
              setAuthError('')
            }}
            className={`flex-1 rounded-full px-3 py-2 ${authMode === 'login' ? 'bg-white text-black' : 'text-zinc-400'}`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setAuthError('')
            }}
            className={`flex-1 rounded-full px-3 py-2 ${authMode === 'register' ? 'bg-white text-black' : 'text-zinc-400'}`}
          >
            Đăng ký
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleAuthSubmit}>
          {authMode === 'register' && (
            <input
              name="name"
              value={authForm.name}
              onChange={handleAuthInput}
              placeholder="Ho va ten"
              className="w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm"
              required
            />
          )}
          <input
            name="email"
            type="email"
            value={authForm.email}
            onChange={handleAuthInput}
            placeholder="Email"
            className="w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm"
            required
          />
          <input
            name="password"
            type="password"
            value={authForm.password}
            onChange={handleAuthInput}
            placeholder="Mat khau"
            className="w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm"
            minLength={6}
            required
          />
           <button
             type="submit"
             disabled={authLoading}
             className="w-full rounded-full bg-white px-3 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-70"
           >
            {authLoading ? 'Vui lòng chờ...' : authMode === 'register' ? 'Tạo tài khoản' : 'Continue'}
          </button>
        </form>

        {authError && <p className="mt-3 rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">{authError}</p>}

        <div className="mt-8 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setAuthError('')
            }}
            className="font-semibold text-white hover:underline"
          >
            Sign up
          </button>
        </div>

        <button
          type="button"
          onClick={onBackToPrevious}
          className="mt-4 w-full rounded-full border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10"
        >
          Quay lai
        </button>
      </div>
    </section>
  )
}

export default LoginPage


