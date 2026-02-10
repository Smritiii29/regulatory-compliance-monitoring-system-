import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'admin' | 'principal' | 'hod' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: Record<string, { password: string; user: User }> = {
  'admin@college.edu.in': {
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@college.edu.in',
      name: 'Dr. Rajesh Kumar',
      role: 'admin',
      department: 'Administration',
    },
  },
  'principal@college.edu.in': {
    password: 'principal123',
    user: {
      id: '2',
      email: 'principal@college.edu.in',
      name: 'Dr. Sunita Sharma',
      role: 'principal',
      department: 'Principal Office',
    },
  },
  'hod.cse@college.edu.in': {
    password: 'hod123',
    user: {
      id: '3',
      email: 'hod.cse@college.edu.in',
      name: 'Dr. Amit Patel',
      role: 'hod',
      department: 'Computer Science & Engineering',
    },
  },
  'staff@college.edu.in': {
    password: 'staff123',
    user: {
      id: '4',
      email: 'staff@college.edu.in',
      name: 'Priya Nair',
      role: 'staff',
      department: 'Human Resources',
    },
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const userRecord = mockUsers[email.toLowerCase()];
    if (userRecord && userRecord.password === password) {
      setUser(userRecord.user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'principal';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isAdmin,
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
    staff: 'Department Staff',
  };
  return labels[role];
};
