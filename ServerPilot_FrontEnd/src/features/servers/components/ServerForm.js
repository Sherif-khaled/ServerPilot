import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, CircularProgress, Alert, FormControlLabel, Checkbox, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { createServer, getServerDetails, updateServer } from '../../../api/serverService';
import { IMaskInput } from 'react-imask';
import PropTypes from 'prop-types';

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

    /*********************  STYLED COMPONENTS  ************************/
const RootContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
  backdropFilter: 'blur(8px) saturate(160%)',
  WebkitBackdropFilter: 'blur(8px) saturate(160%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
  color: '#fff',
}));

const GlassCard = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.06)',
  backdropFilter: 'blur(8px) saturate(160%)',
  WebkitBackdropFilter: 'blur(8px) saturate(160%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
  padding: theme.spacing(3),
  color: '#fff',
}));

// Common TextField styling
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
    color: 'white'
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
};
/*********************  END OF STYLED COMPONENTS  ************************/

export default function ServerForm({ customerId, serverData, onSaveSuccess, onClose }) {
  const isEditMode = Boolean(serverData && serverData.id);
  const serverId = isEditMode ? serverData.id : null;

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false); // For form submission
  const [pageLoading, setPageLoading] = useState(isEditMode); // For initial data load in edit mode
  const [apiFormError, setApiFormError] = useState(''); // For general API errors
  const [errors, setErrors] = useState({}); // For field-specific validation errors

  useEffect(() => {
    const fetchServerDetails = async () => {
      try {
        const response = await getServerDetails(customerId, serverId);
        // Passwords and keys are write-only, so they won't be in the response. 
        // Keep them blank in the form for editing unless user provides new ones.
        setFormData({
          server_name: response.data.server_name || '',
          server_ip: response.data.server_ip || '',
          ssh_port: response.data.ssh_port || 22,
          login_using_root: response.data.login_using_root || false,
          ssh_user: response.data.ssh_user || '', // May be null if login_using_root
          ssh_password: '', // Always blank on load for security
          ssh_root_password: '', // Always blank on load
          ssh_key: '', // Always blank on load
          is_active: response.data.is_active === undefined ? true : response.data.is_active,
        });
      } catch (err) {
        console.error('Failed to fetch server details:', err);
        setApiFormError('Failed to load server data. Please try again or go back.');
      }
      setPageLoading(false);
    };
    if (isEditMode && serverId) {
      fetchServerDetails();
    }
    // No fetch needed for create mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, serverId, isEditMode]);

  useEffect(() => {
    if (isEditMode && serverData) {
      // Pre-fill form for editing, passwords/keys remain blank for security
      setFormData({
        server_name: serverData.server_name || '',
        server_ip: serverData.server_ip || '',
        ssh_port: serverData.ssh_port || 22,
        login_using_root: serverData.login_using_root || false,
        ssh_user: serverData.ssh_user || '',
        ssh_password: '', // Always blank on load
        ssh_root_password: '', // Always blank on load
        ssh_key: '', // Always blank on load
        is_active: serverData.is_active === undefined ? true : serverData.is_active,
      });
      setPageLoading(false); // Assuming data is passed directly, no separate fetch needed if serverData is complete
                           // If serverData is just an ID, then fetchServerDetails would be called here.
                           // For now, assuming serverData contains the necessary fields.
    } else {
      setFormData(initialFormData); // Reset for create mode
    }
    setErrors({});
    setApiFormError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, serverData]); // serverId is not needed here as serverData implies it

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prevData => {
      const newData = { ...prevData, [name]: val };
      // Logic based on login_using_root
      if (name === 'login_using_root') {
        if (val === true) { // Switching to root login
          newData.ssh_user = ''; // Clear non-root user
          newData.ssh_password = ''; // Clear non-root password
        } else { // Switching to non-root login
          newData.ssh_root_password = ''; // Clear root password
        }
      }
      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    if (apiFormError) setApiFormError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.server_name.trim()) newErrors.server_name = 'Server name is required.';
    if (!formData.server_ip.trim()) {
      newErrors.server_ip = 'Server IP address is required.';
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.server_ip) && !/^[a-fA-F0-9:]+$/.test(formData.server_ip)) {
        // Basic IPv4 and allows colons for IPv6, not a strict validation
        newErrors.server_ip = 'Invalid IP address format.';
    }
    if (!formData.ssh_port || formData.ssh_port <= 0 || formData.ssh_port > 65535) {
        newErrors.ssh_port = 'Invalid SSH port (must be 1-65535).';
    }

    if (formData.login_using_root) {
        if (!formData.ssh_root_password && !formData.ssh_key) {
            if(isEditMode && !formData.ssh_root_password && !formData.ssh_key) {
                 // In edit mode, if neither is provided, it means user is not updating them
            } else {
                newErrors.ssh_root_password = 'For root login, root password or SSH key is required.';
                newErrors.ssh_key = 'For root login, root password or SSH key is required.';
            }
        }
    } else {
        if (!formData.ssh_user.trim()) newErrors.ssh_user = 'SSH username is required for non-root login.';
        if (!formData.ssh_password && !formData.ssh_key) {
            if(isEditMode && !formData.ssh_password && !formData.ssh_key) {
                // In edit mode, if neither is provided, it means user is not updating them
            } else {
                newErrors.ssh_password = 'For non-root login, password or SSH key is required.';
                newErrors.ssh_key = 'For non-root login, password or SSH key is required.';
            }
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiFormError('');

    // Prepare data: only send password/key if they are provided (not empty)
    // Backend serializer handles logic if they are required but missing for create.
    // For update, if not provided, they are not changed.
    const payload = { ...formData };
    if (!payload.ssh_password) delete payload.ssh_password;
    if (!payload.ssh_root_password) delete payload.ssh_root_password;
    if (!payload.ssh_key) delete payload.ssh_key;
    
    // If login_using_root, nullify non-root credentials
    if (payload.login_using_root) {
        payload.ssh_user = null;
        // ssh_password already handled by delete if empty
    } else {
        // ssh_root_password already handled by delete if empty
    }

    try {
      if (isEditMode) {
        await updateServer(customerId, serverId, payload);
      } else {
        await createServer(customerId, payload);
      }
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error('Failed to save server:', err);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err.response?.data) {
        const responseData = err.response.data;
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.detail) {
            errorMessage = responseData.detail;
        } else if (typeof responseData === 'object') {
          const fieldSpecificErrors = {};
          let hasFieldErrors = false;
          for (const key in responseData) {
            if (initialFormData.hasOwnProperty(key) && Array.isArray(responseData[key])) {
              fieldSpecificErrors[key] = responseData[key].join(' ');
              hasFieldErrors = true;
            }
          }
          if (hasFieldErrors) {
            setErrors(prev => ({ ...prev, ...fieldSpecificErrors }));
            errorMessage = 'Please correct the highlighted errors.';
          } else {
            const messages = Object.values(responseData).flat().join(' ');
            if (messages) errorMessage = messages;
          }
        }
      }
      setApiFormError(errorMessage);
    }
    setLoading(false);
  };

  if (pageLoading) {
    return (
      <RootContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <CircularProgress sx={{ color: '#FE6B8B' }} />
        </Box>
      </RootContainer>
    );
  }

  if (!isEditMode && apiFormError && !pageLoading && !Object.keys(errors).length) {
    // If it's create mode and there's a general API error not related to fields (e.g. initial load error)
    // This condition might need refinement based on how pageError is used for create mode
  }

  return (
    <RootContainer>
      <GlassCard>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {apiFormError && <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{apiFormError}</Alert>}
            
            <TextField
              required
              fullWidth
              id="server_name"
              label="Server Name"
              name="server_name"
              value={formData.server_name}
              onChange={handleChange}
              error={!!errors.server_name}
              helperText={errors.server_name}
              sx={textFieldSx}
            />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField
                required
                fullWidth
                label="Server IP Address"
                name="server_ip"
                id="server_ip"
                value={formData.server_ip}
                onChange={handleChange}
                error={!!errors.server_ip}
                helperText={errors.server_ip}
                sx={{ flexGrow: 1, ...textFieldSx }}
                InputProps={{
                  inputComponent: TextMaskAdapter,
                }}
              />
              <TextField
                required
                id="ssh_port"
                label="SSH Port"
                name="ssh_port"
                type="number"
                value={formData.ssh_port}
                onChange={handleChange}
                error={!!errors.ssh_port}
                helperText={errors.ssh_port}
                InputProps={{ inputProps: { min: 1, max: 65535 } }}
                sx={{ width: { xs: '100%', sm: '120px' }, ...textFieldSx }}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox 
                  checked={formData.login_using_root} 
                  onChange={handleChange} 
                  name="login_using_root" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-checked': {
                      color: '#FE6B8B',
                      '& .MuiSvgIcon-root': {
                        border: '2px solid #FE6B8B',
                        borderRadius: '3px',
                      }
                    },
                    '&.Mui-checked:hover': {
                      backgroundColor: 'rgba(254, 107, 139, 0.1)',
                    },
                    '& .MuiSvgIcon-root': {
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '3px',
                    }
                  }} 
                />
              }
              label="Login as root user"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            />

            {!formData.login_using_root && (
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  id="ssh_user"
                  label="SSH Username (non-root)"
                  name="ssh_user"
                  value={formData.ssh_user}
                  onChange={handleChange}
                  error={!!errors.ssh_user}
                  helperText={errors.ssh_user}
                  required={!formData.login_using_root}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  id="ssh_password"
                  label="SSH Password (non-root)"
                  name="ssh_password"
                  type="password"
                  value={formData.ssh_password}
                  onChange={handleChange}
                  error={!!errors.ssh_password}
                  helperText={errors.ssh_password || 'Leave blank to keep current or if using SSH key.'}
                  autoComplete="new-password"
                  sx={textFieldSx}
                />
              </Box>
            )}

            {formData.login_using_root && (
              <TextField
                fullWidth
                id="ssh_root_password"
                label="SSH Root Password"
                name="ssh_root_password"
                type="password"
                value={formData.ssh_root_password}
                onChange={handleChange}
                error={!!errors.ssh_root_password}
                helperText={errors.ssh_root_password || 'Leave blank to keep current or if using SSH key.'}
                autoComplete="new-password"
                sx={textFieldSx}
              />
            )}
            
            <TextField
              fullWidth
              id="ssh_key"
              label="SSH Private Key (Optional)"
              name="ssh_key"
              multiline
              rows={4}
              value={formData.ssh_key}
              onChange={handleChange}
              error={!!errors.ssh_key}
              helperText={errors.ssh_key || 'Paste your private SSH key here. Leave blank to keep current or if using password.'}
              placeholder="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
              sx={textFieldSx}
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={formData.is_active} 
                  onChange={handleChange} 
                  name="is_active" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-checked': {
                      color: '#FE6B8B',
                      '& .MuiSvgIcon-root': {
                        border: '2px solid #FE6B8B',
                        borderRadius: '3px',
                      }
                    },
                    '&.Mui-checked:hover': {
                      backgroundColor: 'rgba(254, 107, 139, 0.1)',
                    },
                    '& .MuiSvgIcon-root': {
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '3px',
                    }
                  }} 
                />
              }
              label="Server is Active"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  onClick={onClose}
                  variant="outlined"
                  color="error"
                  disabled={loading}
                  sx={{ flex: 1, borderRadius: 25, p: '10px 25px' }}
                                                    >
                     Cancel
                </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                sx={{
                  flex: 1,
                  background: 'linear-gradient(45deg,#FE6B8B 30%,#FF8E53 90%)',
                  boxShadow: '0 3px 5px 2px rgba(255,105,135,.3)',
                  borderRadius: 25,
                  p: '10px 25px',
                }} >
                {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Update Server' : 'Create Server')}
              </Button>
            </Box>
          </Box>
        </Box>
      </GlassCard>
    </RootContainer>
  );
}
