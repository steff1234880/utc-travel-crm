import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  roleId?: string | null;
  roleName: string;
  permissions: string[];
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  } | null;
}

export const getRoleDefaultRoute = (roleName?: string, permissions?: string[]): string => {
  const role = (roleName || '').toUpperCase().trim();

  if (role.includes('SUPER') || role.includes('CEO') || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return '/admin/ceo-dashboard';
  }
  if (role.includes('SALES')) {
    return '/admin/crm/dashboard';
  }
  if (role.includes('HR')) {
    return '/admin/hr';
  }
  if (role.includes('ACCOUNT') || role.includes('FINANCE')) {
    return '/admin/accounting';
  }
  if (role.includes('OPERAT') || role.includes('RESERVATION') || role.includes('TOUR')) {
    return '/admin/operations';
  }

  // Permission fallback if custom role name
  if (permissions && Array.isArray(permissions)) {
    if (permissions.some(p => p.startsWith('sales_crm:') || p.startsWith('enquiries:'))) return '/admin/crm/dashboard';
    if (permissions.some(p => p.startsWith('hr:') || p.startsWith('employees:'))) return '/admin/hr';
    if (permissions.some(p => p.startsWith('accounting:') || p.startsWith('payments:'))) return '/admin/accounting';
    if (permissions.some(p => p.startsWith('operations:'))) return '/admin/operations';
  }

  return '/admin';
};

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: UserProfile; defaultRoute?: string; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string | string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasModuleAccess: (moduleName: string) => boolean;
  getRoleDefaultRoute: (roleName?: string, permissions?: string[]) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch current user profile:', error);
      const cachedUser = localStorage.getItem('user_profile');
      if (cachedUser) {
        try { setUser(JSON.parse(cachedUser)); } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success && data.accessToken) {
        // Clear any stale tokens before storing new credentials
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user_profile');

        localStorage.setItem('token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        
        setToken(data.accessToken);
        setUser(data.user);
        localStorage.setItem('user_profile', JSON.stringify(data.user));

        const defaultRoute = getRoleDefaultRoute(data.user?.roleName, data.user?.permissions);
        console.log('[Auth] Login success. Role:', data.user?.roleName, '| defaultRoute:', defaultRoute);
        return { success: true, user: data.user, defaultRoute };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Invalid credentials or login failed';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user_profile');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const isSuperUser = (role: string) => {
    const r = (role || '').toUpperCase();
    return r.includes('SUPER') || r.includes('CEO') || r === 'ADMIN' || r === 'SUPER_ADMIN';
  };

  const hasPermission = (permName: string): boolean => {
    if (!user) return false;
    if (isSuperUser(user.roleName)) return true;
    return user.permissions?.includes(permName) || false;
  };

  const hasRole = (roleName: string | string[]): boolean => {
    if (!user) return false;
    if (isSuperUser(user.roleName)) return true;
    const currentRole = (user.roleName || '').toUpperCase();
    if (Array.isArray(roleName)) {
      return roleName.some(r => r.toUpperCase() === currentRole);
    }
    return currentRole === roleName.toUpperCase();
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isSuperUser(user.roleName)) return true;
    return permissions.some(p => user.permissions?.includes(p));
  };

  const hasModuleAccess = (moduleName: string): boolean => {
    if (!user) return false;
    if (isSuperUser(user.roleName)) return true;
    const normalizedMod = moduleName.toLowerCase().replace(/\s+/g, '_');
    return user.permissions?.some(p => p.startsWith(`${normalizedMod}:`)) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
        hasAnyPermission,
        hasModuleAccess,
        getRoleDefaultRoute
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
