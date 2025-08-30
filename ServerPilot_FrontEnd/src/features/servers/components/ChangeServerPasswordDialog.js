import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Box,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  textFieldSx,
  gradientButtonSx,
  glassDialogSx,
  CancelButton,
  GeneratePasswordButton,
  PasswordStrengthMeter,
  ShowPasswordIconButton,
} from '../../../common';
import { useTranslation } from 'react-i18next';

/**
 * Props:
 * - open: boolean
 * - onClose: function
 * - serverName: string
 * - onSubmit: async function(password) => { ok: boolean, error?: string }
 */
export default function ChangeServerPasswordDialog({ open, onClose, serverName, onSubmit }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = (generated) => {
    setPassword(generated);
    if (error) setError('');
  };

  const handleToggleVisibility = () => setShowPassword((v) => !v);

  const handleClose = () => {
    if (submitting) return;
    setPassword('');
    setError('');
    setShowPassword(false);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!password) {
      setError(t('servers.passwordDialog.emptyError'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await onSubmit?.(password);
      if (result && result.ok) {
        setPassword('');
        onClose?.();
      } else if (result && result.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperComponent={glassDialogSx} maxWidth="sm" fullWidth>
      <DialogTitle>{t('servers.passwordDialog.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {t('servers.passwordDialog.description', { name: serverName })}
        </DialogContentText>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            autoFocus
            margin="dense"
            id="new-server-password"
            label={t('servers.passwordDialog.newPassword')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            error={!!error}
            helperText={error}
            sx={{ ...textFieldSx }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <ShowPasswordIconButton visible={showPassword} onClick={handleToggleVisibility} />
                  <GeneratePasswordButton onGenerate={handleGenerate} disabled={submitting} />
                </InputAdornment>
              ),
            }}
          />
          
        </Box>
        <PasswordStrengthMeter password={password} />
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <CancelButton onClick={handleClose} disabled={submitting}>{t('servers.common.cancel')}</CancelButton>
        </Box>
        <Box>
          <Button 
            onClick={handleSubmit}
            disabled={
                !password ||
                submitting
                }  
            sx={{ ...gradientButtonSx }}>
            {t('servers.passwordDialog.change')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}


