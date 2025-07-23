import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { getProfile, setupMfa, verifyMfa, disableMfa } from '../../../api/userService';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';

const MfaSettings = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeUri, setQrCodeUri] = useState(null);
  const [otp, setOtp] = useState('');

  const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));

  const textFieldSx = {
  '& .MuiOutlinedInput-root': {
  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
  '&.Mui-focused fieldset': { borderColor: 'transparent' },
  '&.Mui-focused': {
  boxShadow: '0 0 0 2px #FE6B8B, 0 0 0 1px #FF8E53',
  borderRadius: 1,
        },
  color: '#fff',
    },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.7)' },
};

  const fetchMfaStatus = async () => {
    try {
      const { data } = await getProfile();
      setMfaEnabled(data.mfa_enabled);
    } catch (err) {
      console.error('Error fetching MFA status:', err.response ? err.response.data : err.message);
      setError('Failed to load MFA status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const handleEnableMfa = async () => {
    setError('');
    setSuccess('');
    try {
      const { data } = await setupMfa();
      console.log('MFA Setup Response:', data);
      setQrCodeUri(data.qr_code_uri);
    } catch (err) {
      console.error('Error during MFA setup:', err.response ? err.response.data : err.message);
      setError('Failed to start MFA setup. Check the browser console for more details.');
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!otp || !otp.trim()) {
      setError('Please enter the OTP token from your authenticator app.');
      return;
    }
    
    try {
      // Show loading state
      setLoading(true);
      
      // Verify the OTP token
      const { data, error } = await verifyMfa(otp);
      
      if (error) {
        if (error.code === 'mfa_not_setup') {
          // Reset the MFA setup flow since it's not properly configured
          setQrCodeUri(null);
          setOtp('');
          setError('Your MFA setup session has expired. Please click "Enable MFA" to start over.');
          return;
        }
        // Handle specific error messages from the backend
        const errorMessage = error.detail || error.message || 'Failed to verify MFA. Please try again.';
        setError(errorMessage);
        return;
      }
      
      // Success case - MFA is now enabled
      setSuccess('MFA has been successfully enabled for your account!');
      setMfaEnabled(true);
      setQrCodeUri(null);
      setOtp('');
      
      // Clear any stored device ID from session
      if (window.sessionStorage) {
        window.sessionStorage.removeItem('mfa_device_id');
      }
      
      // Refresh the MFA status to ensure UI is in sync
      await fetchMfaStatus();
      
    } catch (err) {
      console.error('Unexpected error during MFA verification:', err);
      setError('An unexpected error occurred while verifying your code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setError('');
    setSuccess('');
    try {
      await disableMfa();
      setSuccess('MFA disabled successfully!');
      setMfaEnabled(false);
    } catch (err) {
      console.error('Error during MFA disable:', err.response ? err.response.data : err.message);
      setError('Failed to disable MFA. Check the browser console for more details.');
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <GlassPaper>
      <Typography variant="h6" gutterBottom>
        Multi-Factor Authentication (MFA)
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
        Enable Multi-Factor Authentication (MFA) to add an extra layer of security to your account.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {mfaEnabled ? (
        <Box>
          <Typography sx={{ mb: 2 }}>Multi-Factor Authentication is currently enabled.</Typography>
          <Button variant="contained" color="error" onClick={handleDisableMfa}>
            Disable MFA
          </Button>
        </Box>
      ) : (
        <Box>
          {!qrCodeUri ? (
            <Button 
              variant="contained" 
              onClick={handleEnableMfa}
              sx={{
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
            color: 'white',
            borderRadius: '25px',
            padding: '10px 25px',
              '&:disabled': {
              background: 'rgba(255, 255, 255, 0.3)',
              },
              mt: 3,
          }}>
              Enable MFA
            </Button>
          ) : (
            <Box component="form" onSubmit={handleVerifyMfa}>
              <Typography>Scan this QR code with your authenticator app:</Typography>
              <Box sx={{ my: 2 }}>
                <img src={qrCodeUri} alt="MFA QR Code" />
              </Box>
              <TextField
                label="OTP Token"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                fullWidth
                sx={{ mb: 2, ...textFieldSx }}
              />
              <Button 
                type="submit" 
                variant="contained"
                sx={{
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
            color: 'white',
            borderRadius: '25px',
            padding: '10px 25px',
              '&:disabled': {
              background: 'rgba(255, 255, 255, 0.3)',
              },
              mt: 3,
          }}>
                Verify & Enable
              </Button>
            </Box>
          )}
        </Box>
      )}
    </GlassPaper>
  );
};

export default MfaSettings;
