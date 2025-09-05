import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, Link, CircularProgress, InputAdornment } from '@mui/material';
import { registerUser, checkUsernameExists } from '../../../api/userService';
import { styled } from '@mui/material/styles';
import Footer from '../../core/components/Footer';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../api/axiosConfig';
import ShowPasswordIconButton from '../../../common/ShowPasswordIconButton';
import GeneratePasswordButton from '../../../common/GeneratePasswordButton';
import PasswordStrengthMeter from '../../../common/PasswordStrengthMeter';
import { textFieldSx, gradientButtonSx, glassCardSx, Background } from '../../../common';


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
  maxWidth: '800px',
  textAlign: 'center',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff',
});
export default function UserRegisterForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
  const [errors, setErrors] = useState({});
  const [usernameError, setUsernameError] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selfRegistrationEnabled, setSelfRegistrationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    // Check if self-registration is enabled
    api.get('/security/self-registration-status/')
      .then(response => {
        setSelfRegistrationEnabled(response.data.self_registration_enabled || false);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch self-registration status:', err);
        setSelfRegistrationEnabled(false); // Default to disabled for security
        setIsLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (name === 'username' && usernameError) {
      setUsernameError('');
    }
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    if (name === 'username' && value) {
      try {
        const res = await checkUsernameExists(value);
        if (res.data?.exists) {
          setUsernameError(t('userForm.usernameTaken'));
        } else {
          setUsernameError('');
        }
      } catch (err) {
        // Silent fail; do not block form
        setUsernameError('');
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.username.trim()) newErrors.username = t('userForm.required.username');
    if (!form.email.trim()) newErrors.email = t('userForm.required.email');
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = t('userForm.required.emailInvalid');
    if (!form.first_name.trim()) newErrors.first_name = t('userForm.required.firstName');
    if (!form.last_name.trim()) newErrors.last_name = t('userForm.required.lastName');
    if (!form.password) newErrors.password = t('userForm.required.password');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selfRegistrationEnabled) {
      setError(t('auth.selfRegistrationDisabled'));
      return;
    }
    if (!validateForm() || usernameError) return;

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await registerUser(form);
      setSuccess(t('auth.registrationSuccessful'));
      setForm({ username: '', email: '', password: '', first_name: '', last_name: '' });
    } catch (err) {
      setError(err.response?.data?.email || err.response?.data?.detail || t('auth.registrationFailed'));
    }
    finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selfRegistrationEnabled) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Background />
        <Box sx={{ ...glassCardSx, maxWidth: 500, mx: 'auto', my: 'auto', textAlign: 'center' }}>
          <Typography variant="h5" mb={2} color="error">
            {t('auth.selfRegistrationDisabled')}
          </Typography>
          <Typography variant="body1" mb={3} color="text.secondary">
            {t('auth.selfRegistrationDisabledMessage')}
          </Typography>
          <Button 
            component={RouterLink} 
            to="/login" 
            variant="contained" 
            color="primary"
            fullWidth
            sx={gradientButtonSx}
          >
            {t('auth.backToLogin')}
          </Button>
        </Box>
        <Footer transparent authPage />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Background />
        <MainContainer sx={{ flexGrow: 1 }}>
          <Box sx={{ maxWidth: 800, mx: 'auto', my: 'auto', width: '100%', p: 3 }}>
            {success && <Alert severity="success">{success}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <FormContainer component="form" onSubmit={handleSubmit}>
            <Typography variant="h5" mb={2} align="center">{t('auth.registerPharse')}</Typography>

              <TextField 
                label={t('auth.username')} 
                name="username" 
                value={form.username} 
                onChange={handleChange} 
                onBlur={handleBlur}
                fullWidth 
                margin="normal" 
                error={!!errors.username || !!usernameError}
                helperText={errors.username || usernameError}
                sx={textFieldSx} 
                />
              <TextField 
                label={t('auth.email')}
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                fullWidth 
                margin="normal" 
                error={!!errors.email}
                helperText={errors.email}
                sx={textFieldSx} 
    
              />
              <TextField 
                label={t('auth.password')} 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                value={form.password} 
                onChange={handleChange} 
                fullWidth 
                margin="normal" 
                error={!!errors.password}
                helperText={errors.password}
                sx={textFieldSx}
                InputProps={{
                  style: { color: 'white' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <ShowPasswordIconButton
                        visible={showPassword}
                        onClick={() => setShowPassword((show) => !show)}
                      />
                      <GeneratePasswordButton
                        onGenerate={(pwd) => {
                          setForm((prev) => ({
                            ...prev,
                            password: pwd,
                          }));
                        }}
                        disabled={submitting}
                      />
                    </InputAdornment>
                  ),
                }} 
    
              />
              <PasswordStrengthMeter password={form.password} />
              <TextField 
                label={t('auth.firstName')} 
                name="first_name" 
                value={form.first_name} 
                onChange={handleChange} 
                fullWidth 
                margin="normal"
                error={!!errors.first_name}
                helperText={errors.first_name}
                sx={textFieldSx} 
    
              />
              <TextField 
                label={t('auth.lastName')} 
                name="last_name" 
                value={form.last_name} 
                onChange={handleChange} 
                fullWidth 
                margin="normal"
                error={!!errors.last_name}
                helperText={errors.last_name}
                sx={textFieldSx} 
    
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                fullWidth 
                disabled={submitting}
                sx={{...gradientButtonSx, mt: 2 }}>
                  {t('auth.register')}
              </Button>
            </FormContainer>
            <Box sx={{ mt: 2, textAlign: 'left' }}>
              <Link component={RouterLink} to="/login" variant="body2" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                {t('auth.alreadyHaveAccount')}
              </Link>
            </Box>
          </Box>
      </MainContainer>

      <Footer transparent authPage />
    </Box>
  );
}
