import React, { useState, useEffect, memo } from 'react';
import { Typography, Paper, Box, TextField, Button, FormControlLabel, Switch, CircularProgress, Link } from '@mui/material';
import PropTypes from 'prop-types';
import api from '../../../api/axiosConfig';
import { textFieldSx, glassPaperSx, gradientButtonSx, CircularProgressSx, switchSx } from '../../../common';
import { useTranslation } from 'react-i18next';



const AdminSecurity = ({ showSuccess, showError, showWarning, showInfo }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    recaptcha_site_key: '',
    recaptcha_secret_key: '',
    recaptcha_enabled: false,
    session_expiration_hours: 24,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/security/settings/');
        const fetchedSettings = {
          recaptcha_site_key: response.data.recaptcha_site_key || '',
          recaptcha_secret_key: response.data.recaptcha_secret_key || '',
          recaptcha_enabled: response.data.recaptcha_enabled,
          session_expiration_hours: response.data.session_expiration_hours || 24,
        };
        setSettings(fetchedSettings);
      } catch (err) {
        showError(t('adminSecurity.loadFail'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/security/settings/', settings);
      showSuccess(t('adminSecurity.savingSuccess'));
    } catch (err) {
      showError(t('adminSecurity.saveFail'));
      console.error(err);
    }
  };

  if (isLoading) {
    return <CircularProgress sx={CircularProgressSx} />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ ...glassPaperSx }}>
        <Typography variant="h6" gutterBottom>
          {t('adminSecurity.title')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          {t('adminSecurity.description')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <Link href="https://www.google.com/recaptcha/admin/create" target="_blank" rel="noopener noreferrer" sx={{ color: '#FE6B8B' }}>
            {t('adminSecurity.linkText')}
          </Link>
        </Typography>
        <Box sx={{ border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 1, p: 2, mt: 2 }}>
          <Box>
            <FormControlLabel
              control={<Switch 
                checked={settings.recaptcha_enabled} 
                onChange={handleChange} 
                name="recaptcha_enabled"
                sx={{
                  ...switchSx
                }}
              />}
              label={t('adminSecurity.enableRecaptcha')}
            />
          </Box>
          {settings.recaptcha_enabled && (
            <>
              <TextField
                fullWidth
                label={t('adminSecurity.siteKey')}
                name="recaptcha_site_key"
                value={settings.recaptcha_site_key}
                onChange={handleChange}
                sx={{ ...textFieldSx, mt: 2 }}
                helperText={t('adminSecurity.siteKeyHelper')}
              />
              <TextField
                fullWidth
                label={t('adminSecurity.secretKey')}
                name="recaptcha_secret_key"
                value={settings.recaptcha_secret_key}
                onChange={handleChange}
                sx={{ ...textFieldSx, mt: 2 }}
                helperText={t('adminSecurity.secretKeyHelper')}
                type="password"
              />
            </>
          )}
        </Box>
        
        <Box sx={{ border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 1, p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('adminSecurity.sessionTitle')}
          </Typography>
          <TextField
            fullWidth
            label={t('adminSecurity.sessionHours')}
            name="session_expiration_hours"
            type="number"
            value={settings.session_expiration_hours}
            onChange={handleChange}
            sx={{ ...textFieldSx }}
            helperText={t('adminSecurity.sessionHelper')}
            inputProps={{ min: 1, max: 168 }}
          />
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            sx={{ ...gradientButtonSx }}
          >
            {t('adminSecurity.save')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

AdminSecurity.propTypes = {
  showSuccess: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired,
  showWarning: PropTypes.func.isRequired,
  showInfo: PropTypes.func.isRequired,
};

export default memo(AdminSecurity);
