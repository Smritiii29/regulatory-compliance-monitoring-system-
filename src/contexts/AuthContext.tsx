import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, setToken, clearToken, getToken } from '@/services/api';

export type UserRole = 'admin' | 'principal' | 'hod' | 'faculty';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; password: string; role: string; department: string }) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI.me()
        .then((u: User) => setUser(u))
        .catch(() => { clearToken(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await authAPI.login(email, password);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const signup = useCallback(async (signupData: { name: string; email: string; password: string; role: string; department: string }): Promise<boolean> => {
    try {
      const data = await authAPI.signup(signupData);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authAPI.me();
      setUser(u);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'principal';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
        isAdmin,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    admin: 'System Administrator',
    principal: 'Principal / Compliance Officer',
    hod: 'Head of Department',
    faculty: 'Faculty Member',
  };
  return labels[role] || role;
};
