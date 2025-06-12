import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../../../api/axiosConfig';

const Background = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
  zIndex: -1,
});

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

const StyledButton = styled(Button)({
  marginTop: '20px',
  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
  color: 'white',
});

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setMessage('');

    try {
      const response = await api.post('users/password/reset/confirm/', {
        uid,
        token,
        new_password: password,
      });
      setMessage(response.data.detail);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. The link may be invalid or expired.');
    }
  };

  return (
    <>
      <Background />
      <FormContainer>
        <StyledForm onSubmit={handleSubmit}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Reset Password
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="New Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputLabelProps={{ style: { color: '#fff' } }}
            sx={{ input: { color: 'white' } }}
          />
          <TextField
            label="Confirm New Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            InputLabelProps={{ style: { color: '#fff' } }}
            sx={{ input: { color: 'white' } }}
          />
          <StyledButton type="submit" fullWidth variant="contained">
            Set New Password
          </StyledButton>
        </StyledForm>
      </FormContainer>
    </>
  );
};

export default ResetPassword;
