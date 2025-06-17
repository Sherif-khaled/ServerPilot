import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress, MenuItem, Grid, FormControl, InputLabel, OutlinedInput, FormHelperText, Switch, FormGroup, FormControlLabel, Paper } from '@mui/material';
import axios from 'axios';

const securityTypes = [
  { label: 'None', value: 'none' },
  { label: 'TLS', value: 'tls' },
  { label: 'SSL', value: 'ssl' },
];

const AdminGeneralSettingsPage = () => {
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

  if (loading) return <CircularProgress />;
  if (!settings) return <Alert severity="error">Failed to load email settings.</Alert>;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Paper elevation={3} sx={{ p: 3, mb: 3, width: '100%' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          Email Configurations
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Sender Info Group */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>Sender Info</Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ flex: 1, minWidth: 200 }} required>
                <InputLabel htmlFor="send_from">Send From</InputLabel>
                <OutlinedInput id="send_from" name="send_from" label="Send From" value={settings.send_from || ''} onChange={handleChange} type="email"/>
                <FormHelperText>Email address for outgoing mail</FormHelperText>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 200 }}>
                <InputLabel htmlFor="alias_name">Alias Name</InputLabel>
                <OutlinedInput id="alias_name" name="alias_name" label="Alias Name" value={settings.alias_name || ''} onChange={handleChange}/>
                <FormHelperText>Optional display name</FormHelperText>
              </FormControl>
            </Box>
          </Box>
          {/* SMTP Server Group */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>SMTP Server</Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ flex: 1, minWidth: 180 }} required>
                <InputLabel htmlFor="smtp_server">SMTP Server</InputLabel>
                <OutlinedInput id="smtp_server" name="smtp_server" label="SMTP Server" value={settings.smtp_server || ''} onChange={handleChange}/>
                <FormHelperText>SMTP server address</FormHelperText>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 120 }} required>
                <InputLabel htmlFor="smtp_port">SMTP Port</InputLabel>
                <OutlinedInput id="smtp_port" name="smtp_port" label="SMTP Port" value={settings.smtp_port || ''} onChange={handleChange} type="number"/>
                <FormHelperText>SMTP server port</FormHelperText>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 160 }}>
                <InputLabel htmlFor="security_type">Security Type</InputLabel>
                <TextField select id="security_type" name="security_type" label="Security Type" value={settings.use_ssl ? 'ssl' : settings.use_tls ? 'tls' : 'none'} onChange={e => {
                  const val = e.target.value;
                  setSettings(s => ({ ...s, use_ssl: val === 'ssl', use_tls: val === 'tls' }));
                }} fullWidth>
                  {securityTypes.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
                <FormHelperText>Choose SSL, TLS, or None</FormHelperText>
              </FormControl>
            </Box>
          </Box>
          {/* SMTP Authentication Group */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>SMTP Authentication</Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ flex: 1, minWidth: 180 }}>
                <InputLabel htmlFor="username">SMTP Username</InputLabel>
                <OutlinedInput id="username" name="username" label="SMTP Username" value={settings.username || ''} onChange={handleChange}/>
                <FormHelperText>Optional (for authenticated SMTP servers)</FormHelperText>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 180 }}>
                <InputLabel htmlFor="password">SMTP Password</InputLabel>
                <OutlinedInput id="password" name="password" label="SMTP Password" value={settings.password || ''} onChange={handleChange} type="password" autoComplete="new-password"/>
                <FormHelperText>Optional (for authenticated SMTP servers)</FormHelperText>
              </FormControl>
            </Box>
          </Box>
          {/* TLS/SSL Switches */}
          <FormGroup row>
            <FormControlLabel control={<Switch checked={!!settings.use_tls} onChange={e => setSettings(s => ({ ...s, use_tls: e.target.checked, use_ssl: false }))} name="use_tls" />} label="Use TLS" />
            <FormControlLabel control={<Switch checked={!!settings.use_ssl} onChange={e => setSettings(s => ({ ...s, use_ssl: e.target.checked, use_tls: false }))} name="use_ssl" />} label="Use SSL" />
          </FormGroup>
        </Box>
      </Paper>
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" disabled={saving}>Save Settings</Button>
        <Button type="button" variant="outlined" onClick={handleTest}>Test Connection</Button>
      </Box>
      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>{testResult.message}</Alert>
      )}
    </Box>
  );
};

export default AdminGeneralSettingsPage;
