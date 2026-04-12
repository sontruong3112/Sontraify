const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

const authSession = {
  getAccessToken: () => "",
  setAccessToken: () => {},
  onUnauthorized: () => {},
};

let refreshTokenPromise = null;

export const configureAuthSession = ({ getAccessToken, setAccessToken, onUnauthorized } = {}) => {
  if (typeof getAccessToken === "function") {
    authSession.getAccessToken = getAccessToken;
  }

  if (typeof setAccessToken === "function") {
    authSession.setAccessToken = setAccessToken;
  }

  if (typeof onUnauthorized === "function") {
    authSession.onUnauthorized = onUnauthorized;
  }
};

const buildHeaders = (token) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const performFetch = ({ endpoint, method = "GET", body, token }) => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: buildHeaders(token),
    credentials: "include",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
};

const parseResponse = async (response) => {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  return isJson ? await response.json() : null;
};

const refreshAccessToken = async () => {
  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      const response = await performFetch({
        endpoint: "/auth/refresh-token",
        method: "POST",
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        const error = new Error(data?.message || "Unable to refresh session");
        error.status = response.status;
        throw error;
      }

      return data;
    })().finally(() => {
      refreshTokenPromise = null;
    });
  }

  return refreshTokenPromise;
};

export const apiRequest = async ({ endpoint, method = "GET", body, token, requiresAuth = false, _retried = false }) => {
  const authToken = token || (requiresAuth ? authSession.getAccessToken() : "");
  const response = await performFetch({ endpoint, method, body, token: authToken });
  const data = await parseResponse(response);

  if (response.status === 401 && requiresAuth && !_retried) {
    try {
      const refreshed = await refreshAccessToken();
      const nextToken = refreshed?.tokens?.accessToken || "";

      if (!nextToken) {
        throw new Error("Missing refreshed token");
      }

      authSession.setAccessToken(nextToken);

      return apiRequest({
        endpoint,
        method,
        body,
        token: nextToken,
        requiresAuth,
        _retried: true,
      });
    } catch {
      authSession.onUnauthorized();
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

const resolveTokenPayload = (tokenOrPayload, payloadMaybe) => {
  if (payloadMaybe === undefined) {
    return { token: undefined, payload: tokenOrPayload };
  }

  return { token: tokenOrPayload, payload: payloadMaybe };
};

const resolveTokenIdPayload = (tokenOrId, idOrPayload, payloadMaybe) => {
  if (payloadMaybe === undefined) {
    return { token: undefined, id: tokenOrId, payload: idOrPayload };
  }

  return { token: tokenOrId, id: idOrPayload, payload: payloadMaybe };
};

const resolveTokenId = (tokenOrId, idMaybe) => {
  if (idMaybe === undefined) {
    return { token: undefined, id: tokenOrId };
  }

  return { token: tokenOrId, id: idMaybe };
};

export const songsApi = {
  list: (params = {}) => {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    });

    const queryString = search.toString();
    const endpoint = queryString ? `/songs?${queryString}` : "/songs";

    return apiRequest({ endpoint });
  },

  create: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/songs",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  update: (tokenOrId, idOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(tokenOrId, idOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: `/songs/${id}`,
      method: "PUT",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  remove: (tokenOrId, idMaybe) => {
    const { token, id } = resolveTokenId(tokenOrId, idMaybe);

    return apiRequest({
      endpoint: `/songs/${id}`,
      method: "DELETE",
      token,
      requiresAuth: true,
    });
  },

  trackPlay: (id) => {
    return apiRequest({
      endpoint: `/songs/${id}/play`,
      method: "POST",
    });
  },
};

export const authApi = {
  register: (payload) => {
    return apiRequest({
      endpoint: "/auth/register",
      method: "POST",
      body: payload,
    });
  },

  login: (payload) => {
    return apiRequest({
      endpoint: "/auth/login",
      method: "POST",
      body: payload,
    });
  },

  refreshToken: () => {
    return apiRequest({
      endpoint: "/auth/refresh-token",
      method: "POST",
    });
  },

  me: (token) => {
    return apiRequest({
      endpoint: "/auth/me",
      token,
      requiresAuth: true,
    });
  },

  updateMe: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/auth/me",
      method: "PATCH",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  logout: (token) => {
    return apiRequest({
      endpoint: "/auth/logout",
      method: "POST",
      token,
      requiresAuth: true,
    });
  },

  getPreferences: (token) => {
    return apiRequest({
      endpoint: "/auth/preferences",
      token,
      requiresAuth: true,
    });
  },

  updatePreferences: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/auth/preferences",
      method: "PUT",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  applyPreferenceAction: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/auth/preferences/actions",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  adminListUsers: (token) => {
    return apiRequest({
      endpoint: "/auth/admin/users",
      token,
      requiresAuth: true,
    });
  },

  adminUpdateUser: (tokenOrUserId, userIdOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrUserId,
      userIdOrPayload,
      payloadMaybe
    );

    return apiRequest({
      endpoint: `/auth/admin/users/${id}`,
      method: "PATCH",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  adminDeleteUser: (tokenOrUserId, userIdMaybe) => {
    const { token, id } = resolveTokenId(tokenOrUserId, userIdMaybe);

    return apiRequest({
      endpoint: `/auth/admin/users/${id}`,
      method: "DELETE",
      token,
      requiresAuth: true,
    });
  },

  adminResetUserPassword: (tokenOrUserId, userIdOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrUserId,
      userIdOrPayload,
      payloadMaybe
    );

    return apiRequest({
      endpoint: `/auth/admin/users/${id}/reset-password`,
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  adminSendNotification: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/auth/admin/notifications",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  listNotifications: (token) => {
    return apiRequest({
      endpoint: "/auth/notifications",
      token,
      requiresAuth: true,
    });
  },

  markNotificationRead: (tokenOrNotificationId, notificationIdMaybe) => {
    const { token, id } = resolveTokenId(tokenOrNotificationId, notificationIdMaybe);

    return apiRequest({
      endpoint: `/auth/notifications/${id}/read`,
      method: "POST",
      token,
      requiresAuth: true,
    });
  },

  markAllNotificationsRead: (token) => {
    return apiRequest({
      endpoint: "/auth/notifications/read-all",
      method: "POST",
      token,
      requiresAuth: true,
    });
  },
};

export const playlistsApi = {
  listMine: (token) => {
    return apiRequest({
      endpoint: "/playlists",
      token,
      requiresAuth: true,
    });
  },

  create: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/playlists",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  update: (tokenOrId, idOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(tokenOrId, idOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: `/playlists/${id}`,
      method: "PATCH",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  addSong: (tokenOrPlaylistId, playlistIdOrSongId, songIdMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrPlaylistId,
      playlistIdOrSongId,
      songIdMaybe
    );

    return apiRequest({
      endpoint: `/playlists/${id}/songs`,
      method: "POST",
      token,
      body: { songId: payload },
      requiresAuth: true,
    });
  },

  removeSong: (tokenOrPlaylistId, playlistIdOrSongId, songIdMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrPlaylistId,
      playlistIdOrSongId,
      songIdMaybe
    );

    return apiRequest({
      endpoint: `/playlists/${id}/songs/${payload}`,
      method: "DELETE",
      token,
      requiresAuth: true,
    });
  },

  reorderSong: (tokenOrPlaylistId, playlistIdOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrPlaylistId,
      playlistIdOrPayload,
      payloadMaybe
    );

    return apiRequest({
      endpoint: `/playlists/${id}/songs/reorder`,
      method: "PATCH",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  delete: (tokenOrId, idMaybe) => {
    const { token, id } = resolveTokenId(tokenOrId, idMaybe);

    return apiRequest({
      endpoint: `/playlists/${id}`,
      method: "DELETE",
      token,
      requiresAuth: true,
    });
  },
};

export const uploadsApi = {
  createSignature: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/uploads/signature",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },
};

export const artistsApi = {
  list: () => {
    return apiRequest({
      endpoint: "/artists",
    });
  },

  getByIdOrSlug: (idOrSlug) => {
    return apiRequest({
      endpoint: `/artists/${idOrSlug}`,
    });
  },

  create: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/artists",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  createAlbum: (tokenOrArtistId, artistIdOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrArtistId,
      artistIdOrPayload,
      payloadMaybe
    );

    return apiRequest({
      endpoint: `/artists/${id}/albums`,
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  addSongToAlbum: (tokenOrArtistId, artistIdOrAlbumId, albumIdOrSongId, songIdMaybe) => {
    let token;
    let artistId;
    let albumId;
    let songId;

    if (songIdMaybe === undefined) {
      token = undefined;
      artistId = tokenOrArtistId;
      albumId = artistIdOrAlbumId;
      songId = albumIdOrSongId;
    } else {
      token = tokenOrArtistId;
      artistId = artistIdOrAlbumId;
      albumId = albumIdOrSongId;
      songId = songIdMaybe;
    }

    return apiRequest({
      endpoint: `/artists/${artistId}/albums/${albumId}/songs`,
      method: "POST",
      token,
      body: { songId },
      requiresAuth: true,
    });
  },

  getAlbumDetail: (artistId, albumId) => {
    return apiRequest({
      endpoint: `/artists/${artistId}/albums/${albumId}`,
    });
  },
};

export const socialApi = {
  searchUsers: (token, query = "") => {
    const search = new URLSearchParams();

    if (query) {
      search.set("q", query);
    }

    const queryString = search.toString();

    return apiRequest({
      endpoint: queryString ? `/social/users?${queryString}` : "/social/users",
      token,
      requiresAuth: true,
    });
  },

  getFriends: (token) => {
    return apiRequest({
      endpoint: "/social/friends",
      token,
      requiresAuth: true,
    });
  },

  getFriendPresence: (tokenOrFriendId, friendIdMaybe) => {
    const { token, id } = resolveTokenId(tokenOrFriendId, friendIdMaybe);

    return apiRequest({
      endpoint: `/social/friends/${id}/presence`,
      token,
      requiresAuth: true,
    });
  },

  getFriendRequests: (token) => {
    return apiRequest({
      endpoint: "/social/friends/requests",
      token,
      requiresAuth: true,
    });
  },

  sendFriendRequest: (tokenOrPayload, payloadMaybe) => {
    const { token, payload } = resolveTokenPayload(tokenOrPayload, payloadMaybe);

    return apiRequest({
      endpoint: "/social/friends/requests",
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  respondToFriendRequest: (tokenOrUserId, userIdOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrUserId,
      userIdOrPayload,
      payloadMaybe
    );

    return apiRequest({
      endpoint: `/social/friends/requests/${id}/respond`,
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  listMessages: (tokenOrFriendId, friendIdOrParams, paramsMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrFriendId,
      friendIdOrParams,
      paramsMaybe
    );

    const search = new URLSearchParams();

    if (payload?.limit) {
      search.set("limit", String(payload.limit));
    }

    if (payload?.before) {
      search.set("before", String(payload.before));
    }

    const queryString = search.toString();

    return apiRequest({
      endpoint: queryString
        ? `/social/conversations/${id}/messages?${queryString}`
        : `/social/conversations/${id}/messages`,
      token,
      requiresAuth: true,
    });
  },

  sendMessage: (tokenOrFriendId, friendIdOrPayload, payloadMaybe) => {
    const { token, id, payload } = resolveTokenIdPayload(
      tokenOrFriendId,
      friendIdOrPayload,
      payloadMaybe
    );

    return apiRequest({
      endpoint: `/social/conversations/${id}/messages`,
      method: "POST",
      token,
      body: payload,
      requiresAuth: true,
    });
  },

  markConversationSeen: (tokenOrFriendId, friendIdMaybe) => {
    const { token, id } = resolveTokenId(tokenOrFriendId, friendIdMaybe);

    return apiRequest({
      endpoint: `/social/conversations/${id}/seen`,
      method: "POST",
      token,
      requiresAuth: true,
    });
  },
};
