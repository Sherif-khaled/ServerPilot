import React, { useState, useEffect } from 'react';
import { Box, Button, TextField,Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, FormControlLabel, 
  Checkbox,Typography, Paper, Divider } from '@mui/material';
import { getServerDetails, prepareAddServer, confirmAddServer } from '../../../api/serverService';
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
  const [loading, setLoading] = useState(false);
  const [apiFormError, setApiFormError] = useState('');
  const [validationError, setValidationError] = useState({});
  // TOFU flow state (create mode)
  const [fingerprint, setFingerprint] = useState(null);
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showFingerprintField, setShowFingerprintField] = useState(false);
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

  // Helper to split long strings into multiple lines
  const toLines = (s, chunk = 32) => {
    if (typeof s !== 'string' || !s.length) return '';
    const re = new RegExp(`.{1,${chunk}}`, 'g');
    const parts = s.match(re) || [s];
    return parts.join('\n');
  };

  useEffect(() => {
    const fetchServerDetails = async () => {
      try {
        const response = await getServerDetails(customerId, serverId);
        setFormData({
          server_name: response.data.server_name || '',
          server_ip: response.data.server_ip || '',
          ssh_port: response.data.ssh_port || 22,

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
        
    // Prepare server data for saving (used in edit mode only)
    const serverData = {
      server_name: formData.server_name,
      server_ip: formData.server_ip,
      ssh_port: formData.ssh_port,
      // Do not send login_using_root/ssh_user; credentials are handled in Credentials tab
      is_active: formData.is_active,
    };
    
    // Call onSave only in edit mode to avoid bypassing TOFU create flow
    if (isEditMode && onSave) {
      onSave(serverData, serverId);
    }
    return true;
  };

  // --- TOFU: Fetch fingerprint then show in dialog ---
  const handleFetchFingerprint = async () => {
    // Basic validation for required fields
    const ok = handleSave(); // reuse validations but don't submit; it will call onSave in edit mode only
    if (!ok) return;
    setApiFormError('');
    setLoading(true);
    try {
      const { data } = await prepareAddServer(customerId, { server_ip: formData.server_ip, ssh_port: Number(formData.ssh_port) });
      setFingerprint(data);
      setFpDialogOpen(true);
    } catch (err) {
      setApiFormError(err?.response?.data?.detail || 'Failed to fetch fingerprint.');
    } finally {
      setLoading(false);
    }
  };

  // --- TOFU: Confirm (create server with stored fingerprint) ---
  const handleConfirm = async () => {
    if (!fingerprint) return;
    setApiFormError('');
    setLoading(true);
    try {
      await confirmAddServer(customerId, {
        server_name: formData.server_name,
        server_ip: formData.server_ip,
        ssh_port: Number(formData.ssh_port),
        fingerprint,
      });
      // Close dialog and let parent refresh list externally
      onClose();
    } catch (err) {
      setApiFormError(err?.response?.data?.detail || 'Failed to confirm server addition.');
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const handleCloseFpDialog = () => setFpDialogOpen(false);
  const handleVerifyFp = () => {
    // User confirmed they have verified out-of-band
    setVerified(true);
    setShowFingerprintField(true);
    setFpDialogOpen(false);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <>
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

            {/* Display info */}
            {!isEditMode && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Trust On First Use: first we will fetch the SSH host key fingerprint so you can verify it out-of-band. Then we will save the server as trusted.
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

            {!isEditMode && showFingerprintField && (
              <TextField
                fullWidth
                label="SSH Fingerprint (SHA256)"
                value={fingerprint?.sha256 || ''}
                InputProps={{ readOnly: true }}
                sx={textFieldSx}
              />
            )}
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
            {isEditMode ? (
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
                    {t('servers.form.updating')}
                  </Box>
                ) : t('servers.form.update')}
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!(showFingerprintField && verified) && (
                  <Button 
                    onClick={handleFetchFingerprint}
                    variant="outlined"
                    disabled={loading || (!formData.server_name || !formData.server_ip)}
                    sx={{...gradientButtonSx}}
                  >
                    {loading ? 'Fetching…' : 'Fetch Fingerprint'}
                  </Button>
                )}
                {showFingerprintField && verified && (
                  <Button 
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} sx={CircularProgressSx}/> : <SaveIcon sx={{ml: isRtl ? 1 : 0}}/>}
                    sx={{...gradientButtonSx}}
                  >
                    {loading ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
    {/* Fingerprint Result Dialog */}
    <Dialog open={fpDialogOpen} onClose={handleCloseFpDialog} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={20} fontWeight="bold">Verify SSH Host Key Fingerprint</DialogTitle>
      <DialogContent dividers>
        {fingerprint ? (
          <Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Fingerprint (SHA256)</Typography>
              <Typography variant="body1" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                {toLines(fingerprint.sha256, 32)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">Fingerprint (HEX)</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{fingerprint.hex}</Typography>
            </Paper>
            <Alert severity="info" sx={{ mt: 2 }}>
              Verify this on the server using:
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub</Box>
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap' }}>ssh-keyscan -t rsa {formData.server_ip} | ssh-keygen -lf -</Box>
            </Alert>
          </Box>
        ) : (
          <Alert severity="error">Failed to load fingerprint.</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CancelButton 
            onClick={handleCloseFpDialog}>
              {t('servers.common.cancel')}
          </CancelButton>

        </Box>
        <Box justifyContent="flex-end">
          <Button 
            onClick={handleVerifyFp} 
            sx={{...gradientButtonSx}} 
            variant="contained">
              {t('servers.common.verify')}
          </Button>

        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default ServerForm;