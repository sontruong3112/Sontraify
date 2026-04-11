import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { socialApi } from '../api/client'

const SOCKET_SERVER_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '')

const getInitials = (value = '') => {
  const words = String(value).trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase()
  }

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase()
}

const formatMessageTime = (dateValue) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const normalizeMessage = (message, { fallbackState = 'sent' } = {}) => {
  if (!message) {
    return null
  }

  return {
    id: String(message.id || ''),
    senderId: String(message.senderId || ''),
    receiverId: String(message.receiverId || ''),
    text: String(message.text || ''),
    createdAt: message.createdAt || new Date().toISOString(),
    seenAt: message.seenAt || null,
    clientTempId: String(message.clientTempId || ''),
    deliveryState: message.seenAt ? 'seen' : fallbackState,
    errorMessage: '',
  }
}

const sortMessagesByTime = (items) => {
  return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

function MessagesPage({ currentUser, accessToken, onOpenLogin = () => {} }) {
  const [friends, setFriends] = useState([])
  const [friendPresenceMap, setFriendPresenceMap] = useState({})
  const [friendActivityMap, setFriendActivityMap] = useState({})
  const [incomingRequests, setIncomingRequests] = useState([])
  const [outgoingRequests, setOutgoingRequests] = useState([])
  const [userSearchKeyword, setUserSearchKeyword] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [messages, setMessages] = useState([])
  const [messageDraft, setMessageDraft] = useState('')
  const [pageError, setPageError] = useState('')
  const [isLoadingSocial, setIsLoadingSocial] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const messagesViewportRef = useRef(null)
  const socketRef = useRef(null)
  const selectedFriendIdRef = useRef('')
  const currentUserIdRef = useRef('')
  const isMarkingSeenRef = useRef(false)
  const lastSeenRequestAtRef = useRef(0)

  const selectedFriend = useMemo(() => {
    return friends.find((item) => item.id === selectedFriendId) || null
  }, [friends, selectedFriendId])

  const selectedFriendOnline = Boolean(friendPresenceMap[selectedFriendId])
  const selectedFriendActivity = friendActivityMap[selectedFriendId] || null

  useEffect(() => {
    selectedFriendIdRef.current = selectedFriendId
  }, [selectedFriendId])

  useEffect(() => {
    currentUserIdRef.current = String(currentUser?.id || '')
  }, [currentUser?.id])

  const upsertMessage = (nextMessageRaw, { fallbackState = 'sent' } = {}) => {
    const nextMessage = normalizeMessage(nextMessageRaw, { fallbackState })
    if (!nextMessage || !nextMessage.id) {
      return
    }

    setMessages((prev) => {
      const byIdIndex = prev.findIndex((item) => item.id === nextMessage.id)
      const byTempIndex =
        byIdIndex < 0 && nextMessage.clientTempId
          ? prev.findIndex((item) => item.clientTempId && item.clientTempId === nextMessage.clientTempId)
          : -1
      const targetIndex = byIdIndex >= 0 ? byIdIndex : byTempIndex

      if (targetIndex >= 0) {
        const current = prev[targetIndex]
        const merged = {
          ...current,
          ...nextMessage,
          seenAt: nextMessage.seenAt || current.seenAt || null,
          deliveryState: nextMessage.seenAt
            ? 'seen'
            : current.deliveryState === 'failed'
              ? current.deliveryState
              : nextMessage.deliveryState,
          errorMessage: '',
        }

        const next = [...prev]
        next[targetIndex] = merged
        return sortMessagesByTime(next)
      }

      return sortMessagesByTime([...prev, nextMessage])
    })
  }

  const markConversationSeen = async (friendId) => {
    if (!accessToken || !friendId) {
      return
    }

    const now = Date.now()
    if (isMarkingSeenRef.current || now - lastSeenRequestAtRef.current < 800) {
      return
    }

    isMarkingSeenRef.current = true
    lastSeenRequestAtRef.current = now

    try {
      await socialApi.markConversationSeen(accessToken, friendId)
    } catch {
      // Ignore read-receipt request failure and retry later.
    } finally {
      isMarkingSeenRef.current = false
    }
  }

  const loadSocialData = async ({ silent = false } = {}) => {
    if (!accessToken) {
      return
    }

    try {
      if (!silent) {
        setIsLoadingSocial(true)
      }

      const [friendsData, requestsData] = await Promise.all([
        socialApi.getFriends(accessToken),
        socialApi.getFriendRequests(accessToken),
      ])

      const nextFriends = Array.isArray(friendsData?.friends) ? friendsData.friends : []
      const nextIncoming = Array.isArray(requestsData?.incoming) ? requestsData.incoming : []
      const nextOutgoing = Array.isArray(requestsData?.outgoing) ? requestsData.outgoing : []

      setFriends(nextFriends)
      setIncomingRequests(nextIncoming)
      setOutgoingRequests(nextOutgoing)
      setFriendPresenceMap(
        nextFriends.reduce((accumulator, friend) => {
          accumulator[friend.id] = Boolean(friend.isOnline)
          return accumulator
        }, {})
      )
      setFriendActivityMap(
        nextFriends.reduce((accumulator, friend) => {
          accumulator[friend.id] = friend.listeningNow || null
          return accumulator
        }, {})
      )

      setSelectedFriendId((prev) => {
        if (prev && nextFriends.some((friend) => friend.id === prev)) {
          return prev
        }

        return nextFriends[0]?.id || ''
      })
    } catch (error) {
      setPageError(error.message || 'Không thể tải dữ liệu bạn bè')
    } finally {
      if (!silent) {
        setIsLoadingSocial(false)
      }
    }
  }

  const loadConversation = async (friendId, { silent = false } = {}) => {
    if (!accessToken || !friendId) {
      setMessages([])
      return
    }

    try {
      if (!silent) {
        setIsLoadingMessages(true)
      }

      const data = await socialApi.listMessages(accessToken, friendId, { limit: 80 })
      const nextMessages = (Array.isArray(data?.messages) ? data.messages : [])
        .map((item) => normalizeMessage(item, { fallbackState: 'sent' }))
        .filter(Boolean)

      setMessages(sortMessagesByTime(nextMessages))

      const hasUnreadIncoming = nextMessages.some(
        (item) => item.senderId === friendId && item.receiverId === currentUserIdRef.current && !item.seenAt
      )

      if (hasUnreadIncoming) {
        markConversationSeen(friendId)
      }
    } catch (error) {
      setPageError(error.message || 'Không thể tải tin nhắn')
    } finally {
      if (!silent) {
        setIsLoadingMessages(false)
      }
    }
  }

  useEffect(() => {
    if (!currentUser || !accessToken) {
      return
    }

    loadSocialData()
  }, [currentUser?.id, accessToken])

  useEffect(() => {
    if (!selectedFriendId || !accessToken) {
      return
    }

    loadConversation(selectedFriendId)

    const intervalId = window.setInterval(() => {
      loadConversation(selectedFriendId, { silent: true })
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [selectedFriendId, accessToken])

  useEffect(() => {
    if (!selectedFriendId || !accessToken) {
      return
    }

    socialApi
      .getFriendPresence(accessToken, selectedFriendId)
      .then((data) => {
        setFriendPresenceMap((prev) => ({
          ...prev,
          [selectedFriendId]: Boolean(data?.isOnline),
        }))
      })
      .catch(() => {})
  }, [selectedFriendId, accessToken])

  useEffect(() => {
    if (!currentUser || !accessToken) {
      return
    }

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: {
        token: accessToken,
      },
    })

    socketRef.current = socket

    const handleConnect = () => {
      setIsRealtimeConnected(true)
      const activeFriendId = selectedFriendIdRef.current
      if (activeFriendId) {
        socket.emit('chat:join', { friendId: activeFriendId })
      }
    }

    const handleDisconnect = () => {
      setIsRealtimeConnected(false)
    }

    const handlePresenceUpdate = (payload) => {
      const userId = String(payload?.userId || '')
      if (!userId) {
        return
      }

      setFriendPresenceMap((prev) => ({
        ...prev,
        [userId]: Boolean(payload?.isOnline),
      }))
    }

    const handleActivityUpdate = (payload) => {
      const userId = String(payload?.userId || '')
      if (!userId) {
        return
      }

      setFriendActivityMap((prev) => ({
        ...prev,
        [userId]: payload?.activity || null,
      }))
    }

    const handleIncomingMessage = (incomingMessage) => {
      const viewerId = currentUserIdRef.current
      const activeFriendId = selectedFriendIdRef.current

      if (!viewerId || !activeFriendId || !incomingMessage?.id) {
        return
      }

      const senderId = String(incomingMessage.senderId || '')
      const receiverId = String(incomingMessage.receiverId || '')

      if (senderId !== viewerId && receiverId !== viewerId) {
        return
      }

      const conversationFriendId = senderId === viewerId ? receiverId : senderId
      if (conversationFriendId !== activeFriendId) {
        return
      }

      upsertMessage(incomingMessage)

      if (senderId === activeFriendId) {
        markConversationSeen(activeFriendId)
      }
    }

    const handleSeenUpdate = (payload) => {
      const readerId = String(payload?.readerId || '')
      const seenAt = payload?.seenAt || null

      if (!readerId || !seenAt) {
        return
      }

      setMessages((prev) => prev.map((item) => {
        if (item.senderId !== currentUserIdRef.current || item.receiverId !== readerId) {
          return item
        }

        return {
          ...item,
          seenAt,
          deliveryState: 'seen',
        }
      }))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('presence:update', handlePresenceUpdate)
    socket.on('presence:activity', handleActivityUpdate)
    socket.on('chat:message', handleIncomingMessage)
    socket.on('chat:seen', handleSeenUpdate)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('presence:update', handlePresenceUpdate)
      socket.off('presence:activity', handleActivityUpdate)
      socket.off('chat:message', handleIncomingMessage)
      socket.off('chat:seen', handleSeenUpdate)
      socket.disconnect()
      socketRef.current = null
      setIsRealtimeConnected(false)
    }
  }, [currentUser?.id, accessToken])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !isRealtimeConnected || !selectedFriendId) {
      return
    }

    socket.emit('chat:join', { friendId: selectedFriendId })
  }, [isRealtimeConnected, selectedFriendId])

  useEffect(() => {
    if (!messagesViewportRef.current) {
      return
    }

    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight
  }, [messages.length, selectedFriendId])

  const handleSearchUsers = async (event) => {
    event.preventDefault()

    if (!accessToken) {
      return
    }

    try {
      const data = await socialApi.searchUsers(accessToken, userSearchKeyword.trim())
      setUserSearchResults(Array.isArray(data?.users) ? data.users : [])
    } catch (error) {
      setPageError(error.message || 'Không thể tìm người dùng')
    }
  }

  const handleSendRequest = async (userId) => {
    if (!accessToken || !userId) {
      return
    }

    try {
      setIsSubmitting(true)
      setPageError('')
      await socialApi.sendFriendRequest(accessToken, { userId })
      await loadSocialData({ silent: true })
      await handleSearchUsers({ preventDefault: () => {} })
    } catch (error) {
      setPageError(error.message || 'Không thể gửi lời mời kết bạn')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRespondRequest = async (userId, action) => {
    if (!accessToken || !userId) {
      return
    }

    try {
      setIsSubmitting(true)
      setPageError('')
      await socialApi.respondToFriendRequest(accessToken, userId, { action })
      await loadSocialData({ silent: true })
      await handleSearchUsers({ preventDefault: () => {} })
    } catch (error) {
      setPageError(error.message || 'Không thể cập nhật lời mời kết bạn')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendMessageWithStatus = async (payloadText, targetFriendId, tempId) => {
    try {
      const data = await socialApi.sendMessage(accessToken, targetFriendId, {
        text: payloadText,
        clientTempId: tempId,
      })
      const createdMessage = data?.message

      if (createdMessage) {
        upsertMessage(createdMessage, { fallbackState: 'sent' })
      }
    } catch (error) {
      setMessages((prev) => prev.map((item) => {
        if (item.id !== tempId && item.clientTempId !== tempId) {
          return item
        }

        return {
          ...item,
          deliveryState: 'failed',
          errorMessage: error?.message || 'Gửi tin nhắn thất bại',
        }
      }))
      throw error
    }
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!accessToken || !selectedFriendId) {
      return
    }

    const text = messageDraft.trim()
    if (!text) {
      return
    }

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticMessage = {
      id: tempId,
      clientTempId: tempId,
      senderId: currentUser?.id,
      receiverId: selectedFriendId,
      text,
      createdAt: new Date().toISOString(),
      seenAt: null,
      deliveryState: 'sending',
      errorMessage: '',
    }

    setPageError('')
    setMessageDraft('')
    setIsSubmitting(true)
    upsertMessage(optimisticMessage, { fallbackState: 'sending' })

    try {
      await sendMessageWithStatus(text, selectedFriendId, tempId)
    } catch (error) {
      setPageError(error?.message || 'Không thể gửi tin nhắn')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetryMessage = async (message) => {
    if (!message || !selectedFriendId || !accessToken) {
      return
    }

    const tempId = message.clientTempId || message.id

    setMessages((prev) => prev.map((item) => {
      if (item.id !== message.id) {
        return item
      }

      return {
        ...item,
        deliveryState: 'sending',
        errorMessage: '',
      }
    }))

    try {
      await sendMessageWithStatus(message.text, selectedFriendId, tempId)
    } catch {
      // Error state is applied inside sendMessageWithStatus.
    }
  }

  if (!currentUser) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <p className="mt-2 text-sm text-zinc-400">Đăng nhập để kết bạn và nhắn tin.</p>
        <button
          type="button"
          onClick={() => onOpenLogin('login')}
          className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
        >
          Log in
        </button>
      </section>
    )
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-linear-to-b from-[#10182b] via-[#0f1726] to-[#090c14] p-4 shadow-xl shadow-black/30">
        <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
          <p className="mt-1 text-xs text-zinc-300">Kết bạn và nhắn tin trực tiếp với người dùng trong Sontraify.</p>
        </div>

        <form onSubmit={handleSearchUsers} className="flex gap-2">
          <input
            value={userSearchKeyword}
            onChange={(event) => setUserSearchKeyword(event.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-green-500/40 transition focus:ring-2"
          />
          <button type="submit" className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-green-400">Tìm</button>
        </form>

        {userSearchResults.length > 0 && (
          <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
            {userSearchResults.map((user) => (
              <div key={user.id} className="rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{user.name}</p>
                    <p className="truncate text-xs text-zinc-400">{user.email}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {user.relationship === 'none' && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSendRequest(user.id)}
                      className="rounded-md bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      Add Friend
                    </button>
                  )}
                  {user.relationship === 'outgoing' && <span className="text-xs text-zinc-400">Đã gửi lời mời</span>}
                  {user.relationship === 'incoming' && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRespondRequest(user.id, 'accept')}
                        className="rounded-md bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRespondRequest(user.id, 'decline')}
                        className="rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-200 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {user.relationship === 'friends' && <span className="text-xs text-green-300">Bạn bè</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">Incoming Requests</h3>
          <div className="mt-2 space-y-2">
            {incomingRequests.length === 0 && <p className="text-xs text-zinc-500">Không có lời mời mới.</p>}
            {incomingRequests.map((user) => (
              <div key={`incoming-${user.id}`} className="rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-bold text-white">
                    {getInitials(user.name)}
                  </div>
                  <p className="truncate text-zinc-200">{user.name}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRespondRequest(user.id, 'accept')}
                    className="rounded-md bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRespondRequest(user.id, 'decline')}
                    className="rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-200 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">Friends</h3>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
            {isLoadingSocial && <p className="text-xs text-zinc-500">Đang tải danh sách bạn bè...</p>}
            {!isLoadingSocial && friends.length === 0 && <p className="text-xs text-zinc-500">Chưa có bạn bè nào.</p>}
            {friends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                onClick={() => setSelectedFriendId(friend.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${selectedFriendId === friend.id ? 'border-green-400/40 bg-green-500/20 text-green-100' : 'border-white/10 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
                    {getInitials(friend.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{friend.name}</p>
                    <p className="truncate text-[11px] text-zinc-400">{friend.email}</p>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${friendPresenceMap[friend.id] ? 'bg-green-400' : 'bg-zinc-500'}`} />
                  <span className="text-[10px] text-zinc-300">{friendPresenceMap[friend.id] ? 'Online' : 'Offline'}</span>
                  {outgoingRequests.some((item) => item.id === friend.id) ? <span className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">Pending</span> : null}
                </div>
                {friendActivityMap[friend.id]?.isPlaying ? (
                  <p className="mt-1 truncate text-[10px] text-green-300">
                    Dang nghe: {friendActivityMap[friend.id].title} - {friendActivityMap[friend.id].artist}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <article className="rounded-2xl border border-white/10 bg-linear-to-b from-[#111722] via-[#0d1119] to-[#0b0e15] p-4 shadow-xl shadow-black/30">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            {selectedFriend ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-black">
                {getInitials(selectedFriend.name)}
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-300">#</div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">
                {selectedFriend ? selectedFriend.name : 'Select a friend to chat'}
              </h2>
              <p className="truncate text-xs text-zinc-400">{selectedFriend ? `${selectedFriend.email} • ${selectedFriendOnline ? 'Đang online' : 'Đang offline'}` : 'Bạn hãy chọn một người bên trái.'}</p>
              {selectedFriend && selectedFriendActivity?.isPlaying ? (
                <p className="truncate text-xs text-green-300">
                  Dang nghe: {selectedFriendActivity.title} - {selectedFriendActivity.artist}
                </p>
              ) : null}
            </div>
          </div>
          <span className="hidden rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-zinc-300 sm:inline-flex">Secure Chat</span>
          <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.15em] ${isRealtimeConnected ? 'bg-green-500/20 text-green-300' : 'bg-zinc-700/40 text-zinc-300'}`}>
            {isRealtimeConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {!selectedFriend ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
            <div>
              <p className="text-base font-medium text-zinc-200">Không có cuộc trò chuyện nào được chọn</p>
              <p className="mt-1 text-sm text-zinc-500">Thêm bạn và chọn một người để bắt đầu nhắn tin.</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={messagesViewportRef} className="mb-3 h-96 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-linear-to-b from-black/20 to-black/35 p-3">
              {isLoadingMessages && <p className="text-xs text-zinc-500">Đang tải tin nhắn...</p>}
              {!isLoadingMessages && messages.length === 0 && (
                <p className="text-xs text-zinc-500">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên.</p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId === currentUser.id
                const statusText = message.deliveryState === 'sending'
                  ? 'Đang gửi...'
                  : message.deliveryState === 'failed'
                    ? 'Gửi lỗi'
                    : message.seenAt
                      ? `Đã xem ${formatMessageTime(message.seenAt)}`
                      : `Đã gửi ${formatMessageTime(message.createdAt)}`

                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl border px-3 py-2 text-sm shadow ${isMine ? 'border-green-400/20 bg-green-500 text-black' : 'border-white/10 bg-zinc-800/90 text-zinc-100'}`}>
                      <p className="wrap-break-word whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      {isMine ? (
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <p className={`text-[10px] ${message.deliveryState === 'failed' ? 'text-red-700' : 'text-black/70'}`}>{statusText}</p>
                          {message.deliveryState === 'failed' && (
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(message)}
                              className="rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-semibold text-black hover:bg-black/25"
                            >
                              Gửi lại
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-[10px] text-zinc-400">{formatMessageTime(message.createdAt)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSendMessage} className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="flex items-end gap-2">
                <input
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-green-500/40 transition focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !messageDraft.trim()}
                  className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        )}

        {pageError ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-xs text-red-200">{pageError}</p>
        ) : null}
      </article>
    </section>
  )
}

export default MessagesPage


