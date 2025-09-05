import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { challengeMfa, loginUser, loginSession, verifyRecoveryCode } from '../../../api/userService';
import { Box, TextField, Button, Alert,Typography, CircularProgress, Checkbox, FormControlLabel, Link, InputAdornment, Collapse, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../../AuthContext';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Avatar } from '@mui/material';
import Footer from '../../core/components/Footer';
import { textFieldSx, gradientButtonSx, CircularProgressSx, checkBoxSx, Background } from '../../../common';
import { useTranslation } from 'react-i18next';

const MainContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '90vh',
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
  overflow: 'hidden',
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
    color: '#fff',
  },
  '& .MuiAvatar-root': {
      width: '100%',
      height: '100%',
  }
});


export default function UserLoginForm({ onLoginSuccess }) {
  const { t, i18n } = useTranslation();
  const [selfRegistrationEnabled, setSelfRegistrationEnabled] = useState(false);
  
  useEffect(() => {
    // Check if self-registration is enabled
    apiClient.get('/security/self-registration-status/')
      .then(response => {
        setSelfRegistrationEnabled(response.data.self_registration_enabled || false);
      })
      .catch(err => {
        console.error('Failed to fetch self-registration status:', err);
        setSelfRegistrationEnabled(false); // Default to disabled for security
      });
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
  const [useRecovery, setUseRecovery] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

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
        apiClient.get(`/users/profile-picture/${form.username}/`)
            .then(response => {
                setProfilePicUrl(response.data.profile_photo_url);
            })
            .catch(() => {
                setProfilePicUrl('');
            });
    }, 500);
    return () => clearTimeout(timerId);
  }, [form.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Step 1: Use session login to detect MFA requirement
      const sessionResp = await loginSession({ username: form.username, password: form.password });
      if (sessionResp.data?.mfa_required) {
        // Show MFA input; do NOT fetch JWT yet
        setMfaRequired(true);
        return;
      }

      // Step 2: If no MFA required, obtain JWT tokens
      await loginUser({ username: form.username, password: form.password });

      // Step 3: Hydrate auth context and preferences
      const result = await loginAuth();
      if (result.success) {
        try {
          const preferred = result.user?.language;
          if (preferred) {
            i18n.changeLanguage(preferred);
            document.documentElement.dir = preferred === 'ar' ? 'rtl' : 'ltr';
          }
        } catch {}
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(result.error || 'Login failed. Please try again.');
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

  // Shared MFA performer, supports 'auth' (OTP) and 'recovery' modes
  const performMfa = async (mode) => {
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'recovery') {
        const code = (otp || '').toString().trim();
        if (!code || code.length < 6) {
          setIsLoading(false);
          setError('Enter your recovery code.');
          return;
        }
        await verifyRecoveryCode(code);
      } else {
        // Normalize OTP: remove non-digits and ensure 6 digits
        const cleaned = (otp || '').toString().replace(/\D/g, '');
        if (cleaned.length !== 6) {
          setIsLoading(false);
          setError('Enter the 6-digit verification code.');
          return;
        }
        await challengeMfa(cleaned);
      }
      // After successful MFA, obtain JWT tokens
      await loginUser({ username: form.username, password: form.password });
      const result = await loginAuth();
      if (result.success) {
        try {
          const preferred = result.user?.language;
          if (preferred) {
            i18n.changeLanguage(preferred);
            document.documentElement.dir = preferred === 'ar' ? 'rtl' : 'ltr';
          }
        } catch {}
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

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    // Preserve existing submit behavior: uses current selection
    await performMfa(useRecovery ? 'recovery' : 'auth');
  };

  // More options handlers
  const handleToggleMoreOptions = () => setMoreOptionsOpen((prev) => !prev);
  const handleSelectRecovery = () => { setUseRecovery(true); setOtp(''); };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Background />
      <MainContainer sx={{ flexGrow: 1 }}>
        <FormContainer component="form" onSubmit={mfaRequired ? handleMfaSubmit : handleSubmit} noValidate>
          <IconWrapper>
            {profilePicUrl ? <Avatar src={profilePicUrl} /> : <PhotoCameraOutlinedIcon />}
          </IconWrapper>
          {error && <Alert severity="error" sx={{ mb: 2, background: 'transparent', color: '#ffcdd2' }}>{error}</Alert>}
          {!mfaRequired ? (
            <>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>{t('common.adminDashboard')}</Typography>
            </Box>
              <Box sx={{ width: '100%', mb: 2 }}>
                <TextField
                  label={t('auth.username')}
                  variant="outlined"
                  fullWidth
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  sx={{...textFieldSx}}
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
              </Box>
             <Box sx={{ width: '100%' }}>
              <TextField
                  label={t('auth.password')}
                  type="password"
                  variant="outlined"
                  fullWidth
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  sx={{...textFieldSx}}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon />
                      </InputAdornment>
                    ),
                  }}
                />
             </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <FormControlLabel
                  control={<Checkbox value="remember" sx={{...checkBoxSx}}/>}
                  label={t('auth.rememberMe')}
                />
               
              </Box>
              <Box sx={{ mt: 2 , width: '100%'}}>
              <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  sx={{width: '100%',...gradientButtonSx }}
                  startIcon={isLoading ? <CircularProgress size={20} sx={CircularProgressSx} /> : null}
              >
                  {isLoading ? t('auth.loggingIn') : t('auth.login')}
              </Button>
              </Box>
              <Box display={'flex'} sx={{mt:2}}> 
                <Box  justifyContent={'start'}>
                  <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    {t('auth.forgotPassword')}
                  </Link>
                </Box>
                {selfRegistrationEnabled && (
                  <Box sx={{ ml: 'auto' }}>
                    <Link component={RouterLink} to="/register" variant="body2" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      {t('auth.signUp')}
                    </Link>
                  </Box>
                )}
              </Box>
            </>
          ) : (
            <>
              <TextField
                label={useRecovery ? '2FA Recovery Code' : 'MFA Code'}
                variant="outlined"
                fullWidth
                id="otp"
                name="otp"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isLoading}
                sx={{...textFieldSx}}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon />
                    </InputAdornment>
                  ),
                }}
                helperText={useRecovery ? 'You are using a recovery code for this login.' : ''}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{ ...gradientButtonSx }}
                  onClick={() => performMfa(useRecovery ? 'recovery' : 'auth')}
                >
                  Verify
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  onClick={handleToggleMoreOptions}
                  disabled={isLoading}
                  sx={{ justifyContent: 'space-between', borderColor: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: '10px' }}
                  endIcon={moreOptionsOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                >
                  More options
                </Button>
                <Collapse in={moreOptionsOpen} timeout="auto" unmountOnExit>
                  <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      onClick={handleSelectRecovery}
                      sx={{ borderColor: 'rgba(255,255,255,0.3)', borderRadius: '10px' }}
                    >
                      2FA recovery code
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            </>
          )}
        </FormContainer>
      </MainContainer>
      <Footer transparent authPage />
    </Box>
  );
}
