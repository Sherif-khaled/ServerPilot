import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress, MenuItem, FormControl, InputLabel, OutlinedInput, FormHelperText, Switch, FormGroup, FormControlLabel, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

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

  if (loading) return <CircularProgress />;
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

  if (loading) return <CircularProgress />;
  if (!settings) return <Alert severity="error">Failed to load email settings.</Alert>;

    return (
    <>
      <GlassPaper sx={{ mb: 3, width: '100%' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          Icon Settings
        </Typography>
        {faviconError && <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff', mb: 2 }}>{faviconError}</Alert>}
        {faviconSuccess && <Alert severity="success" sx={{ background: 'rgba(76, 175, 80, 0.8)', color: '#fff', mb: 2 }}>{faviconSuccess}</Alert>}
        <Box component="form" onSubmit={handleFaviconSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {faviconPreview && <img src={faviconPreview} alt="Favicon Preview" style={{ width: 32, height: 32, borderRadius: '4px' }} />}
            <Button variant="contained" component="label" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', color: '#fff' }}>
              Choose File
              <input type="file" hidden accept="image/png, image/jpeg, image/x-icon" onChange={handleFaviconChange} />
            </Button>
            <Button type="submit" variant="contained" disabled={faviconSaving || !selectedFavicon} sx={{ background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)' }}>
              {faviconSaving ? <CircularProgress size={24} /> : 'Upload Favicon'}
            </Button>
          </Box>
          {selectedFavicon && <Typography variant="body2">Selected: {selectedFavicon.name}</Typography>}
        </Box>
      </GlassPaper>

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>

        {error && <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ background: 'rgba(76, 175, 80, 0.8)', color: '#fff' }}>{success}</Alert>}
        <GlassPaper sx={{ mb: 3, width: '100%' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Email Configurations
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Sender Info Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>Sender Info</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 200 }} required>
                  <InputLabel htmlFor="send_from" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Send From</InputLabel>
                  <OutlinedInput id="send_from" name="send_from" label="Send From" value={settings.send_from || ''} onChange={handleChange} type="email" sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' } }} />
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Email address for outgoing mail</FormHelperText>
                </FormControl>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 200 }}>
                  <InputLabel htmlFor="alias_name" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Alias Name</InputLabel>
                  <OutlinedInput id="alias_name" name="alias_name" label="Alias Name" value={settings.alias_name || ''} onChange={handleChange} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' } }} />
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Optional display name</FormHelperText>
                </FormControl>
              </Box>
            </Box>
            {/* SMTP Server Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>SMTP Server</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 180 }} required>
                  <InputLabel htmlFor="smtp_server" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>SMTP Server</InputLabel>
                  <OutlinedInput id="smtp_server" name="smtp_server" label="SMTP Server" value={settings.smtp_server || ''} onChange={handleChange} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' } }} />
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>SMTP server address</FormHelperText>
                </FormControl>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 120 }} required>
                  <InputLabel htmlFor="smtp_port" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>SMTP Port</InputLabel>
                  <OutlinedInput id="smtp_port" name="smtp_port" label="SMTP Port" value={settings.smtp_port || ''} onChange={handleChange} type="number" sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' } }} />
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>SMTP server port</FormHelperText>
                </FormControl>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 160 }}>
                  <InputLabel htmlFor="security_type" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Security Type</InputLabel>
                  <TextField select id="security_type" name="security_type" label="Security Type" value={settings.use_ssl ? 'ssl' : settings.use_tls ? 'tls' : 'none'} onChange={e => {
                    const val = e.target.value;
                    setSettings(s => ({ ...s, use_ssl: val === 'ssl', use_tls: val === 'tls' }));
                  }} fullWidth sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' }, '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' } }}>
                    {securityTypes.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </TextField>
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Choose SSL, TLS, or None</FormHelperText>
                </FormControl>
              </Box>
            </Box>
            {/* SMTP Authentication Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>SMTP Authentication</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 180 }}>
                  <InputLabel htmlFor="username" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>SMTP Username</InputLabel>
                  <OutlinedInput id="username" name="username" label="SMTP Username" value={settings.username || ''} onChange={handleChange} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' } }} />
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Optional (for authenticated SMTP servers)</FormHelperText>
                </FormControl>
                <FormControl sx={{ ...textFieldSx, flex: 1, minWidth: 180 }}>
                  <InputLabel htmlFor="password" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>SMTP Password</InputLabel>
                  <OutlinedInput id="password" name="password" label="SMTP Password" value={settings.password || ''} onChange={handleChange} type="password" autoComplete="new-password" sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' } }} />
                  <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Optional (for authenticated SMTP servers)</FormHelperText>
                </FormControl>
              </Box>
            </Box>
            {/* TLS/SSL Switches */}
            <FormGroup row>
              <FormControlLabel
                control={<Switch
                  checked={!!settings.use_tls}
                  onChange={e => setSettings(s => ({ ...s, use_tls: e.target.checked, use_ssl: false }))}
                  name="use_tls"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#FE6B8B',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#FE6B8B',
                    },
                  }}
                />}
                label="Use TLS"
              />
              <FormControlLabel
                control={<Switch
                  checked={!!settings.use_ssl}
                  onChange={e => setSettings(s => ({ ...s, use_ssl: e.target.checked, use_tls: false }))}
                  name="use_ssl"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#FE6B8B',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#FE6B8B',
                    },
                  }}
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
              Save Settings
            </Button>
            <Button type="button" variant="outlined" onClick={handleTest} sx={{ color: 'white', mt: 3, borderRadius: '25px', padding: '10px 25px', borderColor: 'rgba(255, 255, 255, 0.7)' }}>Test Connection</Button>
          </Box>
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2, background: testResult.success ? 'rgba(76, 175, 80, 0.8)' : 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{testResult.message}</Alert>
          )}
        </GlassPaper>

      </Box>
    </>
  );
};

export default GeneralSettings;
