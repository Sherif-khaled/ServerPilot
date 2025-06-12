import React, { useState, useEffect } from 'react';
import api from '../../../api/axiosConfig';
import { challengeMfa } from '../../../api/userService';
import { Box, TextField, Button, Typography, Alert, CircularProgress, Checkbox, FormControlLabel, Link, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../../AuthContext';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Avatar } from '@mui/material';

const Background = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
  zIndex: -1,
});

const MainContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
});

const FormContainer = styled(Box)({
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  padding: '40px',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '400px',
  textAlign: 'center',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff',
});

const IconWrapper = styled(Box)({
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  border: '2px solid #fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px auto',
  overflow: 'hidden', // to contain the avatar image
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
    color: '#fff',
  },
  '& .MuiAvatar-root': {
      width: '100%',
      height: '100%',
  }
});

const StyledTextField = styled(TextField)({
  marginBottom: '20px',
  '& .MuiInputBase-root': {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '10px',
    color: '#fff',
    '&:hover': {
        background: 'rgba(0, 0, 0, 0.4)',
    }
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '& .MuiSvgIcon-root': {
      color: 'rgba(255, 255, 255, 0.7)',
  }
});

const StyledButton = styled(Button)({
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    border: 0,
    borderRadius: '10px',
    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
    color: 'white',
    height: 48,
    padding: '0 30px',
    marginTop: '20px',
    width: '100%',
});


export default function UserLoginForm({ onLoginSuccess }) {
  useEffect(() => {
    api.get('users/csrf/').catch(err => console.error('CSRF pre-flight failed:', err));
  }, []);

  const { loginAuth, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');

  const handleChange = (e) => {
      const { name, value } = e.target;
      setForm({ ...form, [name]: value });
  };

  useEffect(() => {
    if (form.username.trim() === '') {
        setProfilePicUrl('');
        return;
    }

    const timerId = setTimeout(() => {
        api.get(`users/profile-picture/${form.username}/`)
            .then(response => {
                setProfilePicUrl(response.data.profile_photo_url);
            })
            .catch(() => {
                setProfilePicUrl('');
            });
    }, 500); // 500ms debounce

    return () => clearTimeout(timerId);
  }, [form.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('users/login/', form, {
        withCredentials: true,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      
      if (response.data.mfa_required) {
        setMfaRequired(true);
      } else {
        const result = await loginAuth();
        if (result.success) {
          if (onLoginSuccess) onLoginSuccess();
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.non_field_errors?.[0] || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
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
      await challengeMfa(otp);
      const result = await loginAuth();
      if (result.success) {
        setOtp('');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(result.error || 'Authentication failed after MFA verification');
      }
    } catch (err) {
      let errorMessage = 'MFA validation failed. Please try again.';
      if (err.response) {
        if (err.response.status === 400 && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.non_field_errors) {
          errorMessage = err.response.data.non_field_errors[0];
        }
      }
      setError(errorMessage);
      if (err.response?.status === 400 && (err.response.data.error?.includes('No MFA challenge pending') || err.response.data.error?.includes('session'))) {
        setMfaRequired(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Background />
      <MainContainer>
        <FormContainer component="form" onSubmit={mfaRequired ? handleMfaSubmit : handleSubmit} noValidate>
          <IconWrapper>
            {profilePicUrl ? <Avatar src={profilePicUrl} /> : <PhotoCameraOutlinedIcon />}
          </IconWrapper>
          {error && <Alert severity="error" sx={{ mb: 2, background: 'transparent', color: '#ffcdd2' }}>{error}</Alert>}
          {!mfaRequired ? (
            <>
              <StyledTextField
                label="Username"
                variant="outlined"
                fullWidth
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={form.username}
                onChange={handleChange}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <StyledTextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                name="password"
                id="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <FormControlLabel
                  control={<Checkbox value="remember" sx={{color: 'rgba(255, 255, 255, 0.7)', '&.Mui-checked': { color: '#2196F3' }}}/>}
                  label="Remember me"
                />
                <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Forgot Password?
                </Link>
              </Box>
              <StyledButton
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                  {isLoading ? 'Logging in...' : 'Login'}
              </StyledButton>
            </>
          ) : (
            <StyledTextField
              label="MFA Code"
              variant="outlined"
              fullWidth
              id="otp"
              name="otp"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon />
                  </InputAdornment>
                ),
              }}
            />
          )}
        </FormContainer>
      </MainContainer>
    </>
  );
}
