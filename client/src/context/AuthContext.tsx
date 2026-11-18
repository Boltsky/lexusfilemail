import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (email: string, name: string, googleId: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('lexusmail_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
        localStorage.removeItem('lexusmail_token');
      }
    } catch {
      setUser(null);
      localStorage.removeItem('lexusmail_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password: pass });
      if (res.data.success && res.data.token) {
        localStorage.setItem('lexusmail_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, error: res.data.error || 'Login failed' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed',
      };
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    try {
      const res = await apiClient.post('/auth/register', { name, email, password: pass });
      if (res.data.success && res.data.token) {
        localStorage.setItem('lexusmail_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, error: res.data.error || 'Registration failed' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Registration failed',
      };
    }
  };

  const googleLogin = async (email: string, name: string, googleId: string, avatarUrl?: string) => {
    try {
      const res = await apiClient.post('/auth/google', { email, name, googleId, avatarUrl });
      if (res.data.success && res.data.token) {
        localStorage.setItem('lexusmail_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, error: res.data.error || 'Google login failed' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Google login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('lexusmail_token');
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
