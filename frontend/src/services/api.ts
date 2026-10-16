import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Read from 'token' — the key used by AuthContext.login()
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      // Only clear token on auth-specific endpoints, not on resource 401s
      const isAuthEndpoint = requestUrl.includes('/auth/');
      if (!isAuthEndpoint) {
        console.warn('Session expired (401). Clearing tokens and redirecting to login.');
        // Clear both key variants to handle any inconsistency
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user_profile');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
