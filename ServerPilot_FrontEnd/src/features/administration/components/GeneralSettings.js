import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, MenuItem, TextField, Switch, FormGroup, FormControlLabel, Paper } from '@mui/material';
import axios from 'axios';
import { textFieldSx, glassPaperSx, gradientButtonSx, blueGradientButtonSx, CircularProgressSx, switchSx } from '../../../common';



const securityTypes = [
  { label: 'None', value: 'none' },
  { label: 'TLS', value: 'tls' },
  { label: 'SSL', value: 'ssl' },
];

const GeneralSettings = () => {
  const [favicon, setFavicon] = useState(null);
  const [selectedFavicon, setSelectedFavicon] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [faviconSaving, setFaviconSaving] = useState(false);
  const [faviconError, setFaviconError] = useState(null);
  const [faviconSuccess, setFaviconSuccess] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    axios.get('/api/configuration/email-settings/')
      .then(res => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings');
        setLoading(false);
      });

    axios.get('/api/configuration/favicon/')
      .then(res => {
        setFavicon(res.data.icon);
        setFaviconPreview(res.data.icon);
      })
      .catch(() => {
        setFaviconError('Failed to load favicon');
      });
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setSettings(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    axios.put('/api/configuration/email-settings/', settings)
      .then(() => {
        setSuccess('Settings saved');
        setSaving(false);
      })
      .catch(() => {
        setError('Failed to save settings');
        setSaving(false);
      });
  };

  const handleTest = () => {
    setTestResult(null);
    axios.post('/api/configuration/email-settings/test-connection/', settings)
      .then(res => {
        setTestResult({ success: true, message: res.data.message });
      })
      .catch(err => {
        setTestResult({ success: false, message: err.response?.data?.message || 'Test failed' });
      });
  };

  if (loading) return <CircularProgress size={24} sx={{ color: '#FE6B8B' }}  />;
    const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFavicon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconSubmit = (e) => {
    e.preventDefault();
    if (!selectedFavicon) {
      setFaviconError('Please select a file first.');
      return;
    }
    setFaviconSaving(true);
    setFaviconError(null);
    setFaviconSuccess(null);

    const formData = new FormData();
    formData.append('icon', selectedFavicon);

    axios.put('/api/configuration/favicon/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then((res) => {
        setFavicon(res.data.icon);
        setFaviconSuccess('Favicon updated successfully.');
        setFaviconSaving(false);
      })
      .catch(() => {
        setFaviconError('Failed to upload favicon.');
        setFaviconSaving(false);
      });
  };

  if (loading) return <CircularProgress sx={CircularProgressSx} />;
  if (!settings) return <Alert severity="error">Failed to load email settings.</Alert>;

    return (
    <>
      <Paper sx={{ ...glassPaperSx }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          Icon Settings
        </Typography>
        {faviconError && <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff', mb: 2 }}>{faviconError}</Alert>}
        {faviconSuccess && <Alert severity="success" sx={{ background: 'rgba(76, 175, 80, 0.8)', color: '#fff', mb: 2 }}>{faviconSuccess}</Alert>}
        <Box component="form" onSubmit={handleFaviconSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {faviconPreview && <img src={faviconPreview} alt="Favicon Preview" style={{ width: 32, height: 32, borderRadius: '4px' }} />}
            <Button variant="contained" component="label" sx={{ ...blueGradientButtonSx }}>
              Choose File
              <input type="file" hidden accept="image/png, image/jpeg, image/x-icon" onChange={handleFaviconChange} />
            </Button>
            <Button type="submit" variant="contained" disabled={faviconSaving || !selectedFavicon} sx={{ ...gradientButtonSx }}>
              {faviconSaving ? <CircularProgress sx={CircularProgressSx}  /> : 'Upload Favicon'}
            </Button>
          </Box>
          {selectedFavicon && <Typography variant="body2">Selected: {selectedFavicon.name}</Typography>}
        </Box>
      </Paper>

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>

        {error && <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ background: 'rgba(76, 175, 80, 0.8)', color: '#fff' }}>{success}</Alert>}
        <Paper sx={{ ...glassPaperSx}}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Email Configurations
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Sender Info Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>Sender Info</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="send_from"
                  name="send_from"
                  label="Send From"
                  value={settings.send_from || ''}
                  onChange={handleChange}
                  type="email"
                  required
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 200 }}
                  helperText="Email address for outgoing mail"
                />
                <TextField
                  id="alias_name"
                  name="alias_name"
                  label="Alias Name"
                  value={settings.alias_name || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 200 }}
                  helperText="Optional display name"
                />
              </Box>
            </Box>
            {/* SMTP Server Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>SMTP Server</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="smtp_server"
                  name="smtp_server"
                  label="SMTP Server"
                  value={settings.smtp_server || ''}
                  onChange={handleChange}
                  required
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 180 }}
                  helperText="SMTP server address"
                />
                <TextField
                  id="smtp_port"
                  name="smtp_port"
                  label="SMTP Port"
                  value={settings.smtp_port || ''}
                  onChange={handleChange}
                  type="number"
                  required
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 120 }}
                  helperText="SMTP server port"
                />
                <TextField
                  id="security_type"
                  name="security_type"
                  label="Security Type"
                  value={settings.use_ssl ? 'ssl' : settings.use_tls ? 'tls' : 'none'}
                  onChange={e => {
                    const val = e.target.value;
                    setSettings(s => ({ ...s, use_ssl: val === 'ssl', use_tls: val === 'tls' }));
                  }}
                  select
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 160 }}
                  helperText="Choose SSL, TLS, or None"
                >
                  {securityTypes.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
              </Box>
            </Box>
            {/* SMTP Authentication Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>SMTP Authentication</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="username"
                  name="username"
                  label="SMTP Username"
                  value={settings.username || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 180 }}
                  helperText="Optional (for authenticated SMTP servers)"
                />
                <TextField
                  id="password"
                  name="password"
                  label="SMTP Password"
                  value={settings.password || ''}
                  onChange={handleChange}
                  type="password"
                  autoComplete="new-password"
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 180 }}
                  helperText="Optional (for authenticated SMTP servers)"
                />
              </Box>
            </Box>
            {/* TLS/SSL Switches */}
            <FormGroup row>
              <FormControlLabel
                control={<Switch
                  checked={!!settings.use_tls}
                  onChange={e => setSettings(s => ({ ...s, use_tls: e.target.checked, use_ssl: false }))}
                  name="use_tls"
                  sx={{...switchSx}}
                />}
                label="Use TLS"
              />
              <FormControlLabel
                control={<Switch
                  checked={!!settings.use_ssl}
                  onChange={e => setSettings(s => ({ ...s, use_ssl: e.target.checked, use_tls: false }))}
                  name="use_ssl"
                  sx={{...switchSx}}
                />}
                label="Use SSL"
              />
            </FormGroup>
          </Box>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{...gradientButtonSx, mt: 3}}>
              Save Settings
            </Button>
            <Button type="button" variant="outlined" onClick={handleTest} sx={{ color: 'white', mt: 3, borderRadius: '25px', padding: '10px 25px', borderColor: 'rgba(255, 255, 255, 0.7)' }}>Test Connection</Button>
          </Box>
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2, background: testResult.success ? 'rgba(76, 175, 80, 0.8)' : 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{testResult.message}</Alert>
          )}
        </Paper>

      </Box>
    </>
  );
};

export default GeneralSettings;
