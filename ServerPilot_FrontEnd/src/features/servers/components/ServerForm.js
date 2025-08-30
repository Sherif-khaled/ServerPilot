import React, { useState, useEffect } from 'react';
import { Box, Button, TextField,Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, FormControlLabel, 
  Checkbox,Typography} from '@mui/material';
import {getServerDetails, testServerConnection, testServerConnectionWithPayload } from '../../../api/serverService';
import { IMaskInput } from 'react-imask';
import PropTypes from 'prop-types';
import { Save as SaveIcon } from '@mui/icons-material';
import { textFieldSx, gradientButtonSx, glassDialogSx, checkBoxSx, CancelButton, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const TextMaskAdapter = React.forwardRef(function TextMaskAdapter(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="num.num.num.num"
      blocks={{
        num: {
          mask: Number,
          min: 0,
          max: 255,
        },
      }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

TextMaskAdapter.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const initialFormData = {
  server_name: '',
  server_ip: '',
  ssh_port: 22,
  login_using_root: false,
  ssh_user: '',
  ssh_password: '',
  ssh_root_password: '',
  ssh_key: '',
  is_active: true,
};


const ServerForm = ({ open, onClose, customerId, serverData, onSave }) => {
  const { t, i18n } = useTranslation();
  const isEditMode = Boolean(serverData && serverData.id);
  const serverId = isEditMode ? serverData.id : null;

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [apiFormError, setApiFormError] = useState('');
  const [validationError, setValidationError] = useState({});
  const [connectionTested, setConnectionTested] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState(null);
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

  useEffect(() => {
    const fetchServerDetails = async () => {
      try {
        const response = await getServerDetails(customerId, serverId);
        setFormData({
          server_name: response.data.server_name || '',
          server_ip: response.data.server_ip || '',
          ssh_port: response.data.ssh_port || 22,
          login_using_root: response.data.login_using_root || false,
          ssh_user: response.data.ssh_user || '',
          ssh_password: '',
          ssh_root_password: '',
          ssh_key: '',
          is_active: response.data.is_active === undefined ? true : response.data.is_active,
        });
      } catch (err) {
        setApiFormError(t('servers.common.loadingError'));
      }
      setPageLoading(false);
    };

    if (isEditMode && serverId) {
      fetchServerDetails();
    } else if (serverData) {
      setFormData({
        server_name: serverData.server_name || '',
        server_ip: serverData.server_ip || '',
        ssh_port: serverData.ssh_port || 22,
        login_using_root: serverData.login_using_root || false,
        ssh_user: serverData.ssh_user || '',
        ssh_password: '',
        ssh_root_password: '',
        ssh_key: '',
        is_active: serverData.is_active === undefined ? true : serverData.is_active,
      });
      setPageLoading(false);
    } else {
      // Reset form for new server
      setFormData(initialFormData);
      setPageLoading(false);
    }
    
    setValidationError({});
    setApiFormError('');
  }, [customerId, serverId, isEditMode, serverData]);

  useEffect(() => {
    // Reset connection test status when dialog opens or context changes
    setConnectionTested(false);
    setConnectionMessage(null);
  }, [open]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prevData => {
      const newData = { ...prevData, [name]: val };
      if (name === 'login_using_root') {
        if (val === true) {
          newData.ssh_user = '';
          newData.ssh_password = '';
        } else {
          newData.ssh_root_password = '';
        }
      }
      return newData;
    });
  
    // Clear the error for the current field when user types
    if (validationError[name]) {
      setValidationError(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // If a credential-affecting field changed, invalidate previous connection test
    if ([
      'server_ip',
      'ssh_port',
      'login_using_root',
      'ssh_user',
      'ssh_password',
      'ssh_root_password',
      'ssh_key',
    ].includes(name)) {
      setConnectionTested(false);
      setConnectionMessage(null);
    }
  };

  const validateForConnection = () => {
    const errors = {};

    // Server IP validation
    if (!formData.server_ip.trim()) {
      errors.server_ip = t('servers.form.errors.enterServerIp');
    } else {
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Pattern = /^[a-fA-F0-9:]+$/;
      if (!ipv4Pattern.test(formData.server_ip) && !ipv6Pattern.test(formData.server_ip)) {
        errors.server_ip = t('servers.form.errors.invalidIp');
      }
    }

    // SSH Port validation
    if (!formData.ssh_port) {
      errors.ssh_port = t('servers.form.errors.enterSshPort');
    } else {
      const port = parseInt(formData.ssh_port, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        errors.ssh_port = t('servers.form.errors.invalidSshPort');
      }
    }

    // Authentication validation
    if (formData.login_using_root) {
      if (!formData.ssh_root_password && !formData.ssh_key) {
        errors.root_auth = t('servers.form.errors.rootAuthRequired');
      }
    } else {
      if (!formData.ssh_user.trim()) {
        errors.ssh_user = t('servers.form.errors.sshUserRequired');
      }
      if (!formData.ssh_password && !formData.ssh_key) {
        errors.user_auth = t('servers.form.errors.authRequired');
      }
    }

    setValidationError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (e) => {
    if (e) {
      e.preventDefault();
    }
    // Server name validation
    if (!formData.server_name.trim()) {
      setValidationError({ server_name: t('servers.form.errors.enterServerName') });
      return false;
    }
    
    // Server IP validation
    if (!formData.server_ip.trim()) {
      setValidationError({ server_ip: t('servers.form.errors.enterServerIp') });
      return false;
    } else {
      // IP format validation
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Pattern = /^[a-fA-F0-9:]+$/;
      if (!ipv4Pattern.test(formData.server_ip) && !ipv6Pattern.test(formData.server_ip)) {
        setValidationError({ server_ip: t('servers.form.errors.invalidIp') });
        return false;
      }
    }
    
    // SSH Port validation
    if (!formData.ssh_port) {
      setValidationError({ ssh_port: t('servers.form.errors.enterSshPort') });
      return false;
    } else {
      const port = parseInt(formData.ssh_port, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        setValidationError({ ssh_port: t('servers.form.errors.invalidSshPort') });
        return false;
      }
    }
    
    // Authentication validation
    if (formData.login_using_root) {
      if (!formData.ssh_root_password && !formData.ssh_key) {
        if (!isEditMode || (formData.ssh_root_password === '' && formData.ssh_key === '')) {
          setValidationError({ root_auth: t('servers.form.errors.rootAuthRequired') });
          return false;
        }
      }
    } else {
      if (!formData.ssh_user.trim()) {
        setValidationError({ ssh_user: t('servers.form.errors.sshUserRequired') });
        return false;
      }
      
      if (!formData.ssh_password && !formData.ssh_key) {
        if (!isEditMode || (formData.ssh_password === '' && formData.ssh_key === '')) {
          setValidationError({ user_auth: t('servers.form.errors.authRequired') });
          return false;
        }
      }
    }
    
    // Prepare server data for saving
    const serverData = {
      server_name: formData.server_name,
      server_ip: formData.server_ip,
      ssh_port: formData.ssh_port,
      login_using_root: formData.login_using_root,
      ssh_user: formData.login_using_root ? null : formData.ssh_user,
      ssh_password: formData.ssh_password || undefined,
      ssh_root_password: formData.ssh_root_password || undefined,
      ssh_key: formData.ssh_key || undefined,
      is_active: formData.is_active
    };
    
    // Call onSave with the server data and server ID if in edit mode
    if (onSave) {
      onSave(serverData, isEditMode ? serverId : null);
    }
    return true;
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const hasCredentialChanges = () => {
    if (!isEditMode || !serverData) return true;
    const base = serverData || {};
    const compare = (a, b) => String(a ?? '') !== String(b ?? '');
    if (compare(formData.server_ip, base.server_ip)) return true;
    if (compare(formData.ssh_port, base.ssh_port || 22)) return true;
    if (formData.login_using_root !== (base.login_using_root || false)) return true;
    if (formData.login_using_root) {
      // Any provided root password/key implies change
      if (formData.ssh_root_password || formData.ssh_key) return true;
    } else {
      if (compare(formData.ssh_user, base.ssh_user || '')) return true;
      if (formData.ssh_password || formData.ssh_key) return true;
    }
    return false;
  };

  const buildConnectionPayload = () => ({
    server_ip: formData.server_ip,
    ssh_port: formData.ssh_port,
    login_using_root: formData.login_using_root,
    ssh_user: formData.login_using_root ? null : formData.ssh_user,
    ssh_password: formData.login_using_root ? null : formData.ssh_password,
    ssh_root_password: formData.login_using_root ? formData.ssh_root_password : null,
    ssh_key: formData.ssh_key || null,
  });

  const handleTestConnection = async () => {
    setConnectionMessage(null);
    setApiFormError('');

    if (!validateForConnection()) return;

    try {
      setTestingConnection(true);
      let response;
      if (isEditMode && serverId && !hasCredentialChanges()) {
        response = await testServerConnection(customerId, serverId);
      } else {
        const payload = buildConnectionPayload();
        response = await testServerConnectionWithPayload(customerId, payload);
      }
      setConnectionTested(true);
      setConnectionMessage({ type: 'success', text: response?.data?.message || t('servers.form.connectionSuccess') });
    } catch (error) {
      setConnectionTested(false);
      const msg = error?.response?.data?.details || error?.response?.data?.message || error.message || t('servers.form.connectionFailed');
      setConnectionMessage({ type: 'error', text: msg });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={24} fontWeight="bold">{isEditMode ? t('servers.form.editTitle') : t('servers.form.addTitle')}</DialogTitle>
      <Box component="div" noValidate autoComplete="off" sx={{ mt: 2 }}>
        <DialogContent dividers>
          <Box>
          {connectionMessage && (
              <Alert severity={connectionMessage.type === 'success' ? 'success' : 'error'} sx={{ mb: 2 }}>
                {connectionMessage.text}
              </Alert>
            )}
            {apiFormError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {apiFormError}
              </Alert>
            )}
            {validationError.is_active && (
              <Typography variant="body2" color="error" sx={{ ml: 2 }}>
                {validationError.is_active}
              </Typography>
            )}

            {/* Display auth validation errors */}
            {validationError.root_auth && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {validationError.root_auth}
              </Alert>
            )}
            {validationError.user_auth && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {validationError.user_auth}
              </Alert>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

            <TextField
              required
              fullWidth
              id="server_name"
              label={t('servers.form.name')}
              name="server_name"
              value={formData.server_name}
              onChange={handleChange}
              error={!!validationError.server_name}
              helperText={validationError.server_name || ''}
              sx={textFieldSx}
              disabled={loading}
            />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField
                required
                fullWidth
                label={t('servers.form.ip')}
                name="server_ip"
                id="server_ip"
                value={formData.server_ip}
                onChange={handleChange}
                error={!!validationError.server_ip}
                helperText={validationError.server_ip || ''}
                sx={{ flexGrow: 1, ...textFieldSx }}
                InputProps={{
                  inputComponent: TextMaskAdapter,
                }}
                disabled={loading}
              />
              <TextField
                required
                id="ssh_port"
                label={t('servers.form.sshPort')}
                name="ssh_port"
                type="number"
                value={formData.ssh_port}
                onChange={handleChange}
                error={!!validationError.ssh_port}
                helperText={validationError.ssh_port || ''}
                InputProps={{ 
                  inputProps: { min: 1, max: 65535 },
                }}
                sx={{ width: { xs: '100%', sm: '120px' }, ...textFieldSx }}
                disabled={loading}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox 
                  checked={formData.login_using_root} 
                  onChange={handleChange} 
                  name="login_using_root"
                  disabled={loading}
                  sx={{ ...checkBoxSx}} 
                />
              }
              label={t('servers.form.loginAsRoot')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}
            />

            {!formData.login_using_root && (
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  id="ssh_user"
                  label={t('servers.form.sshUser')}
                  name="ssh_user"
                  value={formData.ssh_user}
                  onChange={handleChange}
                  error={!!validationError.ssh_user}
                  helperText={validationError.ssh_user ? validationError.ssh_user : t('servers.form.keepOrKey')}
                  required={!formData.login_using_root}
                  sx={textFieldSx}
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  id="ssh_password"
                  label={t('servers.form.sshPassword')}
                  name="ssh_password"
                  type="password"
                  value={formData.ssh_password}
                  onChange={handleChange}
                  error={!!validationError.ssh_password}
                  helperText={validationError.ssh_password ? validationError.ssh_password : t('servers.form.keepOrKey')}
                  autoComplete="new-password"
                  sx={textFieldSx}
                  disabled={loading}
                />
              </Box>
            )}

            {formData.login_using_root && (
              <TextField
                fullWidth
                id="ssh_root_password"
                label={t('servers.form.rootPassword')}
                name="ssh_root_password"
                type="password"
                value={formData.ssh_root_password}
                onChange={handleChange}
                error={!!validationError.ssh_root_password}
                helperText={validationError.ssh_root_password ? validationError.ssh_root_password : t('servers.form.keepOrKey')}
                autoComplete="new-password"
                sx={textFieldSx}
                disabled={loading}
              />
            )}

            <TextField
              fullWidth
              id="ssh_key"
              label={t('servers.form.privateKey')}
              name="ssh_key"
              value={formData.ssh_key}
              onChange={handleChange}
              error={!!validationError.ssh_key}
              helperText={validationError.ssh_key ? validationError.ssh_key : t('servers.form.keepOrKey')}
              multiline
              rows={4}
              placeholder={t('servers.form.privateKeyPlaceholder')}
              sx={textFieldSx}
              disabled={loading}
            />
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start'}}>
              <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_active}
                      onChange={handleChange}
                      name="is_active"
                      disabled={loading}
                      sx={{ ...checkBoxSx}} 
                    />
                  }
                  label={t('servers.form.active')}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)'}}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end'}}>
              <Button 
                  onClick={handleTestConnection}
                  variant="outlined"
                  disabled={testingConnection || loading}
                >
                  {testingConnection ? t('servers.form.testing') : t('servers.form.testConnection')}
                </Button>
              </Box>
                
            </Box>
            
            
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CancelButton 
              onClick={handleClose}
              variant="outlined"
            >
              {t('servers.common.cancel')}
            </CancelButton>
           
          </Box>
          
          <Box>
            <Button 
              onClick={handleSave}
              variant="contained"
              disabled={loading || !connectionTested}
              startIcon={loading ? <CircularProgress size={20} sx={CircularProgressSx}/> : <SaveIcon sx={{ml: isRtl ? 1 : 0}}/>}
              sx={{...gradientButtonSx}}
            >
              {loading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                  {isEditMode ? t('servers.form.updating') : t('servers.form.creating')}
                </Box>
              ) : isEditMode ? t('servers.form.update') : t('servers.form.create')}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ServerForm;