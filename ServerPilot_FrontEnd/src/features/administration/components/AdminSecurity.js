import React, { useState, useEffect } from 'react';
import { Typography, Paper, Box, TextField, Button, FormControlLabel, Switch, CircularProgress, Link, Alert, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../../../api/axiosConfig';
import { textFieldSx, glassPaperSx, gradientButtonSx, blueGradientButtonSx, CircularProgressSx } from '../../../common';



const AdminSecurity = () => {
  const [settings, setSettings] = useState({
    recaptcha_site_key: '',
    recaptcha_secret_key: '',
    recaptcha_enabled: false,
    session_expiration_hours: 24,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

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
        setAlert({ open: true, message: 'Failed to load settings.', severity: 'error' });
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
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
    setAlert({ ...alert, open: false }); // Hide previous alert
    try {
      await api.post('/security/settings/', settings);
      setAlert({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: 'Failed to save settings.', severity: 'error' });
      console.error(err);
    }
  };

  if (isLoading) {
    return <CircularProgress sx={CircularProgressSx} />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ ...glassPaperSx }}>
        <Collapse in={alert.open}>
          <Alert
            severity={alert.severity}
            onClose={() => {
              setAlert({ ...alert, open: false });
            }}
            sx={{ mb: 2, background: alert.severity === 'success' ? 'rgba(76, 175, 80, 0.8)' : 'rgba(211, 47, 47, 0.8)', color: '#fff' }}
          >
            {alert.message}
          </Alert>
        </Collapse>
        <Typography variant="h6" gutterBottom>
          reCAPTCHA v2 Settings
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          Configure Google reCAPTCHA v2 to protect your site from spam and abuse.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <Link href="https://www.google.com/recaptcha/admin/create" target="_blank" rel="noopener noreferrer" sx={{ color: '#FE6B8B' }}>
            Google reCAPTCHA
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
                  '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#FE6B8B',
                    },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#FE6B8B',
                    },
                  }} 
                />}
              label="Enable reCAPTCHA"
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Site Key"
              name="recaptcha_site_key"
              value={settings.recaptcha_site_key}
              sx={{...textFieldSx}}
              onChange={handleChange}
              disabled={!settings.recaptcha_enabled}
              helperText="The site key used in your frontend code."
            />
            <TextField
              fullWidth
              label="Secret Key"
              name="recaptcha_secret_key"
              type="password"
              value={settings.recaptcha_secret_key}
              sx={{...textFieldSx}}
              onChange={handleChange}
              disabled={!settings.recaptcha_enabled}
              helperText="The secret key used for communication between your site and Google."
            />
          </Box>
        </Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          Session Settings
        </Typography>
        <TextField
          fullWidth
          label="Session Expiration (Hours)"
          name="session_expiration_hours"
          type="number"
          value={settings.session_expiration_hours}
          sx={{...textFieldSx}}
          onChange={handleChange}
          helperText="The number of hours before an inactive session expires."
        />
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            type="submit" 
            variant="contained" 
            sx={{...gradientButtonSx}}>
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminSecurity;
