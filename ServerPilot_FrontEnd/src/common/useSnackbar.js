import { useState, useCallback } from 'react';

/**
 * Custom hook for managing snackbar state
 * 
 * @returns {Object} - Object containing snackbar state and control functions
 * @returns {Object} returns.snackbar - Snackbar state object { open, message, severity }
 * @returns {function} returns.showSuccess - Function to show success message
 * @returns {function} returns.showError - Function to show error message
 * @returns {function} returns.showWarning - Function to show warning message
 * @returns {function} returns.showInfo - Function to show info message
 * @returns {function} returns.hideSnackbar - Function to hide snackbar
 */
const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  }, []);

  const showSuccess = useCallback((message) => {
    showSnackbar(message, 'success');
  }, [showSnackbar]);

  const showError = useCallback((message) => {
    showSnackbar(message, 'error');
  }, [showSnackbar]);

  const showWarning = useCallback((message) => {
    showSnackbar(message, 'warning');
  }, [showSnackbar]);

  const showInfo = useCallback((message) => {
    showSnackbar(message, 'info');
  }, [showSnackbar]);

  return {
    snackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideSnackbar
  };
};

export default useSnackbar;
