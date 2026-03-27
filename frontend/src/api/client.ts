import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly auth + refresh cookies automatically
});

// ---------------------------------------------------------------------------
// CSRF — fetch once, cache, attach to every state-changing request
// ---------------------------------------------------------------------------

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const { data } = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
  csrfToken = data.csrfToken as string;
  return csrfToken;
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    config.headers['x-csrf-token'] = await getCsrfToken();
  }

  // Attach Bearer token for cross-origin requests (cookies are blocked by browsers)
  const url = config.url ?? '';
  if (url.includes('/admin/') || url.startsWith('/admin')) {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) config.headers['Authorization'] = `Bearer ${adminToken}`;
  } else {
    const userToken = sessionStorage.getItem('user_token');
    if (userToken) config.headers['Authorization'] = `Bearer ${userToken}`;
  }

  return config;
});

// ---------------------------------------------------------------------------
// Token refresh — on TOKEN_EXPIRED silently refresh then retry once
// ---------------------------------------------------------------------------

let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  // Serialise concurrent refresh attempts into a single request
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        if (res.data?.token) sessionStorage.setItem('user_token', res.data.token);
        refreshPromise = null;
      })
      .catch((err) => { refreshPromise = null; throw err; });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const data = error.response?.data;

    // Reset cached CSRF token on 403 and retry once if it was a CSRF failure
    if (error.response?.status === 403) {
      csrfToken = null;
      if (
        error.response?.data?.error === 'CSRF validation failed' &&
        !originalRequest._csrfRetried
      ) {
        originalRequest._csrfRetried = true;
        const method = (originalRequest.method ?? 'get').toLowerCase();
        if (!['get', 'head', 'options'].includes(method)) {
          originalRequest.headers['x-csrf-token'] = await getCsrfToken();
        }
        return apiClient(originalRequest);
      }
    }

    // Silently refresh once when the access token has expired
    if (
      error.response?.status === 401 &&
      data?.error === 'TOKEN_EXPIRED' &&
      !originalRequest._retried
    ) {
      originalRequest._retried = true;
      try {
        await refreshTokens();
        // Re-attach fresh CSRF token if this was a state-changing request
        const method = (originalRequest.method ?? 'get').toLowerCase();
        if (!['get', 'head', 'options'].includes(method)) {
          originalRequest.headers['x-csrf-token'] = await getCsrfToken();
        }
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
