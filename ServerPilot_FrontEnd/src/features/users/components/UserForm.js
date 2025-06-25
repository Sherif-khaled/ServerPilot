import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Typography,
  CircularProgress,
  LinearProgress,
  Paper,
  useMediaQuery,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Save as SaveIcon } from '@mui/icons-material';
import { checkUsernameExists } from '../../../api/userService';
import ShowPasswordIconButton from '../../../common/ShowPasswordIconButton';
import GeneratePasswordButton from '../../../common/GeneratePasswordButton';
import PasswordStrengthMeter from '../../../common/PasswordStrengthMeter';

/*********************  THEME HELPERS  ************************/ 
// Glassmorphic helpers
const glassBg = 'rgba(255,255,255,0.08)';
const glassBorder = '1px solid rgba(255,255,255,0.125)';
const blurProps = {
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
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

const GlassCard = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(8px) saturate(160%)',
    WebkitBackdropFilter: 'blur(8px) saturate(160%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
    padding: theme.spacing(3),
    color: '#fff',
}));

// Common TextField sx with gradient focus ring
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

// Very naive password strength (0‑100)
const calcStrength = (pw = '') => {
  let score = 0;
  if (pw.length > 5) score += 20;
  if (pw.length > 8) score += 20;
  if (/[a-z]/.test(pw)) score += 20;
  if (/[A-Z]/.test(pw)) score += 20;
  if (/\d/.test(pw)) score += 20;
  return score;
};

// Password strength logic and generator (copy from SetPasswordForm.js)
const getPasswordStrength = (password) => {
  let score = 0;
  if (password.length > 7) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

/*********************  COMPONENT  ************************/
export default function UserForm({ onSubmit, onCancel, initialUser, isEditMode = false, loading }) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  /* ──────────────── LOCAL STATE ──────────────── */
  const [formData, setFormData] = useState(getDefaultFormData());
  const [errors, setErrors] = useState({});
  const [usernameError, setUsernameError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiFormError, setApiFormError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  /* ──────────────── EFFECTS ──────────────── */
  useEffect(() => {
    if (isEditMode && initialUser) {
      setFormData({
        username: initialUser.username || '',
        email: initialUser.email || '',
        first_name: initialUser.first_name || '',
        last_name: initialUser.last_name || '',
        password: '',
        password2: '',
        is_active: !!initialUser.is_active,
        is_staff: !!initialUser.is_staff,
      });
    } else {
      setFormData(getDefaultFormData());
    }
    setErrors({});
    setApiFormError('');
  }, [initialUser, isEditMode]);

  /* ──────────────── HANDLERS ──────────────── */
  const handleCloseNotification = () => setNotification(prev => ({ ...prev, open: false }));

  const handleChange = e => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        (name === 'is_active' || name === 'is_staff')
          ? value === 'true'
          : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (apiFormError) setApiFormError('');
  };

  const handleBlur = async e => {
    const { name, value } = e.target;
    if (name === 'username' && value.trim()) {
      try {
        const res = await checkUsernameExists(value);
        setUsernameError(res.data.exists ? 'Username is already taken.' : '');
      } catch {
        setUsernameError('Error checking username.');
      }
    }
  };

  const validateForm = () => {
    const newErr = {};
    if (!formData.first_name.trim()) newErr.first_name = 'First name is required.';
    if (!formData.last_name.trim()) newErr.last_name = 'Last name is required.';
    if (!formData.email.trim()) newErr.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErr.email = 'Email invalid.';
    if (!formData.username.trim()) newErr.username = 'Username required.';

    if (!isEditMode) {
      if (!formData.password) newErr.password = 'Password required.';
      if (!formData.password2) newErr.password2 = 'Confirm password.';
      if (formData.password && formData.password2 && formData.password !== formData.password2)
        newErr.password2 = 'Passwords do not match.';
    }

    setErrors(newErr);
    return !Object.keys(newErr).length;
  };

  const handleSubmitInternal = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = { ...formData };
    delete payload.password2;
    if (isEditMode && !payload.password) delete payload.password;

    try {
      await onSubmit(payload);
      setNotification({
        open: true,
        severity: 'success',
        message: isEditMode ? 'User updated successfully!' : 'User created successfully!',
      });
      if (!isEditMode) setFormData(getDefaultFormData());
    } catch (err) {
      setNotification({ open: true, severity: 'error', message: err.message || 'Error. Try again.' });
    }
  };

  /* ──────────────── MEMOS ──────────────── */
  const passwordStrength = useMemo(() => calcStrength(formData.password), [formData.password]);

  /* ──────────────── RENDER ──────────────── */
  return (
    <RootContainer>


      <GlassCard>
        {loading && !formData.email ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress sx={{ color: '#FE6B8B' }} />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmitInternal} sx={{ mt: 1 }} noValidate>
            {/* ───── Personal Info ───── */}
            <Typography variant="subtitle1" sx={{ mb: 1, opacity: 0.8 }}>
              Personal Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: isSm ? 'column' : 'row', gap: 2 }}>
              <TextField fullWidth label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} error={!!errors.first_name} helperText={errors.first_name} required sx={textFieldSx} autoFocus />
              <TextField fullWidth label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} error={!!errors.last_name} helperText={errors.last_name} required sx={textFieldSx} />
            </Box>
            <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={!!errors.email} helperText={errors.email} required sx={{ ...textFieldSx, mt: 2 }} />
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.username || !!usernameError}
              helperText={errors.username || usernameError}
              required
              sx={{ ...textFieldSx, mt: 2 }}
              disabled={isEditMode}
            />

            {/* ───── Security Info ───── */}
            {!isEditMode && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, opacity: 0.8 }}>
                  Security
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: isSm ? 'column' : 'row', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    required
                    sx={textFieldSx}
                    InputProps={{
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
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    name="password2"
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.password2}
                    onChange={handleChange}
                    error={!!errors.password2}
                    helperText={errors.password2}
                    required
                    sx={textFieldSx}
                    InputProps={{
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
                {/* Password strength meter using the common template */}
                <PasswordStrengthMeter password={formData.password} />
              </>
            )}

            {/* ───── Status & Role ───── */}
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, opacity: 0.8 }}>
              Account Settings
            </Typography>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Status
              </FormLabel>
              <RadioGroup row name="is_active" value={formData.is_active} onChange={handleChange}>
                <FormControlLabel value={true} control={<Radio sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: '#FE6B8B' } }} />} label="Active" />
                <FormControlLabel value={false} control={<Radio sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: '#FE6B8B' } }} />} label="Inactive" />
              </RadioGroup>
            </FormControl>

            {/* Role select with glass paper */}
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={textFieldSx}>
                <Select
                  name="is_staff"
                  value={String(formData.is_staff)}
                  onChange={handleChange}
                  displayEmpty
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        ...blurProps,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: glassBorder,
                        borderRadius: 2,
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0,0,0,.37)',
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

            {/* ───── Actions ───── */}
            <Box sx={{ mt: 4, display: 'flex', flexDirection: isSm ? 'column' : 'row', gap: 2 }}>
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
                }}
                startIcon={<SaveIcon />}
              >
                {loading ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create User'}
              </Button>
              <Button
                onClick={onCancel}
                variant="outlined"
                color="error"
                disabled={loading}
                sx={{ flex: 1, borderRadius: 25, p: '10px 25px' }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </GlassCard>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </RootContainer>
  );
}
