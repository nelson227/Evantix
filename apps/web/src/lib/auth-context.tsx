'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

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
    const token = localStorage.getItem('evantix_access_token');
    if (token) {
      api
        .get('/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('evantix_access_token');
          localStorage.removeItem('evantix_refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('evantix_access_token', data.tokens.accessToken);
    localStorage.setItem('evantix_refresh_token', data.tokens.refreshToken);
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
      localStorage.setItem('evantix_access_token', data.tokens.accessToken);
      localStorage.setItem('evantix_refresh_token', data.tokens.refreshToken);
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
    localStorage.removeItem('evantix_access_token');
    localStorage.removeItem('evantix_refresh_token');
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
