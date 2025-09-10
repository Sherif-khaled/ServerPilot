import React, { useState, useEffect } from 'react';
import { Box, Button, TextField,Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, FormControlLabel, 
  Checkbox,Typography} from '@mui/material';
import {getServerDetails } from '../../../api/serverService';
import { Save as SaveIcon } from '@mui/icons-material';
import { textFieldSx, gradientButtonSx, glassDialogSx, checkBoxSx, CancelButton, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';
import { IpMaskInput } from '../../../common';  

const initialFormData = {
  server_name: '',
  server_ip: '',
  ssh_port: 22,
  login_using_root: false,
  ssh_user: '',
  is_active: true,
};

const ServerForm = ({ open, onClose, customerId, serverData, onSave }) => {
  const { t, i18n } = useTranslation();
  const isEditMode = Boolean(serverData && serverData.id);
  const serverId = isEditMode ? serverData.id : null;

  const [formData, setFormData] = useState(initialFormData);
  const [loading] = useState(false);
  const [apiFormError, setApiFormError] = useState('');
  const [validationError, setValidationError] = useState({});
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
          is_active: response.data.is_active === undefined ? true : response.data.is_active,
        });
      } catch (err) {
        setApiFormError(t('servers.common.loadingError'));
      }
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
        is_active: serverData.is_active === undefined ? true : serverData.is_active,
      });
    } else {
      // Reset form for new server
      setFormData(initialFormData);
    }
    
    setValidationError({});
    setApiFormError('');
  }, [customerId, serverId, isEditMode, serverData, t]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prevData => {
      const newData = { ...prevData, [name]: val };
      // No inline credentials here; managed via Credentials tab.
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
        
    // Prepare server data for saving
    const serverData = {
      server_name: formData.server_name,
      server_ip: formData.server_ip,
      ssh_port: formData.ssh_port,
      login_using_root: formData.login_using_root,
      ssh_user: formData.login_using_root ? null : formData.ssh_user,
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={24} fontWeight="bold">{isEditMode ? t('servers.form.editTitle') : t('servers.form.addTitle')}</DialogTitle>
      <Box component="div" noValidate autoComplete="off" sx={{ mt: 2 }}>
        <DialogContent dividers>
          <Box>
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
            <Alert severity="info" sx={{ mb: 1 }}>
              {t('servers.form.credentialsManagedInTab')}
            </Alert>
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
              <IpMaskInput
                required
                fullWidth
                id="server_ip"
                label={t('servers.form.ip')}
                name="server_ip"
                value={formData.server_ip}
                onChange={handleChange}
                error={!!validationError.server_ip}
                helperText={validationError.server_ip || ''}
                sx={textFieldSx}
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
              <TextField
                fullWidth
                id="ssh_user"
                label={t('servers.form.sshUser')}
                name="ssh_user"
                value={formData.ssh_user}
                onChange={handleChange}
                error={!!validationError.ssh_user}
                helperText={validationError.ssh_user || ''}
                required={!formData.login_using_root}
                sx={textFieldSx}
                disabled={loading}
              />
            )}

            {/* Root password and private key fields removed. */}

            {/* Private key input removed. */}
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
              disabled={loading}
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