import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Container, Alert, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';
import ReCAPTCHA from 'react-google-recaptcha';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import api from '../../../api/axiosConfig';
import Footer from '../../core/components/Footer';
import { textFieldSx, gradientButtonSx, Background } from '../../../common';
import { useTranslation } from 'react-i18next';

const FormContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

const StyledForm = styled('form')({
  background: 'rgba(255, 255, 255, 0.1)',
  padding: '40px',
  borderRadius: '15px',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  width: '100%',
  maxWidth: '400px',
  color: '#fff',
});

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if reCAPTCHA is enabled by checking for the site key in environment variables
    setRecaptchaEnabled(!!process.env.REACT_APP_RECAPTCHA_SITE_KEY);
  }, []);

  const handleChange = (field, value) => {
    switch (field) {
      case 'email':
        setEmail(value);
        break;
      default:
        break;
    }
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = t('forgotPassword.errors.enterEmail');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('forgotPassword.errors.invalidEmail');
    }
    
    if (recaptchaEnabled && !recaptchaToken) {
      newErrors.recaptcha = t('forgotPassword.errors.recaptchaRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    // Clear recaptcha error when user completes it
    if (errors.recaptcha) {
      setErrors(prev => ({
        ...prev,
        recaptcha: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      const response = await api.post('users/password/reset/', { email, recaptcha_token: recaptchaToken });
      setMessage(response.data.detail);
    } catch (err) {
      setError(t('forgotPassword.genericError'));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Background />
      <FormContainer sx={{ flexGrow: 1 }}>
        <StyledForm onSubmit={handleSubmit}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('forgotPassword.title')}
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 3 }}>
            {t('forgotPassword.helper')}
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('forgotPassword.email')}
            variant="outlined"
            fullWidth
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email || ''}
            sx={{ ...textFieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon />
                </InputAdornment>
              ),
            }}
          />
          {recaptchaEnabled && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
              <ReCAPTCHA
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
              />
              {errors.recaptcha && (
                <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                  {errors.recaptcha}
                </Typography>
              )}
            </Box>
          )}
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            disabled={recaptchaEnabled ? !recaptchaToken : false}
            sx={{width: '100%',mt:2,...gradientButtonSx }}
          >
            {t('forgotPassword.submit')}
          </Button>
        </StyledForm>
      </FormContainer>
      <Footer transparent authPage />
    </Box>
  );
};

export default ForgotPassword;
