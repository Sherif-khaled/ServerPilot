import React, { createContext, useState, useEffect, useContext } from 'react';
import { getProfile } from './api/userService';
import apiClient from './api/apiClient';
import i18n from './i18n';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in by trying to fetch profile
  const checkAuth = async () => {
    try {
      const hasAccess = !!localStorage.getItem('accessToken');
      if (!hasAccess) {
        setUser(null);
        return false;
      }
      const response = await getProfile();
      setUser(response.data);
      const preferred = response.data?.language;
      if (preferred) {
        i18n.changeLanguage(preferred);
        document.documentElement.dir = preferred === 'ar' ? 'rtl' : 'ltr';
      }
      return true;
    } catch (error) {
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };
    initializeAuth();
  }, []);

  // Login function
  const loginAuth = async (userData) => {
    try {
      // With JWT, tokens are already stored by loginUser; just fetch profile
      const response = await getProfile();
      
      // If we get here, the user is authenticated
      setUser(response.data);
      return { 
        success: true, 
        user: response.data 
      };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        // Handle MFA required response
        if (error.response.status === 403 && error.response.data?.mfa_required) {
          return { 
            success: false, 
            mfa_required: true,
            error: 'MFA verification required'
          };
        }
        // Handle other 403 Forbidden errors (permission denied)
        if (error.response.status === 403) {
          return {
            success: false,
            error: 'Permission Denied: You do not have the necessary permissions to access this application. Please contact an administrator for assistance.'
          };
        }
      }

      return { 
        success: false, 
        error: error.response?.data?.detail || 'Authentication failed' 
      };
    }
  };

  // Logout function
  const logoutAuth = async () => {
    try {
      // Clear tokens (best effort call to backend logout is optional)
      try { await apiClient.post('/users/logout/'); } catch (e) {}
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear the user state regardless of the API call result
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, // <-- Add this
      isAuthenticated: !!user,
      loginAuth, 
      logoutAuth, 
      isLoading,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
