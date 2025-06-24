import React, { useState } from 'react';
import {
    Box, TextField, Button, Typography, Alert, CircularProgress
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';


export default function SetPasswordForm({ onSubmit, onCancel, username, error, loading }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');

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

    /*********************  END OF STYLED COMPONENTS  ************************/

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

    return (
        <RootContainer>
            <GlassCard>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 1 }}>

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="newPassword"
                        label="New Password"
                        type="password"
                        id="newPassword"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                        sx={textFieldSx}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        id="confirmPassword"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        sx={textFieldSx}
                    />
                    {formError && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{formError}</Alert>}
                    {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                         <Button
                            onClick={onCancel}
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
                                }} 
                            size="large">
                            {loading ? <CircularProgress size={24}
                            
                            color="inherit" /> : 'Set Password'}
                        </Button>
                    </Box>
                </Box>
            </GlassCard>
        </RootContainer>
    );
}
