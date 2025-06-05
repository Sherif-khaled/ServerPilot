import React, { createContext, useState, useEffect, useContext } from 'react';
import { getProfile } from './api/userService';
import apiClient from './api/apiClient';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in by trying to fetch profile
  const checkAuth = async () => {
    try {
      const response = await getProfile();
      setUser(response.data);
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
      // The actual login is handled by the session cookie
      // First, try to get the user profile
      const response = await getProfile();
      
      // If we get here, the user is authenticated
      setUser(response.data);
      return { 
        success: true, 
        user: response.data 
      };
    } catch (error) {
      console.error('Login error:', error);
      // Check if this is an MFA required response
      if (error.response && error.response.status === 403 && 
          error.response.data && error.response.data.mfa_required) {
        return { 
          success: false, 
          mfa_required: true,
          error: 'MFA verification required'
        };
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
      // Call Django's logout endpoint to clear the session
      await apiClient.post('/users/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear the user state regardless of the API call result
      setUser(null);
      // Clear any stored tokens just in case
      localStorage.removeItem('authToken');
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
