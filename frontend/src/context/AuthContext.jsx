import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isTokenExpired, getTokenRemainingTime } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize token and user only if the stored token is still valid
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('jwt_token');
    if (savedToken && !isTokenExpired(savedToken)) {
      return savedToken;
    }
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    return null;
  });

  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('jwt_token');
    if (!savedToken || isTokenExpired(savedToken)) {
      return null;
    }
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        localStorage.removeItem('user_data');
      }
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'otp' | 'register'

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
  }, []);

  // Sync token in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  }, [token]);

  // Sync user in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_data');
    }
  }, [user]);

  // Active Timer: Automatically log out the exact moment the JWT expires
  useEffect(() => {
    if (!token) return;

    if (isTokenExpired(token)) {
      logout();
      return;
    }

    const remainingMs = getTokenRemainingTime(token);
    // Set timer to trigger logout when token expires
    const timer = setTimeout(() => {
      logout();
      setIsAuthModalOpen(false);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [token, logout]);

  // Tab Focus / Visibility Listener: Instantly check expiry when user returns to tab
  useEffect(() => {
    const checkExpiryOnActive = () => {
      const currentToken = localStorage.getItem('jwt_token');
      if (currentToken && isTokenExpired(currentToken)) {
        logout();
      }
    };

    window.addEventListener('focus', checkExpiryOnActive);
    document.addEventListener('visibilitychange', checkExpiryOnActive);

    return () => {
      window.removeEventListener('focus', checkExpiryOnActive);
      document.removeEventListener('visibilitychange', checkExpiryOnActive);
    };
  }, [logout]);

  // Listen to 401 session expiration from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      setIsAuthModalOpen(false);
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, [logout]);

  const login = (authResponse) => {
    const newToken = authResponse.token;
    const userData = authResponse.user;
    setToken(newToken);
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isAuthenticated = Boolean(token && user && !isTokenExpired(token));
  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        updateUser,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
