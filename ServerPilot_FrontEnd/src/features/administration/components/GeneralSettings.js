import React, { useEffect, useState, memo } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, MenuItem, TextField, Switch, FormGroup, FormControlLabel, Paper, Select, FormControl, InputLabel, FormHelperText } from '@mui/material';
import axios from 'axios';
import PropTypes from 'prop-types';
import { textFieldSx, glassPaperSx, gradientButtonSx, blueGradientButtonSx, CircularProgressSx, switchSx, SelectSx } from '../../../common';
import { useTranslation } from 'react-i18next';



const securityTypes = [
  { label: 'None', value: 'none' },
  { label: 'TLS', value: 'tls' },
  { label: 'SSL', value: 'ssl' },
];

const GeneralSettings = ({ showSuccess, showError, showWarning, showInfo }) => {
  const { t } = useTranslation();
  const [favicon, setFavicon] = useState(null);
  const [selectedFavicon, setSelectedFavicon] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [faviconSaving, setFaviconSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    axios.get('/api/configuration/email-settings/')
      .then(res => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch(() => {
        showError(t('generalSettings.settingsLoadFail'));
        setLoading(false);
      });

    axios.get('/api/configuration/favicon/')
      .then(res => {
        setFavicon(res.data.icon);
        setFaviconPreview(res.data.icon);
      })
      .catch(() => {
        showError(t('generalSettings.iconLoadFail'));
      });
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setSettings(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSaving(true);
    axios.put('/api/configuration/email-settings/', settings)
      .then(() => {
        showSuccess(t('generalSettings.settingsSaved'));
        setSaving(false);
      })
      .catch(() => {
        showError(t('generalSettings.settingsSaveFail'));
        setSaving(false);
      });
  };

  const handleTest = () => {
    setTestResult(null);
    axios.post('/api/configuration/test-email/', settings)
      .then(res => {
        setTestResult({ success: true, message: res.data.message });
        showSuccess('Connection test successful');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'Connection test failed. Please check SMTP authentications.';
        setTestResult({ success: false, message: errorMessage });
        showError(errorMessage);
      });
  };

  
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
      showError(t('generalSettings.pleaseSelectFile'));
      return;
    }
    setFaviconSaving(true);

    const formData = new FormData();
    formData.append('icon', selectedFavicon);

    axios.put('/api/configuration/favicon/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then((res) => {
        setFavicon(res.data.icon);
        showSuccess(t('generalSettings.iconUpdated'));
        setFaviconSaving(false);
      })
      .catch(() => {
        showError(t('generalSettings.iconUploadFail'));
        setFaviconSaving(false);
      });
  };

  if (loading) return <CircularProgress sx={CircularProgressSx} />;
  if (!settings) return <Alert severity="error">{t('generalSettings.settingsLoadFail')}</Alert>;

    return (
    <>
      <Paper sx={{ ...glassPaperSx }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          {t('generalSettings.iconSettings')}
        </Typography>
        
        <Box component="form" onSubmit={handleFaviconSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {faviconPreview && <img src={faviconPreview} alt="Favicon Preview" style={{ width: 32, height: 32, borderRadius: '4px' }} />}
            <Button variant="contained" component="label" sx={{ ...blueGradientButtonSx }}>
              {t('generalSettings.chooseFile')}
              <input type="file" hidden accept="image/png, image/jpeg, image/x-icon" onChange={handleFaviconChange} />
            </Button>
            <Button type="submit" variant="contained" disabled={faviconSaving || !selectedFavicon} sx={{ ...gradientButtonSx }}>
              {faviconSaving ? <CircularProgress sx={CircularProgressSx}  /> : t('generalSettings.uploadFavicon')}
            </Button>
          </Box>
          {selectedFavicon && <Typography variant="body2">{t('generalSettings.selected', { name: selectedFavicon.name })}</Typography>}
        </Box>
      </Paper>

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
        
        <Paper sx={{ ...glassPaperSx}}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            {t('generalSettings.emailConfigurations')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Sender Info Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('generalSettings.senderInfo')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="send_from"
                  name="send_from"
                  label={t('generalSettings.sendFrom')}
                  value={settings.send_from || ''}
                  onChange={handleChange}
                  type="email"
                  required
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 200 }}
                  helperText={t('generalSettings.sendFromHelper')}
                />
                <TextField
                  id="alias_name"
                  name="alias_name"
                  label={t('generalSettings.aliasName')}
                  value={settings.alias_name || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 200 }}
                  helperText={t('generalSettings.aliasHelper')}
                />
              </Box>
            </Box>
            {/* SMTP Server Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('generalSettings.smtpServer')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="smtp_server"
                  name="smtp_server"
                  label={t('generalSettings.smtpServer')}
                  value={settings.smtp_server || ''}
                  onChange={handleChange}
                  required
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 180 }}
                  helperText={t('generalSettings.smtpServerHelper')}
                />
                <TextField
                  id="smtp_port"
                  name="smtp_port"
                  label={t('generalSettings.smtpPort')}
                  value={settings.smtp_port || ''}
                  onChange={handleChange}
                  type="number"
                  required
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 120 }}
                  helperText={t('generalSettings.smtpPortHelper')}
                />
                <FormControl fullWidth sx={{...textFieldSx, flex: 1, minWidth: 160 }}>
                  <InputLabel id="security_type_label">{t('generalSettings.securityType')}</InputLabel>
                  <Select
                    labelId="security_type_label"
                    id="security_type"
                    name="security_type"
                    label={t('generalSettings.securityType')}
                    value={settings.use_ssl ? 'ssl' : settings.use_tls ? 'tls' : 'none'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(s => ({ ...s, use_ssl: val === 'ssl', use_tls: val === 'tls' }));
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          ...SelectSx
                        },
                      },
                    }}
                  >
                    {securityTypes.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{t('generalSettings.chooseSSL')}</FormHelperText>
                </FormControl>
              </Box>
            </Box>
            {/* SMTP Authentication Group */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('generalSettings.smtpAuth')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="username"
                  name="username"
                  label={t('generalSettings.smtpUsername')}
                  value={settings.username || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 180 }}
                  helperText={t('generalSettings.smtpUsernameHelper')}
                />
                <TextField
                  id="password"
                  name="password"
                  label={t('generalSettings.smtpPassword')}
                  value={settings.password || ''}
                  onChange={handleChange}
                  type="password"
                  autoComplete="new-password"
                  fullWidth
                  sx={{...textFieldSx, flex: 1, minWidth: 180 }}
                  helperText={t('generalSettings.smtpPasswordHelper')}
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
                label={t('generalSettings.useTLS')}
              />
              <FormControlLabel
                control={<Switch
                  checked={!!settings.use_ssl}
                  onChange={e => setSettings(s => ({ ...s, use_ssl: e.target.checked, use_tls: false }))}
                  name="use_ssl"
                  sx={{...switchSx}}
                />}
                label={t('generalSettings.useSSL')}
              />
            </FormGroup>
          </Box>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{...gradientButtonSx, mt: 3}}>
              {t('generalSettings.saveSettings')}
            </Button>
            <Button type="button" variant="outlined" onClick={handleTest} sx={{ color: 'white', mt: 3, borderRadius: '25px', padding: '10px 25px', borderColor: 'rgba(255, 255, 255, 0.7)' }}>{t('generalSettings.testConnection')}</Button>
          </Box>
        </Paper>

      </Box>
    </>
  );
};

GeneralSettings.propTypes = {
  showSuccess: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired,
  showWarning: PropTypes.func.isRequired,
  showInfo: PropTypes.func.isRequired,
};

export default memo(GeneralSettings);
