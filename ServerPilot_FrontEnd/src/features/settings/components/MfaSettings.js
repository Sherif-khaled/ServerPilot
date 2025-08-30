import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { getProfile, setupMfa, verifyMfa, disableMfa } from '../../../api/userService';
import { CustomSnackbar, useSnackbar, textFieldSx, GlassPaper, gradientButtonSx, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const MfaSettings = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrCodeUri, setQrCodeUri] = useState(null);
  const [otp, setOtp] = useState('');

  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const { t } = useTranslation();


  const fetchMfaStatus = async () => {
    try {
      const { data } = await getProfile();
      setMfaEnabled(data.mfa_enabled);
    } catch (err) {
      console.error('Error fetching MFA status:', err.response ? err.response.data : err.message);
      setError(t('mfaSettings.loadFail'));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const handleEnableMfa = async () => {
    setError('');
    try {
      const { data } = await setupMfa();
      console.log('MFA Setup Response:', data);
      setQrCodeUri(data.qr_code_uri);
    } catch (err) {
      console.error('Error during MFA setup:', err.response ? err.response.data : err.message);
      showError(t('mfaSettings.setupFail'));
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!otp || !otp.trim()) {
      setError(t('mfaSettings.otpRequired'));
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await verifyMfa(otp);
      
      if (error) {
        if (error.code === 'mfa_not_setup') {
          setQrCodeUri(null);
          setOtp('');
          setError(t('mfaSettings.setupExpired'));
          return;
        }
        // Handle specific error messages from the backend
        const errorMessage = error.detail || error.message || t('mfaSettings.verifyFailGeneric');
        setError(errorMessage);
        return;
      }
      
      // Success case - MFA is now enabled
      showSuccess(t('mfaSettings.enabledNow'));
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
      console.error('Unexpected error during MFA verification:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.detail
        ? err.response.data.detail
        : t('mfaSettings.verifyUnexpected');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setError('');
    try {
      await disableMfa();
      showSuccess(t('mfaSettings.disableSuccess'));
      setMfaEnabled(false);
    } catch (err) {
      console.error('Error during MFA disable:', err.response ? err.response.data : err.message);
      showError(t('mfaSettings.disableFail'));
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <GlassPaper>
      <Typography variant="h6" gutterBottom>
        {t('mfaSettings.title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
        {t('mfaSettings.description')}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {mfaEnabled ? (
        <Box>
          <Typography sx={{ mb: 2 }}>Multi-Factor Authentication is currently enabled.</Typography>
          <Button variant="contained" color="error" onClick={handleDisableMfa}>
            {t('mfaSettings.disable')}
          </Button>
        </Box>
      ) : (
        <Box>
          {!qrCodeUri ? (
            <Button 
              variant="contained" 
              onClick={handleEnableMfa}
              sx={{
            ...gradientButtonSx}}>
              {t('mfaSettings.enable')}
            </Button>
          ) : (
            <Box component="form" onSubmit={handleVerifyMfa} noValidate>
              <Typography>{t('mfaSettings.scanQr')}</Typography>
              <Box sx={{ my: 2 }}>
                <img src={qrCodeUri} alt="MFA QR Code" />
              </Box>
              <TextField
                label={t('mfaSettings.otpToken')}
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
            ...gradientButtonSx}}>
                {t('mfaSettings.verifyEnable')}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        severity={snackbar.severity}
        message={snackbar.message}
      />
    </GlassPaper>
  );
};

export default MfaSettings;
