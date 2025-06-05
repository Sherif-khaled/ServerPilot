import React, { useState, useEffect } from 'react';
import api from '../../../api/axiosConfig';
import { challengeMfa } from '../../../api/userService';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../../../AuthContext';

export default function UserLoginForm({ onLoginSuccess }) {
  useEffect(() => {
    // Perform a pre-flight request to get the CSRF token
    api.get('/users/csrf/').catch(err => console.error('CSRF pre-flight failed:', err));
  }, []);

  const { loginAuth } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First, try to log in with the credentials
      const response = await api.post('/users/login/', form, {
        withCredentials: true, // Ensure cookies are sent with the request
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      // If we get here, the login was successful
      if (response.data.mfa_required) {
        // MFA is required, show the OTP input
        setMfaRequired(true);
      } else {
        // No MFA required, proceed with normal login
        const result = await loginAuth();
        if (result.success) {
          if (onLoginSuccess) onLoginSuccess();
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      // Handle login errors (e.g., network issues, server errors)
      const errorMessage = err.response?.data?.detail || 
                         err.response?.data?.message ||
                         err.response?.data?.non_field_errors?.[0] ||
                         'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
      
      // If MFA is required but there was an error, reset the form
      if (err.response?.data?.mfa_required) {
        setMfaRequired(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use the challengeMfa function from userService which sends the correct field name
      const response = await challengeMfa(otp);
      
      // If we get here, MFA verification was successful
      // Now verify the authentication status
      const result = await loginAuth();
      
      if (result.success) {
        // Clear the OTP field on success
        setOtp('');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(result.error || 'Authentication failed after MFA verification');
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      let errorMessage = 'MFA validation failed. Please try again.';
      
      if (err.response) {
        // Handle specific error cases
        if (err.response.status === 400 && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.non_field_errors) {
          errorMessage = err.response.data.non_field_errors[0];
        }
      }
      
      setError(errorMessage);
      
      // If the session is invalid, reset the MFA flow
      if (err.response?.status === 400 && 
          (err.response.data.error?.includes('No MFA challenge pending') ||
           err.response.data.error?.includes('session'))) {
        setMfaRequired(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Login
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={mfaRequired ? handleMfaSubmit : handleSubmit} noValidate>
        {!mfaRequired ? (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={form.username}
              onChange={handleChange}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </>
        ) : (
          <TextField
            margin="normal"
            required
            fullWidth
            id="otp"
            label="MFA Code"
            name="otp"
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={isLoading}
          />
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Signing in...' : mfaRequired ? 'Verify' : 'Sign In'}
        </Button>
      </Box>
    </Box>
  );
}
