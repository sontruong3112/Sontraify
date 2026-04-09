import { useState } from 'react'

function LoginPage({
  authMode,
  setAuthMode,
  setAuthError,
  authForm,
  handleAuthInput,
  handleAuthSubmit,
  handleGoogleLogin,
  authError,
  authLoading,
  onBackToPrevious,
}) {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const hasValidGoogleClientId = Boolean(
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com') &&
    !GOOGLE_CLIENT_ID.startsWith('your_')
  )
  const [googleLoading, setGoogleLoading] = useState(false)

  const requestGoogleAccessToken = () => {
    const oauthClient = window.google?.accounts?.oauth2

    if (!hasValidGoogleClientId) {
      setAuthError('VITE_GOOGLE_CLIENT_ID chua duoc cau hinh hop le tren frontend')
      return
    }

    if (!oauthClient) {
      setAuthError('Google SDK chua san sang, vui long thu lai')
      return
    }

    setGoogleLoading(true)
    setAuthError('')

    const tokenClient = oauthClient.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (response) => {
        try {
          if (!response?.access_token) {
            throw new Error('Khong lay duoc access token tu Google')
          }

          await handleGoogleLogin(response.access_token)
        } catch (error) {
          setAuthError(error?.message || 'Dang nhap Google that bai')
        } finally {
          setGoogleLoading(false)
        }
      },
      error_callback: () => {
        setAuthError('Dang nhap Google da bi huy hoac that bai')
        setGoogleLoading(false)
      },
    })

    tokenClient.requestAccessToken({ prompt: 'select_account' })
  }

  return (
    <section className="mx-auto w-full max-w-105 px-2 py-8">
      <div className="rounded-2xl border border-white/10 bg-black/55 p-6 shadow-2xl shadow-black/60 backdrop-blur-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.64 14.45a.76.76 0 01-1.04.25 9.7 9.7 0 00-5.03-1.31 9.8 9.8 0 00-3.38.62.75.75 0 11-.5-1.41 11.2 11.2 0 013.88-.7c2.04 0 4.05.52 5.78 1.5.36.2.49.67.29 1.05zm1.5-2.9a.94.94 0 01-1.3.3 12.5 12.5 0 00-6.3-1.66 12.7 12.7 0 00-4.22.73.94.94 0 11-.62-1.77 14.6 14.6 0 014.84-.83c2.52 0 4.99.65 7.23 1.88.45.24.61.82.37 1.35zm.12-3.03A15.3 15.3 0 0010.6 8.4c-1.83 0-3.63.3-5.31.91a1.12 1.12 0 11-.76-2.1A17.5 17.5 0 0110.6 6c3.24 0 6.43.85 9.23 2.46a1.12 1.12 0 11-1.13 1.96z" />
            </svg>
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
            Dang nhap
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setAuthError('')
            }}
            className={`flex-1 rounded-full px-3 py-2 ${authMode === 'register' ? 'bg-white text-black' : 'text-zinc-400'}`}
          >
            Dang ky
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
            disabled={authLoading || googleLoading}
            className="w-full rounded-full bg-green-500 px-3 py-3 text-sm font-semibold text-black transition hover:bg-green-400 disabled:opacity-70"
          >
            {authLoading ? 'Vui long cho...' : authMode === 'register' ? 'Tao tai khoan' : 'Continue'}
          </button>
        </form>

        <div className="my-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Or continue with</div>

        <button
          type="button"
          onClick={requestGoogleAccessToken}
          disabled={authLoading || googleLoading || !hasValidGoogleClientId}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.46a5.52 5.52 0 01-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.65z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3A7.18 7.18 0 0112 19.34a7.18 7.18 0 01-6.73-4.95H1.27v3.1A11.99 11.99 0 0012 24z" />
            <path fill="#FBBC05" d="M5.27 14.39A7.2 7.2 0 014.9 12c0-.83.14-1.63.37-2.39v-3.1H1.27A11.99 11.99 0 000 12c0 1.93.46 3.75 1.27 5.49l4-3.1z" />
            <path fill="#EA4335" d="M12 4.66c1.76 0 3.34.6 4.58 1.78l3.43-3.43C17.95 1.07 15.24 0 12 0 7.3 0 3.25 2.69 1.27 6.51l4 3.1A7.18 7.18 0 0112 4.66z" />
          </svg>
          {googleLoading ? 'Dang ket noi Google...' : 'Continue with Google'}
        </button>

        {!hasValidGoogleClientId && (
          <p className="mt-3 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
            Can cau hinh VITE_GOOGLE_CLIENT_ID trong frontend/.env de dung Google login.
          </p>
        )}

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
