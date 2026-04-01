import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('evantix_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('evantix_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync('evantix_access_token', data.tokens.accessToken);
        await SecureStore.setItemAsync('evantix_refresh_token', data.tokens.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
        return api(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('evantix_access_token');
        await SecureStore.deleteItemAsync('evantix_refresh_token');
      }
    }
    return Promise.reject(error);
  },
);
