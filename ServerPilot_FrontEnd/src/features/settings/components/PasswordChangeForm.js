import React, { useState } from 'react';
import { Box, TextField, Typography, Button, Alert, InputAdornment, CircularProgress } from '@mui/material';
import { changePassword } from '../../../api/userService';
import ShowPasswordIconButton from '../../../common/ShowPasswordIconButton';
import PasswordStrengthMeter from '../../../common/PasswordStrengthMeter';
import GeneratePasswordButton from '../../../common/GeneratePasswordButton';
import { CustomSnackbar, useSnackbar } from '../../../common';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';

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
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
    color: 'white',
    borderRadius: '12px',
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
};

const PasswordChangeForm = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use the custom snackbar hook
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await changePassword({ current_password: oldPassword, new_password: newPassword });
      showSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData) {
        if (errorData.new_password) {
          setError(errorData.new_password.join(' '));
        } else if (errorData.detail) {
          setError(errorData.detail);
        } else {
          setError('Failed to change password. Please check your old password.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPaper>
      <Typography variant="h6" gutterBottom>
        Password
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
        Change your password to enhance your account security.
      </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          margin="normal"
          required
          fullWidth
          name="oldPassword"
          label="Old Password"
          type={showOld ? 'text' : 'password'}
          id="oldPassword"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          sx={textFieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <ShowPasswordIconButton
                  visible={showOld}
                  onClick={() => setShowOld((show) => !show)}
                />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="newPassword"
          label="New Password"
          type={showNew ? 'text' : 'password'}
          id="newPassword"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          sx={textFieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <ShowPasswordIconButton
                  visible={showNew}
                  onClick={() => setShowNew((show) => !show)}
                />
                <GeneratePasswordButton
                  onGenerate={(pwd) => {
                    setNewPassword(pwd);
                    setConfirmPassword(pwd);
                  }}
                />
              </InputAdornment>
            ),
          }}
        />
        <PasswordStrengthMeter password={newPassword} />
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm New Password"
          type={showConfirm ? 'text' : 'password'}
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
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
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
        </Button>
      </Box>

      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        severity={snackbar.severity}
        message={snackbar.message}
      />
    </GlassPaper>
    
  );
};

export default PasswordChangeForm;
