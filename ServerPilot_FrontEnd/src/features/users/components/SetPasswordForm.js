import React, { useState } from 'react';
import {
    Box, TextField, Button, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import PasswordStrengthMeter from '../../../common/PasswordStrengthMeter';
import GeneratePasswordButton from '../../../common/GeneratePasswordButton';
import ShowPasswordIconButton from '../../../common/ShowPasswordIconButton';
import {glassDialogSx, textFieldSx, gradientButtonSx, CancelButton, CircularProgressSx} from '../../../common';

export default function SetPasswordForm({ open, onClose, onSubmit, username, error, loading }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            setFormError('Passwords do not match.');
            return;
        }
        if (!newPassword) {
            setFormError('Password cannot be empty.');
            return;
        }
        setFormError('');
        onSubmit(newPassword);
    };

    const handleClose = () => {
        if (loading) return;
        setNewPassword('');
        setConfirmPassword('');
        setFormError('');
        setShowPassword(false);
        setShowConfirm(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
            <DialogTitle fontSize={36} fontWeight="bold">
                Set Password for {username}
            </DialogTitle>
            <DialogContent sx={{ 
                color: '#fff',
                padding: '0 24px 16px 24px',
            }}>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="newPassword"
                        label="New Password"
                        type={showPassword ? 'text' : 'password'}
                        id="newPassword"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
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
                                        setNewPassword(pwd);
                                        setConfirmPassword(pwd);
                                      }}
                                      disabled={loading}
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
                    {formError && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{formError}</Alert>}
                    {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Box>
                    <CancelButton
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </CancelButton>
                </Box>
                <Box>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        disabled={
                        loading ||
                        !newPassword ||
                        !confirmPassword ||
                        newPassword !== confirmPassword
                        } 
                        sx={{
                        ...gradientButtonSx
                            }} 
                        size="large"
                        onClick={handleSubmit}
                    >
                        {loading ? <CircularProgress sx={CircularProgressSx} /> : 'Set Password'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
