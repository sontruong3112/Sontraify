import { useEffect, useMemo, useState } from 'react'
import { socialApi } from '../api/client'

function MessagesPage({ currentUser, accessToken, onOpenLogin = () => {} }) {
  const [friends, setFriends] = useState([])
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

  const selectedFriend = useMemo(() => {
    return friends.find((item) => item.id === selectedFriendId) || null
  }, [friends, selectedFriendId])

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

      setSelectedFriendId((prev) => {
        if (prev && nextFriends.some((friend) => friend.id === prev)) {
          return prev
        }

        return nextFriends[0]?.id || ''
      })
    } catch (error) {
      setPageError(error.message || 'Khong the tai du lieu ban be')
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
      setMessages(Array.isArray(data?.messages) ? data.messages : [])
    } catch (error) {
      setPageError(error.message || 'Khong the tai tin nhan')
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
    }, 4000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [selectedFriendId, accessToken])

  const handleSearchUsers = async (event) => {
    event.preventDefault()

    if (!accessToken) {
      return
    }

    try {
      const data = await socialApi.searchUsers(accessToken, userSearchKeyword.trim())
      setUserSearchResults(Array.isArray(data?.users) ? data.users : [])
    } catch (error) {
      setPageError(error.message || 'Khong the tim nguoi dung')
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
      setPageError(error.message || 'Khong the gui loi moi ket ban')
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
      setPageError(error.message || 'Khong the cap nhat loi moi ket ban')
    } finally {
      setIsSubmitting(false)
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

    try {
      setIsSubmitting(true)
      setPageError('')
      const data = await socialApi.sendMessage(accessToken, selectedFriendId, { text })
      const createdMessage = data?.message

      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage])
      }

      setMessageDraft('')
    } catch (error) {
      setPageError(error.message || 'Khong the gui tin nhan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentUser) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <p className="mt-2 text-sm text-zinc-400">Dang nhap de ket ban va nhan tin.</p>
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
    <section className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
        <h2 className="text-lg font-semibold">Friends & Requests</h2>
        <p className="mt-1 text-xs text-zinc-500">Tim ban, gui loi moi ket ban va quan ly danh sach.</p>

        <form onSubmit={handleSearchUsers} className="mt-4 flex gap-2">
          <input
            value={userSearchKeyword}
            onChange={(event) => setUserSearchKeyword(event.target.value)}
            placeholder="Tim theo ten hoac email"
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">Tim</button>
        </form>

        {userSearchResults.length > 0 && (
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
            {userSearchResults.map((user) => (
              <div key={user.id} className="rounded-md bg-zinc-900/80 px-2 py-2 text-sm">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-xs text-zinc-400">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  {user.relationship === 'none' && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSendRequest(user.id)}
                      className="rounded bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      Add Friend
                    </button>
                  )}
                  {user.relationship === 'outgoing' && <span className="text-xs text-zinc-400">Da gui loi moi</span>}
                  {user.relationship === 'incoming' && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRespondRequest(user.id, 'accept')}
                        className="rounded bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRespondRequest(user.id, 'decline')}
                        className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {user.relationship === 'friends' && <span className="text-xs text-green-300">Ban be</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-200">Incoming requests</h3>
          <div className="mt-2 space-y-2">
            {incomingRequests.length === 0 && <p className="text-xs text-zinc-500">Khong co loi moi moi.</p>}
            {incomingRequests.map((user) => (
              <div key={`incoming-${user.id}`} className="rounded-md bg-zinc-900/70 px-2 py-2 text-sm">
                <p className="truncate">{user.name}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRespondRequest(user.id, 'accept')}
                    className="rounded bg-green-500 px-2 py-1 text-xs font-semibold text-black disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRespondRequest(user.id, 'decline')}
                    className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-200">Friends</h3>
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
            {isLoadingSocial && <p className="text-xs text-zinc-500">Dang tai danh sach ban be...</p>}
            {!isLoadingSocial && friends.length === 0 && <p className="text-xs text-zinc-500">Chua co ban be nao.</p>}
            {friends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                onClick={() => setSelectedFriendId(friend.id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-800 ${selectedFriendId === friend.id ? 'bg-green-500/20 text-green-200' : 'bg-zinc-900/70'}`}
              >
                <span className="truncate">{friend.name}</span>
                {outgoingRequests.some((item) => item.id === friend.id) ? <span className="text-[11px] text-zinc-400">Pending</span> : null}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <article className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
        <div className="mb-3 border-b border-white/10 pb-3">
          <h2 className="text-lg font-semibold">{selectedFriend ? `Chat with ${selectedFriend.name}` : 'Chon mot nguoi ban de bat dau chat'}</h2>
          {selectedFriend ? <p className="text-xs text-zinc-400">{selectedFriend.email}</p> : null}
        </div>

        {!selectedFriend ? (
          <p className="text-sm text-zinc-500">Ban hay them ban tu cot ben trai de bat dau nhan tin.</p>
        ) : (
          <>
            <div className="mb-4 h-90 space-y-2 overflow-y-auto rounded-lg bg-black/20 p-3">
              {isLoadingMessages && <p className="text-xs text-zinc-500">Dang tai tin nhan...</p>}
              {!isLoadingMessages && messages.length === 0 && (
                <p className="text-xs text-zinc-500">Chua co tin nhan nao. Hay gui loi chao dau tien.</p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId === currentUser.id

                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-100'}`}>
                      <p className="wrap-break-word whitespace-pre-wrap">{message.text}</p>
                      <p className={`mt-1 text-[11px] ${isMine ? 'text-black/70' : 'text-zinc-400'}`}>
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder="Nhap tin nhan..."
                className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={isSubmitting || !messageDraft.trim()}
                className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </>
        )}

        {pageError ? (
          <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-200">{pageError}</p>
        ) : null}
      </article>
    </section>
  )
}

export default MessagesPage
