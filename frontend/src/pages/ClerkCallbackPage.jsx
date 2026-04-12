import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

function ClerkCallbackPage({
  handleClerkLogin = async () => {},
  onError = () => {},
}) {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (hasStartedRef.current) {
      return
    }

    hasStartedRef.current = true

    let active = true

    const finishLogin = async () => {
      try {
        if (!isSignedIn) {
          onError('Phiên đăng nhập Clerk không hợp lệ, vui lòng thử lại')
          navigate('/login', { replace: true })
          return
        }

        const token = await getToken()
        if (!token) {
          throw new Error('Không lấy được Clerk token')
        }

        await handleClerkLogin(token)

        if (!active) {
          return
        }

        navigate('/', { replace: true })
      } catch (error) {
        if (!active) {
          return
        }

        hasStartedRef.current = false
        onError(error?.message || 'Không thể hoàn tất đăng nhập Google')
        navigate('/login', { replace: true })
      }
    }

    finishLogin()

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken, handleClerkLogin, onError, navigate])

  return (
    <section className="mx-auto w-full max-w-105 px-2 py-8">
      <div className="rounded-2xl border border-white/10 bg-black/55 p-6 text-center shadow-2xl shadow-black/60 backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Google Login</p>
        <p className="mt-3 text-sm text-zinc-400">Đang hoàn tất đăng nhập qua Clerk...</p>
      </div>
    </section>
  )
}

export default ClerkCallbackPage
