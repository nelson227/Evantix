import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_ROOT = API_BASE.replace('/api/v1', '');

export function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_ROOT}${url}`;
}

export function isVideo(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('evantix_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401 with refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('evantix_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });
        localStorage.setItem('evantix_access_token', data.tokens.accessToken);
        localStorage.setItem('evantix_refresh_token', data.tokens.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('evantix_access_token');
        localStorage.removeItem('evantix_refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
