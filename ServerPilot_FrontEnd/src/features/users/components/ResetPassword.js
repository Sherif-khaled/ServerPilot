import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Alert, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../../../api/axiosConfig';
import { useTranslation } from 'react-i18next';
import {textFieldSx, gradientButtonSx, Background} from '../../../common';

const FormContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
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


const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    switch (field) {
      case 'password':
        setPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
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
    
    if (!password.trim()) {
      newErrors.password = t('resetPassword.errors.enterPassword');
    } else if (password.length < 8) {
      newErrors.password = t('resetPassword.errors.passwordTooShort');
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('resetPassword.errors.confirmPassword');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.errors.mismatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      const response = await api.post('users/password/reset/confirm/', {
        uid,
        token,
        new_password: password,
      });
      setMessage(response.data.detail);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || t('forgotPassword.genericError'));
    }
  };

  return (
    <>
      <Background />
      <FormContainer>
        <StyledForm onSubmit={handleSubmit}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('resetPassword.title')}
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('resetPassword.newPassword')}
            variant="outlined"
            fullWidth
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={!!errors.password}
            helperText={errors.password || ''}
            InputLabelProps={{ style: { color: '#fff' } }}
            sx={textFieldSx}
          />
          <TextField
            label={t('resetPassword.confirmNewPassword')}
            variant="outlined"
            fullWidth
            margin="normal"
            type="password"
            value={confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword || ''}
            InputLabelProps={{ style: { color: '#fff' } }}
            sx={textFieldSx}
          />
          <Button type="submit" fullWidth variant="contained" sx={gradientButtonSx}>
            {t('resetPassword.submit')}
          </Button>
        </StyledForm>
      </FormContainer>
    </>
  );
};

export default ResetPassword;
