'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  role_display: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  date_joined: string;
  permissions: {
    can_upload: boolean;
    can_export: boolean;
    can_use_filters: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка токенов из localStorage при монтировании
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('access_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Пытаемся blacklist токен на сервере
      if (refreshToken && accessToken) {
        await fetch(`${API_BASE}/auth/users/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Очищаем состояние и localStorage
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
    }
  }, [accessToken, refreshToken]);

  // Обновление access token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      setAccessToken(data.access);
      localStorage.setItem('access_token', data.access);
      
      // Если вернулся новый refresh token (rotation enabled)
      if (data.refresh) {
        setRefreshToken(data.refresh);
        localStorage.setItem('refresh_token', data.refresh);
      }

      return data.access;
    } catch (error) {
      // Если не удалось обновить токен, разлогиниваем
      await logout();
      throw error;
    }
  }, [logout, refreshToken]);

  // Автоматическое обновление токена перед истечением (каждые 50 минут)
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(() => {
      refreshAccessToken().catch(console.error);
    }, 50 * 60 * 1000); // 50 минут

    return () => clearInterval(interval);
  }, [accessToken, refreshAccessToken]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка входа');
      }

      const data = await response.json();
      
      // Сохраняем токены и данные пользователя
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setUser(data.user);
      
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user && !!accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook для получения headers с токеном
export function useAuthHeaders() {
  const { accessToken } = useAuth();
  
  return {
    headers: accessToken
      ? {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        },
  };
}
