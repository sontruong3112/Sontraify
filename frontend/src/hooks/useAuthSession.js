import { useEffect, useState } from 'react'
import { authApi, configureAuthSession } from '../api/client'

const ACCESS_TOKEN_KEY = 'music_access_token'

const getInitialAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || ''

export function useAuthSession({ onSessionCleared } = {}) {
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [accessToken, setAccessToken] = useState(getInitialAccessToken)
  const [currentUser, setCurrentUser] = useState(null)
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const updateAccessToken = (token) => {
    setAccessToken(token || '')

    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  }

  const resetLocalSession = () => {
    setCurrentUser(null)
    updateAccessToken('')
    setAuthError('')
    onSessionCleared?.()
  }

  useEffect(() => {
    configureAuthSession({
      getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY) || '',
      setAccessToken: (token) => {
        updateAccessToken(token)
      },
      onUnauthorized: () => {
        resetLocalSession()
      },
    })
  }, [])

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY)

        if (savedToken) {
          const meData = await authApi.me(savedToken)
          setCurrentUser(meData.user)
          updateAccessToken(savedToken)
          return
        }

        const refreshed = await authApi.refreshToken()
        const nextToken = refreshed?.tokens?.accessToken || ''

        if (!nextToken) {
          return
        }

        updateAccessToken(nextToken)
        const meData = await authApi.me(nextToken)
        setCurrentUser(meData.user)
      } catch {
        resetLocalSession()
      } finally {
        setSessionLoading(false)
      }
    }

    bootstrapSession()
  }, [])

  const handleAuthInput = (event) => {
    const { name, value } = event.target
    setAuthForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()

    try {
      setAuthLoading(true)
      setAuthError('')

      const payload = {
        email: authForm.email.trim(),
        password: authForm.password,
      }

      const data = authMode === 'register'
        ? await authApi.register({ ...payload, name: authForm.name.trim() })
        : await authApi.login(payload)

      const nextToken = data?.tokens?.accessToken || ''

      if (!nextToken || !data?.user) {
        throw new Error('Phan hoi dang nhap khong hop le')
      }

      updateAccessToken(nextToken)
      setCurrentUser(data.user)
      setAuthForm({ name: '', email: '', password: '' })
    } catch (requestError) {
      setAuthError(requestError.message || 'Dang nhap that bai')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleLogin = async (googleAccessToken) => {
    try {
      setAuthLoading(true)
      setAuthError('')

      const tokenValue = String(googleAccessToken || '').trim()

      if (!tokenValue) {
        throw new Error('Google access token is missing')
      }

      const data = await authApi.googleLogin({ accessToken: tokenValue })
      const nextToken = data?.tokens?.accessToken || ''

      if (!nextToken || !data?.user) {
        throw new Error('Phan hoi dang nhap Google khong hop le')
      }

      updateAccessToken(nextToken)
      setCurrentUser(data.user)
      setAuthForm({ name: '', email: '', password: '' })
    } catch (requestError) {
      setAuthError(requestError.message || 'Dang nhap Google that bai')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setAuthLoading(true)
      setAuthError('')

      if (accessToken) {
        await authApi.logout(accessToken)
      }
    } catch {
      // Session is cleared locally even if server logout fails.
    } finally {
      resetLocalSession()
      setAuthLoading(false)
    }
  }

  const handleUpdateProfile = async (payload) => {
    if (!accessToken) {
      throw new Error('Vui long dang nhap lai de cap nhat tai khoan')
    }

    const data = await authApi.updateMe(accessToken, payload)

    if (data?.user) {
      setCurrentUser(data.user)
    }

    return data?.user || null
  }

  return {
    authMode,
    setAuthMode,
    authLoading,
    sessionLoading,
    authError,
    setAuthError,
    accessToken,
    currentUser,
    authForm,
    handleAuthInput,
    handleAuthSubmit,
    handleGoogleLogin,
    handleUpdateProfile,
    handleLogout,
  }
}
