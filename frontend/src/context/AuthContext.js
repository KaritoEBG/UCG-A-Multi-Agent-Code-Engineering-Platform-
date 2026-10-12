import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

// Guest usage limit
const GUEST_USAGE_LIMIT = 1;
const GUEST_USAGE_KEY = 'guest_prompts_used';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [guestUsage, setGuestUsage] = useState(() => {
    return parseInt(localStorage.getItem(GUEST_USAGE_KEY) || '0', 10);
  });

  // Guest usage tracking functions
  const getGuestUsageCount = () => {
    return parseInt(localStorage.getItem(GUEST_USAGE_KEY) || '0', 10);
  };

  const incrementGuestUsage = () => {
    const newCount = getGuestUsageCount() + 1;
    localStorage.setItem(GUEST_USAGE_KEY, newCount.toString());
    setGuestUsage(newCount);
    return newCount;
  };

  const hasReachedGuestLimit = () => {
    return getGuestUsageCount() >= GUEST_USAGE_LIMIT;
  };

  const resetGuestUsage = () => {
    localStorage.removeItem(GUEST_USAGE_KEY);
    setGuestUsage(0);
  };

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const response = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data);
          setToken(savedToken);
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Google Sign-In handler
  const signInWithGoogle = async (googleCredential) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/google`, {
        credential: googleCredential
      });
      
      const { access_token, user: userData } = response.data;
      
      // Save token
      localStorage.setItem('auth_token', access_token);
      setToken(access_token);
      setUser(userData);
      
      // Reset guest usage on successful login
      resetGuestUsage();
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Sign-in failed' 
      };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  // Get auth header for API calls
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Authenticated axios instance
  const authAxios = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    signInWithGoogle,
    logout,
    getAuthHeader,
    authAxios,
    // Guest usage tracking
    guestUsage,
    getGuestUsageCount,
    incrementGuestUsage,
    hasReachedGuestLimit,
    resetGuestUsage
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
