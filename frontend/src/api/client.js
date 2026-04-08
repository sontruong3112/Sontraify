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

  logout: (token) => {
    return apiRequest({
      endpoint: "/auth/logout",
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
