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
import { useTranslation } from 'react-i18next';

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
  inactive_reason: '',
});


/*********************  COMPONENT  ************************/
export default function UserForm({ open, onClose, user = null, onSuccess }) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    is_active: true,
    is_staff: false,
    inactive_reason: '',
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [apiFormError, setApiFormError] = useState('');
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

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
        inactive_reason: '',
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
          setUsernameError(t('userForm.usernameTaken'));
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
    if (!formData.username.trim()) newErrors.username = t('userForm.required.username');
    if (!formData.email.trim()) newErrors.email = t('userForm.required.email');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('userForm.required.emailInvalid');
    if (!formData.first_name.trim()) newErrors.first_name = t('userForm.required.firstName');
    if (!formData.last_name.trim()) newErrors.last_name = t('userForm.required.lastName');
    if (!isEditMode && !formData.password) newErrors.password = t('userForm.required.password');
    if (!isEditMode && formData.password !== formData.password2) {
      newErrors.password2 = t('userForm.required.passwordsMismatch');
    }
    if (isEditMode && formData.is_active === false && !formData.inactive_reason.trim()) {
      newErrors.inactive_reason = t('userForm.required.inactiveReason');
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
    // Only send inactive_reason on update when user is set inactive
    if (!isEditMode || payload.is_active) {
      delete payload.inactive_reason;
    }

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
      setApiFormError(err.response?.data?.message || t('forgotPassword.genericError'));
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
      {isEditMode ? t('userForm.editTitle') : t('userForm.addTitle')}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          {apiFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiFormError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label={t('userForm.username')}
                name="username"
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
                label={t('userForm.email')}
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
                label={t('userForm.firstName')}
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
                label={t('userForm.lastName')}
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
                    label={t('userForm.password')}
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
                    label={t('userForm.confirmPassword')}
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
                    {t('userForm.role')}
                  </MenuItem>
                  <MenuItem value="true">{t('userForm.roleAdmin')}</MenuItem>
                  <MenuItem value="false">{t('userForm.roleUser')}</MenuItem>
                </Select>
                <FormHelperText>{t('userForm.roleHint')}</FormHelperText>
              </FormControl>
            </Box>
            {/* Status & Role */}
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {t('userForm.status')}
                </FormLabel>
                <FormGroup row>
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked, inactive_reason: e.target.checked ? '' : prev.inactive_reason }))}
                        sx={{...checkBoxSx}} 
                      />
                    } 
                    label={formData.is_active ? t('userForm.active') : t('userForm.inactive')} 
                  />
                </FormGroup>
              </FormControl>
            </Box>

            {/* Inactive Reason */}
            {isEditMode && formData.is_active === false && (
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label={t('userForm.inactiveReasonLabel')}
                  name="inactive_reason"
                  value={formData.inactive_reason}
                  onChange={handleChange}
                  error={!!errors.inactive_reason}
                  helperText={errors.inactive_reason}
                  margin="normal"
                  variant="outlined"
                  sx={textFieldSx}
                  multiline
                  minRows={2}
                  InputProps={{ style: { color: 'white' } }}
                />
              </Box>
            )}

          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Box>
            <CancelButton 
              onClick={onClose} 
              disabled={loading}
              >{t('userForm.cancel')}
              </CancelButton>
          </Box>
          <Box>
            <Button
              type="submit"
              startIcon={<SaveIcon sx={{ml: isRtl ? 1 : 0}}/>}
              variant="contained"
              disabled={loading}
              sx={{...gradientButtonSx}} 
            >
              {isEditMode ? t('userForm.update') : t('userForm.create')}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
}
