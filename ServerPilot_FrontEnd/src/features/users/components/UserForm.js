import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Box,
  FormControlLabel,
  Alert,
  FormLabel,
  FormGroup,
  Checkbox,
} from '@mui/material';
import { 
  VpnKey as VpnKeyIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

import { checkUsernameExists, adminCreateUser, adminUpdateUser } from '../../../api/userService';
import ShowPasswordIconButton from '../../../common/ShowPasswordIconButton';
import GeneratePasswordButton from '../../../common/GeneratePasswordButton';
import PasswordStrengthMeter from '../../../common/PasswordStrengthMeter';
import { textFieldSx, checkBoxSx, gradientButtonSx,glassDialogSx,SelectSx, CancelButton } from '../../../common';

/*********************  HELPERS  ************************/
const getDefaultFormData = () => ({
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password2: '',
  is_active: true,
  is_staff: false,
});


/*********************  COMPONENT  ************************/
export default function UserForm({ open, onClose, user = null, onSuccess }) {
  // State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    is_active: true,
    is_staff: false,
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [apiFormError, setApiFormError] = useState('');


  // Reset form when user changes or dialog opens/closes
  useEffect(() => {
    if (!open) return;
    
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '',
        password2: '',
        is_active: user.is_active !== false, // Default to true if not set
        is_staff: user.is_staff || false,
      });
    } else {
      setFormData(getDefaultFormData());
    }
    setErrors({});
    setUsernameError('');
    setApiFormError('');
  }, [user, open]);

  /* ──────────────── HANDLERS ──────────────── */

  const handleClose = () => {
    if (loading) return;
    onClose();
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  const handleBlur = async (e) => {
    const { name, value } = e.target;
    if (name === 'username' && value) {
      try {
        const res = await checkUsernameExists(value);
        if (res.data.exists && (!user || user.username !== value)) {
          setUsernameError('Username is already taken');
        } else {
          setUsernameError('');
        }
      } catch (err) {
        console.error('Error checking username:', err);
      }
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.first_name.trim()) newErrors.first_name = 'First Name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last Name is required';
    if (!isEditMode && !formData.password) newErrors.password = 'Password is required';
    if (!isEditMode && formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || usernameError) return;

    setLoading(true);
    const payload = { ...formData };
    delete payload.password2;
    if (isEditMode && !payload.password) delete payload.password;

    try {
      if (isEditMode) {
        await adminUpdateUser(user.id, payload);
      } else {
        await adminCreateUser(payload);
      }
      
      if (onSuccess) onSuccess(isEditMode);
      onClose();
      if (!isEditMode) setFormData(getDefaultFormData());
    } catch (err) {
      setApiFormError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────── MEMOS ──────────────── */

  const isEditMode = Boolean(user?.id);
  
  /* ──────────────── RENDER ──────────────── */
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={36} fontWeight="bold">
      {isEditMode ? 'Edit User' : 'Add New User'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          {apiFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiFormError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Basic Info */}
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="Username*"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.username || !!usernameError}
                helperText={errors.username || usernameError}
                disabled={isEditMode}
                margin="normal"
                variant="outlined"
                sx={textFieldSx}
                InputProps={{
                  style: { color: 'white' },
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon color={errors.username || usernameError ? 'error' : 'inherit'} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="Email*"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                margin="normal"
                variant="outlined"
                sx={textFieldSx}
                InputProps={{ style: { color: 'white' } }}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="First Name*"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                error={!!errors.first_name}
                helperText={errors.first_name}
                margin="normal"
                variant="outlined"
                sx={textFieldSx}
                InputProps={{ style: { color: 'white' } }}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="Last Name*"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                error={!!errors.last_name}
                helperText={errors.last_name}
                margin="normal"
                variant="outlined"
                sx={textFieldSx}
                InputProps={{ style: { color: 'white' } }}
              />
            </Box>
            {/* Security Info */}
            {!isEditMode && (
              <>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                  <TextField
                    fullWidth
                    label="Password*"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    margin="normal"
                    variant="outlined"
                    sx={textFieldSx}
                    InputProps={{
                      style: { color: 'white' },
                      endAdornment: (
                        <InputAdornment position="end">
                          <ShowPasswordIconButton
                            visible={showPassword}
                            onClick={() => setShowPassword((show) => !show)}
                          />
                          <GeneratePasswordButton
                            onGenerate={(pwd) => {
                              setFormData((prev) => ({
                                ...prev,
                                password: pwd,
                                password2: pwd,
                              }));
                            }}
                            disabled={loading}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                  <TextField
                    fullWidth
                    label="Confirm Password*"
                    name="password2"
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.password2}
                    onChange={handleChange}
                    error={!!errors.password2}
                    helperText={errors.password2}
                    margin="normal"
                    variant="outlined"
                    sx={textFieldSx}
                    InputProps={{
                      style: { color: 'white' },
                      endAdornment: (
                        <InputAdornment position="end">
                          <ShowPasswordIconButton
                            visible={showConfirm}
                            onClick={() => setShowConfirm((show) => !show)}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                  <PasswordStrengthMeter password={formData.password} />
                </Box>
              </>
            )}
            <Box sx={{ width: '100%' }}>
              <FormControl fullWidth sx={textFieldSx}>
                <Select
                  name="is_staff"
                  value={String(formData.is_staff)}
                  onChange={handleChange}
                  displayEmpty
                  sx={textFieldSx}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        ...SelectSx
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Role
                  </MenuItem>
                  <MenuItem value="true">Admin</MenuItem>
                  <MenuItem value="false">User</MenuItem>
                </Select>
                <FormHelperText>Choose user role</FormHelperText>
              </FormControl>
            </Box>
            {/* Status & Role */}
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Status
                </FormLabel>
                <FormGroup row>
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        sx={{...checkBoxSx}} 
                      />
                    } 
                    label={formData.is_active ? "Active" : "Inactive"} 
                  />
                </FormGroup>
              </FormControl>
            </Box>

          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Box>
            <CancelButton 
              onClick={onClose} 
              disabled={loading}
              >Cancel
              </CancelButton>
          </Box>
          <Box>
            <Button
              type="submit"
              startIcon={<SaveIcon />}
              variant="contained"
              disabled={loading}
              sx={{...gradientButtonSx}}
            >
              {isEditMode ? 'Update User' : 'Create User'}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
}
