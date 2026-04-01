import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    ministryName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('evantix_access_token');
      if (token) {
        try {
          const { data } = await api.get('/me');
          setUser(data);
        } catch {
          await SecureStore.deleteItemAsync('evantix_access_token');
          await SecureStore.deleteItemAsync('evantix_refresh_token');
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('evantix_access_token', data.tokens.accessToken);
    await SecureStore.setItemAsync('evantix_refresh_token', data.tokens.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (regData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      displayName?: string;
      ministryName?: string;
    }) => {
      const { data } = await api.post('/auth/register', regData);
      await SecureStore.setItemAsync('evantix_access_token', data.tokens.accessToken);
      await SecureStore.setItemAsync('evantix_refresh_token', data.tokens.refreshToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore
    }
    await SecureStore.deleteItemAsync('evantix_access_token');
    await SecureStore.deleteItemAsync('evantix_refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
