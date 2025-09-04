import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Alert, Button, CircularProgress, Typography } from '@mui/material';
import apiClient from '../../../api/apiClient';
import Footer from '../../core/components/Footer';
import { useTranslation } from 'react-i18next';
import { glassCardSx, gradientButtonSx, Background } from '../../../common';


export default function VerifyEmailPage() {
  const { uid, token } = useParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await apiClient.get(`/users/activate/${uid}/${token}/`);
        if (!isMounted) return;
        if (res.status === 200) {
          setStatus('success');
          setMessage(t('auth.emailVerified'));
        } else {
          setStatus('error');
          setMessage(t('auth.verificationFailed'));
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(err.response?.data?.error || t('auth.verificationFailed'));
      }
    })();
    return () => { isMounted = false; };
  }, [uid, token, t]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Background />
        <Box sx={{ ...glassCardSx, maxWidth: 500, mx: 'auto', my: 'auto', textAlign: 'center' }}>
            <Typography variant="h5" mb={2}>
            {status === 'success' ? t('auth.verificationSuccess') : t('auth.verificationError')}
            </Typography>
            {message && (
            <Alert severity={status === 'success' ? 'success' : 'error'} sx={{ mb: 2 }}>
                {message}
            </Alert>
            )}
            <Button component={RouterLink} to="/login" variant="contained" color="primary" sx={gradientButtonSx}>
            {t('auth.backToLogin')}
            </Button>
        </Box>
        <Footer transparent authPage />
        </Box>
  );
}


