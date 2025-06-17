import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Container, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import ReCAPTCHA from 'react-google-recaptcha';
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
  '&:disabled': {
    background: 'rgba(255, 255, 255, 0.3)',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);

  useEffect(() => {
    // Check if reCAPTCHA is enabled by checking for the site key in environment variables
    setRecaptchaEnabled(!!process.env.REACT_APP_RECAPTCHA_SITE_KEY);
  }, []);

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (recaptchaEnabled && !recaptchaToken) {
      setError('Please complete the reCAPTCHA.');
      return;
    }

    try {
      const response = await api.post('users/password/reset/', { email, recaptcha_token: recaptchaToken });
      setMessage(response.data.detail);
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <>
      <Background />
      <FormContainer>
        <StyledForm onSubmit={handleSubmit}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Forgot Password
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 3 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email Address"
            variant="outlined"
            fullWidth
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            InputLabelProps={{ style: { color: '#fff' } }}
            sx={{ input: { color: 'white' } }}
          />
          {recaptchaEnabled && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <ReCAPTCHA
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
              />
            </Box>
          )}
          <StyledButton 
            type="submit" 
            fullWidth 
            variant="contained" 
            disabled={recaptchaEnabled ? !recaptchaToken : false}
          >
            Send Reset Link
          </StyledButton>
        </StyledForm>
      </FormContainer>
    </>
  );
};

export default ForgotPassword;
