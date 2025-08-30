import React, { useState } from 'react';
import { Box, TextField, Typography, Button, Alert, InputAdornment, CircularProgress } from '@mui/material';
import { changePassword } from '../../../api/userService';
import ShowPasswordIconButton from '../../../common/ShowPasswordIconButton';
import PasswordStrengthMeter from '../../../common/PasswordStrengthMeter';
import GeneratePasswordButton from '../../../common/GeneratePasswordButton';
import { CustomSnackbar, useSnackbar, textFieldSx, GlassPaper, gradientButtonSx, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';


const PasswordChangeForm = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError(t('passwordChange.mismatch'));
      setLoading(false);
      return;
    }

    try {
      await changePassword({ current_password: oldPassword, new_password: newPassword });
      showSuccess(t('passwordChange.success'));
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
          setError(t('passwordChange.failGeneric'));
        }
      } else {
        setError(t('passwordChange.unexpected'));
      }
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress  size={20} sx={CircularProgressSx} />
      </Box>
    );
  }
  return (
    <GlassPaper>
      <Typography variant="h6" gutterBottom>
        {t('passwordChange.title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
        {t('passwordChange.description')}
      </Typography>
      
        <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          margin="normal"
          required
          fullWidth
          name="oldPassword"
          label={t('passwordChange.oldPassword')}
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
          label={t('passwordChange.newPassword')}
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
          label={t('passwordChange.confirmNewPassword')}
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
            ...gradientButtonSx}}
        >
          {loading ? <CircularProgress size={20} sx={CircularProgressSx} /> : t('passwordChange.change')}
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
